# 🚀 Quick Reference — Legal AI Training

## Step-by-Step

### 1. Navigate to training folder
```bash
cd "D:\VS code codes\project\backend\model_training"
```

### 2. Install PyTorch with CUDA
```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
```

### 3. Install requirements
```bash
pip install -r requirements.txt
```

### 4. Prepare data
```bash
python prepare_data.py
```

### 5. Train Mistral (keyword extraction)
```bash
python train_mistral.py
```

### 6. Train Qwen (answer generation)
```bash
python train_qwen.py
```

### 7. Test pipeline
```bash
python inference_pipeline.py
```

### 8. Evaluate
```bash
python evaluate.py
```

---

## 🖥 GPU Compatibility (Auto-Detected)

| Tier | GPU | VRAM | Mistral | Qwen | Seq Len |
|------|-----|------|---------|------|---------|
| 1 | RTX 2050 / 2060 / 3050 | 4–6 GB | Mistral-3B | Qwen2.5-1.5B | 512 |
| 2 | RTX 3060 / 3070 / 2070 / 2080 | 8–12 GB | Mistral-7B | Qwen2.5-3B | 1024 |
| 3 | RTX 3080 / 3090 / 4070 / 4080 | 16–20 GB | Mistral-7B | Qwen2.5-7B | 2048 |
| 4 | RTX 4090 / 5090 / A100 | 24 GB+ | Mistral-7B | Qwen2.5-7B | 4096 |

No manual config needed — the right settings apply automatically at startup.

---

## 📊 Check GPU is Being Used (Not CPU)

### Option 1 — Live nvidia-smi (best)
```bash
# Open a second terminal while training runs
nvidia-smi -l 1
```
✅ Healthy: `GPU-Util` > 50%, `Used Memory` growing after model load
❌ Problem: `GPU-Util` = 0% → training fell back to CPU

### Option 2 — Python one-liner
```bash
python -c "import torch; print(f'Allocated: {torch.cuda.memory_allocated(0)/1024**3:.2f} GB / {torch.cuda.get_device_properties(0).total_memory/1024**3:.1f} GB')"
```

### Option 3 — Built-in VRAM report (printed automatically during training)
Each training script prints VRAM at every key step:
```
  [before model load] GPU VRAM — allocated: 0.00 GB  |  reserved: 0.00 GB  |  free: 4.00 GB
  [after model load]  GPU VRAM — allocated: 2.31 GB  |  reserved: 2.50 GB  |  free: 1.50 GB
  [training start]    GPU VRAM — allocated: 3.10 GB  |  reserved: 3.40 GB  |  free: 0.60 GB
```
If `allocated` stays at 0.00 GB after model load → GPU is not being used.

---

## 📊 Monitor Training Progress

### TensorBoard (loss curves)
```bash
tensorboard --logdir=./models/mistral_keyword_finetuned/runs
# open http://localhost:6006
```

---

## ⏱ Training Time Reference

| GPU | Tier | Mistral | Qwen | Total |
|-----|------|---------|------|-------|
| RTX 2050 / 3050 | 1 | 6–10 hrs | 4–7 hrs | 10–17 hrs |
| RTX 3060 / 3070 | 2 | 3–5 hrs | 2–3.5 hrs | 5–8.5 hrs |
| RTX 3080 / 4070 | 3 | 1.5–3 hrs | 1–2 hrs | 2.5–5 hrs |
| RTX 4090 / 5090 | 4 | 45–90 min | 30–60 min | 1.5–2.5 hrs |

---

## 📁 File Locations

```
model_training/
├── training_data/
│   ├── mistral_keyword_extraction.json
│   ├── qwen_answer_generation.json
│   └── conversational_data.json
├── models/
│   ├── mistral_keyword_finetuned/
│   └── qwen_answer_finetuned/
├── inference_results.json
└── evaluation_results.json
```

---

## 🔧 Quick Fixes

| Problem | Fix |
|---------|-----|
| Training on CPU (GPU-Util = 0%) | Reinstall PyTorch: `pip install torch --index-url https://download.pytorch.org/whl/cu121` |
| CUDA out of memory | Reduce `max_seq_length` to 256 in `config.py` |
| Training too slow | Normal for Tier 1 — check GPU-Util is > 0% with `nvidia-smi` |
| Poor results | Set `num_epochs=5`, `lora_r=32` in `config.py` |
| Tamil text missing | Run `ocr_tamil_pdf.py` from `backend/` folder |
| Crash / interrupted | Add `resume_from_checkpoint=True` to `trainer.train()` |

---

## ✅ Pre-flight Checklist

- [ ] NVIDIA GPU with CUDA support (RTX 2050 or newer)
- [ ] 60 GB+ free disk space
- [ ] Python 3.8+ installed
- [ ] CUDA toolkit installed and matching PyTorch build
- [ ] `pip install torch --index-url https://download.pytorch.org/whl/cu121` done
- [ ] `pip install -r requirements.txt` done
- [ ] `constitution_english.pdf` present in `../database/data/`
- [ ] `constitution_tamil_unicode.txt` present in `../database/data/`
- [ ] `Central Acts/` folder populated with sub-category PDFs

---

**Need more detail?** See `TRAINING_GUIDE.md`
