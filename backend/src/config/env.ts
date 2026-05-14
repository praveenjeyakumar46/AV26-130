import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment variable schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3000'),
  API_VERSION: z.string().default('v1'),
  
  // CORS
  CORS_ORIGIN: z
    .string()
    .min(1, 'CORS_ORIGIN is required')
    .default('http://localhost:8080,http://localhost:5173'),
  CORS_CREDENTIALS: z.string().transform((val) => val === 'true').default('true'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().int().positive()).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),
  LOG_MAX_SIZE: z.string().default('20m'),
  LOG_MAX_FILES: z.string().default('14d'),
  
  // Security
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // Supabase
  SUPABASE_URL: z.string().url('SUPABASE_URL must be a valid URL'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required').optional(),
  
  // Connection Pooling
  DB_POOL_MAX: z.string().transform(Number).pipe(z.number().int().positive()).optional().default('10'),
  DB_CONNECTION_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).optional().default('30000'),
  
  // Ollama LLM Configuration
  OLLAMA_BASE_URL: z.string().url('OLLAMA_BASE_URL must be a valid URL').default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:7b'),
  OLLAMA_MISTRAL_MODEL: z.string().default('qwen2.5:3b'),

  /** Optional: OpenAI API key (not used by POST /api/transcribe; use WHISPER_URL + whisper_server.py). */
  OPENAI_API_KEY: z.string().optional(),

  /** Local faster-whisper HTTP server (see whisper_server.py). Use 127.0.0.1 so Node fetch matches Python bind on Windows. */
  WHISPER_URL: z.string().url().default('http://127.0.0.1:9000'),

  /** Google Cloud Speech-to-Text API key (optional fallback if local Whisper fails). */
  GOOGLE_SPEECH_API_KEY: z.string().optional(),

  /** Recognition model: e.g. latest_short, latest_long, default, phone_call, video, command_and_search */
  GOOGLE_SPEECH_MODEL: z.string().default('latest_short'),

  /** Sample rate for WEBM_OPUS / OGG_OPUS (browser MediaRecorder is usually 48000). */
  GOOGLE_SPEECH_SAMPLE_RATE_HZ: z
    .string()
    .optional()
    .default('48000')
    .transform((s) => Number(s))
    .pipe(z.number().int().positive()),

  /** Request enhanced models where available (may require billing / specific models). */
  GOOGLE_SPEECH_USE_ENHANCED: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
});

// Validate and parse environment variables
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Invalid environment variables:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

export const env = parseEnv();

