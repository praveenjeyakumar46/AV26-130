# 📊 Visual Overview - Legal AI Training System

## 🗂️ Complete File Structure

```
D:\VS code codes\project\backend\
│
├── database/
│   └── data/
│       ├── COI.json              ← Indian Constitution (JSON)
│       └── Final_IC.csv          ← Indian Constitution (CSV)
│
└── model_training/               ← YOU ARE HERE
    │
    ├── 📄 Core Scripts
    │   ├── prepare_data.py       ← 1️⃣ START HERE - Prepares training data
    │   ├── train_mistral.py      ← 2️⃣ Trains keyword extraction
    │   ├── train_llama.py        ← 3️⃣ Trains answer generation
    │   ├── inference_pipeline.py ← 4️⃣ Tests both models together
    │   └── evaluate.py           ← 5️⃣ Measures performance
    │
    ├── ⚙️ Configuration
    │   ├── config.py             ← Central settings
    │   ├── requirements.txt      ← Python dependencies
    │   ├── run_training.bat      ← Windows one-click trainer
    │   └── run_training.sh       ← Linux/Mac one-click trainer
    │
    ├── 📚 Documentation
    │   ├── README.md             ← Overview & quick start
    │   ├── SUMMARY.md            ← This complete summary
    │   ├── TRAINING_GUIDE.md     ← Detailed step-by-step guide
    │   └── QUICK_REFERENCE.md    ← Command cheat sheet
    │
    ├── 📊 Generated During Training
    │   ├── training_data/        ← Created by prepare_data.py
    │   │   ├── mistral_keyword_extraction.json
    │   │   ├── llama_answer_generation.json
    │   │   └── conversational_data.json
    │   │
    │   ├── models/               ← Created by training scripts
    │   │   ├── mistral_keyword_finetuned/
    │   │   │   ├── adapter_config.json
    │   │   │   ├── adapter_model.bin
    │   │   │   ├── tokenizer files...
    │   │   │   └── runs/ (TensorBoard logs)
    │   │   │
    │   │   └── llama_answer_finetuned/
    │   │       ├── adapter_config.json
    │   │       ├── adapter_model.bin
    │   │       ├── tokenizer files...
    │   │       └── runs/ (TensorBoard logs)
    │   │
    │   ├── inference_results.json    ← Test outputs
    │   └── evaluation_results.json   ← Performance metrics
    │
    └── .gitignore                ← Prevents committing large files
```

## 🔄 Training Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         TRAINING WORKFLOW                        │
└─────────────────────────────────────────────────────────────────┘

Step 1: DATA PREPARATION (2-5 minutes)
┌──────────────────────────────────────┐
│  python prepare_data.py              │
│                                      │
│  Input:                              │
│  └─ ../database/data/COI.json       │
│  └─ ../database/data/Final_IC.csv   │
│                                      │
│  Output:                             │
│  └─ training_data/                   │
│     ├─ mistral_keyword_*.json       │
│     ├─ llama_answer_*.json          │
│     └─ conversational_*.json        │
└──────────────────────────────────────┘
                  ↓
Step 2: TRAIN MISTRAL (1-4 hours)
┌──────────────────────────────────────┐
│  python train_mistral.py             │
│                                      │
│  What it learns:                     │
│  ✓ Extract legal keywords           │
│  ✓ Identify article numbers         │
│  ✓ Understand query intent          │
│  ✓ Map questions to articles        │
│                                      │
│  Output:                             │
│  └─ models/mistral_keyword_finetuned/│
└──────────────────────────────────────┘
                  ↓
Step 3: TRAIN LLAMA (1.5-5 hours)
┌──────────────────────────────────────┐
│  python train_llama.py               │
│                                      │
│  What it learns:                     │
│  ✓ Generate legal explanations      │
│  ✓ Provide structured guidance      │
│  ✓ Cite articles accurately         │
│  ✓ Format professional answers      │
│                                      │
│  Output:                             │
│  └─ models/llama_answer_finetuned/  │
└──────────────────────────────────────┘
                  ↓
Step 4: TEST PIPELINE (1-2 minutes)
┌──────────────────────────────────────┐
│  python inference_pipeline.py        │
│                                      │
│  Tests:                              │
│  ✓ Sample user queries               │
│  ✓ Keyword extraction                │
│  ✓ Answer generation                 │
│  ✓ End-to-end workflow              │
│                                      │
│  Output:                             │
│  └─ inference_results.json          │
└──────────────────────────────────────┘
                  ↓
