# Model Training — Dual-Persona Pipeline

Two-model fine-tuning setup for a website serving **Common People** and **Students**.

## Architecture

```
User Query
    |
    v
[Mistral-7B]  — Input Handler
    |           Detects persona, topic, rewrites query -> JSON
    v
[Qwen2.5-7B] — Answer Generator
    |           Generates persona-calibrated answer
    v
Response
```

## Files

| File | Purpose |
|---|---|
| `setup_env.py` | UTF-8 fix — import FIRST in every script |
| `training_data.py` | 26 QA pairs x 2 personas = 52 training examples |
| `train_mistral.py` | Fine-tune Mistral as input handler / router |
| `train_qwen.py` | Fine-tune Qwen2.5-7B as answer generator |
| `inference_pipeline.py` | Run both models end-to-end |
| `run_train_mistral.bat` | Windows launcher for Mistral training |
| `run_train_qwen.bat` | Windows launcher for Qwen training |
| `run_inference.bat` | Windows launcher for interactive chat |
| `requirements.txt` | Python dependencies |

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Train (use .bat files on Windows)
run_train_mistral.bat
run_train_qwen.bat

# 3. Run
run_inference.bat

# Or with arguments
python inference_pipeline.py --query "what is DNA?"
python inference_pipeline.py --query "Explain CRISPR mechanisms" --persona student
```

## Personas

**Common People** — Simple language, analogies, relatable examples, warm tone.  
**Students** — Technical depth, correct terminology, frameworks, citations.

## Topics Covered

science, math, health, technology, history, finance, career, general
