"""LegalBERT-based embedding service for semantic search.

Provides a singleton SentenceTransformer model that can be used across
modules (e.g., csv_knowledge_base_optimized, legal_section_matcher).
"""

from typing import List

import numpy as np
from sentence_transformers import SentenceTransformer

# Default LegalBERT model; can be swapped to a fine-tuned checkpoint if available.
# Example alternatives:
# - "nlpaueb/legal-bert-base-uncased"
# - a local/finetuned model path
DEFAULT_LEGAL_MODEL_NAME = "nlpaueb/legal-bert-base-uncased"


class LegalEmbeddingModel:
    """Wrapper around a SentenceTransformer model for legal-domain embeddings."""

    def __init__(self, model_name: str = DEFAULT_LEGAL_MODEL_NAME) -> None:
        self.model_name = model_name
        try:
            print(f"🔄 Loading LegalBERT embedding model: {model_name} ...")
            self.model = SentenceTransformer(model_name)
            print("✅ LegalBERT embedding model loaded successfully")
        except Exception as e:
            # Fail gracefully so the rest of the app can still run.
            print(f"⚠️ Warning: could not load LegalBERT embedding model '{model_name}': {e}")
            self.model = None

    def encode(self, texts: List[str]) -> np.ndarray:
        """Encode a list of texts into embeddings.

        Returns an (N, D) float32 numpy array. If the model is unavailable,
        returns an empty array.
        """

        if not self.model:
            return np.zeros((0, 0), dtype=np.float32)

        if not texts:
            return np.zeros((0, self.model.get_sentence_embedding_dimension()), dtype=np.float32)

        embs = self.model.encode(
            texts,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return embs.astype(np.float32)


# Simple singleton accessor to avoid reloading the model multiple times.
_embedding_instance: LegalEmbeddingModel | None = None


def get_embedding_model(model_name: str = DEFAULT_LEGAL_MODEL_NAME) -> LegalEmbeddingModel:
    global _embedding_instance
    if _embedding_instance is None:
        _embedding_instance = LegalEmbeddingModel(model_name=model_name)
    return _embedding_instance
