"""
setup_env.py — MUST be imported FIRST before any trl/transformers imports.
Fixes Windows cp1252 UnicodeDecodeError when TRL reads deepseekv3.jinja.
"""

import os
import sys

# ── Fix 1: Force UTF-8 for all file I/O (mirrors PYTHONUTF8=1) ──────────────
os.environ["PYTHONUTF8"] = "1"

# ── Fix 2: Reconfigure stdout/stderr to UTF-8 (safe on all Python 3.7+) ─────
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Fix 3: Monkey-patch pathlib.Path.read_text default encoding ──────────────
#    TRL calls  (_CHAT_TEMPLATES_DIR / "deepseekv3.jinja").read_text()
#    without an encoding argument, which on Windows defaults to cp1252.
import pathlib

_original_read_text = pathlib.Path.read_text

def _utf8_read_text(self, encoding=None, errors=None, newline=None):
    if encoding is None:
        encoding = "utf-8"
    if errors is None:
        errors = "replace"
    return _original_read_text(self, encoding=encoding, errors=errors, newline=newline)

pathlib.Path.read_text = _utf8_read_text

print("[setup_env] UTF-8 encoding fix applied — safe to import trl now.")
