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

export interface PaymentData {
  id?: string;
  lease_id: string;
  tenant_id: string;
  amount: number;
  payment_type: string;
  payment_method?: string;
  status: string;
  due_date: string;
  paid_date?: string | null;
  transaction_id?: string | null;
  notes?: string | null;
  proof_url?: string | null;
  period_start?: string;
  period_end?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * List payments.
 *
 * The backend defaults to 20 per page. The dashboard used to call this with no
 * limit and then sum the result as if it were every payment, so revenue tiles
 * silently stopped counting past the twentieth record. Callers that need
 * totals should use fetchFinancialSummary, which aggregates server-side.
 */
export async function listPayments(limit = 100): Promise<{ items: PaymentData[]; total: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payments?limit=${limit}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface FinancialSummary {
  total_collected?: number;
  collected_this_month?: number;
  total_outstanding?: number;
  active_tenancies?: number;
  collection_rate?: number;
}

/** Portfolio totals computed server-side across every lease and payment. */
export async function fetchFinancialSummary(): Promise<FinancialSummary | null> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/reports/summary`, { headers });
  if (!res.ok) return null;
  return res.json();
}

export async function getPayment(id: string): Promise<PaymentData> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payments/${id}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createPayment(data: Partial<PaymentData>): Promise<PaymentData> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updatePayment(id: string, data: Partial<PaymentData>): Promise<PaymentData> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payments/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}


