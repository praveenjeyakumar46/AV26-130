import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../config/logger';
import { AppError } from '../utils/AppError';

export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code?: string;
    details?: unknown;
    stack?: string;
  };
}

export const errorHandler = (
  err: Error | AppError | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Handle CORS errors specifically
  if (err.message && err.message.includes('CORS')) {
    logger.warn('CORS error', {
      message: err.message,
      origin: req.headers.origin,
      path: req.path,
    });
    const response: ErrorResponse = {
      success: false,
      error: {
        message: 'CORS policy violation',
        code: 'CORS_ERROR',
      },
    };
    res.status(403).json(response);
    return;
  }

  // Log error
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    };

    res.status(400).json(response);
    return;
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
      response.error.stack = err.stack;
    }

    res.status(err.statusCode).json(response);
    return;
  }

  // Handle unknown errors
  const response: ErrorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      code: 'INTERNAL_SERVER_ERROR',
    },
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = err.stack;
  }

  res.status(500).json(response);
};

// 404 handler
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const response: ErrorResponse = {
    success: false,
    error: {
      message: `Route ${req.method} ${req.path} not found`,
      code: 'NOT_FOUND',
    },
  };

  logger.warn(`404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json(response);
};

