import { Request, Response, NextFunction } from 'express';

/**
 * Wrapper for async route handlers to catch errors
 * Eliminates the need for try-catch blocks in controllers
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

