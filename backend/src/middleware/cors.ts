import cors from 'cors';
import { Request } from 'express';
import { env } from '../config/env';
import logger from '../config/logger';

/**
 * Validate origin format (basic security check)
 */
const isValidOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    // Only allow http, https protocols
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

/**
 * Parse and validate CORS origins from environment variable
 */
const parseAllowedOrigins = (): string[] => {
  const origins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  // Validate all origins are properly formatted
  const invalidOrigins = origins.filter((origin) => !isValidOrigin(origin));
  if (invalidOrigins.length > 0) {
    logger.warn('Invalid CORS origins detected', { invalidOrigins });
  }

  return origins.filter(isValidOrigin);
};

const allowedOrigins = parseAllowedOrigins();

/**
 * Production-grade CORS configuration
 * 
 * SECURITY FEATURES:
 * - Strict origin validation (no wildcards for authenticated routes)
 * - Environment-specific configuration
 * - Proper credential handling
 * - Restricted methods and headers
 * - Preflight caching
 */
export const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // SECURITY: In production, reject requests with no origin
    // (prevents CSRF attacks from tools like curl, Postman, etc.)
    // Exception: Allow in development for testing
    if (!origin) {
      if (env.NODE_ENV === 'development') {
        // Development: Allow requests without origin (for testing)
        return callback(null, true);
      } else {
        // Production: Reject requests without origin
        logger.warn('CORS: Request rejected - no origin header', {
          timestamp: new Date().toISOString(),
        });
        return callback(new Error('CORS: Origin header required'));
      }
    }

    // Validate origin format
    if (!isValidOrigin(origin)) {
      logger.warn('CORS: Request rejected - invalid origin format', {
        origin: origin.substring(0, 50), // Log partial origin for security
      });
      return callback(new Error('CORS: Invalid origin format'));
    }

    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Development mode: Allow all origins (for local development)
    // SECURITY WARNING: Never use this in production
    if (env.NODE_ENV === 'development' && allowedOrigins.length === 0) {
      logger.warn('CORS: Development mode - allowing all origins', {
        origin,
      });
      return callback(null, true);
    }

    // Reject origin not in allowed list
    logger.warn('CORS: Request rejected - origin not allowed', {
      origin: origin.substring(0, 50),
      allowedOrigins: allowedOrigins.length,
    });
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  
  // SECURITY: Only allow credentials if explicitly configured
  credentials: env.CORS_CREDENTIALS,
  
  // Restrict allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  
  // Restrict allowed headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
  ],
  
  // Expose only necessary headers to client
  exposedHeaders: [
    'X-Total-Count',
    'X-Page',
    'X-Per-Page',
    'RateLimit-Limit',
    'RateLimit-Remaining',
    'RateLimit-Reset',
  ],
  
  // Cache preflight requests for 24 hours
  maxAge: 86400, // 24 hours
  
  // Handle preflight requests
  preflightContinue: false,
  
  // Fail on errors
  optionsSuccessStatus: 204,
};

/**
 * CORS middleware with production-grade security
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Strict CORS configuration for authenticated routes
 * Never allows wildcard or missing origins
 */
export const strictCorsOptions: cors.CorsOptions = {
  ...corsOptions,
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Strict mode: Always require origin, even in development
    if (!origin) {
      return callback(new Error('CORS: Origin header required for authenticated routes'));
    }

    if (!isValidOrigin(origin)) {
      return callback(new Error('CORS: Invalid origin format'));
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
};

/**
 * Strict CORS middleware for authenticated routes
 * Use this for routes that require authentication
 */
export const strictCorsMiddleware = cors(strictCorsOptions);
