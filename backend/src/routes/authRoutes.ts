import { Router } from 'express';
import { getCurrentUser, verifyToken, login, signup } from '../controllers/authController';
import { authenticate } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * @route   POST /auth/signup
 * @desc    Register a new user
 * @access  Public
 */
router.post('/signup', authLimiter, signup);

/**
 * @route   POST /auth/login
 * @desc    Sign in with email + password
 * @access  Public
 */
router.post('/login', authLimiter, login);

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
