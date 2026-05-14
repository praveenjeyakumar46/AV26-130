import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * Get current authenticated user
 * @route GET /api/v1/auth/me
 * @access Private
 */
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    // User is already attached by authenticate middleware
    const user = authReq.user;

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      email_verified: user.email_verified,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
    }, 'User retrieved successfully');
  }
);

/**
 * Verify token endpoint
 * @route GET /api/v1/auth/verify
 * @access Private
 */
export const verifyToken = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    sendSuccess(res, {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    }, 'Token is valid');
  }
);

