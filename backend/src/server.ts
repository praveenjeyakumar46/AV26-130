// Force IPv4 to avoid IPv6 connectivity issues with Supabase
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import createApp from './app';
import { env } from './config/env';
import logger from './config/logger';
import { testSupabaseConnection, closeSupabaseConnections } from './utils/supabase';
import { Express } from 'express';

// Create the Express app
const app = createApp();

/**
 * Graceful shutdown handler
 */
let isShuttingDown = false;
let server: ReturnType<Express['listen']> | null = null;

const gracefulShutdown = async (signal: string): Promise<void> => {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, forcing exit...');
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');

      // Close database connections
      try {
        await closeSupabaseConnections();
        logger.info('Database connections closed.');
      } catch (error) {
        logger.error('Error closing database connections:', error);
      }

      logger.info('Graceful shutdown completed.');
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
};

/**
 * Start the server
 */
const startServer = async (): Promise<void> => {
  try {
    // Log startup information immediately
    console.log('\n🚀 Starting Legal AI Backend Server...\n');
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Legal AI Backend Server');
    logger.info('='.repeat(60));
    
    // Verify database connectivity on startup
    logger.info('📊 Checking database connection...');
    const isConnected = await testSupabaseConnection();
    if (isConnected) {
      logger.info('✅ Database connection verified');
      console.log('✅ Database connection verified');
    } else {
      logger.warn('⚠️ Database not reachable — check your network or Supabase project status. App will still start.');
      console.warn('⚠️ Database not reachable — check your network or Supabase project status.');
    }

    server = app.listen(env.PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('✅ Server started successfully!');
      console.log('='.repeat(60));
      logger.info(`🚀 Server running on port ${env.PORT}`);
      console.log(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📝 Environment: ${env.NODE_ENV}`);
      console.log(`📝 Environment: ${env.NODE_ENV}`);
      logger.info(`🌐 API Version: ${env.API_VERSION}`);
      console.log(`🌐 API Version: ${env.API_VERSION}`);
      logger.info(`📍 Health check: http://localhost:${env.PORT}/api/health`);
      console.log(`📍 Health check: http://localhost:${env.PORT}/api/health`);
      logger.info(`📍 Readiness check: http://localhost:${env.PORT}/api/health/ready`);
      console.log(`📍 Readiness check: http://localhost:${env.PORT}/api/health/ready`);
      console.log('='.repeat(60) + '\n');
    });

    // Graceful shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('Unhandled Rejection:', reason);
      if (!isShuttingDown) {
        gracefulShutdown('unhandledRejection');
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception:', error);
      if (!isShuttingDown) {
        gracefulShutdown('uncaughtException');
      }
    });

    // Handle warnings
    process.on('warning', (warning: Error) => {
      logger.warn('Process Warning:', warning);
    });
  } catch (error) {
    console.error('\n❌ Failed to start server:');
    console.error(error);
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

