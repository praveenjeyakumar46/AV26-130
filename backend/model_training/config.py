# Training Configuration for Legal AI Models
# Auto-detects GPU and applies optimal settings for every tier:
#   Tier 1 — RTX 2050 / 2060 / 3050        :  4–6 GB  VRAM
#   Tier 2 — RTX 3060 / 3070 / 2070 / 2080 :  8–12 GB VRAM
#   Tier 3 — RTX 3080 / 3090 / 4070 / 4080 : 16–20 GB VRAM
#   Tier 4 — RTX 4090 / 5090 / A100        : 24–32 GB VRAM

import os
import torch

# ── Hugging Face (gated models) ───────────────────────────────────────────────
# Mistral/Qwen models require accepting the license and logging in.
# Set HF_TOKEN or run: huggingface-cli login
HF_TOKEN = os.environ.get("HF_TOKEN")

# ── Device ────────────────────────────────────────────────────────────────────
CUDA_AVAILABLE = torch.cuda.is_available()
DEVICE         = "cuda" if CUDA_AVAILABLE else "cpu"

# ── GPU profiling ─────────────────────────────────────────────────────────────
if CUDA_AVAILABLE:
    _props      = torch.cuda.get_device_properties(0)
    _vram_gb    = _props.total_memory / 1024**3
    _gpu_name   = torch.cuda.get_device_name(0)
    _capability = torch.cuda.get_device_capability(0)   # (major, minor)
    # Ampere = sm_80+ (RTX 30xx, A100, RTX 40xx, RTX 50xx)
    # Turing = sm_75  (RTX 20xx)
    _is_ampere_plus = _capability[0] >= 8
else:
    _vram_gb        = 0
    _gpu_name       = "No GPU"
    _capability     = (0, 0)
    _is_ampere_plus = False

# ── GPU Tier selection ────────────────────────────────────────────────────────
#  Tier 1 :  < 8 GB   — RTX 2050 / 2060 / 3050 (4–6 GB)
#  Tier 2 :  8–12 GB  — RTX 3060 / 3070 / 2070 / 2080
#  Tier 3 : 16–20 GB  — RTX 3080 / 3090 / 4070 / 4080
#  Tier 4 : 24 GB+    — RTX 4090 / 5090 / A100 / A6000
if _vram_gb < 8:
    GPU_TIER = 1
elif _vram_gb < 16:
    GPU_TIER = 2
elif _vram_gb < 24:
    GPU_TIER = 3
else:
    GPU_TIER = 4

# ── Precision: fp16 for Turing (RTX 20xx), bf16 for Ampere+ ──────────────────
BF16 = _is_ampere_plus          # bfloat16  — RTX 30xx / 40xx / 50xx / A100
FP16 = CUDA_AVAILABLE and not _is_ampere_plus   # fp16 — RTX 20xx (Turing)

# ── Model selection based on VRAM ─────────────────────────────────────────────
# Mistral: 7B only for all tiers. Qwen: 7B only for all tiers.
# Tier 1 uses 4-bit quant + gradient checkpointing to fit 4–6 GB VRAM.
MISTRAL_MODEL_NAME = "mistralai/Mistral-7B-v0.1"
QWEN_MODEL_NAME    = "Qwen/Qwen2.5-7B-Instruct"

# Override with local path if you have models or a trained checkpoint locally:
# MISTRAL_MODEL_NAME = "./models/mistral_keyword_finetuned"
# MISTRAL_MODEL_NAME = "C:/models/Mistral-7B-v0.1"
# QWEN_MODEL_NAME    = "C:/models/Qwen2.5-7B-Instruct"
# MISTRAL_OUTPUT_DIR = "./models/mistral_keyword_finetuned_v2"

# ── Data Paths ────────────────────────────────────────────────────────────────
CONSTITUTION_ENGLISH_PDF = "../database/data/constitution_english.pdf"
CONSTITUTION_TAMIL_PDF   = "../database/data/constitution_tamil.pdf"
CENTRAL_ACTS_DIR         = "../database/data/Central Acts"
TRAINING_DATA_DIR        = "./training_data"

# Hugging Face Q&A (merged during training unless SKIP_HF_CONSTITUTION=1;
# optional during prepare_data when PREPARE_INCLUDE_HF_CONSTITUTION=1)
CONSTITUTION_HF_DATASET_ID = "afkdark/Constitution_of_India"

# ── Output Directories ────────────────────────────────────────────────────────
MISTRAL_OUTPUT_DIR = "./models/mistral_keyword_finetuned"
QWEN_OUTPUT_DIR    = "./models/qwen_answer_finetuned"

