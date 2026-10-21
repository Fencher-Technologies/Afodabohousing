const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * An error response from the API.
 *
 * The backend answers failures with {detail, error, request_id, status_code}.
 * This used to be thrown as `new Error(<raw JSON text>)`, so every screen that
 * showed `err.message` displayed braces and quotes, and the status code and
 * request id (what support needs to trace a failure) were unrecoverable.
 * `message` is now readable; the structured parts are kept as properties.
 */
export class ApiError extends Error {
  readonly status: number;
  /** The response's `detail`: a string, an object such as {code, message}, or a list of validation errors. */
  readonly detail: unknown;
  /** The machine-readable `error` field, e.g. "rate_limit_exceeded". */
  readonly code?: string;
  readonly requestId?: string;
  /** The parsed JSON body, or null if the response was not JSON. */
  readonly body: unknown;

  constructor(message: string, init: { status: number; detail?: unknown; code?: string; requestId?: string; body?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = init.status;
    this.detail = init.detail;
    this.code = init.code;
    this.requestId = init.requestId;
    this.body = init.body ?? null;
  }
}

/** A person-readable sentence from whatever shape `detail` has. */
function messageFromDetail(detail: unknown): string | null {
  if (typeof detail === 'string') return detail.trim() || null;
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{loc: ['body', 'amount'], msg: '...'}]
    const parts = detail
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item.msg !== 'string') return null;
        const field = Array.isArray(item.loc) ? item.loc.filter((x: unknown) => x !== 'body' && x !== 'query').join('.') : '';
        return field ? `${field}: ${item.msg}` : item.msg;
      })
      .filter((x): x is string => !!x);
    return parts.length ? parts.join('; ') : null;
  }
  if (detail && typeof detail === 'object' && typeof (detail as any).message === 'string') {
    return (detail as any).message;
  }
  return null;
}

/** Build an ApiError from a failed response, whatever the body looks like. */
export async function toApiError(res: Response): Promise<ApiError> {
  const text = await res.text().catch(() => '');
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* not JSON, e.g. a proxy's HTML error page */
  }
  const isObject = body && typeof body === 'object';
  const detail = isObject ? body.detail : undefined;
  const message =
    messageFromDetail(detail) ||
    (isObject && typeof body.error === 'string' ? body.error : null) ||
    (!isObject && text && text.length < 300 && !text.trimStart().startsWith('<') ? text : null) ||
    `Request failed (${res.status})`;
  return new ApiError(message, {
    status: res.status,
    detail,
    code: isObject && typeof body.error === 'string' ? body.error : undefined,
    requestId: (isObject && typeof body.request_id === 'string' ? body.request_id : undefined) ?? res.headers.get('x-request-id') ?? undefined,
    body: isObject ? body : null,
  });
}

async function authHeaders(): Promise<Record<string, string>> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T;
  const text = await res.text();
  return text ? JSON.parse(text) as T : null as T;
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T;
  const text = await res.text();
  return text ? JSON.parse(text) as T : null as T;
}

export async function apiPatch<T = any>(path: string, body: any): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T;
  const text = await res.text();
  return text ? JSON.parse(text) as T : null as T;
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw await toApiError(res);
  if (res.status === 204 || res.headers.get('content-length') === '0') return;
  const text = await res.text();
  if (text) JSON.parse(text);
}

/**
 * Download a binary file (PDF, CSV, XLSX) from an authenticated endpoint.
 *
 * Anchor clicks cannot send an Authorization header, so file downloads must
 * go through fetch with the session token and trigger the save from a blob.
 * Prefers the filename from the backend's Content-Disposition header,
 * falling back to `fallbackFilename`. Throws an ApiError on failure so
 * callers can toast the real error.
 */
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) throw await toApiError(res);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const disposition = res.headers.get('content-disposition') || '';
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = (match?.[1] || fallbackFilename).replace(/[^a-zA-Z0-9._-]/g, '-');
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
