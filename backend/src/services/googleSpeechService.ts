/**
 * Google Cloud Speech-to-Text (REST) — optional engine for POST /api/transcribe.
 * Enable Speech-to-Text API in GCP, create an API key (or use OAuth); set env below.
 */

import logger from '../config/logger';
import { env } from '../config/env';

const RECOGNIZE_URL = 'https://speech.googleapis.com/v1/speech:recognize';

function languageCode(lang?: 'en' | 'ta'): string {
  if (lang === 'ta') return 'ta-IN';
  if (lang === 'en') return 'en-IN';
  return 'en-IN';
}

/** Map browser / upload mime to Speech API encoding + sample rate. */
function audioConfig(
  mimeType: string
): { encoding: string; sampleRateHertz: number } | null {
  const m = (mimeType || '').toLowerCase();
  const hz = env.GOOGLE_SPEECH_SAMPLE_RATE_HZ;
  if (m.includes('webm')) return { encoding: 'WEBM_OPUS', sampleRateHertz: hz };
  if (m.includes('ogg')) return { encoding: 'OGG_OPUS', sampleRateHertz: hz };
  if (m.includes('flac')) return { encoding: 'FLAC', sampleRateHertz: hz };
  if (m.includes('wav') && m.includes('pcm')) return { encoding: 'LINEAR16', sampleRateHertz: hz };
  if (m.includes('wav')) return { encoding: 'LINEAR16', sampleRateHertz: hz };
  if (m.includes('mpeg') || m.includes('mp3')) return { encoding: 'MP3', sampleRateHertz: 44100 };
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return { encoding: 'MP3', sampleRateHertz: 44100 };
  return null;
}

export function isGoogleSpeechConfigured(): boolean {
  return Boolean(env.GOOGLE_SPEECH_ENABLED && env.GOOGLE_SPEECH_API_KEY?.trim());
}

/**
 * Transcribe with Google Cloud Speech-to-Text (sync recognize, &lt; ~1 min clips).
 */
export async function transcribeWithGoogleSpeech(
  audioBuffer: Buffer,
  mimeType: string,
  language?: 'en' | 'ta'
): Promise<string> {
  const key = env.GOOGLE_SPEECH_API_KEY?.trim();
  if (!key) throw new Error('GOOGLE_SPEECH_NOT_CONFIGURED');

  const cfg = audioConfig(mimeType);
  if (!cfg) {
    throw new Error(`GOOGLE_SPEECH_UNSUPPORTED_MIME:${mimeType || 'unknown'}`);
  }

  const config: Record<string, unknown> = {
    encoding: cfg.encoding,
    sampleRateHertz: cfg.sampleRateHertz,
    languageCode: languageCode(language),
    enableAutomaticPunctuation: true,
    model: env.GOOGLE_SPEECH_MODEL,
  };
  if (env.GOOGLE_SPEECH_USE_ENHANCED === true) {
    config.useEnhanced = true;
  }

  const body = {
    config,
    audio: {
      content: audioBuffer.toString('base64'),
    },
  };

  const url = `${RECOGNIZE_URL}?key=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  const raw = await res.text();
  if (!res.ok) {
    logger.warn('Google Speech API error', { status: res.status, body: raw.slice(0, 800) });
    throw new Error(`GOOGLE_SPEECH_HTTP_${res.status}`);
  }

  let parsed: {
    results?: { alternatives?: { transcript?: string }[] }[];
    error?: { message?: string; code?: number };
  };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    throw new Error('GOOGLE_SPEECH_BAD_JSON');
  }

  if (parsed.error?.message) {
    logger.warn('Google Speech API error object', parsed.error);
    throw new Error(`GOOGLE_SPEECH_API:${parsed.error.message}`);
  }

  const parts: string[] = [];
  for (const r of parsed.results ?? []) {
    const t = r.alternatives?.[0]?.transcript?.trim();
    if (t) parts.push(t);
  }
  const text = parts.join(' ').trim();
  if (!text) throw new Error('GOOGLE_SPEECH_EMPTY');
  return text;
}
