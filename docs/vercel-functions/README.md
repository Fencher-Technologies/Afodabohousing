# Serverless functions (parked)

These two Vercel functions were removed from `api/` because production
deployments began failing the moment they were added, and nobody had access to
the build log to see why. Removing them made deployments green again.

What they did:

* `preview.js.txt` gave WhatsApp, Facebook and X a per-property preview card:
  the listing's own photo, its price and its location. Without it, a shared
  link shows the generic Axis card from index.html.
* `sitemap.js.txt` built sitemap.xml on request. Already replaced by
  `scripts/generate-sitemap.mjs`, which writes the file during the build, so
  this one does not need to come back.

## Testing them safely on a branch

A push to any branch other than `main` creates a preview deployment. It gets
its own address and cannot affect the live site, so a failure costs nothing.

```bash
git checkout -b link-previews
mkdir -p api
cp docs/vercel-functions/preview.js.txt api/preview.js
```

Then add the crawler rewrite to `vercel.json`, above the catch-all:

```json
{
  "source": "/properties/:id",
  "has": [
    {
      "type": "header",
      "key": "user-agent",
      "value": ".*(WhatsApp|facebookexternalhit|Facebot|Twitterbot|TelegramBot|Slackbot|LinkedInBot|Discordbot|Googlebot|bingbot).*"
    }
  ],
  "destination": "/api/preview?id=:id"
}
```

```bash
git add -A
git commit -m "Test: per-property link previews"
git push -u origin link-previews
```

The deployment result shows up in the repository's deployment history within
about a minute, marked Preview. If it succeeds, merge the branch into `main`.
If it fails, delete the branch and nothing is lost:

```bash
git checkout main
git branch -D link-previews
git push origin --delete link-previews
```

## If the functions cannot be made to work

Plan B is to write the preview pages during the build instead: generate a
static `dist/properties/<id>/index.html` per listing, carrying that listing's
meta tags and loading the same app. No serverless functions involved. Listings
added after a build would show the generic card until the next deploy.
