"""
inference_pipeline.py
Full two-model pipeline:
  User query
    → Mistral (input handler)  : detects persona + topic + rewrites query
    → Qwen   (answer generator): generates persona-calibrated answer

Optimised for RTX 4060 Laptop 8GB VRAM:
  Models are loaded SEQUENTIALLY — Mistral routes the query, is unloaded,
  then Qwen loads and generates the answer. This keeps peak VRAM under 8GB.

Usage:
    python inference_pipeline.py
    python inference_pipeline.py --query "what is DNA?"
    python inference_pipeline.py --query "Explain CRISPR-Cas9 mechanisms" --persona student
"""

# ── UTF-8 fix (same as training) ─────────────────────────────────────────────
import setup_env  # noqa: F401

import argparse
import gc
import json
import time
from pathlib import Path

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

# ─────────────────────────────────────────────────────────────────────────────
# GPU CHECK
# ─────────────────────────────────────────────────────────────────────────────

assert torch.cuda.is_available(), (
    "❌ CUDA not available! Check that your NVIDIA drivers and CUDA toolkit are installed."
)
torch.cuda.set_device(0)
print(f"[gpu] ✅  Using : {torch.cuda.get_device_name(0)}")
print(f"[gpu] VRAM Total : {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB\n")

# ─────────────────────────────────────────────────────────────────────────────
# PATHS  (update if you changed OUTPUT_DIR in train_*.py)
# ─────────────────────────────────────────────────────────────────────────────

MISTRAL_BASE  = "mistralai/Mistral-7B-Instruct-v0.3"
MISTRAL_LORA  = "./outputs/mistral_input_handler"

QWEN_BASE     = "Qwen/Qwen2.5-7B-Instruct"
QWEN_LORA     = "./outputs/qwen_answer_generator"

# RTX 4060: bfloat16 + double quant
BNB_CONFIG = BitsAndBytesConfig(
    load_in_4bit              = True,
    bnb_4bit_quant_type       = "nf4",
    bnb_4bit_compute_dtype    = torch.bfloat16,
    bnb_4bit_use_double_quant = True,
)

SYSTEM_COMMON = (
    "You are a warm, friendly assistant that explains things in simple, clear everyday language. "
    "Use real-life examples and analogies. Keep answers practical and kind."
)
SYSTEM_STUDENT = (
    "You are a knowledgeable academic assistant. Give accurate, structured, technically rich answers. "
    "Use correct terminology, reference frameworks or researchers where relevant."
)

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _vram_free_gb() -> float:
    props = torch.cuda.get_device_properties(0)
    return (props.total_memory - torch.cuda.memory_reserved(0)) / 1024**3


def _load_model(base_id: str, lora_path: str, label: str):
    """Load a model + tokenizer onto GPU 0, applying LoRA if available."""
    print(f"[loader] Loading {label} …  (VRAM free: {_vram_free_gb():.1f} GB)")
    tokenizer = AutoTokenizer.from_pretrained(
        lora_path if Path(lora_path).exists() else base_id,
        trust_remote_code=True,
    )
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        base_id,
        quantization_config = BNB_CONFIG,
        device_map          = {"": 0},        # pin to GPU 0
        trust_remote_code   = True,
        torch_dtype         = torch.bfloat16,
    )

    if Path(lora_path).exists():
        model = PeftModel.from_pretrained(base_model, lora_path)
        print(f"[loader] ✅  {label} LoRA loaded from {lora_path}")
    else:
        model = base_model
        print(f"[loader] ⚠️  No LoRA at {lora_path} — using base model.")

    print(f"[gpu]   VRAM after load: {torch.cuda.memory_allocated(0) / 1024**3:.2f} GB allocated\n")
    return model, tokenizer


def _unload_model(model, label: str):
    """Delete model and release VRAM."""
    del model
    gc.collect()
    torch.cuda.empty_cache()
    print(f"[gpu] {label} unloaded. VRAM free: {_vram_free_gb():.1f} GB\n")


# ─────────────────────────────────────────────────────────────────────────────
# STEP 1: MISTRAL — Route the query
# ─────────────────────────────────────────────────────────────────────────────

MISTRAL_SYSTEM = (
    "You are an intelligent input handler. "
    "When a user sends a message, analyse it and respond with a JSON object containing:\n"
    '  "persona": "common_people" or "student"\n'
    '  "topic": one of [science, math, health, technology, history, finance, career, general]\n'
    '  "clean_query": a rephrased, clear version of the user question\n'
    '  "complexity": "simple" or "detailed"\n\n'
    "Rules:\n"
    "- Casual/informal language → common_people\n"
    "- Technical terms or student context → student\n"
    "- When uncertain, default to common_people\n"
    "Respond ONLY with valid JSON. No extra text."
)


