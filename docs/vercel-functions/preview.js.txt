/**
 * Link previews for shared properties (WhatsApp, Facebook, X, Telegram…).
 *
 * The site is a single-page app: every URL serves the same index.html, so
 * every shared property showed the same generic text and no picture. Chat
 * apps don't run JavaScript, so tags added in the browser come too late.
 *
 * vercel.json sends only crawler requests for /properties/:id here. This
 * returns a small page carrying that property's title, price, location and
 * first photo, then forwards real visitors to the listing.
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const SITE = process.env.VITE_SITE_URL || 'https://www.axishousings.com';
const FIELDS = 'id,title,description,images,monthly_rent,rent_currency,address,city,bedrooms,bathrooms,is_active';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function money(amount, currency) {
  const value = Number(amount || 0);
  return `${currency || 'UGX'} ${value.toLocaleString('en-US')}`;
}

async function fetchProperty(id) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&select=${FIELDS}&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

export default async function handler(req, res) {
  const id = (req.query && req.query.id) || '';
  const target = id ? `${SITE}/properties/${encodeURIComponent(id)}` : SITE;

  let property = null;
  try {
    if (id) property = await fetchProperty(id);
  } catch (err) {
    console.error('preview lookup failed:', err);
  }

  const title = property
    ? `${property.title} — ${money(property.monthly_rent, property.rent_currency)}/month`
    : 'Axis Housing – Housing Made Easy';

  const place = property
    ? [property.address, property.city].filter(Boolean).join(', ')
    : '';
  const rooms = property
    ? [
        property.bedrooms ? `${property.bedrooms} bedroom${property.bedrooms === 1 ? '' : 's'}` : null,
        property.bathrooms ? `${property.bathrooms} bathroom${property.bathrooms === 1 ? '' : 's'}` : null,
      ].filter(Boolean).join(', ')
    : '';

  const description = property
    ? [place, rooms, 'View this home on Axis Housing.'].filter(Boolean).join(' · ')
    : 'Find verified rentals, sign digital agreements and manage rent on Axis.';

  const image =
    property && Array.isArray(property.images) && property.images.length
      ? property.images[0]
      : `${SITE}/og-image.png`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Cached at the edge so repeat shares don't re-query the database.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Axis Housing">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:image" content="${escapeHtml(image)}">
<meta property="og:url" content="${escapeHtml(target)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(title)}">
<meta name="twitter:description" content="${escapeHtml(description)}">
<meta name="twitter:image" content="${escapeHtml(image)}">
<link rel="canonical" href="${escapeHtml(target)}">
<meta http-equiv="refresh" content="0; url=${escapeHtml(target)}">
</head>
<body>
<p><a href="${escapeHtml(target)}">${escapeHtml(title)}</a></p>
<script>window.location.replace(${JSON.stringify(target)});</script>
</body>
</html>`);
}
