# Serverless functions (parked)

These two Vercel functions were removed from `api/` because deployments started
failing after they were added, and we had no access to the build log to see why.
The site now does the same jobs without them:

* `sitemap.js.txt` built sitemap.xml on request. Replaced by
  `scripts/generate-sitemap.mjs`, which writes `public/sitemap.xml` during the
  build instead.
* `preview.js.txt` gave WhatsApp and Facebook a per-property preview card
  (the listing's own photo, price and location). There is no build-time
  replacement for this: shared links now show the generic Axis card from
  index.html. To bring it back, move the file to `api/preview.js`, restore the
  crawler rewrite in vercel.json, and check the deployment log.
