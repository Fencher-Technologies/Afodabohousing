const API_BASE = import.meta.env.VITE_API_URL || '';

async function authHeaders(): Promise<Record<string, string>> {
  const { supabase } = await import('@/integrations/supabase/client');
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export async function createVerification(data: {
  amount: number;
  payment_method: string;
  transaction_reference?: string;
  payment_date: string;
  screenshot_url?: string;
  notes?: string;
}) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payment-verifications`, {
    method: 'POST', headers, body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Submission failed');
  return res.json();
}

export async function getMyVerifications(status?: string) {
  const headers = await authHeaders();
  const qs = status ? `?status=${status}` : '';
  const res = await fetch(`${API_BASE}/payment-verifications/my${qs}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export async function getOwnerVerifications(status?: string, search?: string) {
  const headers = await authHeaders();
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (search) params.set('search', search);
  const qs = params.toString() ? `?${params}` : '';
  const res = await fetch(`${API_BASE}/payment-verifications${qs}`, { headers });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
}

export async function approveVerification(id: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payment-verifications/${id}/approve`, { method: 'PATCH', headers });
  if (!res.ok) throw new Error((await res.json()).detail || 'Approval failed');
  return res.json();
}

export async function rejectVerification(id: string, reason: string) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payment-verifications/${id}/reject`, {
    method: 'PATCH', headers, body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error((await res.json()).detail || 'Rejection failed');
  return res.json();
}