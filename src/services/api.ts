const API_BASE = import.meta.env.VITE_API_URL || '';

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
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T;
  const text = await res.text();
  return text ? JSON.parse(text) as T : null as T;
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST', headers, body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T;
  const text = await res.text();
  return text ? JSON.parse(text) as T : null as T;
}

export async function apiPatch<T = any>(path: string, body: any): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH', headers, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204 || res.headers.get('content-length') === '0') return null as T;
  const text = await res.text();
  return text ? JSON.parse(text) as T : null as T;
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await res.text());
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
 * falling back to `fallbackFilename`. Throws with the response body on
 * failure so callers can toast the real error.
 */
export async function apiDownload(path: string, fallbackFilename: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, { headers });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(detail || `Download failed (${res.status})`);
  }
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
