/**
 * Base URL for backend HTTP calls.
 * In development, use '' so requests like `/api/...` go through the Vite proxy.
 */
export const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? '' : 'http://localhost:3000');
