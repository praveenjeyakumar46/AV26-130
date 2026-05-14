import { Response } from 'express';
import { ApiResponse } from '../types';

/**
 * Send success response
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  message?: string,
  statusCode: number = 200
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    message,
  };

  res.status(statusCode).json(response);
};

/**
 * Send paginated response
 */
export const sendPaginated = <T>(
  res: Response,
  data: T[],
  meta: {
    page: number;
    perPage: number;
    total: number;
  },
  message?: string
): void => {
  const totalPages = Math.ceil(meta.total / meta.perPage);

  const response: ApiResponse<T[]> = {
    success: true,
    data,
    message,
    meta: {
      page: meta.page,
      perPage: meta.perPage,
      total: meta.total,
      totalPages,
    },
  };

  res.status(200).json(response);
};

