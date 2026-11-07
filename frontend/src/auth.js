const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const STORAGE_KEY = 'verity.auth.session';

export const authConfigured = Boolean(SUPABASE_URL && PUBLISHABLE_KEY);

async function authRequest(path, body, accessToken) {
  const headers = { apikey: PUBLISHABLE_KEY, 'Content-Type': 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST', headers, body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.msg || payload.message || payload.error_description || 'Supabase sign-in failed.');
  return payload;
}

function saveSession(payload) {
  const session = {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: payload.token_type,
    expires_at: payload.expires_at || Math.floor(Date.now() / 1000) + (payload.expires_in || 3600),
    user: payload.user,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

function storedSession() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); }
  catch { localStorage.removeItem(STORAGE_KEY); return null; }
}

export async function signInWithPassword({ email, password }) {
  if (!authConfigured) throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local.');
  return saveSession(await authRequest('token?grant_type=password', { email, password }));
}

export async function getValidSession(current = storedSession()) {
  if (!current?.refresh_token || !authConfigured) return null;
  if (current.expires_at > Math.floor(Date.now() / 1000) + 60) return current;
  try {
    return saveSession(await authRequest('token?grant_type=refresh_token', { refresh_token: current.refresh_token }));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export async function restoreSession() {
  const current = storedSession();
  if (!current) return null;
  return getValidSession(current);
}

export async function signOut() {
  const session = storedSession();
  if (session?.access_token && authConfigured) {
    try { await authRequest('logout', null, session.access_token); } catch { /* Clear the local session even if logout cannot reach Auth. */ }
  }
  localStorage.removeItem(STORAGE_KEY);
}
