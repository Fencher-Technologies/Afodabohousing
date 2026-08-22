/** Currencies supported by Pesapal gateway. */
export const PESAPAL_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KES' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'FC' },
  { code: 'BIF', name: 'Burundian Franc', symbol: 'FBu' },
  { code: 'MZN', name: 'Mozambican Metical', symbol: 'MT' },
] as const;

export type PesapalCurrency = (typeof PESAPAL_CURRENCIES)[number]['code'];

export function getCurrencySymbol(code: string): string {
  return PESAPAL_CURRENCIES.find(c => c.code === code)?.symbol || code;
}

export function getCurrencyName(code: string): string {
  return PESAPAL_CURRENCIES.find(c => c.code === code)?.name || code;
}
