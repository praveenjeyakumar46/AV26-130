"""
train_mistral.py
Fine-tunes Mistral-7B as the INPUT HANDLER / INTENT CLASSIFIER.

Role in the pipeline:
  User query → [Mistral: classify intent + persona + rewrite clean prompt]
                → [Qwen 2.5-7B: generate the final answer]

Mistral is trained to:
  1. Detect persona  (common_people | student)
  2. Detect topic    (science | math | health | technology | history | finance | career | general)
  3. Return a structured JSON routing signal
  4. Optionally rewrite the query for clarity before passing to Qwen

FIXES the Windows UnicodeDecodeError by importing setup_env FIRST.
Optimised for RTX 4060 Laptop 8GB VRAM.
"""

# ── MUST be the very first import ────────────────────────────────────────────
import setup_env  # noqa: F401  — applies UTF-8 patch before TRL loads

import json
import os
from pathlib import Path

import torch
from datasets import Dataset
from peft import LoraConfig, TaskType, get_peft_model
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from trl import SFTTrainer, SFTConfig

from training_data import build_dataset

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

MODEL_ID   = "mistralai/Mistral-7B-Instruct-v0.3"
OUTPUT_DIR = "./outputs/mistral_input_handler"
DATA_DIR   = "./data"

LORA_CONFIG = LoraConfig(
    task_type   = TaskType.CAUSAL_LM,
    r           = 16,
    lora_alpha  = 32,
    lora_dropout= 0.05,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj"],
    bias        = "none",
)

# RTX 4060: force bfloat16 + double quant to stay within 8GB
BNB_CONFIG = BitsAndBytesConfig(
    load_in_4bit              = True,
    bnb_4bit_quant_type       = "nf4",
    bnb_4bit_compute_dtype    = torch.bfloat16,   # best for RTX 40-series
    bnb_4bit_use_double_quant = True,             # saves ~0.4 GB extra
)

# ─────────────────────────────────────────────────────────────────────────────
# MISTRAL-SPECIFIC TRAINING DATA
# Build a routing/classification dataset from the base QA pairs
# ─────────────────────────────────────────────────────────────────────────────

MISTRAL_SYSTEM = (
    "You are an intelligent input handler. "
    "When a user sends a message, analyse it and respond with a JSON object containing:\n"
    '  "persona": "common_people" or "student"\n'
    '  "topic": one of [science, math, health, technology, history, finance, career, general]\n'
    '  "clean_query": a rephrased, clear version of the user question\n'
    '  "complexity": "simple" or "detailed"\n\n'
    "Rules:\n"
    "- If the user uses casual/informal language, slang, or asks for simple explanations → common_people\n"
    "- If the user uses technical terms, asks for depth, or identifies as a student → student\n"
    "- When uncertain, default to common_people\n"
    "Respond ONLY with valid JSON. No extra text."
)

# Routing examples keyed to the QA bank
ROUTING_EXAMPLES = [
    # (user_query_variant, expected_json)
    (
        "hey what even is the internet lol",
        {"persona": "common_people", "topic": "general",
         "clean_query": "What is the internet?", "complexity": "simple"},
    ),
    (
        "Explain the TCP/IP protocol stack and how the internet works at the network layer.",
        {"persona": "student", "topic": "technology",
         "clean_query": "How does the internet work at the TCP/IP network layer?", "complexity": "detailed"},
    ),
    (
        "why is sky blue?",
        {"persona": "common_people", "topic": "science",
         "clean_query": "Why is the sky blue?", "complexity": "simple"},
    ),
    (
        "Describe Rayleigh scattering and its role in atmospheric optics.",
        {"persona": "student", "topic": "science",
         "clean_query": "What is Rayleigh scattering and how does it cause the sky to appear blue?",
         "complexity": "detailed"},
    ),
    (
        "what foods help me lose weight fast",
        {"persona": "common_people", "topic": "health",
         "clean_query": "What should I eat to lose weight?", "complexity": "simple"},
    ),
    (
        "What is the role of caloric deficit and macronutrient composition in sustainable weight loss?",
        {"persona": "student", "topic": "health",
         "clean_query": "How does caloric deficit and macronutrient balance affect weight loss?",
         "complexity": "detailed"},
    ),
    (
        "bro explain DNA like im 5",
        {"persona": "common_people", "topic": "science",
         "clean_query": "What is DNA in simple terms?", "complexity": "simple"},
    ),
    (
        "Describe the double-helix structure of DNA and the base-pairing rules.",
        {"persona": "student", "topic": "science",
         "clean_query": "What is the molecular structure of DNA?", "complexity": "detailed"},
    ),
    (
        "how do I make a good resume I need a job",
        {"persona": "common_people", "topic": "career",
         "clean_query": "How do I write a good resume?", "complexity": "simple"},
    ),
    (
        "What are ATS optimisation techniques for a software engineering resume?",
        {"persona": "student", "topic": "career",
         "clean_query": "How do I optimise a resume for ATS systems in software engineering?",
         "complexity": "detailed"},
    ),
    (
        "everything is getting expensive why",
        {"persona": "common_people", "topic": "finance",
         "clean_query": "Why are prices rising (inflation)?", "complexity": "simple"},
    ),
    (
        "Explain the demand-pull and cost-push causes of inflation and how central banks respond.",
        {"persona": "student", "topic": "finance",
         "clean_query": "What causes inflation and how do central banks control it?",
         "complexity": "detailed"},
    ),
    (
        "can't sleep what to do",
        {"persona": "common_people", "topic": "health",
         "clean_query": "How can I sleep better?", "complexity": "simple"},
    ),
    (
        "What neuroscientific mechanisms underlie sleep consolidation and memory formation?",
        {"persona": "student", "topic": "health",
         "clean_query": "How does sleep consolidate memory at the neurological level?",
         "complexity": "detailed"},
    ),
    (
        "what is machine learning in simple words",
        {"persona": "common_people", "topic": "technology",
         "clean_query": "What is machine learning?", "complexity": "simple"},
    ),
    (
        "Compare supervised, unsupervised, and reinforcement learning paradigms in ML.",
        {"persona": "student", "topic": "technology",
         "clean_query": "What are the main paradigms in machine learning?", "complexity": "detailed"},
    ),
    (
        "who was gandhi and why is he famous",
        {"persona": "common_people", "topic": "history",
         "clean_query": "Who was Mahatma Gandhi?", "complexity": "simple"},
    ),
    (
        "Analyse Gandhi's Satyagraha philosophy and its influence on global civil rights movements.",
        {"persona": "student", "topic": "history",
         "clean_query": "What was Gandhi's Satyagraha and how did it influence civil rights movements?",
         "complexity": "detailed"},
    ),
    (
        "im stressed all the time help",
        {"persona": "common_people", "topic": "health",
         "clean_query": "How can I manage stress?", "complexity": "simple"},
    ),
    (
        "What does chronic stress do to the HPA axis and what are evidence-based interventions?",
        {"persona": "student", "topic": "health",
         "clean_query": "How does chronic stress affect the HPA axis and what treatments work?",
         "complexity": "detailed"},
    ),
]


