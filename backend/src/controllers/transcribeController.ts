/**
 * Transcribe Controller
 * Proxies audio uploads to the local faster-whisper Python server (whisper_server.py).
 *
 * Flow:
 *   Browser  →  POST /api/transcribe  (multipart, field: "audio")
 *            →  Node.js proxy         (this file)
 *            →  Python FastAPI        (http://127.0.0.1:9000/api/transcribe)
 *            ←  { text: "..." }
 */

import { Request, Response } from 'express';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import logger from '../config/logger';
import { env } from '../config/env';

/* ── multer: keep audio in memory (max 25 MB) ── */
const storage = multer.memoryStorage();
export const audioUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      'audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg',
      'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/flac',
      'application/octet-stream', // some browsers send this for webm
    ];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    }
  },
});

/* ── controller ── */
export async function transcribeAudio(req: Request, res: Response): Promise<void> {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, error: 'No audio file uploaded (field name: audio)' });
      return;
    }

    const language = (req.body?.language as string | undefined) || undefined;
    const whisperUrl = env.WHISPER_URL.replace(/\/$/, '');

    // Forward to Python whisper server
    const form = new FormData();
    form.append('audio', file.buffer, {
      filename: file.originalname || 'recording.webm',
      contentType: file.mimetype || 'audio/webm',
    });
    if (language) form.append('language', language);

    const whisperRes = await axios.post(`${whisperUrl}/api/transcribe`, form, {
      headers: form.getHeaders(),
      timeout: 120_000, // first run may download model weights
      maxContentLength: 50 * 1024 * 1024,
    });

    const text: string = whisperRes.data?.text ?? '';
    logger.info(`[transcribe] OK – ${text.length} chars, lang=${language || 'auto'}`);

    res.json({ success: true, text });
  } catch (err: any) {
    const detail =
      err?.response?.data?.detail ||
      err?.response?.data?.error ||
      err?.message ||
      'Unknown error';

    if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
      logger.error('[transcribe] Whisper server not reachable:', detail);
      res.status(503).json({
        success: false,
        error: 'Speech-to-text server is offline. Start whisper_server.py and try again.',
      });
      return;
    }

    logger.error('[transcribe] Error:', detail);
    res.status(500).json({ success: false, error: `Transcription failed: ${detail}` });
  }
}
