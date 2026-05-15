/**
 * Document Service
 * Handles document processing, text extraction, and analysis
 */

import logger from '../config/logger';
import { generateResponse } from './ollamaService';
import fs from 'fs';

// In-memory storage for document contexts (in production, use a database)
const documentContexts: Map<string, {
  filename: string;
  content: string;
  summary: string;
  analysis: string;
  uploadedAt: Date;
}> = new Map();

/**
 * Extract text from uploaded file
 */
async function extractTextFromFile(filePath: string, mimeType: string): Promise<string> {
  try {
    const fileContent = fs.readFileSync(filePath);

    // Plain text
    if (mimeType === 'text/plain' || filePath.endsWith('.txt')) {
      return fileContent.toString('utf-8');
    }

    // PDF — use pdf-parse
    if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fileContent);
      if (!data.text || data.text.trim().length === 0) {
        throw new Error('PDF appears to be scanned or image-based and contains no extractable text.');
      }
      return data.text;
    }

    // DOCX — use mammoth
    if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filePath.endsWith('.docx')
    ) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ path: filePath });
      if (result.messages && result.messages.length > 0) {
        logger.warn('Mammoth warnings while reading DOCX:', result.messages);
      }
      return result.value;
    }

    // Legacy .doc
    if (mimeType === 'application/msword' || filePath.endsWith('.doc')) {
      throw new Error('Legacy .doc format is not supported. Please convert your file to .docx or .pdf and try again.');
    }

    // Fallback: attempt raw UTF-8 read
    return fileContent.toString('utf-8');
  } catch (error) {
    logger.error('Error extracting text from file:', error);
    throw error instanceof Error ? error : new Error('Failed to extract text from document');
  }
}

/**
 * Strip markdown syntax and return clean plain text
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, '')   // remove heading markers (###, ##, #)
    .replace(/\*\*(.+?)\*\*/g, '$1') // **bold** → bold
    .replace(/\*(.+?)\*/g, '$1')     // *italic* → italic
    .replace(/`(.+?)`/g, '$1')       // `code` → code
    .replace(/^[-*]\s+/gm, '')       // leading bullet dashes
    .trim();
}

/**
 * Generate document analysis using LLM
 */
async function generateDocumentAnalysis(documentText: string): Promise<{
  summary: string;
  analysis: string;
  keyPoints: string[];
}> {
  try {
    const analysisPrompt = `You are a legal document analyst. Analyze the following legal document.

Respond in plain sentences only — do NOT use markdown, headers, bullet symbols, or hashtags.

Provide:
SUMMARY: Two or three plain sentences summarising the document.
ANALYSIS: A detailed paragraph covering the main legal issues, key provisions, important parties or dates, and legal implications.
KEY POINTS: List up to five important points, each on its own line starting with a dash (-).

Document content:
${documentText.substring(0, 8000)}${documentText.length > 8000 ? '... (truncated)' : ''}`;

    const analysisResponse = await generateResponse(analysisPrompt);
    const raw = analysisResponse || 'Unable to generate analysis.';

    // Parse SUMMARY section
    const summaryMatch = raw.match(/SUMMARY[:\s]+([\s\S]+?)(?=ANALYSIS[:\s]+|KEY POINTS[:\s]+|$)/i);
    const rawSummary = summaryMatch ? summaryMatch[1].trim() : raw.split('\n\n')[0] || raw.substring(0, 300);
    const summary = stripMarkdown(rawSummary);

    // Parse ANALYSIS section
    const analysisMatch = raw.match(/ANALYSIS[:\s]+([\s\S]+?)(?=KEY POINTS[:\s]+|$)/i);
    const analysis = stripMarkdown(analysisMatch ? analysisMatch[1].trim() : raw.trim());

    // Parse KEY POINTS section
    const keyPointsMatch = raw.match(/KEY POINTS[:\s]+([\s\S]+?)$/i);
    const keyPoints: string[] = [];
    if (keyPointsMatch) {
      keyPointsMatch[1].split('\n').forEach(line => {
        const cleaned = stripMarkdown(line.replace(/^[-•*\d.\s]+/, '').trim());
        if (cleaned) keyPoints.push(cleaned);
      });
    }

    return {
      summary,
      analysis,
      keyPoints: keyPoints.length > 0 ? keyPoints : [summary],
    };
  } catch (error) {
    logger.error('Error generating document analysis:', error);
    throw new Error('Failed to generate document analysis');
  }
}

/**
 * Process uploaded document
 */
export async function processDocument(
  filePath: string,
  filename: string,
  mimeType: string
): Promise<{
  documentId: string;
  summary: string;
  analysis: string;
  keyPoints: string[];
}> {
  try {
    logger.info(`Processing document: ${filename}`);

    // Extract text from document
    const documentText = await extractTextFromFile(filePath, mimeType);

    if (!documentText || documentText.trim().length === 0) {
      throw new Error('Document appears to be empty or could not be extracted');
    }

    // Generate analysis
    const { summary, analysis, keyPoints } = await generateDocumentAnalysis(documentText);

    // Store document context
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    documentContexts.set(documentId, {
      filename,
      content: documentText,
      summary,
      analysis,
      uploadedAt: new Date()
    });

    logger.info(`Document processed successfully: ${documentId}`);

    return {
      documentId,
      summary,
      analysis,
      keyPoints
    };
  } catch (error) {
    logger.error('Error processing document:', error);
    throw error;
  }
}

/**
 * Get document context by ID
 */
export function getDocumentContext(documentId: string): {
  filename: string;
  content: string;
  summary: string;
  analysis: string;
  uploadedAt: Date;
} | null {
  return documentContexts.get(documentId) || null;
}

/**
 * Get all document contexts (for debugging)
 */
export function getAllDocumentContexts(): Array<{
  documentId: string;
  filename: string;
  summary: string;
  uploadedAt: Date;
}> {
  const contexts: Array<{
    documentId: string;
    filename: string;
    summary: string;
    uploadedAt: Date;
  }> = [];

  documentContexts.forEach((context, id) => {
    contexts.push({
      documentId: id,
      filename: context.filename,
      summary: context.summary,
      uploadedAt: context.uploadedAt
    });
  });

  return contexts;
}

/**
 * Clear old document contexts (older than 24 hours)
 */
export function clearOldDocumentContexts(): void {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  documentContexts.forEach((context, id) => {
    if (context.uploadedAt < oneDayAgo) {
      documentContexts.delete(id);
      logger.info(`Cleared old document context: ${id}`);
    }
  });
}
