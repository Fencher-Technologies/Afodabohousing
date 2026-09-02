const CURRENCY_SYMBOLS: Record<string, string> = {
  UGX: 'UGX', KES: 'KES', NGN: '₦', GHS: 'GH₵', TZS: 'TSh', ZAR: 'R',
  USD: '$', GBP: '£', EUR: '€', CDF: 'FC', RWF: 'RF', ETB: 'Br',
  BIF: 'FBu', ZMW: 'ZK', MWK: 'MK', MZN: 'MT', SZL: 'E',
};

export function formatCurrency(amount: number | null | undefined, currency?: string | null): string {
  const cur = currency || 'UGX';
  const sym = CURRENCY_SYMBOLS[cur] || cur;
  const n = amount || 0;
  return `${sym} ${n.toLocaleString()}`;
}

export function getCurrencySymbol(currency?: string | null): string {
  return CURRENCY_SYMBOLS[currency || 'UGX'] || currency || 'UGX';
}
