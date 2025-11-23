/**
 * API utility for communicating with the backend FastAPI server
 */

// Backend server URL - can be overridden with environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

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
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'healthy';
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
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

