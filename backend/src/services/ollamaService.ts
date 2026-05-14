/**
 * Ollama Service
 * Handles LLM interactions using Ollama API
 * Uses Mistral for input processing (keyword extraction, intent detection, etc.)
 * Uses Qwen2.5-7B-Instruct (HuggingFace, via Ollama) for answer generation
 */

import axios, { AxiosError } from 'axios';
import { Readable } from 'stream';
import logger from '../config/logger';
import { env } from '../config/env';

const OLLAMA_BASE_URL = env.OLLAMA_BASE_URL;
const OLLAMA_MODEL = env.OLLAMA_MODEL; // For answer generation (qwen2.5:7b)
const OLLAMA_MISTRAL_MODEL = env.OLLAMA_MISTRAL_MODEL; // For input processing (qwen2.5:3b)

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

export interface OllamaStreamChunk {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Generate a response using Ollama LLM with specified model
 */
export async function generateResponse(
  prompt: string,
  context?: string,
  model?: string,
  intent?: 'question' | 'guidance'
): Promise<string> {
  try {
    // Build a better prompt structure
    let fullPrompt: string;
    
    if (context) {
      // Qwen2.5-Instruct uses ChatML format
      fullPrompt = `<|im_start|>system
You are a helpful legal assistant. Use the following context to answer the question accurately and concisely.

${context}<|im_end|>
<|im_start|>user
${prompt}<|im_end|>
<|im_start|>assistant
`;
    } else {
      fullPrompt = `<|im_start|>user
${prompt}<|im_end|>
<|im_start|>assistant
`;
    }

    const modelToUse = model || OLLAMA_MODEL;

    logger.info(`Generating response with model: ${modelToUse}`, { intent });

    // Optimize model parameters based on intent and model type
    let temperature = 0.7;
    let top_p = 0.9;
    let top_k = 40;

    // Optimize for legal guidance with Qwen (smaller model)
    if (modelToUse.includes('qwen') && intent === 'guidance') {
      temperature = 0.6; // Lower temperature for more focused guidance
      top_p = 0.85;
      top_k = 50;
    }
    
    // Optimize for legal questions with Qwen (larger model)
    if (modelToUse.includes('qwen') && intent === 'question') {
      temperature = 0.7;
      top_p = 0.9;
      top_k = 40;
    }

    const response = await axios.post<OllamaResponse>(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: modelToUse,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature,
          top_p,
          top_k,
        },
      },
      {
        timeout: 120000, // 2 minutes timeout
      }
    );

    let result = response.data.response?.trim() || '';
    
    if (!result) {
      logger.warn('Empty response from Qwen model');
      throw new Error('Received empty response from Qwen. The model may not be loaded or there was an error.');
    }

    // Remove notes and disclaimers at the end
    result = removeNotesFromResponse(result);

    logger.info(`Generated response length: ${result.length} characters`);
    return result;
  } catch (error) {
    logger.error('Error generating response from Ollama:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error(
          'Ollama service is not running. Please start Ollama and ensure the Qwen models are available.'
        );
      }
      if (axiosError.response?.status === 404) {
        throw new Error(
          `Model "${model || OLLAMA_MODEL}" not found. Please run: ollama pull ${model || OLLAMA_MODEL}`
        );
      }
      throw new Error(`Ollama API error: ${axiosError.message}`);
    }
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

/**
 * Generate a streaming response using Ollama LLM with Qwen model
 * Fixed to properly handle Ollama's streaming format
 */
