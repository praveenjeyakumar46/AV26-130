"""
Data Preparation Script for Legal AI Training

Reads:
  - constitution_english.pdf  (Indian Constitution – English)
  - constitution_tamil.pdf    (Indian Constitution – Tamil)
  - Central Acts/            (all sub-category PDFs – Tamil & English)

Produces three JSON datasets in ./training_data/ :
  - mistral_keyword_extraction.json   (for Mistral fine-tuning)
  - qwen_answer_generation.json       (for Qwen fine-tuning)
  - conversational_data.json          (supplementary bilingual Q&A)
"""

import os
import json
import random
from pathlib import Path
from typing import List, Dict, Tuple

import pdfplumber          # pip install pdfplumber

from sft_example_builders import (
    build_answer_examples,
    build_keyword_examples,
    chunk_text,
    detect_language,
)


# ── helpers ──────────────────────────────────────────────────────────────────

def extract_text_from_pdf(pdf_path: str) -> str:
    """Return all text from a PDF as a single string."""
    text_parts = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t:
                    text_parts.append(t)
    except Exception as e:
        print(f"  ⚠  Could not read {pdf_path}: {e}")
    return "\n".join(text_parts)


def collect_central_act_pdfs(acts_root: str) -> List[Tuple[str, str]]:
    """
    Walk all sub-folders under acts_root and return (pdf_path, category) pairs.
    """
    results = []
    root = Path(acts_root)
    if not root.exists():
        print(f"  ⚠  Central Acts directory not found: {acts_root}")
        return results
    for category_dir in sorted(root.iterdir()):
        if category_dir.is_dir():
            category = category_dir.name
            for pdf_file in sorted(category_dir.glob("*.pdf")):
                results.append((str(pdf_file), category))
    return results


def build_conversational_examples(language: str) -> List[Dict]:
    """Static bilingual conversational seed examples."""
    if language == "english":
        return [
            {
                "instruction": "Provide clear legal guidance for this question:",
                "input": "What are fundamental rights in India?",
                "output": (
                    "Fundamental rights are enshrined in Part III (Articles 12–35) of the "
                    "Indian Constitution. They include the right to equality (Art. 14–18), "
                    "right to freedom (Art. 19–22), right against exploitation (Art. 23–24), "
                    "right to freedom of religion (Art. 25–28), cultural and educational rights "
                    "(Art. 29–30), and right to constitutional remedies (Art. 32). These rights "
                    "are judicially enforceable; you may approach the Supreme Court under "
                    "Article 32 or a High Court under Article 226 if they are violated."
                ),
            },
            {
                "instruction": "Provide clear legal guidance for this question:",
                "input": "Can the government acquire my property?",
                "output": (
                    "Under Article 300A, no person shall be deprived of their property save by "
                    "authority of law. The government may acquire private property for public "
                    "purpose under the Right to Fair Compensation and Transparency in Land "
                    "Acquisition, Rehabilitation and Resettlement Act, 2013, which requires "
                    "fair compensation and, in many cases, the consent of affected families."
                ),
            },
            {
                "instruction": "Provide clear legal guidance for this question:",
                "input": "What is the right to equality under Indian Constitution?",
                "output": (
                    "Articles 14–18 guarantee the right to equality. Article 14 ensures equality "
                    "before the law and equal protection of laws. Article 15 prohibits "
                    "discrimination on grounds of religion, race, caste, sex, or place of birth. "
                    "Article 16 guarantees equal opportunity in public employment. Article 17 "
                    "abolishes untouchability. Article 18 abolishes titles (except military or "
                    "academic distinctions)."
                ),
            },
        ]
    else:  # tamil
        return [
            {
                "instruction": "இந்தக் கேள்விக்கு தெளிவான சட்ட வழிகாட்டுதலை வழங்கவும்:",
                "input": "இந்தியாவில் அடிப்படை உரிமைகள் என்னென்ன?",
                "output": (
                    "இந்திய அரசியலமைப்பின் பகுதி III (சட்டப்பிரிவுகள் 12–35) அடிப்படை உரிமைகளை "
                    "வரையறுக்கிறது. இவை சமத்துவ உரிமை (சட்டப்பிரிவு 14–18), சுதந்திர உரிமை "
                    "(சட்டப்பிரிவு 19–22), சுரண்டலுக்கு எதிரான உரிமை (சட்டப்பிரிவு 23–24), "
                    "மதச் சுதந்திர உரிமை (சட்டப்பிரிவு 25–28), கலாசார மற்றும் கல்வி உரிமைகள் "
                    "(சட்டப்பிரிவு 29–30), மற்றும் அரசியலமைப்பு தீர்வு உரிமை (சட்டப்பிரிவு 32) "
                    "ஆகியவற்றை உள்ளடக்கியது."
                ),
            },
            {
                "instruction": "இந்தக் கேள்விக்கு தெளிவான சட்ட வழிகாட்டுதலை வழங்கவும்:",
                "input": "திருமண சட்டங்கள் என்னென்ன?",
                "output": (
                    "இந்தியாவில் திருமணம் பல்வேறு தனிப்பட்ட சட்டங்களால் நிர்வகிக்கப்படுகிறது. "
                    "இந்து திருமண சட்டம் 1955, சிறப்பு திருமண சட்டம் 1954, முஸ்லிம் தனிப்பட்ட "
                    "சட்டம் (ஷரியத்) பயன்பாட்டு சட்டம் 1937, மற்றும் கிறிஸ்தவ திருமண சட்டம் "
                    "1872 ஆகியவை முக்கியமான திருமண சட்டங்கள் ஆகும்."
                ),
            },
        ]


