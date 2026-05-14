import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AuthenticatedRequest } from '../types';

/**
 * Enhanced request logging middleware
 * Logs detailed request information for production monitoring
 */
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log request start
  const requestInfo: Record<string, unknown> = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    referer: req.get('referer'),
    contentType: req.get('content-type'),
  };

  // Add user info if authenticated
  if ('user' in req) {
    const authReq = req as AuthenticatedRequest;
    if (authReq.user) {
      requestInfo.userId = authReq.user.id;
      requestInfo.userEmail = authReq.user.email;
    }
  }

  // Log query parameters (sanitized)
  if (Object.keys(req.query).length > 0) {
    requestInfo.query = req.query;
  }

  logger.info('Incoming request', requestInfo);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseInfo: Record<string, unknown> = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    };

    // Add user info if authenticated
    if ('user' in req) {
      const authReq = req as AuthenticatedRequest;
      if (authReq.user) {
        responseInfo.userId = authReq.user.id;
      }
    }

    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request completed with error', responseInfo);
    } else if (res.statusCode >= 400) {
      logger.warn('Request completed with client error', responseInfo);
    } else {
      logger.info('Request completed', responseInfo);
    }
  });

  next();
};

