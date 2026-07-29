const API_BASE = import.meta.env.VITE_API_URL || '';

export interface SavedPhone {
  id: string;
  phone: string;
  usage_count: number;
  last_used_at: string;
  created_at: string;
}

export async function listSavedPhones(token: string): Promise<SavedPhone[]> {
  const res = await fetch(`${API_BASE}/saved-phones`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

export async function savePhone(token: string, phone: string): Promise<{ id: string; phone: string; is_new: boolean } | null> {
  const res = await fetch(`${API_BASE}/saved-phones`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ phone }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteSavedPhone(token: string, id: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/saved-phones/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}
