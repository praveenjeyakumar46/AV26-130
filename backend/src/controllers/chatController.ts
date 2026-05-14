/**
 * Chat Controller
 * Handles chat-related HTTP requests
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { processChatMessage, processChatMessageStream } from '../services/chatService';
import logger from '../config/logger';
import { checkOllamaHealth } from '../services/ollamaService';
import { env } from '../config/env';

function getOllamaUnavailableMessage() {
  return (
    `Ollama service is not available at ${env.OLLAMA_BASE_URL}. ` +
    `Start Ollama or set OLLAMA_BASE_URL, then ensure models are pulled: ` +
    `${env.OLLAMA_MODEL} and ${env.OLLAMA_MISTRAL_MODEL}.`
  );
}

/**
 * POST /api/chat/stream
 * Stream chat response with legal analysis
 */
export const streamChat = asyncHandler(async (req: Request, res: Response) => {
  const { text, is_first_input, conversation_history, document_id, language = 'en' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Text is required',
    });
  }

  // Validate conversation history format if provided
  let conversationHistory: Array<{ role: 'user' | 'bot'; content: string }> | undefined;
  if (conversation_history && Array.isArray(conversation_history)) {
    conversationHistory = conversation_history
      .filter((msg: any) => msg && msg.role && msg.content)
      .slice(-10) // Limit to last 10 messages
      .map((msg: any) => ({
        role: msg.role === 'user' || msg.role === 'bot' ? msg.role : 'user',
        content: String(msg.content || '').substring(0, 2000), // Limit content length
      }));
  }

  // Check Ollama health
  const ollamaHealthy = await checkOllamaHealth();
  if (!ollamaHealthy) {
    return res.status(503).json({
      success: false,
      error: getOllamaUnavailableMessage(),
    });
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  try {
    const isFirstInput = Boolean(is_first_input);
    logger.info(`Processing chat stream request: "${text.substring(0, 50)}..."`);

    // Process chat message with streaming
    let chunkCount = 0;
    for await (const chunk of processChatMessageStream(text, isFirstInput, conversationHistory, document_id, language)) {
      if (req.aborted) {
        logger.info('Request aborted by client');
        break;
      }

      chunkCount++;
      const data = JSON.stringify(chunk);
      res.write(`data: ${data}\n\n`);

      // Log chunk types for debugging
      if (chunk.type === 'chunk' && chunkCount % 10 === 0) {
        logger.debug(`Streamed ${chunkCount} chunks so far`);
      }

      // Flush the response
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    }

    logger.info(`Stream completed. Total chunks: ${chunkCount}`);
    res.end();
  } catch (error) {
    logger.error('Error in streamChat:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      });
    } else {
      const errorData = JSON.stringify({
        type: 'error',
        content: error instanceof Error ? error.message : 'Internal server error',
      });
      res.write(`data: ${errorData}\n\n`);
      res.end();
    }
  }
});

/**
 * POST /api/chat
 * Non-streaming chat endpoint
 */
export const chat = asyncHandler(async (req: Request, res: Response) => {
  const { text, is_first_input, conversation_history, document_id } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Text is required',
    });
  }

  // Validate conversation history format if provided
  let conversationHistory: Array<{ role: 'user' | 'bot'; content: string }> | undefined;
  if (conversation_history && Array.isArray(conversation_history)) {
    conversationHistory = conversation_history
      .filter((msg: any) => msg && msg.role && msg.content)
      .slice(-10) // Limit to last 10 messages
      .map((msg: any) => ({
        role: msg.role === 'user' || msg.role === 'bot' ? msg.role : 'user',
        content: String(msg.content || '').substring(0, 2000), // Limit content length
      }));
  }

  // Check Ollama health
  const ollamaHealthy = await checkOllamaHealth();
  if (!ollamaHealthy) {
    return res.status(503).json({
      success: false,
      error: getOllamaUnavailableMessage(),
    });
  }

  try {
    const isFirstInput = Boolean(is_first_input);
    const language = req.body.language || 'en';
    const result = await processChatMessage(text, isFirstInput, conversationHistory, document_id, language);

    res.json({
      success: true,
      reply: result.answer,
      keywords: result.legalTerms,
      summary: result.summary,
      total_keywords_found: result.legalTerms.length,
    });
  } catch (error) {
    logger.error('Error in chat:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/chat/nlu-legal
 * Comprehensive NLU-legal endpoint (for compatibility)
 */
export const nluLegal = asyncHandler(async (req: Request, res: Response) => {
  const { text, message } = req.body;
  const query = text || message;

  if (!query || typeof query !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Text or message is required',
    });
  }

  // Check Ollama health
  const ollamaHealthy = await checkOllamaHealth();
  if (!ollamaHealthy) {
    return res.status(503).json({
      success: false,
      error: getOllamaUnavailableMessage(),
    });
  }

  try {
    const language = req.body.language || 'en';
    const result = await processChatMessage(query, false, undefined, undefined, language);

    res.json({
      success: true,
      reply: result.answer,
      keywords: result.legalTerms,
      sections: result.constitutionContext ? [result.constitutionContext] : [],
      total_keywords_found: result.legalTerms.length,
      legal_analysis: {
        terms: result.legalTerms,
        constitution_references: result.constitutionContext ? 1 : 0,
      },
    });
  } catch (error) {
    logger.error('Error in nluLegal:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

