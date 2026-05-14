/**
 * Document Service
 * Handles document processing, text extraction, and analysis
 */

import logger from '../config/logger';
import { generateResponse } from './ollamaService';
import fs from 'fs';
import path from 'path';

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

    // Handle different file types
    if (mimeType === 'text/plain' || filePath.endsWith('.txt')) {
      return fileContent.toString('utf-8');
    } else if (mimeType === 'application/pdf' || filePath.endsWith('.pdf')) {
      // For PDF, we'll need pdf-parse library
      // For now, return a placeholder - you'll need to install pdf-parse
      logger.warn('PDF parsing not fully implemented. Install pdf-parse package.');
      return 'PDF content extraction requires pdf-parse package. Please install it.';
    } else if (
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      filePath.endsWith('.docx')
    ) {
      // For DOCX, we'll need mammoth library
      logger.warn('DOCX parsing not fully implemented. Install mammoth package.');
      return 'DOCX content extraction requires mammoth package. Please install it.';
    } else if (mimeType === 'application/msword' || filePath.endsWith('.doc')) {
      logger.warn('DOC parsing not fully implemented.');
      return 'DOC file format requires additional library. Please convert to DOCX or PDF.';
    }

    // Fallback: try to read as text
    return fileContent.toString('utf-8');
  } catch (error) {
    logger.error('Error extracting text from file:', error);
    throw new Error('Failed to extract text from document');
  }
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
    const analysisPrompt = `You are a legal document analyst. Analyze the following legal document and provide:

1. A concise summary (2-3 sentences)
2. A detailed analysis covering:
   - Main legal issues or topics
   - Key provisions or clauses
   - Important dates, parties, or obligations
   - Potential legal implications
3. Key points to remember

Document content:
${documentText.substring(0, 8000)}${documentText.length > 8000 ? '... (truncated)' : ''}

Provide your analysis in a clear, structured format.`;

    const analysisResponse = await generateResponse(analysisPrompt);
    const analysis = analysisResponse || 'Unable to generate analysis.';

    // Extract summary (first paragraph)
    const summary = analysis.split('\n\n')[0] || analysis.substring(0, 200);

    // Extract key points (look for bullet points or numbered lists)
    const keyPoints: string[] = [];
    const lines = analysis.split('\n');
    for (const line of lines) {
      if (line.match(/^[-•*]\s/) || line.match(/^\d+\.\s/)) {
        keyPoints.push(line.replace(/^[-•*\d.\s]+/, '').trim());
      }
    }

    return {
      summary: summary.trim(),
      analysis: analysis.trim(),
      keyPoints: keyPoints.length > 0 ? keyPoints : [analysis.substring(0, 100) + '...']
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
