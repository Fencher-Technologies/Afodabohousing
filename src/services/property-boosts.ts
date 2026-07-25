import { supabase } from '@/integrations/supabase/client';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface BoostPlan {
  days: number;
  label: string;
  price: number;
}

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
  if (typeof property !== 'object' || property === null) return false;
  if ('is_boosted' in property && typeof (property as { is_boosted?: unknown }).is_boosted === 'boolean')
    return (property as { is_boosted: boolean }).is_boosted;
  const boostedUntil = getBoostedUntil(property);
  return boostedUntil ? new Date(boostedUntil).getTime() > Date.now() : false;
}

export async function getBoostPackages(): Promise<BoostPlan[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_BASE}/boosts/packages`, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  return res.json();
}