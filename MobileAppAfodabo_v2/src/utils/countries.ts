/**
 * Dialling codes for the phone fields, so nobody has to remember "+256".
 * East Africa first (where Axis operates), then the rest alphabetically.
 */
export type Country = { code: string; name: string; dial: string; flag: string };

export const COUNTRIES: Country[] = [
  { code: 'UG', name: 'Uganda', dial: '256', flag: '🇺🇬' },
  { code: 'KE', name: 'Kenya', dial: '254', flag: '🇰🇪' },
  { code: 'TZ', name: 'Tanzania', dial: '255', flag: '🇹🇿' },
  { code: 'RW', name: 'Rwanda', dial: '250', flag: '🇷🇼' },
  { code: 'BI', name: 'Burundi', dial: '257', flag: '🇧🇮' },
  { code: 'SS', name: 'South Sudan', dial: '211', flag: '🇸🇸' },
  { code: 'CD', name: 'DR Congo', dial: '243', flag: '🇨🇩' },
  { code: 'ET', name: 'Ethiopia', dial: '251', flag: '🇪🇹' },
  { code: 'SO', name: 'Somalia', dial: '252', flag: '🇸🇴' },
  { code: 'AU', name: 'Australia', dial: '61', flag: '🇦🇺' },
  { code: 'BE', name: 'Belgium', dial: '32', flag: '🇧🇪' },
  { code: 'BW', name: 'Botswana', dial: '267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', dial: '55', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', dial: '1', flag: '🇨🇦' },
  { code: 'CN', name: 'China', dial: '86', flag: '🇨🇳' },
  { code: 'DK', name: 'Denmark', dial: '45', flag: '🇩🇰' },
  { code: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬' },
  { code: 'FR', name: 'France', dial: '33', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', dial: '49', flag: '🇩🇪' },
  { code: 'GH', name: 'Ghana', dial: '233', flag: '🇬🇭' },
  { code: 'IN', name: 'India', dial: '91', flag: '🇮🇳' },
  { code: 'IE', name: 'Ireland', dial: '353', flag: '🇮🇪' },
  { code: 'IT', name: 'Italy', dial: '39', flag: '🇮🇹' },
  { code: 'JP', name: 'Japan', dial: '81', flag: '🇯🇵' },
  { code: 'MW', name: 'Malawi', dial: '265', flag: '🇲🇼' },
  { code: 'MU', name: 'Mauritius', dial: '230', flag: '🇲🇺' },
  { code: 'MA', name: 'Morocco', dial: '212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', dial: '258', flag: '🇲🇿' },
  { code: 'NL', name: 'Netherlands', dial: '31', flag: '🇳🇱' },
  { code: 'NG', name: 'Nigeria', dial: '234', flag: '🇳🇬' },
  { code: 'NO', name: 'Norway', dial: '47', flag: '🇳🇴' },
  { code: 'PK', name: 'Pakistan', dial: '92', flag: '🇵🇰' },
  { code: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦' },
  { code: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦' },
  { code: 'ZA', name: 'South Africa', dial: '27', flag: '🇿🇦' },
  { code: 'ES', name: 'Spain', dial: '34', flag: '🇪🇸' },
  { code: 'SE', name: 'Sweden', dial: '46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '41', flag: '🇨🇭' },
  { code: 'TR', name: 'Turkey', dial: '90', flag: '🇹🇷' },
  { code: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪' },
  { code: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dial: '1', flag: '🇺🇸' },
  { code: 'ZM', name: 'Zambia', dial: '260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', dial: '263', flag: '🇿🇼' },
];

export const DEFAULT_COUNTRY = COUNTRIES[0]; // Uganda

/**
 * Longest dial codes first, so +255 is never read as +25. Where two
 * countries share a code (+1 is both the US and Canada), the first listed
 * here wins, so a +1 number shows as the United States.
 */
const SHARED_CODE_PREFERENCE = ['US'];
const BY_LENGTH = [...COUNTRIES].sort(
  (a, b) =>
    b.dial.length - a.dial.length ||
    Number(SHARED_CODE_PREFERENCE.includes(b.code)) - Number(SHARED_CODE_PREFERENCE.includes(a.code)),
);

/** Split a stored number into the country and the local part. */
export function splitPhone(value: string | null | undefined): { country: Country; national: string } {
  const digits = String(value || '').replace(/[^\d+]/g, '').replace(/^\+/, '');
  if (!digits) return { country: DEFAULT_COUNTRY, national: '' };
  for (const country of BY_LENGTH) {
    if (digits.startsWith(country.dial) && digits.length > country.dial.length) {
      return { country, national: digits.slice(country.dial.length) };
    }
  }
  return { country: DEFAULT_COUNTRY, national: digits.replace(/^0+/, '') };
}

/** Join a country and a typed local number into "+256752738927". */
export function joinPhone(country: Country, national: string): string {
  const local = String(national || '').replace(/\D/g, '').replace(/^0+/, '');
  return local ? `+${country.dial}${local}` : '';
}
