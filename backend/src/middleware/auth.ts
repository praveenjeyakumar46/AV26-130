import { Request, Response, NextFunction } from 'express';
import { getSupabaseClient } from '../utils/supabase';
import { AppError } from '../utils/AppError';
import { AuthenticatedRequest, User } from '../types';
import logger from '../config/logger';

/**
 * JWT token format validation
 * Validates token format before attempting verification
 */
const isValidTokenFormat = (token: string): boolean => {
  // JWT tokens have three parts separated by dots: header.payload.signature
  const parts = token.split('.');
  if (parts.length !== 3) {
    return false;
  }

  // Basic validation: parts should be base64url encoded
  // Check length (typical JWT parts are reasonable length)
  return parts.every(part => part.length > 0 && part.length < 500);
};

/**
 * Extract JWT token from Authorization header
 * SECURITY: Only accepts "Bearer <token>" format, rejects plain tokens
 */
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // SECURITY: Only accept "Bearer <token>" format
  // Reject plain tokens to prevent token leakage and ensure proper format
  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('Invalid authorization header format', {
      header: authHeader.substring(0, 20) + '...', // Log only prefix for security
      path: req.path,
    });
    throw new AppError(
      'Invalid authorization header format. Expected: "Bearer <token>"',
      401,
      'INVALID_AUTH_HEADER'
    );
  }

  const token = authHeader.substring(7).trim();

  // Validate token format
  if (!token || !isValidTokenFormat(token)) {
    logger.warn('Invalid token format', {
      path: req.path,
      tokenLength: token.length,
    });
    throw new AppError('Invalid token format', 401, 'INVALID_TOKEN_FORMAT');
  }

  return token;
};

/**
 * Verify Supabase JWT token and extract user information
 * Production-grade token verification with proper error handling
 */
const verifyToken = async (token: string): Promise<User> => {
  const supabase = getSupabaseClient();

  try {
    // Verify the JWT token using Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error) {
      logger.warn('Token verification failed', {
        error: error.message,
        errorCode: error.status,
      });
      throw new AppError('Invalid or expired token', 401, 'UNAUTHORIZED');
    }

    if (!user) {
      throw new AppError('User not found', 401, 'UNAUTHORIZED');
    }

    // Extract user information
    const userInfo: User = {
      id: user.id,
      email: user.email || '',
      email_verified: user.email_confirmed_at !== null,
      phone: user.phone || null,
      role: user.role || 'authenticated',
      metadata: user.user_metadata || {},
      created_at: user.created_at,
    };

    return userInfo;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    // Handle JWT verification errors
    logger.error('Token verification error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new AppError('Token verification failed', 401, 'UNAUTHORIZED');
  }
};

/**
 * Authentication middleware
 * Verifies Supabase JWT token and attaches user to request
 * 
 * SECURITY FEATURES:
 * - Only accepts "Bearer <token>" format
 * - Validates token format before verification
 * - Proper error handling and logging
 * - Rejects invalid/expired tokens
 * 
 * Usage:
 * router.get('/protected', authenticate, controller);
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Extract and validate token
    const token = extractToken(req);

    if (!token) {
      throw new AppError(
        'Authorization token required',
        401,
        'UNAUTHORIZED',
        { message: 'Please provide a valid authorization token in the format: "Bearer <token>"' }
      );
    }

    // Verify token and get user
    const user = await verifyToken(token);

    // Attach user to request
    (req as AuthenticatedRequest).user = user;

    // Log successful authentication (without sensitive data)
    logger.debug('User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    next();
  } catch (error) {
    // Handle authentication errors
    if (error instanceof AppError) {
      next(error);
      return;
    }

    logger.error('Authentication error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    next(
      new AppError('Authentication failed', 401, 'UNAUTHORIZED')
    );
  }
};

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't require it
 * 
 * SECURITY: Still validates token format if present
 * 
 * Usage:
 * router.get('/public-or-private', optionalAuthenticate, controller);
 */
export const optionalAuthenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();

      if (token && isValidTokenFormat(token)) {
        try {
          const user = await verifyToken(token);
          (req as AuthenticatedRequest).user = user;
        } catch (error) {
          // If token is invalid, continue without user
          logger.debug('Optional auth: Invalid token, continuing without user');
        }
      }
    }

    next();
  } catch (error) {
    // Continue even if authentication fails
    next();
  }
};

/**
 * Role-based authorization middleware
 * Use after authenticate middleware
 * 
 * SECURITY: Validates user has required role before allowing access
 * 
 * Usage:
 * router.get('/admin', authenticate, requireRole('admin'), controller);
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      throw new AppError(
        'Authentication required',
        401,
        'UNAUTHORIZED'
      );
    }

    const userRole = authReq.user.role || 'authenticated';

    if (!allowedRoles.includes(userRole)) {
      logger.warn('Access denied - insufficient permissions', {
        userId: authReq.user.id,
        userRole,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      throw new AppError(
        'Insufficient permissions',
        403,
        'FORBIDDEN',
        {
          message: `Required roles: ${allowedRoles.join(', ')}`,
          userRole,
        }
      );
    }

    next();
  };
};

/**
 * Email verification check middleware
 * Use after authenticate middleware for sensitive operations
 * 
 * Usage:
 * router.post('/sensitive-action', authenticate, requireEmailVerification, controller);
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  }

  if (!authReq.user.email_verified) {
    logger.warn('Access denied - email not verified', {
      userId: authReq.user.id,
      email: authReq.user.email,
      path: req.path,
    });

    throw new AppError(
      'Email verification required',
      403,
      'EMAIL_NOT_VERIFIED',
      {
        message: 'Please verify your email address before accessing this resource',
      }
    );
  }

  next();
};
