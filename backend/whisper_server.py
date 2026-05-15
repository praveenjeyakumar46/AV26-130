#!/usr/bin/env python3
"""
Faster-Whisper Speech-to-Text server for the Legal AI project.
Adapted from whispher/backend/main.py.

Run: python whisper_server.py
Default port: 9000 (set via PORT env var)

GPU note – ctranslate2 expects CUDA 12 runtime DLLs:
  pip install nvidia-cublas-cu12 nvidia-cudnn-cu12 nvidia-cuda-runtime-cu12
Fall back to CPU automatically if GPU init fails.

Env vars:
  WHISPER_DEVICE      cuda | cpu  (default: cpu for safety)
  WHISPER_MODEL       base | small | medium | large-v3  (default: base)
  WHISPER_COMPUTE_TYPE  int8 | float16 | float32
  PORT                HTTP port (default: 9000)
"""

from __future__ import annotations

import os
import shutil
import subprocess
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

try:
    from faster_whisper import WhisperModel
except Exception as e:
    raise RuntimeError(
        "faster-whisper not installed. Run: pip install faster-whisper"
    ) from e


# ── Paths ──────────────────────────────────────────────────────────────────
ROOT    = Path(__file__).resolve().parent          # backend/
TMP_DIR = ROOT / "uploads" / "whisper_tmp"
TMP_DIR.mkdir(parents=True, exist_ok=True)


# ── Model (lazy-loaded on first request) ───────────────────────────────────
_DEVICE       = os.environ.get("WHISPER_DEVICE", "cpu").strip().lower()
_MODEL_ID     = os.environ.get("WHISPER_MODEL", "base").strip() or "base"
_COMPUTE_TYPE = os.environ.get(
    "WHISPER_COMPUTE_TYPE",
    "int8" if _DEVICE == "cpu" else "float16",
).strip()

_model: Optional[WhisperModel] = None


def get_model() -> WhisperModel:
    global _model, _DEVICE, _COMPUTE_TYPE
    if _model is None:
        try:
            _model = WhisperModel(_MODEL_ID, device=_DEVICE, compute_type=_COMPUTE_TYPE)
        except RuntimeError as e:
            if _DEVICE == "cuda":
                print(f"[whisper] GPU init failed ({e}). Falling back to CPU.", flush=True)
                _DEVICE       = "cpu"
                _COMPUTE_TYPE = "int8"
                _model = WhisperModel(_MODEL_ID, device="cpu", compute_type="int8")
            else:
                raise
        print(
            f"[whisper] Model ready: {_MODEL_ID} | device={_DEVICE} | compute={_COMPUTE_TYPE}",
            flush=True,
        )
    return _model


# ── FFmpeg helper ──────────────────────────────────────────────────────────
def _to_wav_16k_mono(input_path: Path, out_path: Path) -> None:
    ffmpeg = os.environ.get("FFMPEG_PATH", "ffmpeg")
    cmd = [ffmpeg, "-y", "-i", str(input_path), "-ac", "1", "-ar", "16000", str(out_path)]
    try:
        subprocess.run(cmd, check=True, capture_output=True, timeout=120)
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail="FFmpeg not found. Install FFmpeg and add it to PATH.",
        )
    except subprocess.CalledProcessError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Audio conversion failed: {exc.stderr.decode('utf-8', 'ignore')[:300]}",
        )


def _transcribe(wav_path: Path, language: Optional[str]) -> str:
    model = get_model()
    segments, _ = model.transcribe(
        str(wav_path),
        language=language or None,
        vad_filter=True,
        temperature=[0.0],
        without_timestamps=True,
    )
    return "".join(seg.text for seg in segments).strip()


# ── FastAPI app ────────────────────────────────────────────────────────────
app = FastAPI(title="Legal AI – Whisper STT", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"ok": True, "model": _MODEL_ID, "device": _DEVICE}


@app.post("/api/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
    language: Optional[str] = Form(default=None),
):
    job_id   = uuid.uuid4().hex
    raw_path = TMP_DIR / f"{job_id}_{audio.filename or 'audio'}"
    wav_path = TMP_DIR / f"{job_id}.wav"

    # Save upload
    with raw_path.open("wb") as f:
        shutil.copyfileobj(audio.file, f)

    try:
        _to_wav_16k_mono(raw_path, wav_path)
        text = _transcribe(wav_path, language)
    finally:
        for p in (raw_path, wav_path):
            try:
                p.unlink(missing_ok=True)
            except Exception:
                pass

    return {"text": text}


# ── Entry point ────────────────────────────────────────────────────────────
def main():
    import uvicorn
    port = int(os.environ.get("PORT", "9000"))
    print(f"[whisper] Listening on http://127.0.0.1:{port}", flush=True)
    uvicorn.run(app, host="127.0.0.1", port=port)


if __name__ == "__main__":
    main()
