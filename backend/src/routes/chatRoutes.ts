/**
 * Chat Routes
 * Defines routes for chat/legal assistant functionality
 */

import { Router } from 'express';
import { chat, streamChat, nluLegal } from '../controllers/chatController';
import { searchLimiter } from '../middleware/rateLimiter';

const router = Router();

// Streaming chat endpoint
router.post('/stream', searchLimiter, streamChat);

// Non-streaming chat endpoint
router.post('/', searchLimiter, chat);

// NLU-legal endpoint (for compatibility with frontend)
router.post('/nlu-legal', searchLimiter, nluLegal);

export default router;

