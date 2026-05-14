"""
train_qwen.py
Fine-tunes Qwen2.5-7B-Instruct as the ANSWER GENERATOR.

Role in the pipeline:
  [Mistral: structured routing JSON] → [Qwen: generate the final answer]

Qwen is trained to:
  1. Accept a structured prompt containing persona + topic + clean_query
  2. Generate an answer perfectly calibrated to the persona:
       • common_people → simple, analogies, examples, emojis, warm tone
       • student       → technical depth, frameworks, citations, precision
  3. Handle general conversational questions (ChatGPT-style) naturally
  4. Switch persona style DYNAMICALLY based on the routing signal

FIXES the Windows UnicodeDecodeError by importing setup_env FIRST.
Optimised for RTX 4060 Laptop 8GB VRAM.
"""

# ── MUST be the very first import ────────────────────────────────────────────
import setup_env  # noqa: F401  — applies UTF-8 patch before TRL loads

import json
from pathlib import Path

import torch
from datasets import Dataset, DatasetDict
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
)
from trl import SFTTrainer, SFTConfig

from training_data import build_dataset, PERSONA_CONFIGS

# ─────────────────────────────────────────────────────────────────────────────
# GPU CHECK  — RTX 4060 Laptop
# ─────────────────────────────────────────────────────────────────────────────

