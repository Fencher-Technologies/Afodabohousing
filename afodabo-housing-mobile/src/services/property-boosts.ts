import { apiRequest } from './backend-api';

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
  return apiRequest(`/properties/${propertyId}/boost`, {
    auth: true,
    body: { duration_days: durationDays },
    method: 'POST',
  });
}