# ── main orchestrator ─────────────────────────────────────────────────────────

class LegalDataPreparator:
    def __init__(
        self,
        constitution_en_pdf: str,
        constitution_ta_pdf: str,
        central_acts_dir: str,
    ):
        self.constitution_en_pdf = constitution_en_pdf
        self.constitution_ta_pdf = constitution_ta_pdf
        self.central_acts_dir = central_acts_dir

    def run(self, output_dir: str):
        os.makedirs(output_dir, exist_ok=True)

        keyword_dataset: List[Dict] = []
        answer_dataset:  List[Dict] = []

        # ── 1. Constitution (English) ─────────────────────────────────────────
        print("📖 Reading Constitution (English)...")
        en_text = extract_text_from_pdf(self.constitution_en_pdf)
        if en_text:
            for chunk in chunk_text(en_text):
                keyword_dataset += build_keyword_examples(chunk, "Indian Constitution", "english")
                answer_dataset  += build_answer_examples(chunk, "Indian Constitution", "english")
            print(f"   ✅ {len(chunk_text(en_text))} chunks extracted")
        else:
            print("   ⚠  No text extracted — check if the PDF is text-based.")

        # ── 2. Constitution (Tamil) ───────────────────────────────────────────
        print("📖 Reading Constitution (Tamil)...")
        # Prefer the pre-OCR'd Unicode text file if available (fixes VANAVIL legacy encoding)
        tamil_txt_path = self.constitution_ta_pdf.replace(".pdf", "_unicode.txt")
        if os.path.exists(tamil_txt_path):
            print(f"   ℹ  Using Unicode text file: {tamil_txt_path}")
            with open(tamil_txt_path, encoding="utf-8") as f:
                ta_text = f.read()
        else:
            ta_text = extract_text_from_pdf(self.constitution_ta_pdf)
        if ta_text:
            for chunk in chunk_text(ta_text):
                keyword_dataset += build_keyword_examples(chunk, "Indian Constitution", "tamil")
                answer_dataset  += build_answer_examples(chunk, "Indian Constitution", "tamil")
            print(f"   ✅ {len(chunk_text(ta_text))} chunks extracted")
        else:
            print("   ⚠  No text extracted from Tamil PDF — check if it is text-based.")

        # ── 3. Central Acts (all categories) ─────────────────────────────────
        act_pdfs = collect_central_act_pdfs(self.central_acts_dir)
        print(f"\n📂 Found {len(act_pdfs)} Central Act PDFs across all categories")

        for pdf_path, category in act_pdfs:
            act_name = Path(pdf_path).stem
            print(f"   📄 {category} / {act_name}")
            raw = extract_text_from_pdf(pdf_path)
            if not raw:
                continue
            lang = detect_language(raw)
            for chunk in chunk_text(raw):
                keyword_dataset += build_keyword_examples(chunk, act_name, lang, category)
                answer_dataset  += build_answer_examples(chunk, act_name, lang, category)

        # ── 4. Hugging Face Constitution Q&A (optional — for offline training, set
        #     SKIP_HF_CONSTITUTION=1 when running train_* if you enable this)
        if os.environ.get("PREPARE_INCLUDE_HF_CONSTITUTION", "").strip().lower() in (
            "1",
            "true",
            "yes",
        ):
            from hf_constitution_data import (
                load_hf_mistral_keyword_records,
                load_hf_qwen_answer_records,
            )

            k_extra = load_hf_mistral_keyword_records()
            a_extra = load_hf_qwen_answer_records()
            keyword_dataset.extend(k_extra)
            answer_dataset.extend(a_extra)
            print(
                f"\n📚 Hugging Face Constitution Q&A baked into JSON: "
                f"+{len(k_extra)} keyword | +{len(a_extra)} answer examples"
            )

        # ── 5. Conversational seed data ───────────────────────────────────────
        conversational_dataset = (
            build_conversational_examples("english")
            + build_conversational_examples("tamil")
        )

        # ── 6. Shuffle & save ─────────────────────────────────────────────────
        random.seed(42)
        random.shuffle(keyword_dataset)
        random.shuffle(answer_dataset)

        def _save(data, filename):
            path = os.path.join(output_dir, filename)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print(f"   💾 {filename}  ({len(data)} examples)")

        print("\n📦 Saving datasets...")
        _save(keyword_dataset,       "mistral_keyword_extraction.json")
        _save(answer_dataset,        "qwen_answer_generation.json")
        _save(conversational_dataset,"conversational_data.json")

        print(
            f"\n✅ Done! "
            f"{len(keyword_dataset)} keyword examples | "
            f"{len(answer_dataset)} answer examples | "
            f"{len(conversational_dataset)} conversational examples"
        )
        print(f"📁 All saved to: {output_dir}")


if __name__ == "__main__":
    from config import (
        CONSTITUTION_ENGLISH_PDF,
        CONSTITUTION_TAMIL_PDF,
        CENTRAL_ACTS_DIR,
        TRAINING_DATA_DIR,
    )

    preparator = LegalDataPreparator(
        constitution_en_pdf=CONSTITUTION_ENGLISH_PDF,
        constitution_ta_pdf=CONSTITUTION_TAMIL_PDF,
        central_acts_dir=CENTRAL_ACTS_DIR,
    )
    preparator.run(output_dir=TRAINING_DATA_DIR)
