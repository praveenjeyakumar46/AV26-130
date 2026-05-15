import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import taskRoutes from './taskRoutes';
import chatRoutes from './chatRoutes';
import constitutionRoutes from './constitutionRoutes';
import uploadRoutes from './uploadRoutes';
import judgementRoutes from './judgementRoutes';
import lmsRoutes from './lmsRoutes';
import transcribeRoutes from './transcribeRoutes';
import { env } from '../config/env';

const router = Router();

// Health check routes (no versioning)
router.use('/health', healthRoutes);
router.use('/api/health', healthRoutes);

// ── Auth routes ──────────────────────────────────────────────────────────────
// Mounted at /auth so the frontend can call /auth/login and /auth/signup directly
router.use('/auth', authRoutes);

// Chat routes
router.use('/api/chat', chatRoutes);

// Constitution / Law Reference routes
router.use('/api/law-reference', constitutionRoutes);
router.use('/api/constitution', constitutionRoutes);

// Upload routes
router.use('/api/upload', uploadRoutes);

// Judgement routes
router.use('/api/judgements', judgementRoutes);

// LexLearn Pro — LMS AI Tutor route
router.use('/api/lms', lmsRoutes);

// Speech-to-text (faster-whisper via Python sidecar)
router.use('/api/transcribe', transcribeRoutes);

// Versioned API mount (also exposes /api/v1/auth/me, /api/v1/auth/verify etc.)
const apiRouter = Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/tasks', taskRoutes);
router.use(`/api/${env.API_VERSION}`, apiRouter);

export default router;
