const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$' };

/** Amounts are US$; any other code (old data) is shown as its ISO code. */
export function formatCurrency(amount: number | null | undefined, currency?: string | null): string {
  const cur = currency || 'USD';
  const sym = CURRENCY_SYMBOLS[cur] || cur;
  const n = amount || 0;
  return `${sym} ${n.toLocaleString()}`;
}

export function getCurrencySymbol(currency?: string | null): string {
  return CURRENCY_SYMBOLS[currency || 'USD'] || currency || 'USD';
}