def route_query(query: str, forced_persona: str = None) -> dict:
    """
    Load Mistral, run routing, unload it, return routing dict.
    If forced_persona is set, skips Mistral entirely (saves ~6s load time).
    """
    if forced_persona:
        return {
            "persona": forced_persona,
            "topic": "general",
            "clean_query": query,
            "complexity": "detailed" if forced_persona == "student" else "simple",
        }

    model, tokenizer = _load_model(MISTRAL_BASE, MISTRAL_LORA, "Mistral (Input Handler)")

    prompt = (
        f"<s>[INST] <<SYS>>\n{MISTRAL_SYSTEM}\n<</SYS>>\n\n"
        f"{query} [/INST]"
    )
    inputs = tokenizer(prompt, return_tensors="pt").to("cuda:0")

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens = 120,
            temperature    = 0.1,
            do_sample      = True,
            pad_token_id   = tokenizer.eos_token_id,
        )
    response = tokenizer.decode(outputs[0], skip_special_tokens=True)

    # Extract JSON from response
    try:
        json_start = response.rfind("{")
        json_end   = response.rfind("}") + 1
        routing    = json.loads(response[json_start:json_end])
    except Exception:
        routing = {
            "persona": "common_people",
            "topic": "general",
            "clean_query": query,
            "complexity": "simple",
        }

    # Unload Mistral before loading Qwen
    _unload_model(model, "Mistral")
    return routing


# ─────────────────────────────────────────────────────────────────────────────
# STEP 2: QWEN — Generate the answer
# ─────────────────────────────────────────────────────────────────────────────

def generate_answer(routing: dict) -> str:
    """Load Qwen, generate answer, unload it, return answer string."""
    persona     = routing.get("persona", "common_people")
    topic       = routing.get("topic", "general")
    clean_query = routing.get("clean_query", "")
    complexity  = routing.get("complexity", "simple")

    model, tokenizer = _load_model(QWEN_BASE, QWEN_LORA, "Qwen (Answer Generator)")

    system = SYSTEM_STUDENT if persona == "student" else SYSTEM_COMMON
    routing_prefix = (
        f"[Persona: {persona.replace('_', ' ').title()}] "
        f"[Topic: {topic.capitalize()}]\n\n"
    )
    enriched_user = routing_prefix + clean_query

    messages = [
        {"role": "system", "content": system},
        {"role": "user",   "content": enriched_user},
    ]
    text   = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(text, return_tensors="pt").to("cuda:0")

    max_tokens = 512 if complexity == "detailed" else 300

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_new_tokens     = max_tokens,
            temperature        = 0.7,
            top_p              = 0.9,
            do_sample          = True,
            repetition_penalty = 1.1,
            pad_token_id       = tokenizer.eos_token_id,
        )

    new_tokens = outputs[0][inputs["input_ids"].shape[1]:]
    answer = tokenizer.decode(new_tokens, skip_special_tokens=True).strip()

    # Unload Qwen
    _unload_model(model, "Qwen")
    return answer


# ─────────────────────────────────────────────────────────────────────────────
# FULL PIPELINE
# ─────────────────────────────────────────────────────────────────────────────

def run_pipeline(query: str, forced_persona: str = None) -> dict:
    """
    Sequential pipeline:
      1. Load Mistral → route → unload Mistral
      2. Load Qwen    → answer → unload Qwen
    Peak VRAM stays under 8GB at all times.
    """
    t0 = time.time()

    # Step 1: Route
    routing = route_query(query, forced_persona=forced_persona)
    t1 = time.time()

    # Step 2: Answer
    answer = generate_answer(routing)
    t2 = time.time()

    return {
        "query":         query,
        "routing":       routing,
        "answer":        answer,
        "routing_ms":    round((t1 - t0) * 1000),
        "generation_ms": round((t2 - t1) * 1000),
        "total_ms":      round((t2 - t0) * 1000),
    }


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def _print_result(result: dict):
    r = result["routing"]
    print("\n" + "─"*60)
    print(f"  Query    : {result['query']}")
    print(f"  Persona  : {r.get('persona')}   Complexity: {r.get('complexity')}")
    print(f"  Topic    : {r.get('topic')}")
    print(f"  Rewritten: {r.get('clean_query')}")
    print("─"*60)
    print(result["answer"])
    print("─"*60)
    print(f"  ⏱  Routing {result['routing_ms']}ms | Generation {result['generation_ms']}ms | Total {result['total_ms']}ms\n")


def interactive_loop():
    print("\n🤖  Dual-Model Pipeline  [RTX 4060 — Sequential Loading]")
    print("    Note: each query loads/unloads models sequentially to fit 8GB VRAM.")
    print("    Prefix with 'student:' or 'common:' to skip Mistral routing.\n")
    print("    Type 'quit' to exit.\n")

    while True:
        try:
            query = input("You: ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nBye!")
            break
        if not query or query.lower() in ("quit", "exit", "q"):
            print("Bye!")
            break

        forced = None
        if query.lower().startswith("student:"):
            forced = "student"
            query  = query[8:].strip()
        elif query.lower().startswith("common:"):
            forced = "common_people"
            query  = query[7:].strip()

        result = run_pipeline(query, forced_persona=forced)
        _print_result(result)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query",   type=str, default=None, help="Single query to answer")
    parser.add_argument("--persona", type=str, default=None,
                        choices=["common_people", "student"],
                        help="Force a persona (skips Mistral routing, saves load time)")
    args = parser.parse_args()

    if args.query:
        result = run_pipeline(args.query, forced_persona=args.persona)
        _print_result(result)
    else:
        interactive_loop()
