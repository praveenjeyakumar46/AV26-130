import { Request, Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types';
import { sendSuccess } from '../utils/response';
import { asyncHandler } from '../utils/asyncHandler';
import { getSupabaseAdminClient, getSupabaseClient } from '../utils/supabase';
import { AppError } from '../utils/AppError';
import logger from '../config/logger';
import { env } from '../config/env';
import crypto from 'crypto';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Simple SHA-256 password hash (no external deps). */
const hashPassword = (password: string): string =>
  crypto.createHash('sha256').update(password + env.JWT_SECRET).digest('hex');

/** Build the JWT-like token we return to the client.
 *  We reuse Supabase's own session token so the existing middleware still works. */

// ─── POST /auth/signup ───────────────────────────────────────────────────────
export const signup = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }
    if (password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 400, 'VALIDATION_ERROR');
    }

    const admin = getSupabaseAdminClient();
    if (!admin) {
      throw new AppError('Auth service unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,           // skip e-mail OTP for local dev
      user_metadata: { name: name ?? '' },
    });

    if (authError) {
      logger.warn('Signup auth error', { error: authError.message });
      if (authError.message.toLowerCase().includes('already')) {
        throw new AppError('Email already registered', 409, 'EMAIL_EXISTS');
      }
      throw new AppError(authError.message, 400, 'SIGNUP_ERROR');
    }

    const userId = authData.user.id;

    // 2. Upsert a row in our public.users table
    const supabase = getSupabaseClient();
    await supabase.from('users').upsert({
      id: userId,
      email,
      name: name ?? '',
      created_at: new Date().toISOString(),
    });

    // 3. Sign in to get a real session token
    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (sessionError || !sessionData.session) {
      throw new AppError('Account created but sign-in failed — please log in manually', 201, 'SESSION_ERROR');
    }

    logger.info('User signed up', { userId, email });

    sendSuccess(res, {
      access_token: sessionData.session.access_token,
      token_type: 'bearer',
      username: email,
      name: name ?? '',
      issued_at: new Date().toISOString(),
    }, 'Account created successfully', 201);
  }
);

// ─── POST /auth/login ────────────────────────────────────────────────────────
export const login = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const { username, password } = req.body as {
      username?: string;
      password?: string;
    };

    if (!username || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const supabase = getSupabaseClient();

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: username,
      password,
    });

    if (sessionError || !sessionData.session) {
      logger.warn('Login failed', { email: username, error: sessionError?.message });
      throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Fetch display name from our users table (best-effort)
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', sessionData.user.id)
      .single();

    logger.info('User logged in', { userId: sessionData.user.id, email: username });

    sendSuccess(res, {
      access_token: sessionData.session.access_token,
      token_type: 'bearer',
      username,
      name: profile?.name ?? sessionData.user.user_metadata?.name ?? '',
      issued_at: new Date().toISOString(),
    }, 'Logged in successfully');
  }
);

// ─── GET /api/v1/auth/me ─────────────────────────────────────────────────────
export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    const supabase = getSupabaseClient();
    const { data: profile } = await supabase
      .from('users')
      .select('name')
      .eq('id', user.id)
      .single();

    sendSuccess(res, {
      id: user.id,
      email: user.email,
      name: profile?.name ?? user.metadata?.name ?? '',
      email_verified: user.email_verified,
      phone: user.phone,
      role: user.role,
      created_at: user.created_at,
    }, 'User retrieved successfully');
  }
);

// ─── GET /api/v1/auth/verify ─────────────────────────────────────────────────
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
