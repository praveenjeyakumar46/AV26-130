import { Request } from 'express';

/**
 * User information from Supabase Auth
 */
export interface User {
  id: string;
  email: string;
  email_verified: boolean;
  phone: string | null;
  role: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Extended Express Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user: User;
}

/**
 * Standard API Response structure
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: {
    page?: number;
    perPage?: number;
    total?: number;
    totalPages?: number;
  };
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  page?: number;
  perPage?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Task query parameters
 */
export interface TaskQueryParams extends PaginationQuery {
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  search?: string;
}

