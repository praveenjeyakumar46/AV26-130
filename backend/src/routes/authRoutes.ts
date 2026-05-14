import { Router } from 'express';
import { getCurrentUser, verifyToken } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get('/me', authLimiter, authenticate, getCurrentUser);

/**
 * @route   GET /api/v1/auth/verify
 * @desc    Verify JWT token
 * @access  Private
 */
router.get('/verify', authLimiter, authenticate, verifyToken);

export default router;

