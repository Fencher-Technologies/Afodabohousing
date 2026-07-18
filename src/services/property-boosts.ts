import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface BoostPlan {
  days: number;
  label: string;
  price: number;
}

export const BOOST_PLANS: BoostPlan[] = [
  { days: 7, label: '7 days', price: 25000 },
  { days: 14, label: '14 days', price: 45000 },
  { days: 30, label: '30 days', price: 80000 },
];

export function formatBoostPrice(amount: number) {
  return `UGX ${amount.toLocaleString()}`;
}

export function getBoostedUntil(property: unknown) {
  const value =
    typeof property === 'object' && property !== null && 'boosted_until' in property
      ? (property as { boosted_until?: string | null }).boosted_until
      : null;

  return value || null;
}

export function isPropertyBoosted(property: unknown) {
  if (typeof property !== 'object' || property === null) {
    return false;
  }

  if ('is_boosted' in property && typeof (property as { is_boosted?: unknown }).is_boosted === 'boolean') {
    return (property as { is_boosted: boolean }).is_boosted;
  }

  const boostedUntil = getBoostedUntil(property);
  return boostedUntil ? new Date(boostedUntil).getTime() > Date.now() : false;
}

export async function purchasePropertyBoost(propertyId: string, durationDays: number) {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Please sign in again before boosting a property.');
  }

  const response = await fetch(`${API_BASE}/properties/${propertyId}/boost`, {
    body: JSON.stringify({ duration_days: durationDays }),
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  const payload = response.headers.get('content-type')?.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const detail =
      typeof payload === 'object' && payload !== null && 'detail' in payload
        ? String(payload.detail)
        : typeof payload === 'string'
          ? payload
          : 'Could not boost this property.';

    throw new Error(detail);
  }

  return payload;
}
