import winston from 'winston';
import path from 'path';
import { env } from './env';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Helper to safely stringify objects that may contain circular references
const safeStringify = (obj: unknown): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
};

/**
 * Format meta object for logging.
 * Filters out internal Winston keys and handles strings/objects properly.
 * Prevents character-by-character JSON output when a string is passed as meta.
 */
const formatMeta = (meta: Record<string, unknown>): string => {
  // Remove Winston internal keys
  const { service, stack, ...rest } = meta;

  // If rest is empty, nothing to show
  if (Object.keys(rest).length === 0) return '';

  // If the only key is '0','1','2'... it's a string spread into meta — reconstruct it
  const keys = Object.keys(rest);
  const isSpreadString = keys.every(k => !isNaN(Number(k)));
  if (isSpreadString) {
    const reconstructed = keys
      .sort((a, b) => Number(a) - Number(b))
      .map(k => rest[k])
      .join('');
    return reconstructed;
  }

  // Otherwise safely stringify the object
  try {
    return safeStringify(rest);
  } catch {
    return '[unserializable meta]';
  }
};

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    // Append stack trace if present (for errors)
    if (stack) msg += `\n${stack}`;
    // Append meta if present
    const metaStr = formatMeta(meta);
    if (metaStr) msg += ` ${metaStr}`;
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  defaultMeta: { service: 'legal-ai-backend' },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: env.NODE_ENV === 'production' ? logFormat : consoleFormat,
      // Ensure console output is always enabled
      silent: false,
    }),
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, 'error.log'),
      level: 'error',
      maxsize: env.LOG_MAX_SIZE,
      maxFiles: env.LOG_MAX_FILES,
    }),
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, 'combined.log'),
      maxsize: env.LOG_MAX_SIZE,
      maxFiles: env.LOG_MAX_FILES,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, 'exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(env.LOG_FILE_PATH, 'rejections.log'),
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(env.LOG_FILE_PATH)) {
  fs.mkdirSync(env.LOG_FILE_PATH, { recursive: true });
}

export default logger;

