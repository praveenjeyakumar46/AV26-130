"""Long-document summarization using Longformer Encoder-Decoder (LED).

This module provides a simple wrapper around `allenai/led-base-16384`
for summarizing long legal documents, with a singleton accessor.
"""

from typing import Optional

import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


LED_MODEL_NAME = "allenai/led-base-16384"


class LongformerSummarizer:
    """Summarizer for long legal texts using Longformer Encoder-Decoder."""

    def __init__(self, model_name: str = LED_MODEL_NAME, device: Optional[str] = None) -> None:
        self.model_name = model_name
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        try:
            print(f"🔄 Loading Longformer Encoder-Decoder model: {model_name} ...")
            self.tokenizer = AutoTokenizer.from_pretrained(model_name)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(self.device)
            print("✅ Longformer Encoder-Decoder loaded successfully")
        except Exception as e:
            print(f"⚠️ Warning: could not load Longformer Encoder-Decoder '{model_name}': {e}")
            self.tokenizer = None
            self.model = None

    def summarize(self, text: str, max_new_tokens: int = 512) -> str:
        """Summarize the given text.

        If the model is unavailable, returns a simple truncated fallback.
        """
        text = (text or "").strip()
        if not text:
            return ""

        if not self.model or not self.tokenizer:
            # Fallback: naive truncation summary
            return text[:500] + ("..." if len(text) > 500 else "")

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=16000,  # LED can handle long contexts
        ).to(self.device)

        # Global attention on first token (standard LED pattern)
        global_attention_mask = torch.zeros_like(inputs["input_ids"])
        global_attention_mask[:, 0] = 1

        with torch.no_grad():
            summary_ids = self.model.generate(
                **inputs,
                global_attention_mask=global_attention_mask,
                max_new_tokens=max_new_tokens,
                num_beams=4,
                length_penalty=1.0,
            )

        return self.tokenizer.decode(summary_ids[0], skip_special_tokens=True).strip()


_summarizer_instance: Optional[LongformerSummarizer] = None


def get_long_summarizer() -> LongformerSummarizer:
    """Get or create the global LongformerSummarizer instance."""
    global _summarizer_instance
    if _summarizer_instance is None:
        _summarizer_instance = LongformerSummarizer()
    return _summarizer_instance
