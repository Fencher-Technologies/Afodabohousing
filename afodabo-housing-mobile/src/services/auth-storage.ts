import { sessionStorage } from './session-storage';
import type { AuthSession } from '../types/auth';
import { getBackendApiEnv } from '../utils/env';

const AUTH_STORAGE_KEY = 'backend_auth_session';

type AuthListener = (session: AuthSession | null) => void;

const listeners = new Set<AuthListener>();

function emit(session: AuthSession | null) {
  listeners.forEach((listener) => listener(session));
}

export async function getStoredAuthSession() {
  const rawValue = await sessionStorage.getItem(AUTH_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    await sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export async function setStoredAuthSession(session: AuthSession) {
  await sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  emit(session);
}

export async function clearStoredAuthSession() {
  await sessionStorage.removeItem(AUTH_STORAGE_KEY);
  emit(null);
}

export async function getAccessToken() {
  const session = await getStoredAuthSession();
  return session?.accessToken ?? null;
}

export async function refreshStoredAuthSession() {
  const session = await getStoredAuthSession();

  if (!session?.refreshToken) {
    await clearStoredAuthSession();
    return null;
  }

  const { apiBaseUrl } = getBackendApiEnv();
  const response = await fetch(new URL('/auth/refresh', apiBaseUrl).toString(), {
    body: JSON.stringify({
      refresh_token: session.refreshToken,
    }),
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload || typeof payload !== 'object') {
    await clearStoredAuthSession();
    return null;
  }

  const nextSession: AuthSession = {
    accessToken:
      'access_token' in payload && typeof payload.access_token === 'string'
        ? payload.access_token
        : session.accessToken,
    refreshToken:
      'refresh_token' in payload && typeof payload.refresh_token === 'string'
        ? payload.refresh_token
        : session.refreshToken,
    role:
      'role' in payload &&
      (payload.role === 'tenant' || payload.role === 'house_manager' || payload.role === 'admin')
        ? payload.role
        : (session.role ?? null),
    user: {
      email:
        'user' in payload &&
        payload.user &&
        typeof payload.user === 'object' &&
        'email' in payload.user &&
        typeof payload.user.email === 'string'
          ? payload.user.email
          : session.user.email,
      id:
        'user' in payload &&
        payload.user &&
        typeof payload.user === 'object' &&
        'id' in payload.user &&
        typeof payload.user.id === 'string'
          ? payload.user.id
          : session.user.id,
      user_metadata:
        'user' in payload &&
        payload.user &&
        typeof payload.user === 'object' &&
        'user_metadata' in payload.user
          ? (payload.user.user_metadata as Record<string, unknown> | null | undefined)
          : (session.user.user_metadata ?? null),
    },
  };

  await setStoredAuthSession(nextSession);
  return nextSession;
}

export function subscribeToAuthSession(listener: AuthListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}
