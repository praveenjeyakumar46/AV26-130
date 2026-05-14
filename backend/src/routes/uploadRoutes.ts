/**
 * Upload Routes
 * Defines routes for document upload functionality
 */

import { Router } from 'express';
import { uploadDocument } from '../controllers/uploadController';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

// Document upload endpoint
router.post('/document', uploadLimiter, uploadDocument);

export default router;
