/**
 * API utility for communicating with the backend FastAPI server
 */

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

export async function sendChatMessage(text: string): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat/nlu-legal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, message: text }),
    });
    if (!response.ok) return await sendChatMessageFallback(text);
    return response.json();
  } catch {
    return await sendChatMessageFallback(text);
  }
}

async function sendChatMessageFallback(text: string): Promise<ChatResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, message: text }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.json();
  } catch (error) {
    return {
      reply: 'Sorry, I encountered an error processing your request. Please try again later.',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      keywords: [],
    };
  }
}

export async function checkHealth(): Promise<boolean> {
  const endpoints = [
    '/api/health',
    '/health',
    `${API_BASE_URL || 'http://localhost:3000'}/api/health`,
    `${API_BASE_URL || 'http://localhost:3000'}/health`,
  ];

  for (const endpoint of endpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        cache: 'no-cache',
      });
      clearTimeout(timeoutId);
      if (!response.ok) continue;
      const result = await response.json();
      if (result.success === true && result.data?.status === 'healthy') return true;
      if (result.status === 'healthy') return true;
      if (result.data?.status === 'healthy') return true;
    } catch {
      continue;
    }
  }
  return false;
}

export async function getApiInfo(): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

// ── Auth types ────────────────────────────────────────────────────────────────

export interface LoginResult {
  access_token: string;
  token_type: string;
  username: string;
  name: string;
  issued_at: string;
}

export interface SignupResult {
  access_token: string;
  token_type: string;
  username: string;
  name: string;
  issued_at: string;
}

// ── Auth functions ────────────────────────────────────────────────────────────
// The backend wraps all responses in { success, data, message }.
// We unwrap .data so callers get the payload directly.

export async function loginUser(username: string, password: string): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.error?.message || json?.message || 'Login failed');
  }

  const json = await response.json();
  // Unwrap backend envelope: { success, data: { access_token, name, ... } }
  return (json.data ?? json) as LoginResult;
}

export async function signupUser(name: string, email: string, password: string): Promise<SignupResult> {
  const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.error?.message || json?.message || 'Signup failed');
  }

  const json = await response.json();
  // Unwrap backend envelope
  return (json.data ?? json) as SignupResult;
}
