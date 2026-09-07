import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

/**
 * Create a property.
 *
 * Through the API rather than the table: the backend creates the property's
 * first rental unit from its rent, deposit and rooms. A property is its units,
 * so one created by direct insert had no unit and therefore no authoritative
 * price. Returns the created property so units can be attached to its id.
 */
export async function createProperty(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; id?: string; detail?: string }> {
  const res = await fetch(`${API_BASE}/properties`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    const created = await res.json().catch(() => ({}));
    return { ok: true, id: created?.id };
  }
  const err = await res.json().catch(() => ({}));
  return { ok: false, detail: err.detail };
}
