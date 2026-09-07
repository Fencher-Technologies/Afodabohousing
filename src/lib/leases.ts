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
 * Create a lease.
 *
 * Through the API rather than the table: the backend inherits the property's
 * rent_currency onto the lease, which every payment and receipt under it then
 * inherits in turn. A direct insert took the UGX column default, so a lease on
 * a property listed in another currency silently reported the wrong one.
 */
export async function createLease(
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; detail?: string }> {
  const res = await fetch(`${API_BASE}/leases`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, detail: err.detail };
}

/** Update a lease. */
export async function updateLease(
  leaseId: string,
  payload: Record<string, unknown>,
): Promise<{ ok: boolean; detail?: string }> {
  const res = await fetch(`${API_BASE}/leases/${leaseId}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, detail: err.detail };
}
