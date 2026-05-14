#!/usr/bin/env python3
"""
Local faster-whisper HTTP server for Tamil/English STT. Run: python whisper_server.py

GPU on Windows with only CUDA Toolkit 13: faster-whisper/ctranslate2 still loads CUDA *12*
user-mode DLLs (e.g. cublas64_12.dll). Install the 12.x runtimes into the same venv:

  pip install nvidia-cublas-cu12 nvidia-cudnn-cu12 nvidia-cuda-runtime-cu12

If cuDNN still fails to load, add its versioned bin folder via WHISPER_EXTRA_DLL_DIRS
(see NVIDIA cuDNN zip layout, often ...\\bin\\12.x).

For reliable browser WebM, install ffmpeg and put it on PATH (used when PyAV yields empty text).

Env: WHISPER_DEVICE=cuda|cpu (default cuda), WHISPER_MODEL (e.g. tiny, base, small, medium, large-v3),
  WHISPER_COMPUTE_TYPE, WHISPER_EXTRA_DLL_DIRS (Windows ;-separated). CUDA uses the GPU; mic capture is 48 kHz in the browser (see frontend).
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path


def _register_ct2_cuda_runtime_bins() -> None:
    """Put CUDA 12 DLLs / .so on the loader path (pip nvidia-*-cu12 + optional CUDA 12 toolkit)."""
    try:
        import site

        roots = list(site.getsitepackages())
        u = site.getusersitepackages()
        if u:
            roots.append(u)
    except Exception:
        roots = []

    cand: list[Path] = []
    for base in roots:
        nvidia = Path(base) / "nvidia"
        if not nvidia.is_dir():
            continue
        try:
            for pkg in nvidia.iterdir():
                bin_dir = pkg / "bin"
                if bin_dir.is_dir():
                    cand.append(bin_dir)
        except OSError:
            pass

    if sys.platform == "win32":
        extra = os.environ.get("WHISPER_EXTRA_DLL_DIRS", "").strip()
        if extra:
            for part in extra.split(";"):
                p = Path(part.strip())
                if p.is_dir():
                    cand.append(p)
        cuda_root = Path(r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA")
        if cuda_root.is_dir():
            for child in sorted(cuda_root.glob("v12.*"), key=lambda p: p.name, reverse=True):
                b = child / "bin"
                if b.is_dir():
                    cand.append(b)
    elif sys.platform == "linux":
        for cuda_home in sorted(Path("/usr/local").glob("cuda-12*"), reverse=True):
            lib = cuda_home / "lib64"
            if lib.is_dir():
                cand.append(lib)

    seen: set[str] = set()
    ordered: list[str] = []
    for d in cand:
        try:
            s = str(d.resolve())
        except OSError:
            continue
        if s in seen:
            continue
        seen.add(s)
        if sys.platform == "win32":
            try:
                os.add_dll_directory(s)
            except (OSError, FileNotFoundError, AttributeError):
                pass
        ordered.append(s)

    if not ordered:
        return
    sep = os.pathsep
    prev = os.environ.get("PATH", "")
    os.environ["PATH"] = sep.join(ordered) + (sep + prev if prev else "")
    if sys.platform != "win32":
        ld = os.environ.get("LD_LIBRARY_PATH", "")
        os.environ["LD_LIBRARY_PATH"] = sep.join(ordered) + (sep + ld if ld else "")


_register_ct2_cuda_runtime_bins()

_whisper_device = os.environ.get("WHISPER_DEVICE", "cuda").strip().lower()
if _whisper_device not in ("cpu", "cuda"):
    _whisper_device = "cuda"
_compute_type = os.environ.get(
    "WHISPER_COMPUTE_TYPE",
    "int8" if _whisper_device == "cpu" else "float16",
).strip()

_model_id = os.environ.get("WHISPER_MODEL", "medium").strip() or "medium"

from faster_whisper import WhisperModel  # noqa: E402

try:
    model = WhisperModel(_model_id, device=_whisper_device, compute_type=_compute_type)
except RuntimeError as e:
    err = str(e).lower()
    if _whisper_device == "cuda" and any(
        x in err for x in ("cublas", "cudnn", "dll", "cuda", "load", "libcudnn")
    ):
        print(
            "\nGPU init failed. ctranslate2 expects CUDA 12 *runtime* libraries (parallel to CUDA 13 toolkit).\n"
            "Try: pip install nvidia-cublas-cu12 nvidia-cudnn-cu12 nvidia-cuda-runtime-cu12\n"
            "Or install CUDA Toolkit 12.x. Optional: WHISPER_EXTRA_DLL_DIRS for cuDNN bin paths.\n"
            f"Original error: {e}\n\nFalling back to CPU.\n",
            file=sys.stderr,
            flush=True,
        )
        _whisper_device = "cpu"
        _compute_type = "int8"
        model = WhisperModel(_model_id, device="cpu", compute_type="int8")
    else:
        raise

print(
    f"Whisper model loaded: id={_model_id}, device={_whisper_device}, compute_type={_compute_type}",
    flush=True,
)


def _parse_multipart(
    body: bytes, content_type: str
) -> tuple[dict[str, bytes], str | None]:
    """Parse multipart/form-data without stdlib cgi (removed in Python 3.13+)."""
    if "multipart/form-data" not in (content_type or "").lower():
        raise ValueError("Expected multipart/form-data")
    m = re.search(r"boundary=([^;\s]+)", content_type, re.I)
    if not m:
        raise ValueError("Missing boundary")
    boundary = m.group(1).strip().strip('"').encode("ascii")
    delim = b"--" + boundary

    fields: dict[str, bytes] = {}
    audio_filename: str | None = None
    pos = 0
    while True:
        idx = body.find(delim, pos)
        if idx == -1:
            break
        i = idx + len(delim)
        if i < len(body) and body[i : i + 2] == b"--":
            break
        if i + 1 < len(body) and body[i : i + 2] == b"\r\n":
            i += 2
        else:
            pos = i
            continue
        next_idx = body.find(delim, i)
        chunk = body[i:] if next_idx == -1 else body[i:next_idx]
        sep = chunk.find(b"\r\n\r\n")
        if sep == -1:
            pos = len(body) if next_idx == -1 else next_idx
            continue
        headers = chunk[:sep].decode("latin-1", errors="replace")
        data = chunk[sep + 4 :]
        # One CRLF before the next boundary is transport padding, not part of the field (RFC 2046).
        # Do not strip in a loop — binary payloads may legitimately end with 0x0d 0x0a.
        if data.endswith(b"\r\n"):
            data = data[:-2]

        name_m = re.search(r'name="([^"]+)"', headers, re.I)
        if not name_m:
            pos = len(body) if next_idx == -1 else next_idx
            continue
        name = name_m.group(1)
        fields[name] = data
        if name == "audio":
            fn_m = re.search(r'filename="((?:[^"\\]|\\.)*)"', headers, re.I)
            if fn_m:
                audio_filename = fn_m.group(1).replace("\\\"", '"')
            else:
                fn2 = re.search(r"filename=([^;\r\n]+)", headers, re.I)
                audio_filename = (
                    fn2.group(1).strip().strip('"') if fn2 else None
                )
        pos = len(body) if next_idx == -1 else next_idx

    return fields, audio_filename


def _normalize_language(code: str | None) -> str | None:
    if not code:
        return None
    c = code.strip().lower().replace("_", "-")
    if c.startswith("ta"):
        return "ta"
    if c.startswith("en"):
        return "en"
    return None


def _transcribe_file(path: str, lang: str | None) -> str:
    """Transcribe with conservative options; PyAV/WebM quirks handled via ffmpeg fallback outside."""
    segments, _ = model.transcribe(
        path,
        language=lang,
        vad_filter=False,
        temperature=[0.0],
        no_speech_threshold=None,
        log_prob_threshold=None,
        compression_ratio_threshold=None,
        suppress_blank=False,
        condition_on_previous_text=False,
        without_timestamps=True,
    )
    return " ".join(s.text for s in segments).strip()


def _ffmpeg_to_wav16k_mono(src: str) -> str | None:
    """Browser WebM is sometimes decoded poorly by PyAV; ffmpeg PCM is more reliable."""
    dst = src + ".16k.wav"
    try:
        subprocess.run(
            [
                "ffmpeg",
                "-nostdin",
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                src,
                "-ar",
                "16000",
                "-ac",
                "1",
                "-c:a",
                "pcm_s16le",
                dst,
            ],
            check=True,
            timeout=120,
            capture_output=True,
        )
        return dst
    except (FileNotFoundError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None


class Handler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        """Avoid 501 when the browser or a health probe opens the root URL."""
        if self.path.split("?", 1)[0].rstrip("/") in ("", "/"):
            self._json(
                200,
                {
                    "ok": True,
                    "service": "faster-whisper",
                    "model": _model_id,
                    "device": _whisper_device,
                    "usage": "POST multipart form field 'audio'",
                },
            )
            return
        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"error":"not_found"}')

    def do_HEAD(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()

    def do_POST(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError:
            length = 0
        if length <= 0:
            self._json(400, {"error": "Missing or invalid Content-Length"})
            return

        body = self.rfile.read(length)
        ctype = self.headers.get("content-type", "")

        try:
            fields, upload_name = _parse_multipart(body, ctype)
        except ValueError as e:
            self._json(400, {"error": str(e)})
            return

        audio = fields.get("audio", b"")
        if not audio:
            self._json(400, {"error": "Missing or empty audio field"})
            return

        lang_raw = fields.get("language", b"").decode("utf-8", errors="replace").strip()
        lang = _normalize_language(lang_raw)

        suffix = ".webm"
        if upload_name:
            _, ext = os.path.splitext(upload_name)
            if ext:
                suffix = ext

        tmp: str | None = None
        wav_tmp: str | None = None
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
                f.write(audio)
                tmp = f.name
            text = _transcribe_file(tmp, lang)
            if not text and suffix.lower() in (".webm", ".weba", ".mkv", ".mp4", ".m4a"):
                wav_tmp = _ffmpeg_to_wav16k_mono(tmp)
                if wav_tmp:
                    text = _transcribe_file(wav_tmp, lang)
        except Exception as e:
            self._json(500, {"error": "transcribe_failed", "detail": str(e)[:500]})
            return
        finally:
            for p in (wav_tmp, tmp):
                if p and os.path.isfile(p):
                    try:
                        os.unlink(p)
                    except OSError:
                        pass

        self._json(200, {"text": text})

    def _json(self, status: int, payload: dict) -> None:
        raw = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def log_message(self, *args: object) -> None:
        pass


if __name__ == "__main__":
    host = os.environ.get("WHISPER_BIND", "127.0.0.1").strip() or "127.0.0.1"
    port = int(os.environ.get("WHISPER_PORT", "9000") or "9000")
    print(f"Whisper server listening on http://{host}:{port}", flush=True)
    HTTPServer((host, port), Handler).serve_forever()
