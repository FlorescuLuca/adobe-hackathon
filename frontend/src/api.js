import { getValidSession } from './auth.js';

const API_BASE = (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000/api/v1').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiRequest(path, { session, ...options } = {}) {
  const currentSession = session ? await getValidSession(session) : null;
  const headers = new Headers(options.headers || {});
  if (currentSession?.access_token) headers.set('Authorization', `Bearer ${currentSession.access_token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const message = typeof payload === 'object' ? payload?.detail || 'Request failed.' : payload || 'Request failed.';
    throw new ApiError(message, response.status);
  }
  return payload;
}
