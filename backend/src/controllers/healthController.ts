import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { sendSuccess } from '../utils/response';
import { getSupabaseClient } from '../utils/supabase';
import { AppError } from '../utils/AppError';
import { asyncHandler } from '../utils/asyncHandler';
import { checkOllamaHealth } from '../services/ollamaService';

/**
 * Basic health check endpoint (liveness probe)
 * Returns immediately without checking dependencies
 */
export const healthCheck = async (
  req: Request,
  res: Response<ApiResponse>
): Promise<void> => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
  };

  sendSuccess(res, healthData, 'Server is running');
};

/**
 * Readiness check endpoint
 * Checks if the application is ready to serve traffic
 * Verifies database connectivity
 */
export const readinessCheck = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const checks: Record<string, { status: string; message?: string }> = {};

    // Check database connectivity
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.from('tasks').select('id').limit(1);

      if (error && error.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine for health check
        throw error;
      }

      checks.database = {
        status: 'healthy',
        message: 'Database connection successful',
      };
    } catch (error) {
      checks.database = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
      };
    }

    // Check Ollama connectivity (optional - chat won't work without it)
    try {
      const ollamaHealthy = await checkOllamaHealth();
      checks.ollama = {
        status: ollamaHealthy ? 'healthy' : 'unhealthy',
        message: ollamaHealthy
          ? 'Ollama service is available'
          : 'Ollama service is not available (chat features will not work)',
      };
    } catch (error) {
      checks.ollama = {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Ollama health check failed',
      };
    }

    // Determine overall status
    const allHealthy = Object.values(checks).every(
      (check) => check.status === 'healthy'
    );

    const healthData = {
      status: allHealthy ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
    };

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode);
    sendSuccess(res, healthData, allHealthy ? 'Service is ready' : 'Service is not ready');
  }
);

/**
 * Detailed health check with system information
 */
export const detailedHealthCheck = asyncHandler(
  async (req: Request, res: Response<ApiResponse>): Promise<void> => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      system: {
        memory: {
          rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
          heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
          external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        },
        cpu: {
          user: `${Math.round(cpuUsage.user / 1000)}ms`,
          system: `${Math.round(cpuUsage.system / 1000)}ms`,
        },
      },
      node: {
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };

    sendSuccess(res, healthData, 'Detailed health information');
  }
);


