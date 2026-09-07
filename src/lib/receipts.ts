import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || '';

export interface Receipt {
  id: string;
  receipt_number: string;
  payment_id: string;
  lease_id: string | null;
  amount: number;
  currency: string;
  payment_date: string | null;
  payment_method: string | null;
  coverage_days: number | null;
  coverage_start_date: string | null;
  coverage_end_date: string | null;
  property_title: string | null;
  unit_label: string | null;
  status: string;
  created_at: string;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

/** Receipts issued to the signed-in tenant. */
export async function fetchMyReceipts(): Promise<Receipt[]> {
  const res = await fetch(`${API_BASE}/receipts/my`, { headers: await authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.items ?? [];
}

/** Receipts issued across the signed-in manager's properties. */
export async function fetchOwnerReceipts(): Promise<Receipt[]> {
  const res = await fetch(`${API_BASE}/receipts`, { headers: await authHeaders() });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.items ?? [];
}

/**
 * Download a receipt PDF.
 *
 * The backend renders receipts with ReportLab at GET /receipts/{id}/pdf. The
 * web app had no receipts UI at all, so nothing ever called it — receipts were
 * only reachable from the mobile app. Returns false on failure so callers can
 * show a toast rather than failing silently.
 */
export async function downloadReceiptPdf(
  receiptId: string,
  receiptNumber?: string,
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/receipts/${receiptId}/pdf`, {
      headers: await authHeaders(),
    });
    if (!res.ok) return false;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receiptNumber || receiptId}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '-');
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Revoke on the next tick so the download has started.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (error) {
    console.error('Receipt PDF download failed:', error);
    return false;
  }
}
