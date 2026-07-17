# NusaCanvas deployment guide

The canonical production origin is `https://nusacanvas.space`.

NusaCanvas is deployed as Cloudflare Workers Static Assets using the Worker named `nusacanvas-space`. Both `nusacanvas.space` and `www.nusacanvas.space` are declared as custom domains in `wrangler.jsonc`; canonical page URLs use the apex domain.

## Requirements

- Node.js 24.x
- Authenticated access to the NusaCanvas Cloudflare account
- Git access to `drewsebastians/nusacanvas.space`

Never commit Cloudflare or GitHub credentials.

## Release

From the repository root:

```text
npm ci
npm run verify:batch1
npm run build
npm run deploy
npm run verify:production
```

The build output is `dist/`; Wrangler deploys that directory, not the repository root.

Production pages allow search indexing, expose `sitemap.xml`, and use canonical URLs on `nusacanvas.space`. The application workspace at `/workspace/` remains `noindex` because it is an interactive tool rather than a search landing page.

## Verification

- `https://nusacanvas.space/` returns HTTP 200.
- Public pages do not return `X-Robots-Tag: noindex`.
- `robots.txt` allows crawling and points to the production sitemap.
- Public HTML contains an apex-domain canonical URL.
- CSS, JavaScript, map data, guides, and sample assets return HTTP 200.
- Unknown paths return HTTP 404.
- CSP, nosniff, referrer, and permissions headers remain present.

## Rollback

Use the Cloudflare Worker deployment history to restore the last known-good version, then run `npm run verify:production`. Do not enable GitHub Pages; Cloudflare Workers is the only production deployment path.