export async function* generateStreamResponse(
  prompt: string,
  context?: string,
  model?: string,
  intent?: 'question' | 'guidance'
): AsyncGenerator<string, void, unknown> {
  try {
    // Build a better prompt structure
    let fullPrompt: string;
    
    if (context) {
      // Qwen2.5-Instruct uses ChatML format
      fullPrompt = `<|im_start|>system
You are a helpful legal assistant. Use the following context to answer the question accurately and concisely.

${context}<|im_end|>
<|im_start|>user
${prompt}<|im_end|>
<|im_start|>assistant
`;
    } else {
      fullPrompt = `<|im_start|>user
${prompt}<|im_end|>
<|im_start|>assistant
`;
    }

    const modelToUse = model || OLLAMA_MODEL;

    logger.info(`Generating streaming response with model: ${modelToUse}`, { intent });

    // Optimize model parameters based on intent and model type
    let temperature = 0.7;
    let top_p = 0.9;
    let top_k = 40;

    // Optimize for legal guidance with Qwen (smaller model)
    if (modelToUse.includes('qwen') && intent === 'guidance') {
      temperature = 0.6;
      top_p = 0.85;
      top_k = 50;
    }
    
    // Optimize for legal questions with Qwen (larger model)
    if (modelToUse.includes('qwen') && intent === 'question') {
      temperature = 0.7;
      top_p = 0.9;
      top_k = 40;
    }

    const response = await axios.post(
      `${OLLAMA_BASE_URL}/api/generate`,
      {
        model: modelToUse,
        prompt: fullPrompt,
        stream: true,
        options: {
          temperature,
          top_p,
          top_k,
        },
      },
      {
        timeout: 180000, // 3 minutes timeout for streaming
        responseType: 'stream',
      }
    );

    const stream = response.data as Readable;
    let buffer = '';
    let hasYielded = false;

    for await (const chunk of stream) {
      const chunkStr = chunk.toString();
      buffer += chunkStr;
      
      // Ollama sends JSON objects separated by newlines
      const lines = buffer.split('\n');
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        try {
          const data: OllamaStreamChunk = JSON.parse(trimmedLine);
          
          // Yield the response chunk if it exists
          if (data.response && data.response.length > 0) {
            hasYielded = true;
            // Clean the chunk (though notes usually come at the end, we'll clean final response)
            yield data.response;
          }
          
          // Check if done
          if (data.done) {
            logger.info('Stream completed');
            return;
          }
        } catch (parseError) {
          // Skip invalid JSON - might be partial data
          logger.debug('Skipping invalid JSON line:', trimmedLine.substring(0, 100));
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      try {
        const data: OllamaStreamChunk = JSON.parse(buffer.trim());
        if (data.response && data.response.length > 0) {
          yield data.response;
        }
      } catch (e) {
        logger.debug('Could not parse remaining buffer');
      }
    }

    // If we never yielded anything, something went wrong
    if (!hasYielded) {
      logger.warn('No content yielded from stream');
      throw new Error('No response received from Qwen model. The model may not be responding correctly.');
    }
  } catch (error) {
    logger.error('Error generating streaming response from Qwen model:', error);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.code === 'ECONNREFUSED') {
        throw new Error(
          'Ollama service is not running. Please start Ollama and ensure the Qwen models are available.'
        );
      }
      if (axiosError.response?.status === 404) {
        throw new Error(
          `Model "${model || OLLAMA_MODEL}" not found. Please run: ollama pull ${model || OLLAMA_MODEL}`
        );
      }
      throw new Error(`Ollama API error: ${axiosError.message}`);
    }
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

/**
 * Extract legal terms from a query using Qwen2.5:3b model
 * Smaller Qwen model is efficient for structured extraction tasks
 * Enhanced with detailed logging
 */
export async function extractLegalTerms(query: string): Promise<string[]> {
  try {
    const extractionPrompt = `Extract ONLY the exact legal terms, section numbers, act names, and legal concepts from this query. Return them as a comma-separated list with no additional text.

Query: "${query}"

Legal terms:`;

    // Use Qwen2.5:3b for keyword extraction (efficient for structured tasks)
    const response = await generateResponse(extractionPrompt, undefined, OLLAMA_MISTRAL_MODEL);
    
    // Parse the response to extract terms
    let terms = response
      .split(',')
      .map((term) => term.trim())
      .filter((term) => term.length > 0)
      .map((term) => {
        // Remove common prefixes and formatting
        return term
          .replace(/^[-•*]\s*/, '') // Remove bullet points
          .replace(/^["']|["']$/g, '') // Remove quotes
          .trim();
      })
      .filter((term) => term.length > 0 && term.length < 100); // Filter out too long terms

    // If no terms found or response seems invalid, try fallback
    if (terms.length === 0 || response.toLowerCase().includes('no terms') || response.toLowerCase().includes('none')) {
      logger.info('Mistral extraction returned no terms, using fallback');
      return extractSimpleKeywords(query);
    }

    // Remove duplicates
    const uniqueTerms = [...new Set(terms)];
    
    // Enhanced logging for extracted keywords
    logger.info('=== KEYWORD EXTRACTION ===', {
      query: query.substring(0, 200), // Log first 200 chars of query
      extracted_keywords: uniqueTerms,
      keyword_count: uniqueTerms.length,
      extraction_method: 'mistral',
      timestamp: new Date().toISOString(),
    });

    return uniqueTerms;
  } catch (error) {
    logger.error('Error extracting legal terms with Qwen2.5:3b:', error);
    // Fallback: simple keyword extraction
    logger.info('Falling back to simple keyword extraction');
    const fallbackTerms = extractSimpleKeywords(query);
    
    // Log fallback extraction
    logger.info('=== KEYWORD EXTRACTION (FALLBACK) ===', {
      query: query.substring(0, 200),
      extracted_keywords: fallbackTerms,
      keyword_count: fallbackTerms.length,
      extraction_method: 'regex_fallback',
      timestamp: new Date().toISOString(),
    });
    
    return fallbackTerms;
  }
}

/**
 * Simple keyword extraction fallback
 * Uses regex patterns to extract legal terms
 * Enhanced with logging
 */
function extractSimpleKeywords(query: string): string[] {
  const keywords: string[] = [];
  
  // Pattern 1: Section/Article numbers with letters (e.g., "Section 498A", "Article 21")
  const sectionPattern = /\b(?:Section|Art|Article|Sec|S\.)\s*(\d+[A-Za-z]?)\b/gi;
  const sectionMatches = query.match(sectionPattern);
  if (sectionMatches) {
    keywords.push(...sectionMatches.map(m => m.trim()));
  }

  // Pattern 2: Acts with numbers (e.g., "IPC 302", "CrPC 125")
  const actPattern = /\b(IPC|CrPC|CPC|Constitution|Act|Indian Penal Code|Code of Criminal Procedure)\s*(\d+)?/gi;
  const actMatches = query.match(actPattern);
  if (actMatches) {
    keywords.push(...actMatches.map(m => m.trim()));
  }

  // Pattern 3: Standalone section numbers (e.g., "498A", "302")
  const standalonePattern = /\b(\d+[A-Za-z]?)\s*(?:of|under|in)\s*(?:IPC|CrPC|CPC|Constitution|Act)/gi;
  const standaloneMatches = query.match(standalonePattern);
  if (standaloneMatches) {
    keywords.push(...standaloneMatches.map(m => m.trim()));
  }

  // Pattern 4: Common legal terms
  const commonLegalTerms = [
    'bailable',
    'cognizable',
    'non-bailable',
    'non-cognizable',
    'punishment',
    'offence',
    'offense',
    'complaint',
    'FIR',
    'First Information Report',
    'bail',
    'arrest',
    'warrant',
    'summons',
    'trial',
    'appeal',
    'conviction',
    'acquittal',
  ];

  const lowerQuery = query.toLowerCase();
  for (const term of commonLegalTerms) {
    if (lowerQuery.includes(term.toLowerCase())) {
      keywords.push(term);
    }
  }

  // Remove duplicates and return
  return [...new Set(keywords)];
}

/**
 * Remove notes, disclaimers, and legal advice warnings from the end of responses
 */
function removeNotesFromResponse(response: string): string {
  if (!response || response.trim().length === 0) {
    return response;
  }

  // Common patterns for notes/disclaimers at the end
  const notePatterns = [
    // Notes about legal advice
    /\n\n\s*Note:.*$/is,
    /\n\n\s*NOTE:.*$/is,
    /\n\n\s*Disclaimer:.*$/is,
    /\n\n\s*DISCLAIMER:.*$/is,
    /\n\n\s*Please note:.*$/is,
    /\n\n\s*Important:.*$/is,
    /\n\n\s*Warning:.*$/is,
    // Legal advice disclaimers
    /\n\n\s*This.*not.*legal advice.*$/is,
    /\n\n\s*This.*not.*constitute.*legal advice.*$/is,
    /\n\n\s*This.*not.*professional legal counsel.*$/is,
    /\n\n\s*This.*not.*professional.*advice.*$/is,
    /\n\n\s*Consult.*lawyer.*$/is,
    /\n\n\s*Seek.*legal.*professional.*$/is,
    /\n\n\s*Please consult.*$/is,
    // General notes
    /\n\n\s*Note that.*$/is,
    /\n\n\s*Keep in mind.*$/is,
    /\n\n\s*Remember that.*$/is,
    // Single line notes
    /\n\s*Note:.*$/is,
    /\n\s*NOTE:.*$/is,
  ];

  let cleaned = response.trim();

  // Remove each pattern
  for (const pattern of notePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Also remove if response ends with common note phrases (case insensitive)
  const noteEndings = [
    'This is not legal advice.',
    'This does not constitute legal advice.',
    'This is not professional legal advice.',
    'Please consult a lawyer.',
    'Consult a legal professional.',
    'Seek professional legal counsel.',
    'Note: This is not legal advice.',
    'Disclaimer: This is not legal advice.',
  ];

  for (const ending of noteEndings) {
    const lowerCleaned = cleaned.toLowerCase();
    const lowerEnding = ending.toLowerCase();
    if (lowerCleaned.endsWith(lowerEnding)) {
      cleaned = cleaned.substring(0, cleaned.length - ending.length).trim();
    }
  }

  // Remove any trailing note-like sentences
  const sentences = cleaned.split(/[.!?]\s+/);
  if (sentences.length > 1) {
    const lastSentence = sentences[sentences.length - 1].toLowerCase();
    const noteKeywords = ['note', 'disclaimer', 'consult', 'lawyer', 'legal advice', 'professional'];
    if (noteKeywords.some(keyword => lastSentence.includes(keyword))) {
      cleaned = sentences.slice(0, -1).join('. ').trim();
      // Add back punctuation if needed
      if (cleaned.length > 0 && !cleaned.match(/[.!?]$/)) {
        cleaned += '.';
      }
    }
  }

  return cleaned.trim();
}

/**
 * Detect user intent: question or guidance
 * Uses Qwen2.5:3b model for intent classification
 */
export async function detectUserIntent(query: string): Promise<'question' | 'guidance'> {
  try {
    const intentPrompt = `Analyze the following user query and determine if they are:
1. Asking a QUESTION (seeking information, clarification, or facts)
2. Seeking GUIDANCE (asking for advice, recommendations, or step-by-step help)

Query: "${query}"

Respond with ONLY one word: "question" or "guidance"`;

    const response = await generateResponse(intentPrompt, undefined, OLLAMA_MISTRAL_MODEL);
    const intent = response.trim().toLowerCase();
    
    if (intent.includes('guidance') || intent.includes('advice') || intent.includes('help')) {
      logger.info('User intent detected: GUIDANCE', { query: query.substring(0, 100) });
      return 'guidance';
    }
    
    logger.info('User intent detected: QUESTION', { query: query.substring(0, 100) });
    return 'question';
  } catch (error) {
    logger.error('Error detecting user intent:', error);
    // Default to question if detection fails
    return 'question';
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaHealth(): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.warn('Ollama health check failed', {
        baseUrl: OLLAMA_BASE_URL,
        code: error.code,
        message: error.message,
      });
    } else {
      logger.warn('Ollama health check failed', {
        baseUrl: OLLAMA_BASE_URL,
        error,
      });
    }
    return false;
  }
}

/**
 * Check if a specific model is available
 */
export async function checkModelAvailability(modelName: string): Promise<boolean> {
  try {
    const response = await axios.get(`${OLLAMA_BASE_URL}/api/tags`, {
      timeout: 5000,
    });
    
    if (response.status === 200 && response.data?.models) {
      const models = response.data.models as Array<{ name: string }>;
      return models.some(model => model.name.includes(modelName));
    }
    
    return false;
  } catch (error) {
    logger.warn(`Model availability check failed for ${modelName}:`, error);
    return false;
  }
}
