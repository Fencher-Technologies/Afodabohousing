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
  created_at?: string;
  updated_at?: string;
}

export async function listPayments(): Promise<{ items: PaymentData[]; total: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payments`, { headers });
  if (!res.ok) throw new Error(await res.text());
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

export async function initiateNylonPay(params: {
  amount: number;
  phone_number: string;
  description: string;
  payment_id: string;
  first_name: string;
  last_name: string;
  email?: string;
}): Promise<{ success: boolean; reference?: string; status?: string; message: string }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/payments/initiate-nylonpay`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
