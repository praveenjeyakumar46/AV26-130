import { Router } from 'express';
import {
  healthCheck,
  readinessCheck,
  detailedHealthCheck,
} from '../controllers/healthController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Basic health check (liveness probe)
 * @access  Public
 */
router.get('/', asyncHandler(healthCheck));

/**
 * @route   GET /api/health/ready
 * @desc    Readiness check (checks dependencies)
 * @access  Public
 */
router.get('/ready', asyncHandler(readinessCheck));

/**
 * @route   GET /api/health/detailed
 * @desc    Detailed health check with system info
 * @access  Public
 */
router.get('/detailed', asyncHandler(detailedHealthCheck));

export default router;