Step 5: EVALUATE (2-5 minutes)
┌──────────────────────────────────────┐
│  python evaluate.py                  │
│                                      │
│  Measures:                           │
│  ✓ Keyword accuracy                  │
│  ✓ Answer quality                    │
│  ✓ Overall performance               │
│                                      │
│  Output:                             │
│  └─ evaluation_results.json         │
└──────────────────────────────────────┘
```

## 🎯 User Query Processing Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRODUCTION INFERENCE FLOW                     │
└─────────────────────────────────────────────────────────────────┘

User Query: "What is the Right to Equality?"
                    ↓
┌───────────────────────────────────────────────────────────────┐
│  MISTRAL MODEL (Keyword Extraction)                           │
├───────────────────────────────────────────────────────────────┤
│  Input Processing:                                            │
│  • Tokenizes user query                                       │
│  • Analyzes legal context                                     │
│  • Identifies key concepts                                    │
│                                                               │
│  Output:                                                      │
│  {                                                            │
│    "article_number": "14",                                    │
│    "article_name": "Equality before law",                     │
│    "keywords": ["equality", "discrimination", "state"],       │
│    "context": "Fundamental Rights",                           │
│    "query_type": "definition",                                │
│    "requires_detailed_explanation": true                      │
│  }                                                            │
└───────────────────────────────────────────────────────────────┘
                    ↓
┌───────────────────────────────────────────────────────────────┐
│  LLAMA MODEL (Answer Generation)                              │
├───────────────────────────────────────────────────────────────┤
│  Input:                                                       │
│  • Original query                                             │
│  • Extracted keywords                                         │
│  • Article context                                            │
│                                                               │
│  Processing:                                                  │
│  • Retrieves relevant legal knowledge                         │
│  • Structures comprehensive answer                            │
│  • Adds legal guidance                                        │
│  • Formats with citations                                     │
│                                                               │
│  Output:                                                      │
│  "**Article 14: Equality before law**                         │
│                                                               │
│   Article 14 of the Indian Constitution guarantees equality   │
│   before law and equal protection of laws to all persons      │
│   within the territory of India. This means:                  │
│                                                               │
│   1. The State cannot discriminate against any citizen        │
│   2. Everyone is equal before the law                         │
│   3. Similar cases must be treated similarly                  │
│                                                               │
│   **Legal Guidance:**                                         │
│   This is a fundamental right enforceable in courts. If you   │
│   believe you've faced discrimination, you can approach the   │
│   Supreme Court under Article 32 or High Court under         │
│   Article 226."                                               │
└───────────────────────────────────────────────────────────────┘
                    ↓
        Final Answer Delivered to User
```

## 📊 Model Architecture Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                      MISTRAL vs LLAMA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MISTRAL 7B (Keyword Extraction)                                │
│  ┌────────────────────────────────────────────────────┐        │
│  │  Base Parameters: 7 Billion                         │        │
│  │  LoRA Rank: 16                                      │        │
│  │  Trainable Params: ~84M (1.16%)                     │        │
│  │  Memory (4-bit): ~7GB                               │        │
│  │  Training Time: 1-4 hours                           │        │
│  │  Specialty: Fast, accurate keyword extraction       │        │
│  │  Output: Structured JSON with keywords & context    │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                  │
│  LLAMA 3.2 3B (Answer Generation)                               │
│  ┌────────────────────────────────────────────────────┐        │
│  │  Base Parameters: 3 Billion                         │        │
│  │  LoRA Rank: 32                                      │        │
│  │  Trainable Params: ~168M (5.22%)                    │        │
│  │  Memory (4-bit): ~3GB                               │        │
│  │  Training Time: 1.5-5 hours                         │        │
│  │  Specialty: Detailed, accurate legal answers        │        │
│  │  Output: Comprehensive formatted text               │        │
│  └────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## 🎓 Training Progress Visualization

```
┌─────────────────────────────────────────────────────────────────┐
│                     TYPICAL TRAINING PROGRESS                    │
└─────────────────────────────────────────────────────────────────┘

Training Loss Over Time (Epochs 1-3)
│
│ Loss
│ 3.0 │ ●
│     │  ●
│ 2.5 │   ●
│     │    ●
│ 2.0 │     ●●
│     │       ●●
│ 1.5 │         ●●
│     │           ●●●
│ 1.0 │              ●●●
│     │                 ●●●
│ 0.5 │                    ●●●●●●
│     │                          ●●●●●●●
│ 0.0 └─────────────────────────────────────────→ Steps
      Start    Epoch 1    Epoch 2    Epoch 3

✓ Good Training: Loss decreases steadily
✗ Overfitting: Loss increases after decreasing
✗ Not Learning: Loss stays flat
```

## 💾 Storage Requirements