assert torch.cuda.is_available(), (
    "❌ CUDA not available! Check that your NVIDIA drivers and CUDA toolkit are installed."
)
torch.cuda.set_device(0)
print(f"[gpu] ✅  Using : {torch.cuda.get_device_name(0)}")
print(f"[gpu] VRAM Total : {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
print(f"[gpu] VRAM Free  : {(torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_reserved(0)) / 1024**3:.1f} GB\n")

# ─────────────────────────────────────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────────────────────────────────────

MODEL_ID   = "Qwen/Qwen2.5-7B-Instruct"
OUTPUT_DIR = "./outputs/qwen_answer_generator"

LORA_CONFIG = LoraConfig(
    task_type      = TaskType.CAUSAL_LM,
    r              = 16,
    lora_alpha     = 32,
    lora_dropout   = 0.05,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj"],
    bias           = "none",
)

# RTX 4060: force bfloat16 + double quant to stay within 8GB
BNB_CONFIG = BitsAndBytesConfig(
    load_in_4bit              = True,
    bnb_4bit_quant_type       = "nf4",
    bnb_4bit_compute_dtype    = torch.bfloat16,   # best for RTX 40-series
    bnb_4bit_use_double_quant = True,             # saves ~0.4 GB extra
)

# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPTS (injected dynamically at training time)
# ─────────────────────────────────────────────────────────────────────────────

QWEN_SYSTEM_COMMON = (
    "You are a warm, friendly assistant that explains things in simple, clear everyday language. "
    "Use real-life examples and analogies. Avoid jargon — if you must use a technical word, "
    "immediately explain it in plain terms. Use emojis sparingly to add warmth. "
    "Make the person feel understood and capable, never overwhelmed. "
    "Keep answers practical and actionable."
)

QWEN_SYSTEM_STUDENT = (
    "You are a knowledgeable academic assistant for students. "
    "Give structured, accurate, and information-rich answers. "
    "Use correct technical terminology, reference relevant frameworks, formulas, or researchers. "
    "Provide real-world applications of the concepts. Be clear, concise, and intellectually rigorous. "
    "Do not oversimplify — students need depth to succeed academically and professionally."
)

# ─────────────────────────────────────────────────────────────────────────────
# DATASET BUILDER  — Qwen ChatML format
# ─────────────────────────────────────────────────────────────────────────────

def build_qwen_dataset(tokenizer) -> DatasetDict:
    """
    Build a dataset where each example is formatted in Qwen's ChatML format.
    The system prompt is dynamically chosen per persona.
    """
    raw = build_dataset(shuffle=True, seed=99)
    records = []

    for ex in raw:
        persona = ex["persona"]
        messages = ex["messages"]

        # Select the right system prompt
        system = QWEN_SYSTEM_COMMON if persona == "common_people" else QWEN_SYSTEM_STUDENT

        # Build enriched user turn: include routing metadata so model learns
        # to condition on persona + topic signals
        topic = ex["topic"]
        original_question = messages[1]["content"]

        # Construct the enriched user message (as if Mistral routed it)
        routing_prefix = (
            f"[Persona: {persona.replace('_', ' ').title()}] "
            f"[Topic: {topic.capitalize()}]\n\n"
        )
        enriched_user = routing_prefix + original_question

        # Format as ChatML (Qwen's native format)
        chat = [
            {"role": "system",    "content": system},
            {"role": "user",      "content": enriched_user},
            {"role": "assistant", "content": messages[2]["content"]},  # the answer
        ]

        # Apply the tokenizer's chat template
        text = tokenizer.apply_chat_template(
            chat,
            tokenize=False,
            add_generation_prompt=False,
        )
        records.append({"text": text, "persona": persona, "topic": topic})

    # 90 / 10 split
    split_idx = int(len(records) * 0.9)
    train_records = records[:split_idx]
    eval_records  = records[split_idx:]

    return DatasetDict({
        "train": Dataset.from_list(train_records),
        "eval":  Dataset.from_list(eval_records),
    })


# ─────────────────────────────────────────────────────────────────────────────
# TRAINING
# ─────────────────────────────────────────────────────────────────────────────

def train():
    print("\n" + "="*60)
    print("  QWEN 2.5-7B ANSWER GENERATOR — Fine-tuning  [RTX 4060 8GB]")
    print("="*60 + "\n")

    # ── Tokenizer ────────────────────────────────────────────────────────────
    tokenizer = AutoTokenizer.from_pretrained(
        MODEL_ID,
        trust_remote_code = True,
        use_fast          = True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # ── Dataset ──────────────────────────────────────────────────────────────
    datasets = build_qwen_dataset(tokenizer)
    print(f"[dataset] train={len(datasets['train'])}  eval={len(datasets['eval'])}\n")

    # Persona distribution report
    from collections import Counter
    persona_counts = Counter(datasets["train"]["persona"])
    topic_counts   = Counter(datasets["train"]["topic"])
    print("[dataset] Persona distribution (train):")
    for k, v in sorted(persona_counts.items()):
        print(f"           {k}: {v}")
    print("[dataset] Topic distribution (train):")
    for k, v in sorted(topic_counts.items()):
        print(f"           {k}: {v}")
    print()

    # ── Model — pinned to GPU 0 ───────────────────────────────────────────────
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config = BNB_CONFIG,
        device_map          = {"": 0},        # pin everything to GPU 0
        trust_remote_code   = True,
        torch_dtype         = torch.bfloat16,
    )
    model.config.use_cache = False

    # Confirm model is on GPU
    print(f"[gpu] Model device : {next(model.parameters()).device}")
    print(f"[gpu] VRAM in use  : {torch.cuda.memory_allocated(0) / 1024**3:.2f} GB allocated\n")

    # ── LoRA ─────────────────────────────────────────────────────────────────
    model = get_peft_model(model, LORA_CONFIG)
    model.print_trainable_parameters()

    # ── SFT Config — tuned for 8GB VRAM ──────────────────────────────────────
    sft_config = SFTConfig(
        output_dir                  = OUTPUT_DIR,
        num_train_epochs            = 3,
        per_device_train_batch_size = 1,          # 8GB: keep at 1
        per_device_eval_batch_size  = 1,          # 8GB: keep at 1
        gradient_accumulation_steps = 8,          # effective batch = 8
        learning_rate               = 2e-4,
        lr_scheduler_type           = "cosine",
        warmup_ratio                = 0.05,
        fp16                        = False,       # RTX 4060 prefers bf16
        bf16                        = True,        # RTX 40-series supports bfloat16 natively
        logging_steps               = 10,
        eval_strategy               = "epoch",
        save_strategy               = "epoch",
        save_total_limit            = 2,
        load_best_model_at_end      = True,
        max_length                  = 512,         # fixed: renamed from max_seq_length in trl>=0.12
        dataset_text_field          = "text",
        report_to                   = "none",
        optim                       = "paged_adamw_8bit",
        # group_by_length removed — no longer supported in trl>=0.12
    )

    trainer = SFTTrainer(
        model            = model,
        args             = sft_config,
        train_dataset    = datasets["train"],
        eval_dataset     = datasets["eval"],
        processing_class = tokenizer,             # fixed: renamed from 'tokenizer' in trl>=0.12
    )

    print("[training] Starting Qwen answer generator fine-tuning …\n")
    trainer.train()

    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"\n[done] ✅  Qwen model saved → {OUTPUT_DIR}")

    # ── Free VRAM after training ──────────────────────────────────────────────
    del model
    del trainer
    torch.cuda.empty_cache()
    print(f"[gpu] VRAM cleared. Free: {(torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_reserved(0)) / 1024**3:.1f} GB")


if __name__ == "__main__":
    train()
