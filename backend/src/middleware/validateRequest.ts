import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Middleware to validate request data using Zod schemas
 * @param schema - Zod schema to validate against
 * @param source - Where to validate from: 'body', 'query', 'params'
 */
export const validateRequest = (
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = req[source];
      const validated = schema.parse(data);
      
      // Replace the original data with validated data
      req[source] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        }));

        throw new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);
      }
      next(error);
    }
  };
};

