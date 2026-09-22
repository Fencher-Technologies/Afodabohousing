/**
 * Per-page SEO: title, description, canonical link, social cards and
 * structured data.
 *
 * The site is a single page app, so every route served the same tags from
 * index.html: one title, one description, no canonical. Search engines had
 * nothing to tell pages apart. This sets them as each page mounts, and
 * restores the defaults when it unmounts.
 */
import { useEffect } from 'react';

export const SITE_NAME = 'Axis Housing';
export const SITE_URL = 'https://axishousings.com';
export const DEFAULT_DESCRIPTION =
  'Find verified rentals and manage them end to end on Axis Housing. Search homes, sign tenancy agreements online, record rent payments and issue receipts.';

type SeoOptions = {
  title: string;
  description?: string;
  /** Path only, e.g. "/properties". Defaults to the current path. */
  path?: string;
  image?: string;
  /** Extra keywords for this page. */
  keywords?: string[];
  /** schema.org JSON-LD for this page. */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  noIndex?: boolean;
};

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSeo({ title, description, path, image, keywords, jsonLd, noIndex }: SeoOptions) {
  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
    const desc = description || DEFAULT_DESCRIPTION;
    const url = `${SITE_URL}${path ?? window.location.pathname}`;
    const img = image || `${SITE_URL}/og-image.png`;

    document.title = fullTitle;
    setMeta('meta[name="description"]', 'name', 'description', desc);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    if (keywords?.length) {
      setMeta('meta[name="keywords"]', 'name', 'keywords', keywords.join(', '));
    }
    setLink('canonical', url);

    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', desc);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[property="og:image"]', 'property', 'og:image', img);
    setMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', img);

    let script: HTMLScriptElement | null = null;
    if (jsonLd) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      if (script) script.remove();
    };
  }, [title, description, path, image, keywords?.join(','), JSON.stringify(jsonLd ?? null), noIndex]);
}

/** schema.org description of a listing, for rich results. */
export function propertyJsonLd(p: {
  id: string;
  title?: string | null;
  description?: string | null;
  images?: unknown;
  monthly_rent?: number | null;
  rent_currency?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
}) {
  const images = Array.isArray(p.images) ? (p.images as string[]) : [];
  return {
    '@context': 'https://schema.org',
    '@type': 'Residence',
    name: p.title || 'Rental property',
    description: p.description || DEFAULT_DESCRIPTION,
    url: `${SITE_URL}/properties/${p.id}`,
    image: images.length ? images : [`${SITE_URL}/og-image.png`],
    numberOfBedrooms: p.bedrooms ?? undefined,
    numberOfBathroomsTotal: p.bathrooms ?? undefined,
    address: {
      '@type': 'PostalAddress',
      streetAddress: p.address || undefined,
      addressLocality: p.city || undefined,
      addressCountry: p.country || undefined,
    },
    offers: p.monthly_rent
      ? {
          '@type': 'Offer',
          price: p.monthly_rent,
          priceCurrency: p.rent_currency || 'UGX',
          availability: 'https://schema.org/InStock',
          url: `${SITE_URL}/properties/${p.id}`,
        }
      : undefined,
  };
}
