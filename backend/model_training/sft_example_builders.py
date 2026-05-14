"""
Shared SFT example builders (no PDF deps) - used by prepare_data.py and hf_constitution_data.py.
"""

from __future__ import annotations

import re
from typing import Dict, List


def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    """Split text into overlapping word-chunks for manageable sequence lengths."""
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def detect_language(text: str) -> str:
    """
    Rough heuristic: if the text contains Tamil Unicode characters it is Tamil,
    otherwise assume English.
    """
    tamil_range = re.compile(r"[\u0B80-\u0BFF]")
    return "tamil" if tamil_range.search(text) else "english"


LEGAL_TERMS_EN = [
    "right",
    "freedom",
    "fundamental",
    "duty",
    "parliament",
    "state",
    "union",
    "citizen",
    "territory",
    "law",
    "constitution",
    "amendment",
    "provision",
    "clause",
    "schedule",
    "justice",
    "liberty",
    "equality",
    "fraternity",
    "sovereignty",
    "republic",
    "article",
    "act",
    "section",
    "property",
    "marriage",
    "labour",
    "taxation",
    "criminal",
    "welfare",
]

LEGAL_TERMS_TA = [
    "?????",
    "??????",
    "????????????",
    "????????????",
    "????????",
    "??????????",
    "????",
    "?????????",
    "???????",
    "????",
    "??????????",
    "????????",
    "????",
    "?????????",
    "????",
]


def extract_keywords_from_chunk(chunk: str, language: str) -> List[str]:
    terms = LEGAL_TERMS_TA if language == "tamil" else LEGAL_TERMS_EN
    lower = chunk.lower()
    return list({t for t in terms if t in lower})


def build_keyword_examples(
    chunk: str, source_name: str, language: str, category: str = "Constitutional Law"
) -> List[Dict]:
    """Create Mistral keyword-extraction training pairs from one text chunk."""
    keywords = extract_keywords_from_chunk(chunk, language)
    examples = []

    examples.append(
        {
            "instruction": (
                "Extract legal keywords and context from the following legal text:"
                if language == "english"
                else "???? ???? ???? ????????????? ??????? ??????? ??????? ????? ??????????:"
            ),
            "input": chunk,
            "output": {
                "source": source_name,
                "language": language,
                "category": category,
                "keywords": keywords,
                "relevance": (
                    "Fundamental Rights"
                    if any(
                        w in chunk.lower()
                        for w in ["right", "freedom", "fundamental", "?????"]
                    )
                    else "Legal Provision"
                ),
            },
        }
    )

    if language == "english":
        snippet = chunk[:120].strip().replace("\n", " ")
        for query in [
            f"What legal rights are described in: {snippet}",
            f"Identify the key legal concepts in: {snippet}",
        ]:
            examples.append(
                {
                    "instruction": "Identify relevant legal concepts from this query:",
                    "input": query,
                    "output": {
                        "source": source_name,
                        "language": "english",
                        "category": category,
                        "keywords": keywords[:6],
                        "query_type": "keyword_lookup",
                    },
                }
            )

    return examples


def build_answer_examples(
    chunk: str, source_name: str, language: str, category: str = "Constitutional Law"
) -> List[Dict]:
    """Create Qwen answer-generation training pairs from one text chunk."""
    examples = []
    snippet = chunk[:120].strip().replace("\n", " ")

    if language == "english":
        templates = [
            f"What does this legal provision say? {snippet}",
            f"Explain the following in simple terms: {snippet}",
            f"What are the rights or duties described in: {snippet}",
        ]
        sys_note = "Provide accurate legal guidance based on Indian law."
    else:
        templates = [
            f"???? ???? ???? ???? ?????????? {snippet}",
            f"??? ???????? ??????????: {snippet}",
        ]
        sys_note = "?????? ?????????? ??? ?????????? ???? ???????????? ?????????."

    for q in templates:
        examples.append(
            {
                "instruction": sys_note,
                "input": {"question": q, "context": source_name, "category": category},
                "output": (
                    f"**Source:** {source_name}\n**Category:** {category}\n\n{chunk}"
                ),
            }
        )

    return examples