def build_mistral_dataset() -> Dataset:
    """Build the routing classification dataset for Mistral."""
    records = []
    for user_q, expected_json in ROUTING_EXAMPLES:
        text = (
            f"<s>[INST] <<SYS>>\n{MISTRAL_SYSTEM}\n<</SYS>>\n\n"
            f"{user_q} [/INST] "
            f"{json.dumps(expected_json, ensure_ascii=False)} </s>"
        )
        records.append({"text": text})
    return Dataset.from_list(records)


# ─────────────────────────────────────────────────────────────────────────────
# TRAINING
# ─────────────────────────────────────────────────────────────────────────────

def train():
    print("\n" + "="*60)
    print("  MISTRAL INPUT HANDLER — Fine-tuning  [RTX 4060 8GB]")
    print("="*60 + "\n")

    # Load tokenizer
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.padding_side = "right"

    # Load model in 4-bit, pinned to GPU 0
    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config = BNB_CONFIG,
        device_map          = {"": 0},        # pin everything to GPU 0
        trust_remote_code   = True,
        torch_dtype         = torch.bfloat16,
    )
    model.config.use_cache = False
    model.config.pretraining_tp = 1

    # Confirm model is on GPU
    print(f"[gpu] Model device : {next(model.parameters()).device}")
    print(f"[gpu] VRAM in use  : {torch.cuda.memory_allocated(0) / 1024**3:.2f} GB allocated\n")

    # Apply LoRA
    model = get_peft_model(model, LORA_CONFIG)
    model.print_trainable_parameters()

    # Dataset
    dataset = build_mistral_dataset()
    print(f"[dataset] {len(dataset)} routing examples loaded.\n")

    # SFT config — tuned for 8GB VRAM
    sft_config = SFTConfig(
        output_dir                  = OUTPUT_DIR,
        num_train_epochs            = 5,          # small dataset → more epochs
        per_device_train_batch_size = 1,          # 8GB: keep at 1
        gradient_accumulation_steps = 8,          # effective batch = 8
        learning_rate               = 2e-4,
        lr_scheduler_type           = "cosine",
        warmup_ratio                = 0.1,
        fp16                        = False,       # RTX 4060 prefers bf16
        bf16                        = True,        # RTX 40-series supports bfloat16 natively
        logging_steps               = 5,
        save_steps                  = 50,
        save_total_limit            = 2,
        max_length                  = 256,         # fixed: renamed from max_seq_length in trl>=0.12
        dataset_text_field          = "text",
        report_to                   = "none",
        optim                       = "paged_adamw_8bit",
        # group_by_length removed — no longer supported in trl>=0.12
    )

    trainer = SFTTrainer(
        model            = model,
        args             = sft_config,
        train_dataset    = dataset,
        processing_class = tokenizer,             # fixed: renamed from 'tokenizer' in trl>=0.12
    )

    print("[training] Starting Mistral input handler fine-tuning …\n")
    trainer.train()

    trainer.save_model(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    print(f"\n[done] ✅  Mistral model saved → {OUTPUT_DIR}")

    # ── Free VRAM before Qwen training ───────────────────────────────────────
    del model
    del trainer
    torch.cuda.empty_cache()
    print(f"[gpu] VRAM cleared. Free: {(torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_reserved(0)) / 1024**3:.1f} GB")


if __name__ == "__main__":
    train()
