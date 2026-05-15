/**
 * Transcribe Routes
 * POST /api/transcribe  – accepts audio file (field: "audio"), returns { text }
 */

import { Router } from 'express';
import { audioUpload, transcribeAudio } from '../controllers/transcribeController';
import { uploadLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', uploadLimiter, audioUpload.single('audio'), transcribeAudio);

export default router;
