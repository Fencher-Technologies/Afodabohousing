import { apiRequest } from './backend-api';

export interface BoostPrice {
  duration_days: number;
  amount: number;
  currency: string;
}

export interface InitiateBoostPayload {
  property_id: string;
  duration_days: number;
  phone_number: string;
}

export interface InitiateBoostResponse {
  boost_id: string;
  reference: string;
  status: string;
  message: string;
}

const BOOST_PRICES = [
  { duration_days: 7, amount: 15000, label: '7 days', priceLabel: 'UGX 15,000' },
  { duration_days: 14, amount: 25000, label: '14 days', priceLabel: 'UGX 25,000' },
  { duration_days: 30, amount: 45000, label: '30 days', priceLabel: 'UGX 45,000' },
] as const;

export function getBoostPriceOptions() {
  return BOOST_PRICES;
}

export async function fetchBoostPrice(durationDays: number) {
  return apiRequest<BoostPrice>(`/boosts/price/default?duration_days=${durationDays}`);
}

export async function initiateBoost(payload: InitiateBoostPayload) {
  return apiRequest<InitiateBoostResponse>('/boosts/initiate', {
    auth: true,
    body: {
      property_id: payload.property_id,
      duration_days: payload.duration_days,
      phone_number: payload.phone_number,
    },
    method: 'POST',
  });
}
