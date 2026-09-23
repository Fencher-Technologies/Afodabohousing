/**
 * Writes public/sitemap.xml before the site is built.
 *
 * This used to be a serverless function. It runs at build time now, so the
 * site needs nothing but static files. The listings are a snapshot from the
 * last build rather than live, which is fine: search engines recrawl, and
 * every deploy refreshes it.
 *
 * Never fails the build. Without database credentials it still writes the
 * static pages.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const SITE = (process.env.VITE_SITE_URL || 'https://www.axishousings.com').replace(/\/$/, '');
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY;

const STATIC_PAGES = [
  ['/', 'daily', '1.0'],
  ['/properties', 'hourly', '0.9'],
  ['/about', 'monthly', '0.6'],
  ['/contact', 'monthly', '0.6'],
  ['/getting-started', 'monthly', '0.7'],
  ['/login', 'yearly', '0.4'],
  ['/signup', 'yearly', '0.5'],
  ['/terms', 'yearly', '0.3'],
  ['/privacy', 'yearly', '0.3'],
];

async function listings() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const url =
    `${SUPABASE_URL}/rest/v1/properties?select=id,updated_at,created_at` +
    `&is_active=eq.true&status=eq.available&order=updated_at.desc&limit=5000`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) throw new Error(`listing lookup returned ${res.status}`);
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

function entry(loc, changefreq, priority, lastmod) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>',
  ].filter(Boolean).join('\n');
}

let properties = [];
try {
  properties = await listings();
  console.log(`sitemap: ${properties.length} listings included`);
} catch (err) {
  console.warn(`sitemap: listings skipped (${err.message})`);
}

const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  [
    ...STATIC_PAGES.map(([p, freq, pri]) => entry(`${SITE}${p}`, freq, pri)),
    ...properties.map((p) =>
      entry(
        `${SITE}/properties/${p.id}`,
        'weekly',
        '0.8',
        (p.updated_at || p.created_at || '').slice(0, 10) || undefined,
      ),
    ),
  ].join('\n') +
  '\n</urlset>\n';

await mkdir('public', { recursive: true });
await writeFile(path.join('public', 'sitemap.xml'), xml, 'utf8');
console.log('sitemap: wrote public/sitemap.xml');
