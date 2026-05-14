import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import logger from '../config/logger';
import { env } from '../config/env';

/**
 * Extract real client IP address from request
 * Handles proxy/load balancer scenarios (X-Forwarded-For, X-Real-IP)
 */
const getClientIP = (req: Request): string => {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
    return ips[0].trim();
  }

  // Check for real IP header
  const realIP = req.headers['x-real-ip'];
  if (realIP && typeof realIP === 'string') {
    return realIP.trim();
  }

  // Fallback to Express IP
  return req.ip || req.socket.remoteAddress || 'unknown';
};

/**
 * Generate a unique key for rate limiting
 * Uses IP for unauthenticated, user ID for authenticated
 */
const generateKey = (req: Request): string => {
  // For authenticated users, use user ID for more accurate limiting
  if ('user' in req && (req as any).user?.id) {
    return `user:${(req as any).user.id}`;
  }

  // For unauthenticated, use IP
  return `ip:${getClientIP(req)}`;
};

/**
 * General API rate limiter
 * Production-grade with proper IP extraction and configurable limits
 */
export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // Default: 15 minutes (900000ms)
  max: env.RATE_LIMIT_MAX_REQUESTS, // Default: 100 requests per window
  // Use custom key generator for user-based and IP-based limiting
  keyGenerator: generateKey,
  // Standard rate limit headers (RFC 6585)
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for health checks
  skip: (req: Request) => {
    const path = req.path;
    return path === '/api/health' || 
           path === '/health' || 
           path === '/api/health/ready' ||
           path === '/api/health/detailed';
  },
  // Custom handler with detailed logging
  handler: (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const userId = 'user' in req ? (req as any).user?.id : 'anonymous';

    logger.warn('Rate limit exceeded', {
      ip: clientIP,
      userId,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });

    // Return 429 with proper headers
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil(env.RATE_LIMIT_WINDOW_MS / 1000), // Seconds
      },
    });
  },
  // Skip successful requests for better UX (optional, can be configured)
  skipSuccessfulRequests: false,
});

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks on login/registration
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 failed attempts per window
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  // Don't count successful authentication attempts
  skipSuccessfulRequests: true,
  handler: (req: Request, res: Response) => {
    const clientIP = getClientIP(req);

    logger.warn('Authentication rate limit exceeded', {
      ip: clientIP,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: 900, // 15 minutes in seconds
      },
    });
  },
});

/**
 * Rate limiter for task creation (prevents spam/abuse)
 */
export const createTaskLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 task creations per minute per user/IP
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const userId = 'user' in req ? (req as any).user?.id : 'anonymous';

    logger.warn('Task creation rate limit exceeded', {
      ip: clientIP,
      userId,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many task creation requests, please try again later.',
        code: 'TASK_CREATE_LIMIT_EXCEEDED',
        retryAfter: 60, // 1 minute in seconds
      },
    });
  },
});

/**
 * Rate limiter for search/query endpoints
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 search requests per minute
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const userId = 'user' in req ? (req as any).user?.id : 'anonymous';

    logger.warn('Search rate limit exceeded', {
      ip: clientIP,
      userId,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many search requests, please try again later.',
        code: 'SEARCH_LIMIT_EXCEEDED',
        retryAfter: 60,
      },
    });
  },
});

/**
 * Rate limiter for file upload endpoints
 */
export const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 uploads per 15 minutes
  keyGenerator: generateKey,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const clientIP = getClientIP(req);
    const userId = 'user' in req ? (req as any).user?.id : 'anonymous';

    logger.warn('Upload rate limit exceeded', {
      ip: clientIP,
      userId,
      path: req.path,
    });

    res.status(429).json({
      success: false,
      error: {
        message: 'Too many upload requests, please try again later.',
        code: 'UPLOAD_LIMIT_EXCEEDED',
        retryAfter: 900,
      },
    });
  },
});
