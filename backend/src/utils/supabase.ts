// Force IPv4 globally before any network calls
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import logger from '../config/logger';

/**
 * Supabase client singleton
 * IPv4 is forced via dns.setDefaultResultOrder to avoid IPv6 connectivity issues
 */
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create Supabase client instance
 */
export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      db: {
        schema: 'public',
      },
      global: {
        headers: {
          'x-client-info': 'legal-ai-backend',
        },
        fetch: (url, options = {}) => {
          return fetch(url, {
            ...options,
            // Set a 30s timeout on every Supabase request
            signal: options.signal ?? AbortSignal.timeout(30000),
          });
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    logger.info('Supabase client initialized (IPv4 forced)');
  }
  return supabaseClient;
};

/**
 * Get Supabase admin client (with service role key)
 * Use this for server-side operations that bypass RLS
 */
let supabaseAdminClient: SupabaseClient | null = null;

export const getSupabaseAdminClient = (): SupabaseClient | null => {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    logger.warn('Supabase service role key not configured');
    return null;
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
        db: {
          schema: 'public',
        },
        global: {
          headers: {
            'x-client-info': 'legal-ai-backend-admin',
          },
          fetch: (url, options = {}) => {
            return fetch(url, {
              ...options,
              signal: options.signal ?? AbortSignal.timeout(30000),
            });
          },
        },
      }
    );

    logger.info('Supabase admin client initialized (IPv4 forced)');
  }
  return supabaseAdminClient;
};

/**
 * Test Supabase connectivity with a lightweight query
 * Returns true if connected, false if not — never throws
 */
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('constitution_articles')
      .select('id')
      .limit(1);

    // PGRST116 = no rows returned — that's fine, means connection works
    if (error && error.code !== 'PGRST116') {
      logger.warn('Supabase connectivity check failed:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    // Extract message as a plain string — never pass error object to logger
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Supabase connectivity check failed: ${message}`);
    return false;
  }
};

/**
 * Close all Supabase connections (for graceful shutdown)
 */
export const closeSupabaseConnections = async (): Promise<void> => {
  try {
    supabaseClient      = null;
    supabaseAdminClient = null;
    logger.info('Supabase connections closed');
  } catch (error) {
    logger.error('Error closing Supabase connections:', error);
  }
};
