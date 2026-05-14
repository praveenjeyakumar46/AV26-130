import express, { Express, Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import logger from './config/logger';
import { corsMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';
import routes from './routes';

/**
 * Create and configure Express application
 */
const createApp = (): Express => {
  const app = express();

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          // Allow PDF iframes from self (for act/article PDF preview)
          frameSrc: ["'self'", "http://localhost:3000", "http://localhost:5173", "http://localhost:8080"],
          frameAncestors: ["'self'", "http://localhost:5173", "http://localhost:8080", "http://localhost:3000"],
        },
      },
      // Disable X-Frame-Options so our own iframe can load PDFs
      frameguard: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  );

  // CORS - Applied globally
  app.use(corsMiddleware);

  // Compression
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // HTTP request logging with Morgan
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: {
          write: (message: string) => logger.info(message.trim()),
        },
        skip: (req: Request) => {
          return req.path === '/api/health' || req.path === '/health';
        },
      })
    );
  }

  if (process.env.NODE_ENV === 'production') {
    app.use(requestLogger);
  }

  // API routes
  app.use('/', routes);

  // Root endpoint
  app.get('/', (req: Request, res: Response) => {
    res.json({
      success: true,
      message: 'Legal AI Backend API',
      version: process.env.npm_package_version || '1.0.0',
      documentation: '/api/docs',
    });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
