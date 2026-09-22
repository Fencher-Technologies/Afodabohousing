/**
 * The message used when a listing is shared (WhatsApp, SMS, anywhere).
 *
 * Always ends with the listing's link on axishousings.com, so whoever
 * receives it can open the home and find the rest of Axis.
 */
const SITE_URL = 'https://axishousings.com';

export type ShareableProperty = {
  id: string;
  title?: string | null;
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
  const rent = p.monthly_rent
    ? `${p.rent_currency || 'UGX'} ${Number(p.monthly_rent).toLocaleString()}/month`
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
  ].filter((line) => line !== null).join('\n');
}
