import { getAccessToken, refreshStoredAuthSession } from './auth-storage';
import { getBackendApiEnv } from '../utils/env';

interface RequestOptions {
  auth?: boolean;
  body?: unknown;
  method?: 'DELETE' | 'GET' | 'PATCH' | 'POST';
  query?: Record<string, number | string | undefined>;
}

function buildUrl(path: string, query?: RequestOptions['query']) {
  const { apiBaseUrl } = getBackendApiEnv();
  const url = new URL(`${apiBaseUrl}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiRequestInternal<T>(path, options, true);
}

async function apiRequestInternal<T>(
  path: string,
  options: RequestOptions,
  allowRefreshRetry: boolean,
): Promise<T> {
  const headers = new Headers();
  const method = options.method ?? 'GET';
  const requestUrl = buildUrl(path, options.query);

  headers.set('Accept', 'application/json');

  if (options.auth) {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      throw new Error('You must be signed in to access the backend API.');
    }

    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      headers,
      method,
    });
  } catch (error) {
    const isLocalhostUrl = /https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/i.test(requestUrl);
    const isHttpUrl = /^http:\/\//i.test(requestUrl);

    if (isLocalhostUrl) {
      throw new Error(
        'Backend request failed. On Android, localhost is not your computer. Use http://10.0.2.2:8000 for the emulator or your PC LAN IP for a real device.',
      );
    }

    if (isHttpUrl) {
      throw new Error(
        'Backend request failed over HTTP. Make sure the Android app allows cleartext traffic and that your FastAPI server is reachable on the configured host.',
      );
    }

    throw error instanceof Error ? error : new Error('Backend request failed.');
  }

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (response.status === 401 && options.auth && allowRefreshRetry) {
    const refreshedSession = await refreshStoredAuthSession();

    if (refreshedSession?.accessToken) {
      return apiRequestInternal<T>(path, options, false);
    }
  }

  if (!response.ok) {
    const detail =
      typeof payload === 'object' && payload !== null && 'detail' in payload
        ? String(payload.detail)
        : typeof payload === 'string'
          ? payload
          : 'Backend request failed.';

    throw new Error(detail);
  }

  return payload as T;
}

export interface PaginatedResponse<T> {
  items: T[];
  limit: number;
  skip: number;
  total: number;
}
