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
