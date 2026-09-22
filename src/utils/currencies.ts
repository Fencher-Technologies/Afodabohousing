/**
 * Currencies a manager can report totals in, and price a property in.
 *
 * Axis works anywhere, so this is not limited to East Africa: the list covers
 * the currencies of the countries the app offers, with the region Axis serves
 * first for convenience.
 */
export type CurrencyOption = { code: string; name: string };

export const CURRENCIES: CurrencyOption[] = [
  { code: 'UGX', name: 'Ugandan Shilling' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'TZS', name: 'Tanzanian Shilling' },
  { code: 'RWF', name: 'Rwandan Franc' },
  { code: 'BIF', name: 'Burundian Franc' },
  { code: 'SSP', name: 'South Sudanese Pound' },
  { code: 'CDF', name: 'Congolese Franc' },
  { code: 'ETB', name: 'Ethiopian Birr' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'DKK', name: 'Danish Krone' },
  { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'GHS', name: 'Ghanaian Cedi' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'MAD', name: 'Moroccan Dirham' },
  { code: 'MUR', name: 'Mauritian Rupee' },
  { code: 'MWK', name: 'Malawian Kwacha' },
  { code: 'MZN', name: 'Mozambican Metical' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'NOK', name: 'Norwegian Krone' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'SEK', name: 'Swedish Krona' },
  { code: 'TRY', name: 'Turkish Lira' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'ZMW', name: 'Zambian Kwacha' },
  { code: 'ZWL', name: 'Zimbabwean Dollar' },
];

export const DEFAULT_CURRENCY = 'UGX';
