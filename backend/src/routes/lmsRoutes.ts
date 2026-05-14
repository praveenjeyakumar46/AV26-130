/**
 * LMS Routes — LexLearn Pro
 * AI Tutor endpoint for the Legal LMS RAG chatbot.
 * POST /api/lms/chat  { system: string, messages: {role, content}[] }
 */

import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { env } from '../config/env';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

const router = Router();

/** Resolve the /law books/ folder relative to project root */
const LAW_BOOKS_DIR = path.resolve(process.cwd(), '..', 'law books');

/**
 * GET /api/lms/books
 * Returns list of available renamed law book PDFs
 */
router.get('/books', (_req: Request, res: Response) => {
  try {
    const files = fs.existsSync(LAW_BOOKS_DIR)
      ? fs.readdirSync(LAW_BOOKS_DIR).filter(f => f.endsWith('.pdf'))
      : [];
    res.json({ success: true, books: files });
  } catch (err) {
    logger.error('Failed to list law books', err);
    res.status(500).json({ success: false, error: 'Could not list law books' });
  }
});

/**
 * GET /api/lms/books/:filename
 * Streams a law book PDF to the client
 */
router.get('/books/:filename', (req: Request, res: Response) => {
  const filename = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(LAW_BOOKS_DIR, filename);
  if (!fs.existsSync(filePath) || !filename.endsWith('.pdf')) {
    return res.status(404).json({ success: false, error: 'Book not found' });
  }
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  fs.createReadStream(filePath).pipe(res);
});

/**
 * POST /api/lms/chat
 * Accepts a system prompt + message history and returns an AI reply.
 * Uses the Anthropic API (claude-sonnet-4-20250514) if ANTHROPIC_API_KEY is set,
 * otherwise falls back to the project's Ollama chat service.
 */
router.post(
  '/chat',
  asyncHandler(async (req: Request, res: Response) => {
    const { system, messages } = req.body as {
      system?: string;
      messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ success: false, error: 'messages array is required' });
    }

    // ── Option A: Anthropic API ────────────────────────────────────────────
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (anthropicKey) {
      try {
        const payload: Record<string, unknown> = {
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
        };
        if (system) payload.system = system;

        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(payload),
        });

        if (!resp.ok) {
          const err = await resp.text();
          logger.error(`Anthropic API error ${resp.status}: ${err}`);
          throw new Error(`Anthropic API error: ${resp.status}`);
        }

        const data = await resp.json() as {
          content: Array<{ type: string; text: string }>;
        };
        const reply = data.content?.find(c => c.type === 'text')?.text ?? '';
        return res.json({ success: true, reply });
      } catch (err) {
        logger.error('LMS Anthropic call failed, trying Ollama fallback', err);
      }
    }

    // ── Option B: Ollama fallback ──────────────────────────────────────────
    try {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const model     = process.env.OLLAMA_MODEL || 'llama3';

      // Build a single prompt string from the conversation
      const systemBlock = system ? `System: ${system}\n\n` : '';
      const historyBlock = messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      const prompt = `${systemBlock}${historyBlock}\nAssistant:`;

      const resp = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt, stream: false }),
      });

      if (!resp.ok) throw new Error(`Ollama error: ${resp.status}`);

      const data = await resp.json() as { response: string };
      return res.json({ success: true, reply: data.response ?? '' });
    } catch (err) {
      logger.error('LMS Ollama fallback failed', err);
      return res.status(503).json({
        success: false,
        error: 'AI service unavailable. Set ANTHROPIC_API_KEY or start Ollama.',
      });
    }
  }),
);

export default router;
