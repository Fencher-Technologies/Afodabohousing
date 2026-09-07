import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export interface RentalUnitInput {
  property_id: string;
  unit_number: string;
  floor_level?: string | null;
  bedrooms: number;
  bathrooms: number;
  sitting_rooms?: number;
  kitchens?: number;
  rent_amount: number;
  security_deposit?: number | null;
  description?: string | null;
  status?: string;
}

/**
 * Create a rental unit.
 *
 * Through the API rather than the table: the backend inherits the property's
 * rent_currency onto the unit and checks the caller owns the property. A
 * direct insert did neither, so a unit on a property listed in USD was stored
 * against the default currency.
 */
export async function createRentalUnit(
  data: RentalUnitInput,
): Promise<{ ok: boolean; detail?: string }> {
  const res = await fetch(`${API_BASE}/rental-units`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  if (res.ok) return { ok: true };
  const err = await res.json().catch(() => ({}));
  return { ok: false, detail: err.detail };
}

export interface RentalUnit {
  id: string;
  property_id: string;
  unit_number: string;
  floor_level: string | null;
  bedrooms: number;
  bathrooms: number;
  rent_amount: number;
  rent_currency: string;
  security_deposit: number | null;
  status: string;
  description: string | null;
}

export async function listPropertyUnits(propertyId: string): Promise<RentalUnit[]> {
  const res = await fetch(`${API_BASE}/rental-units/property/${propertyId}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data?.items ?? [];
}

export async function updateRentalUnit(
  unitId: string,
  data: Partial<RentalUnitInput>,
): Promise<boolean> {
  const res = await fetch(`${API_BASE}/rental-units/${unitId}`, {
    method: 'PATCH',
    headers: await authHeaders(),
    body: JSON.stringify(data),
  });
  return res.ok;
}

export async function deleteRentalUnit(unitId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE}/rental-units/${unitId}`, {
    method: 'DELETE',
    headers: await authHeaders(),
  });
  return res.ok;
}
