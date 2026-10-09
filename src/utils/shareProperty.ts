/**
 * The message used when a listing is shared (WhatsApp, SMS, anywhere).
 *
 * Ends with the listing's link on axishousings.com plus a line pointing at
 * the app download, so a share both opens the home and recruits the person
 * who receives it. That second line is the marketing purpose of sharing.
 */
import { GET_APP_URL } from '@/config/app-links';

const SITE_URL = 'https://www.axishousings.com';

export type ShareableProperty = {
  id: string;
  title?: string | null;
  /** Web uses rent_amount, the preview function uses monthly_rent. */
  rent_amount?: number | string | null;
  monthly_rent?: number | string | null;
  rent_currency?: string | null;
  address?: string | null;
  city?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
};

export function propertyUrl(id: string, origin?: string): string {
  const base = (origin || SITE_URL).replace(/\/$/, '');
  return `${base}/properties/${id}`;
}

export function propertyShareText(p: ShareableProperty, url: string): string {
  const amount = p.rent_amount ?? p.monthly_rent;
  const rent = amount
    ? `${p.rent_currency || 'USD'} ${Number(amount).toLocaleString()}/month`
    : null;
  const place = [p.address, p.city].filter(Boolean).join(', ');
  const rooms = [
    p.bedrooms ? `${p.bedrooms} bedroom${p.bedrooms === 1 ? '' : 's'}` : null,
    p.bathrooms ? `${p.bathrooms} bathroom${p.bathrooms === 1 ? '' : 's'}` : null,
  ].filter(Boolean).join(', ');

  return [
    p.title || 'Property on Axis Housing',
    rent,
    place || null,
    rooms || null,
    '',
    `View it on Axis: ${url}`,
    `Get the Axis app: ${GET_APP_URL}`,
  ].filter((line) => line !== null).join('\n');
}
