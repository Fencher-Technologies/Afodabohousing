import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || '';

export type MaintenanceStatus = 'open' | 'scheduled' | 'completed' | 'cancelled';

/**
 * Move a maintenance request to a new status.
 *
 * Goes through the API rather than writing to the table directly. The backend
 * enforces the open -> scheduled -> completed set (with cancelled as a
 * terminal exit), records the completion date, and notifies the tenant. A
 * direct table write skipped all three and could store statuses outside the
 * set — the dashboard previously wrote "in_progress" this way.
 */
export async function updateMaintenanceStatus(
  requestId: string,
  status: MaintenanceStatus,
): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE}/maintenance/${requestId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({
      status,
      ...(status === 'completed'
        ? { completed_date: new Date().toISOString().slice(0, 10) }
        : {}),
    }),
  });
  return res.ok;
}

/**
 * Raise a maintenance request.
 *
 * Through the API so the backend can scope it to a property the caller
 * actually rents and notify the manager. A direct table insert did neither.
 */
export async function createMaintenanceRequest(data: {
  property_id: string;
  tenant_id?: string | null;
  title: string;
  description: string;
  priority: string;
  photo_url?: string | null;
}): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${API_BASE}/maintenance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}
