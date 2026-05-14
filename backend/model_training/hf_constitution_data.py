"""
Hugging Face: afkdark/Constitution_of_India -> Mistral / Qwen training records.

Schema: question, answer (933 train rows). Converted to the same dict shapes as
prepare_data.py (instruction / input / output).

Offline / deduplication: train_mistral.py and train_qwen.py merge this dataset by
default. If you bake it into JSON with PREPARE_INCLUDE_HF_CONSTITUTION=1, set
SKIP_HF_CONSTITUTION=1 when training to avoid loading it twice.
"""

from __future__ import annotations

from typing import Any, Dict, List

from datasets import load_dataset

from config import CONSTITUTION_HF_DATASET_ID
from sft_example_builders import (
    build_keyword_examples,
    chunk_text,
    detect_language,
    extract_keywords_from_chunk,
)


def _load_hf_split(split: str = "train") -> List[Dict[str, Any]]:
    ds = load_dataset(CONSTITUTION_HF_DATASET_ID, split=split)
    return [dict(row) for row in ds]


def hf_rows_to_mistral_keyword_records(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Keyword-extraction examples from Constitution Q&A (chunked answers + query rows)."""
    out: List[Dict[str, Any]] = []
    source = "Constitution of India (HF Q&A)"

    for row in rows:
        q = (row.get("question") or "").strip()
        a = (row.get("answer") or "").strip()
        if not a and not q:
            continue
        body = a if a else q
        lang = detect_language(body + " " + q)
        for chunk in chunk_text(body):
            out.extend(build_keyword_examples(chunk, source, lang))

        if lang == "english" and q and a:
            kws = extract_keywords_from_chunk(a, "english")
            out.append(
                {
                    "instruction": "Identify relevant legal concepts from this query:",
                    "input": q,
                    "output": {
                        "source": source,
                        "language": "english",
                        "category": "Constitutional Law",
                        "keywords": kws[:12],
                        "query_type": "constitution_hf_qa",
                    },
                }
            )

    return out


def hf_rows_to_qwen_answer_records(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Answer-generation examples: one row per HF Q&A pair."""
    out: List[Dict[str, Any]] = []
    for row in rows:
        q = (row.get("question") or "").strip()
        a = (row.get("answer") or "").strip()
        if not q or not a:
            continue
        lang = detect_language(q + " " + a)
        sys_note = (
            "Provide accurate legal guidance based on Indian law."
            if lang == "english"
            else "?????? ?????????? ??? ?????????? ???? ???????????? ?????????."
        )
        out.append(
            {
                "instruction": sys_note,
                "input": {
                    "question": q,
                    "context": "Constitution of India (Hugging Face Q&A)",
                    "category": "Constitutional Law",
                },
                "output": a,
            }
        )
    return out


def load_hf_mistral_keyword_records() -> List[Dict[str, Any]]:
    return hf_rows_to_mistral_keyword_records(_load_hf_split("train"))


def load_hf_qwen_answer_records() -> List[Dict[str, Any]]:
    return hf_rows_to_qwen_answer_records(_load_hf_split("train"))
