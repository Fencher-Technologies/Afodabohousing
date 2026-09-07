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
 * Update a payment.
 *
 * Through the API rather than the table. When an amount changes the backend
 * recomputes coverage_days and frozen_monthly_rent, which drive the rent
 * ledger (arrears, paid-until, next due), and re-issues the receipt. A direct
 * table write changed the amount and left all of that stale, so the tenancy
 * would report a coverage figure that no longer matched what was paid.
 */
export async function updatePayment(
  paymentId: string,
  data: Record<string, unknown>,
): Promise<{ ok: boolean; detail?: string }> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, detail: err.detail };
}

/** Delete a payment. The backend also cleans up the linked receipt. */
export async function deletePayment(paymentId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/payments/${paymentId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return res.ok;
}
