"""Case type classifier wrapper using BiLSTM-GRU.

This module provides a thin wrapper around `BiLSTMGRUClassifier` for
inference-time usage (e.g., classifying a legal matter as Civil,
Criminal, or Hybrid).

The actual checkpoint and vocabulary files are expected to be placed
under `backend/models/` and are loaded lazily; if they are missing,
this module degrades gracefully and returns `None` from `predict`.
"""

from __future__ import annotations

import json
import os
from typing import Dict, List, Optional

import torch

from models.bilstm_gru import BiLSTMGRUClassifier


DEFAULT_VOCAB_PATH = os.path.join(os.path.dirname(__file__), "models", "case_type_vocab.json")
DEFAULT_CKPT_PATH = os.path.join(os.path.dirname(__file__), "models", "case_type_bilstm_gru.pt")

LABELS: List[str] = ["Civil", "Criminal", "Hybrid"]


class CaseTypeClassifier:
    def __init__(
        self,
        vocab_path: str = DEFAULT_VOCAB_PATH,
        ckpt_path: str = DEFAULT_CKPT_PATH,
        embed_dim: int = 128,
        hidden_dim: int = 128,
    ) -> None:
        self.vocab_path = vocab_path
        self.ckpt_path = ckpt_path
        self.embed_dim = embed_dim
        self.hidden_dim = hidden_dim

        self.vocab: Dict[str, int] = {}
        self.pad_idx: int = 0
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model: Optional[BiLSTMGRUClassifier] = None

        try:
            self._load_resources()
        except Exception as e:
            print(f"⚠️ Warning: CaseTypeClassifier initialization failed: {e}")
            self.model = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _load_resources(self) -> None:
        if not os.path.exists(self.vocab_path) or not os.path.exists(self.ckpt_path):
            print(
                f"⚠️ CaseTypeClassifier resources not found; expected at\n"
                f"   vocab: {self.vocab_path}\n   checkpoint: {self.ckpt_path}"
            )
            return

        with open(self.vocab_path, "r", encoding="utf-8") as f:
            self.vocab = json.load(f)

        if "<pad>" not in self.vocab:
            raise ValueError("Vocabulary must contain a '<pad>' token")
        self.pad_idx = int(self.vocab["<pad>"])

        vocab_size = len(self.vocab)
        num_classes = len(LABELS)

        model = BiLSTMGRUClassifier(
            vocab_size=vocab_size,
            embed_dim=self.embed_dim,
            hidden_dim=self.hidden_dim,
            num_classes=num_classes,
            pad_idx=self.pad_idx,
        )
        state = torch.load(self.ckpt_path, map_location=self.device)
        model.load_state_dict(state)
        model.to(self.device)
        model.eval()
        self.model = model
        print("✅ CaseTypeClassifier model loaded successfully")

    def _encode_text(self, text: str) -> Optional[torch.Tensor]:
        if not self.vocab:
            return None
        tokens = text.lower().split()
        ids = [self.vocab.get(tok, self.vocab.get("<unk>", self.pad_idx)) for tok in tokens]
        if not ids:
            ids = [self.pad_idx]
        return torch.tensor([ids], dtype=torch.long, device=self.device)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def predict(self, text: str) -> Optional[Dict[str, object]]:
        """Predict case type for the given text.

        Returns a dict with `label` and `score` or None if the classifier
        is not available or an error occurs.
        """
        if not self.model:
            return None

        input_ids = self._encode_text(text)
        if input_ids is None:
            return None

        lengths = torch.tensor([input_ids.size(1)], dtype=torch.long, device=self.device)

        with torch.no_grad():
            logits = self.model(input_ids, lengths)
            probs = torch.softmax(logits, dim=-1)[0]

        idx = int(torch.argmax(probs).item())
        score = float(probs[idx].item())
        label = LABELS[idx]
        return {"label": label, "score": score}


_classifier_instance: Optional[CaseTypeClassifier] = None


def get_case_type_classifier() -> CaseTypeClassifier:
    """Get or create global CaseTypeClassifier instance."""
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = CaseTypeClassifier()
    return _classifier_instance
