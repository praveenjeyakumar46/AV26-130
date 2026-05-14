import { Router } from 'express';
import healthRoutes from './healthRoutes';
import authRoutes from './authRoutes';
import taskRoutes from './taskRoutes';
import chatRoutes from './chatRoutes';
import constitutionRoutes from './constitutionRoutes';
import uploadRoutes from './uploadRoutes';
import judgementRoutes from './judgementRoutes';
import { env } from '../config/env';

const router = Router();

// Health check route (no versioning)
router.use('/health', healthRoutes);
router.use('/api/health', healthRoutes);

// API routes with versioning
const apiRouter = Router();
apiRouter.use('/auth', authRoutes);
apiRouter.use('/tasks', taskRoutes);

// Chat routes
router.use('/api/chat', chatRoutes);

// Constitution / Law Reference routes
router.use('/api/law-reference', constitutionRoutes);
router.use('/api/constitution', constitutionRoutes);

// Upload routes
router.use('/api/upload', uploadRoutes);

// Judgement routes
router.use('/api/judgements', judgementRoutes);

// Versioned API mount
router.use(`/api/${env.API_VERSION}`, apiRouter);

export default router;
