/**
 * Upload Controller
 * Handles document upload and processing
 */

import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { processDocument } from '../services/documentService';
import { uploadLimiter } from '../middleware/rateLimiter';
import logger from '../config/logger';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.join(', ')}`));
    }
  }
});

/**
 * POST /api/upload/document
 * Upload and analyze a legal document
 */
export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      logger.error('File upload error:', err);
      return res.status(400).json({
        success: false,
        error: err.message || 'File upload failed'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    try {
      const filePath = req.file.path;
      const filename = req.file.originalname;
      const mimeType = req.file.mimetype;

      logger.info(`Processing uploaded file: ${filename}`);

      // Process the document
      const result = await processDocument(filePath, filename, mimeType);

      // Clean up uploaded file after processing
      try {
        fs.unlinkSync(filePath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup uploaded file:', cleanupError);
      }

      res.json({
        success: true,
        filename,
        documentId: result.documentId,
        summary: result.summary,
        analysis: result.analysis,
        keyPoints: result.keyPoints,
        message: 'Document processed successfully. You can now ask questions about it.'
      });
    } catch (error) {
      // Clean up file on error
      if (req.file?.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (cleanupError) {
          logger.warn('Failed to cleanup file on error:', cleanupError);
        }
      }

      logger.error('Error processing document:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process document'
      });
    }
  });
});
