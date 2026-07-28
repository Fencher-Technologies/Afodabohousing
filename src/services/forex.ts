import { apiGet } from './api';

let cachedRates: Record<string, number> | null = null;

export interface ForexRates {
  base: string;
  rates: Record<string, number>;
  updated: string;
}

export async function getForexRates(): Promise<ForexRates> {
  return apiGet<ForexRates>('/forex/rates');
}

export async function getCachedRates(): Promise<Record<string, number>> {
  if (cachedRates) return cachedRates;
  try {
    const data = await getForexRates();
    cachedRates = data.rates;
    return data.rates;
  } catch {
    return {};
  }
}

export function formatForex(ugxAmount: number, rates: Record<string, number>): string {
  const usd = ugxAmount * (rates['USD'] || 0);
  if (usd <= 0) return '';
  return `≈ $${usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} USD`;
}