# ── Training Hyperparameters by GPU Tier ──────────────────────────────────────
#
#  effective_batch = batch_size × gradient_accumulation_steps
#  All tiers target effective_batch ≈ 16 for stable training.
#
_MISTRAL_CONFIGS = {
    1: {   # RTX 2050 / 2060 / 3050  —  4–6 GB
        "num_epochs": 3, "batch_size": 1, "gradient_accumulation_steps": 16,
        "learning_rate": 2e-4, "max_seq_length": 512,
        "lora_r": 8,  "lora_alpha": 16,  "lora_dropout": 0.05,
        "gradient_checkpointing": True,
    },
    2: {   # RTX 3060 / 3070 / 2070 / 2080  —  8–12 GB
        "num_epochs": 3, "batch_size": 2, "gradient_accumulation_steps": 8,
        "learning_rate": 2e-4, "max_seq_length": 1024,
        "lora_r": 16, "lora_alpha": 32,  "lora_dropout": 0.05,
        "gradient_checkpointing": True,
    },
    3: {   # RTX 3080 / 3090 / 4070 / 4080  —  16–20 GB
        "num_epochs": 3, "batch_size": 4, "gradient_accumulation_steps": 4,
        "learning_rate": 2e-4, "max_seq_length": 2048,
        "lora_r": 32, "lora_alpha": 64,  "lora_dropout": 0.05,
        "gradient_checkpointing": False,
    },
    4: {   # RTX 4090 / 5090 / A100  —  24 GB+
        "num_epochs": 3, "batch_size": 8, "gradient_accumulation_steps": 2,
        "learning_rate": 2e-4, "max_seq_length": 4096,
        "lora_r": 64, "lora_alpha": 128, "lora_dropout": 0.05,
        "gradient_checkpointing": False,
    },
}

_QWEN_CONFIGS = {
    1: {   # RTX 2050 / 2060 / 3050  —  4–6 GB (use CPU offload for load; seq 256 to save VRAM)
        "num_epochs": 3, "batch_size": 1, "gradient_accumulation_steps": 16,
        "learning_rate": 2e-4, "max_seq_length": 256,
        "lora_r": 8,  "lora_alpha": 16,  "lora_dropout": 0.05,
        "gradient_checkpointing": True,
    },
    2: {   # RTX 3060 / 3070 / 2070 / 2080  —  8–12 GB
        "num_epochs": 3, "batch_size": 2, "gradient_accumulation_steps": 8,
        "learning_rate": 2e-4, "max_seq_length": 1024,
        "lora_r": 16, "lora_alpha": 32,  "lora_dropout": 0.05,
        "gradient_checkpointing": True,
    },
    3: {   # RTX 3080 / 3090 / 4070 / 4080  —  16–20 GB
        "num_epochs": 3, "batch_size": 4, "gradient_accumulation_steps": 4,
        "learning_rate": 2e-4, "max_seq_length": 2048,
        "lora_r": 32, "lora_alpha": 64,  "lora_dropout": 0.05,
        "gradient_checkpointing": False,
    },
    4: {   # RTX 4090 / 5090 / A100  —  24 GB+
        "num_epochs": 3, "batch_size": 8, "gradient_accumulation_steps": 2,
        "learning_rate": 2e-4, "max_seq_length": 4096,
        "lora_r": 64, "lora_alpha": 128, "lora_dropout": 0.05,
        "gradient_checkpointing": False,
    },
}

MISTRAL_CONFIG = _MISTRAL_CONFIGS[GPU_TIER]
QWEN_CONFIG    = _QWEN_CONFIGS[GPU_TIER]

# ── Quantization (4-bit NF4 via bitsandbytes) ─────────────────────────────────
QUANTIZATION_CONFIG = {
    "load_in_4bit": True,
    "bnb_4bit_quant_type": "nf4",
    "bnb_4bit_compute_dtype": torch.bfloat16 if BF16 else torch.float16,
    "bnb_4bit_use_double_quant": True,
}

# ── Optimizer ─────────────────────────────────────────────────────────────────
OPTIM      = "paged_adamw_8bit"   # memory-efficient for all tiers
DEVICE_MAP = "cuda" if CUDA_AVAILABLE else "cpu"

# ── Generation Parameters ─────────────────────────────────────────────────────
GENERATION_CONFIG = {
    "temperature": 0.7,
    "top_p": 0.95,
    "top_k": 50,
    "repetition_penalty": 1.1,
}

# ── Evaluation / Checkpoint Settings ─────────────────────────────────────────
EVAL_CONFIG = {
    "eval_steps": 50,
    "save_steps": 100,
    "logging_steps": 10,
    "save_total_limit": 3,
}

# ── W&B (optional) ────────────────────────────────────────────────────────────
USE_WANDB      = False
WANDB_PROJECT  = "legal-ai-training"
WANDB_RUN_NAME = None

# ── Data Processing ───────────────────────────────────────────────────────────
TRAIN_TEST_SPLIT    = 0.1
RANDOM_SEED         = 42
SUPPORTED_LANGUAGES = ["english", "tamil"]

# ── Inference Settings ────────────────────────────────────────────────────────
INFERENCE_CONFIG = {
    "mistral_temperature": 0.3,
    "qwen_temperature": 0.7,
    "max_new_tokens_mistral": 256,
    "max_new_tokens_qwen": 512,
}
