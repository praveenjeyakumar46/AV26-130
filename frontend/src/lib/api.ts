/**
 * API utility for communicating with the backend FastAPI server
 */

// Backend server URL - can be overridden with environment variable
// In development, use relative URLs to leverage Vite proxy
// In production, use the full backend URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? '' : 'http://localhost:3000');

export interface ChatRequest {
  text: string;
  message?: string;
  max_keywords?: number;
}

export interface ChatResponse {
  reply: string;
  keywords?: string[];
  success: boolean;
  error?: string;
  total_keywords_found?: number;
  legal_analysis?: any;
  nlu_analysis?: any;
  sections?: string[];
}

/**
 * Send a chat message to the backend API
 * Uses the comprehensive NLU-legal endpoint which combines multiple models
 */
export async function sendChatMessage(text: string): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/nlu-legal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        message: text,
      }),
    });

    if (!response.ok) {
      // Try fallback endpoint
      return await sendChatMessageFallback(text);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error sending chat message:', error);
    // Try fallback endpoint
    return await sendChatMessageFallback(text);
  }
}

/**
 * Fallback to basic chat endpoint if the comprehensive one fails
 */
async function sendChatMessageFallback(text: string): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text,
        message: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error in fallback chat endpoint:', error);
    return {
      reply: 'Sorry, I encountered an error processing your request. Please try again later.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      keywords: [],
    };
  }
}

/**
 * Check if the backend API is healthy
 */
export async function checkHealth(): Promise<boolean> {
  // Try multiple endpoints in case of routing differences
  // Use relative URLs to leverage Vite proxy in development
  const endpoints = [
    '/api/health',
    '/health',
    `${API_BASE_URL || 'http://localhost:3000'}/api/health`,
    `${API_BASE_URL || 'http://localhost:3000'}/health`,
  ];

  for (const endpoint of endpoints) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout (reduced from 3)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        mode: 'cors', // Explicitly set CORS mode
        // Suppress error logging for connection refused (backend not running)
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.debug(`Health check returned ${response.status} for ${endpoint}`);
        continue; // Try next endpoint
      }

      const result = await response.json();
      
      // Backend returns { success: true, data: { status: 'healthy', ... }, message: '...' }
      if (result.success === true && result.data?.status === 'healthy') {
        return true;
      }
      // Also check direct status format
      if (result.status === 'healthy') {
        return true;
      }
      // Check if data.status exists directly
      if (result.data?.status === 'healthy') {
        return true;
      }
      // Log unexpected response format for debugging
      if (import.meta.env.DEV) {
        console.debug('Unexpected health check response format:', result);
      }
    } catch (error) {
      // Continue to next endpoint on error
      // Suppress console output for connection errors (backend not running is expected)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          // Timeout - silently continue
          continue;
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          // Network error - silently continue (backend likely not running)
          continue;
        } else if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to fetch')) {
          // Connection refused - silently continue
          continue;
        }
        // Only log unexpected errors
        if (import.meta.env.DEV) {
          console.debug(`Health check failed for ${endpoint}:`, error.message);
        }
      }
      continue;
    }
  }

  // All endpoints failed
  console.error('All health check endpoints failed - backend may be offline or not accessible');
  return false;
}

/**
 * Get API root information
 */
export async function getApiInfo(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Error fetching API info:', error);
    return null;
  }
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  username: string;
  name: string;
  issued_at: string;
}

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Login failed');
  }

  return response.json();
}

export interface SignupResult {
  access_token: string;
  token_type: string;
  username: string;
  name: string;
  issued_at: string;
}

export async function signupUser(name: string, email: string, password: string): Promise<SignupResult> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Signup failed');
  }

  return response.json();
}

