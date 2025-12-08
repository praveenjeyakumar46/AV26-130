"""BiLSTM-GRU text classifier for legal tasks (e.g., case type).

This module defines the neural architecture only; training and checkpoint
management are handled elsewhere.
"""

from typing import Tuple

import torch
import torch.nn as nn


class BiLSTMGRUClassifier(nn.Module):
    """BiLSTM + GRU based sequence classifier.

    Architecture: Embedding -> BiLSTM -> BiGRU -> Dropout -> Linear.
    """

    def __init__(
        self,
        vocab_size: int,
        embed_dim: int,
        hidden_dim: int,
        num_classes: int,
        pad_idx: int,
    ) -> None:
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=pad_idx)
        self.bilstm = nn.LSTM(
            embed_dim,
            hidden_dim,
            num_layers=1,
            batch_first=True,
            bidirectional=True,
        )
        self.bigru = nn.GRU(
            2 * hidden_dim,
            hidden_dim,
            num_layers=1,
            batch_first=True,
            bidirectional=True,
        )
        self.dropout = nn.Dropout(0.3)
        self.fc = nn.Linear(2 * hidden_dim, num_classes)

    def forward(self, input_ids: torch.Tensor, lengths: torch.Tensor) -> torch.Tensor:
        """Forward pass.

        Args:
            input_ids: LongTensor of shape (B, T)
            lengths: LongTensor of shape (B,) with actual sequence lengths
        Returns:
            logits: FloatTensor of shape (B, num_classes)
        """
        embedded = self.embedding(input_ids)  # (B, T, E)

        packed = nn.utils.rnn.pack_padded_sequence(
            embedded,
            lengths.cpu(),
            batch_first=True,
            enforce_sorted=False,
        )
        lstm_out, _ = self.bilstm(packed)
        gru_out, _ = self.bigru(lstm_out)
        out, _ = nn.utils.rnn.pad_packed_sequence(gru_out, batch_first=True)

        # Gather last valid timestep for each sequence
        batch_indices = torch.arange(out.size(0), device=out.device)
        last_indices = lengths - 1
        last_hidden = out[batch_indices, last_indices]  # (B, 2H)

        logits = self.fc(self.dropout(last_hidden))
        return logits
