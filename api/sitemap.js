/**
 * sitemap.xml, generated from the live listings.
 *
 * A static file would go stale the moment a property is added or unlisted,
 * so this lists the public pages plus every active listing.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const SITE = (process.env.VITE_SITE_URL || 'https://www.axishousings.com').replace(/\/$/, '');

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/properties', priority: '0.9', changefreq: 'hourly' },
  { path: '/about', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.6', changefreq: 'monthly' },
  { path: '/getting-started', priority: '0.7', changefreq: 'monthly' },
  { path: '/login', priority: '0.4', changefreq: 'yearly' },
  { path: '/signup', priority: '0.5', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
];

async function fetchProperties() {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  const url =
    `${SUPABASE_URL}/rest/v1/properties?select=id,updated_at,created_at` +
    `&is_active=eq.true&status=eq.available&order=updated_at.desc&limit=5000`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return [];
  const rows = await res.json();
  return Array.isArray(rows) ? rows : [];
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    lastmod ? `    <lastmod>${lastmod}</lastmod>` : '',
    changefreq ? `    <changefreq>${changefreq}</changefreq>` : '',
    priority ? `    <priority>${priority}</priority>` : '',
    '  </url>',
  ].filter(Boolean).join('\n');
}

export default async function handler(req, res) {
  let properties = [];
  try {
    properties = await fetchProperties();
  } catch (err) {
    console.error('sitemap listing lookup failed:', err);
  }

  const entries = [
    ...STATIC_PAGES.map((p) => urlEntry({ loc: `${SITE}${p.path}`, changefreq: p.changefreq, priority: p.priority })),
    ...properties.map((p) =>
      urlEntry({
        loc: `${SITE}/properties/${p.id}`,
        lastmod: (p.updated_at || p.created_at || '').slice(0, 10) || undefined,
        changefreq: 'weekly',
        priority: '0.8',
      }),
    ),
  ];

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`,
  );
}
