"""
CSV + Hugging Face Dataset Loader for Legal AI Training
========================================================
Loads:
  1. W:\\Project\\backend\\database\\data\\Constitution Of India.csv
  2. Hugging Face dataset: afkdark/Constitution_of_India

Converts both into instruction/input/output dicts compatible with
train_mistral.py (keyword extraction) and train_qwen.py (answer generation).

Usage:
    from train_csv_loader import load_all_csv_and_hf_records_mistral
    from train_csv_loader import load_all_csv_and_hf_records_qwen
"""

from __future__ import annotations

import csv
import os
import re
import textwrap
from pathlib import Path
from typing import Any, Dict, List, Optional

# ── Default CSV path (relative to this file or absolute) ─────────────────────
_THIS_DIR  = Path(__file__).parent
_CSV_PATHS = [
    _THIS_DIR.parent / "database" / "data" / "Constitution Of India.csv",   # backend/database/data
    _THIS_DIR / "training_data" / "Constitution Of India.csv",               # model_training/training_data
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _find_csv() -> Optional[Path]:
    for p in _CSV_PATHS:
        if p.exists():
            return p
    # Last-resort: env override
    env = os.environ.get("CONSTITUTION_CSV_PATH", "")
    if env and Path(env).exists():
        return Path(env)
    return None


def _clean(text: str) -> str:
    """Strip extra whitespace and normalise newlines."""
    return re.sub(r"\s+", " ", text).strip()


def _chunk_article(text: str, max_chars: int = 800) -> List[str]:
    """Split long article text into overlapping ~max_chars chunks."""
    if len(text) <= max_chars:
        return [text]
    sentences  = re.split(r"(?<=[.;])\s+", text)
    chunks: List[str] = []
    buf = ""
    for s in sentences:
        if len(buf) + len(s) + 1 > max_chars and buf:
            chunks.append(buf.strip())
            # 20 % overlap — keep last sentence in the buffer
            buf = s
        else:
            buf = buf + " " + s if buf else s
    if buf:
        chunks.append(buf.strip())
    return chunks or [text]


def _extract_article_number(text: str) -> str:
    """Try to pull 'Article 21' or '21.' style reference from the start of text."""
    m = re.match(r"^(\d+[A-Z]?)[.\s]", text.strip())
    if m:
        return f"Article {m.group(1)}"
    m2 = re.match(r"^Article\s+(\d+[A-Z]?)", text.strip(), re.I)
    if m2:
        return f"Article {m2.group(1)}"
    return "Constitutional Provision"


# ── CSV → Records ─────────────────────────────────────────────────────────────

def load_csv_rows() -> List[str]:
    """
    Read the CSV and return a list of article text strings.
    The CSV has a single column 'Articles' with multi-line cells.
    """
    csv_path = _find_csv()
    if csv_path is None:
        print(
            "⚠  Constitution CSV not found. Searched:\n"
            + "\n".join(f"    {p}" for p in _CSV_PATHS)
            + "\n  Set CONSTITUTION_CSV_PATH=/path/to/file.csv to override."
        )
        return []

    rows: List[str] = []
    with open(csv_path, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Column is 'Articles'; fall back to first column value
            text = row.get("Articles") or next(iter(row.values()), "")
            text = _clean(text)
            if text:
                rows.append(text)

    print(f"📄 Loaded CSV: {csv_path.name}  ({len(rows)} article rows)")
    return rows


def csv_rows_to_mistral_keyword_records(rows: List[str]) -> List[Dict[str, Any]]:
    """
    Convert CSV article rows into keyword-extraction training records
    for Mistral fine-tuning.

    Each row produces one or more records:
      - instruction: "Extract legal keywords …"
      - input: article chunk
      - output: {"source", "language", "category", "keywords", "article_ref"}
    """
    records: List[Dict[str, Any]] = []
    source = "Constitution of India (CSV)"

    legal_stopwords = {
        "the", "a", "an", "of", "in", "to", "and", "or", "is", "are", "be",
        "by", "with", "for", "that", "this", "such", "may", "shall", "as",
        "its", "any", "all", "has", "have", "their", "from", "on", "at",
    }

    for row_text in rows:
        article_ref = _extract_article_number(row_text)
        for chunk in _chunk_article(row_text):
            # Simple keyword heuristic: capitalised words + legal nouns
            words    = re.findall(r"\b[A-Za-z][a-z]{2,}\b", chunk)
            keywords = list(
                dict.fromkeys(
                    w for w in words
                    if w.lower() not in legal_stopwords and len(w) > 3
                )
            )[:15]

            if not keywords:
                continue

            records.append(
                {
                    "instruction": (
                        "Extract legal keywords and identify the constitutional article "
                        "from the following legal text:"
                    ),
                    "input": chunk,
                    "output": {
                        "source": source,
                        "language": "english",
                        "category": "Constitutional Law",
                        "keywords": keywords,
                        "article_ref": article_ref,
                    },
                }
            )

    print(f"  ↳ Mistral CSV records: {len(records)}")
    return records


def csv_rows_to_qwen_answer_records(rows: List[str]) -> List[Dict[str, Any]]:
    """
    Convert CSV article rows into QA answer-generation training records
    for Qwen fine-tuning.

    Produces a synthetic Q&A pair for each article:
      - question: "What does <Article N> of the Constitution state?"
      - answer:   the article text (trimmed to 600 chars)
    """
    records: List[Dict[str, Any]] = []

    for row_text in rows:
        article_ref = _extract_article_number(row_text)
        answer      = row_text[:600]  # keep answers concise for seq-len budgets

        records.append(
            {
                "instruction": (
                    "Provide accurate legal guidance based on Indian Constitutional Law."
                ),
                "input": {
                    "question": f"What does {article_ref} of the Constitution of India state?",
                    "context":  "Constitution of India (CSV dataset)",
                    "category": "Constitutional Law",
                },
                "output": answer,
            }
        )

    print(f"  ↳ Qwen CSV records: {len(records)}")
    return records


# ── HF dataset  →  Records ────────────────────────────────────────────────────

def load_hf_rows() -> List[Dict[str, Any]]:
    """
    Load afkdark/Constitution_of_India from Hugging Face.
    Returns a list of dicts with keys: question, answer.
    """
    try:
        from datasets import load_dataset  # noqa: PLC0415
        ds = load_dataset("afkdark/Constitution_of_India", split="train")
        rows = [dict(r) for r in ds]
        print(f"📚 HF dataset loaded: afkdark/Constitution_of_India  ({len(rows)} rows)")
        return rows
    except Exception as exc:
        print(f"⚠  Could not load HF dataset (offline?): {exc}")
        return []


def hf_rows_to_mistral_keyword_records(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """HF Q&A → Mistral keyword-extraction records."""
    records: List[Dict[str, Any]] = []
    source = "Constitution of India (HF Q&A)"

    legal_stopwords = {
        "the", "a", "an", "of", "in", "to", "and", "or", "is", "are",
        "be", "by", "with", "for", "that", "this", "such", "may", "shall",
    }

    for row in rows:
        answer = _clean(row.get("answer") or "")
        question = _clean(row.get("question") or "")
        body = answer or question
        if not body:
            continue

        words    = re.findall(r"\b[A-Za-z][a-z]{2,}\b", body)
        keywords = list(
            dict.fromkeys(
                w for w in words if w.lower() not in legal_stopwords and len(w) > 3
            )
        )[:15]

        if not keywords:
            continue

        records.append(
            {
                "instruction": (
                    "Extract legal keywords and identify the constitutional article "
                    "from the following legal text:"
                ),
                "input": body[:800],
                "output": {
                    "source": source,
                    "language": "english",
                    "category": "Constitutional Law",
                    "keywords": keywords,
                    "article_ref": "HF Q&A",
                },
            }
        )

    print(f"  ↳ Mistral HF records: {len(records)}")
    return records


def hf_rows_to_qwen_answer_records(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """HF Q&A → Qwen answer-generation records."""
    records: List[Dict[str, Any]] = []
    for row in rows:
        q = _clean(row.get("question") or "")
        a = _clean(row.get("answer") or "")
        if not q or not a:
            continue
        records.append(
            {
                "instruction": "Provide accurate legal guidance based on Indian Constitutional Law.",
                "input": {
                    "question": q,
                    "context":  "Constitution of India (Hugging Face Q&A)",
                    "category": "Constitutional Law",
                },
                "output": a,
            }
        )

    print(f"  ↳ Qwen HF records: {len(records)}")
    return records


# ── Combined loaders (used by train_mistral.py / train_qwen.py) ───────────────

def load_all_csv_and_hf_records_mistral() -> List[Dict[str, Any]]:
    """
    Return combined Mistral keyword-extraction records from:
      • Constitution Of India.csv
      • afkdark/Constitution_of_India (HF)

    Call this from train_mistral.py::load_data() to merge into training data.
    """
    csv_rows = load_csv_rows()
    hf_rows  = load_hf_rows()

    records  = csv_rows_to_mistral_keyword_records(csv_rows)
    records += hf_rows_to_mistral_keyword_records(hf_rows)

    print(f"✅ Total Mistral extra records (CSV + HF): {len(records)}")
    return records


def load_all_csv_and_hf_records_qwen() -> List[Dict[str, Any]]:
    """
    Return combined Qwen answer-generation records from:
      • Constitution Of India.csv
      • afkdark/Constitution_of_India (HF)

    Call this from train_qwen.py::load_data() to merge into training data.
    """
    csv_rows = load_csv_rows()
    hf_rows  = load_hf_rows()

    records  = csv_rows_to_qwen_answer_records(csv_rows)
    records += hf_rows_to_qwen_answer_records(hf_rows)

    print(f"✅ Total Qwen extra records (CSV + HF): {len(records)}")
    return records


# ── CLI quick test ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("=" * 60)
    print("CSV + HF Dataset Loader — Quick Test")
    print("=" * 60)

    m_records = load_all_csv_and_hf_records_mistral()
    q_records = load_all_csv_and_hf_records_qwen()

    if m_records:
        print("\n── Sample Mistral record ──")
        import json
        print(json.dumps(m_records[0], indent=2, ensure_ascii=False))

    if q_records:
        print("\n── Sample Qwen record ──")
        import json
        print(json.dumps(q_records[0], indent=2, ensure_ascii=False))