```
┌─────────────────────────────────────────────────────────────────┐
│                      DISK SPACE NEEDED                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Initial Setup:                                                  │
│  ├─ Python packages         ~2-3 GB                             │
│  ├─ Base Mistral model      ~14 GB (downloaded if not local)    │
│  └─ Base Llama model        ~6 GB (downloaded if not local)     │
│                                                                  │
│  Training Data:                                                  │
│  ├─ Source data             ~500 KB                             │
│  ├─ Processed datasets      ~5-10 MB                            │
│  └─ Training cache          ~1-2 GB                             │
│                                                                  │
│  Model Outputs:                                                  │
│  ├─ Mistral LoRA adapters   ~200-300 MB                         │
│  ├─ Llama LoRA adapters     ~300-500 MB                         │
│  ├─ TensorBoard logs        ~100-500 MB                         │
│  └─ Checkpoints             ~1-2 GB                             │
│                                                                  │
│  TOTAL REQUIRED: ~50-75 GB                                       │
│  RECOMMENDED: 100 GB free space                                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## ⏱️ Time Estimates by Hardware

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRAINING TIME BREAKDOWN                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  RTX 3060 (12GB VRAM):                                          │
│  ├─ Data Preparation:   ~3 minutes                              │
│  ├─ Mistral Training:   3-4 hours                               │
│  ├─ Llama Training:     4-5 hours                               │
│  ├─ Testing:            1-2 minutes                              │
│  └─ Evaluation:         2-5 minutes                              │
│  TOTAL: ~7-9 hours                                               │
│                                                                  │
│  RTX 4090 (24GB VRAM):                                          │
│  ├─ Data Preparation:   ~2 minutes                              │
│  ├─ Mistral Training:   1-2 hours                               │
│  ├─ Llama Training:     1.5-2.5 hours                           │
│  ├─ Testing:            1 minute                                 │
│  └─ Evaluation:         2 minutes                                │
│  TOTAL: ~2.5-4.5 hours                                           │
│                                                                  │
│  A100 (40GB VRAM):                                              │
│  ├─ Data Preparation:   ~2 minutes                              │
│  ├─ Mistral Training:   45-60 minutes                           │
│  ├─ Llama Training:     1-1.5 hours                             │
│  ├─ Testing:            30 seconds                               │
│  └─ Evaluation:         1-2 minutes                              │
│  TOTAL: ~1.75-2.5 hours                                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 📈 Expected Performance Metrics

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERFORMANCE BENCHMARKS                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Mistral (Keyword Extraction):                                  │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Article Identification:    ████████████░ 85-95%  │          │
│  │  Keyword Precision:         ████████░░░░ 75-85%  │          │
│  │  Keyword Recall:            ████████░░░░ 70-80%  │          │
│  │  F1 Score:                  ████████░░░░ 75-82%  │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  Llama (Answer Generation):                                     │
│  ┌──────────────────────────────────────────────────┐          │
│  │  Answer Completeness:       █████████░░░ 80-90%  │          │
│  │  Legal Accuracy:            ██████████░░ 85-95%  │          │
│  │  Relevance:                 █████████░░░ 88-93%  │          │
│  │  Overall Quality:           █████████░░░ 80-90%  │          │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
│  Combined System:                                                │
│  ┌──────────────────────────────────────────────────┐          │
│  │  End-to-End Accuracy:       █████████░░░ 82-87%  │          │
│  │  User Satisfaction:         ████████░░░░ 4.0-4.5/5 │        │
│  └──────────────────────────────────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🎯 Quick Command Reference

```
┌─────────────────────────────────────────────────────────────────┐
│                      MOST USED COMMANDS                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  One-Click Training (Windows):                                   │
│  └─ run_training.bat                                            │
│                                                                  │
│  One-Click Training (Linux/Mac):                                 │
│  └─ ./run_training.sh                                           │
│                                                                  │
│  Manual Training:                                                │
│  ├─ python prepare_data.py         (Step 1)                     │
│  ├─ python train_mistral.py        (Step 2)                     │
│  ├─ python train_llama.py          (Step 3)                     │
│  ├─ python inference_pipeline.py   (Step 4)                     │
│  └─ python evaluate.py             (Step 5)                     │
│                                                                  │
│  Monitoring:                                                     │
│  ├─ nvidia-smi -l 1                (Watch GPU)                  │
│  └─ tensorboard --logdir=models/   (View metrics)               │
│                                                                  │
│  Testing Single Model:                                           │
│  └─ python -c "from inference_pipeline import *; ..."           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Getting Started Checklist

```
□ Step 1: Navigate to model_training directory
□ Step 2: Read SUMMARY.md (you are here!)
□ Step 3: Check hardware requirements
□ Step 4: Install Python dependencies
□ Step 5: Run prepare_data.py
□ Step 6: Start Mistral training
□ Step 7: Start Llama training
□ Step 8: Test inference pipeline
□ Step 9: Evaluate performance
□ Step 10: Integrate with backend
```

---

**Ready to start?** Run `run_training.bat` (Windows) or `./run_training.sh` (Linux/Mac)

**Need help?** Check `TRAINING_GUIDE.md` for detailed instructions

**Quick reference?** See `QUICK_REFERENCE.md` for commands
