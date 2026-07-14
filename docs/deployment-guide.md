# NusaCanvas Deployment Guide

The future canonical production origin is:

```text
https://nusacanvas.space
```

That custom domain is not attached, routed, or indexable yet. Remote repository and Worker renames are deferred to the planned platform migration.

The current staging deployment target remains the existing Cloudflare Workers Static Assets service:

```text
https://mapnesia.andrew-sebastian91.workers.dev
```

This staging URL is intentionally non-indexable. Its legacy token is an infrastructure identifier only; the active product identity is NusaCanvas.

## Requirements

- Node.js 24.x
- npm
- Python 3.12 or newer
- Cloudflare account access for the `andrew-sebastian91` workers.dev subdomain
- Repository secrets:
  - `CLOUDFLARE_ACCOUNT_ID`
  - `CLOUDFLARE_API_TOKEN`

Do not commit Cloudflare credentials to the repository, workflow files, logs, screenshots, or artifacts.

## Local Checks

```text
npm ci
npm run verify:batch1
npm run build
```

The build output is `dist/`. Wrangler must deploy `dist/`, not the repository root.

## Local Cloudflare Preview

```text
npm run dev
```

This command rebuilds `dist/` and starts `wrangler dev` using `wrangler.jsonc`.

If you only need a plain static server for debugging:

```text
npm run dev:static
```

## Manual Staging Deploy

After credentials are available in the shell:

```text
npm run deploy
npm run verify:staging
```

Then run the smoke workflow against the live staging URL:

```text
PLAYWRIGHT_BASE_URL=https://mapnesia.andrew-sebastian91.workers.dev npm run test:e2e:smoke
```

On Windows PowerShell:

```text
$env:PLAYWRIGHT_BASE_URL = "https://mapnesia.andrew-sebastian91.workers.dev"
npm run test:e2e:smoke
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

## GitHub Actions Manual Deploy Fallback

`.github/workflows/deploy-cloudflare.yml` is a manual `workflow_dispatch` fallback. The active staging deployment path is Cloudflare direct build. The manual fallback runs the quality gate before deployment and uses the official Cloudflare Wrangler action with:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

The workflow records the staging URL in the job summary. It does not contain credential values. It intentionally does not run on every `main` push so the repository does not double-deploy while Cloudflare direct build is active.

## Cloudflare Direct Builds

If Cloudflare is connected directly to this repository and the dashboard deploy command is:

```text
npx wrangler deploy
```

the repository `postinstall` script builds `dist/` during dependency installation before Wrangler runs. Keep `.node-version` and `.nvmrc` pinned to Node 24 so the direct Cloudflare build environment matches the GitHub Actions workflow and local engine requirement.

## Verification Checklist

- `npm run check` passes.
- `npm run build` produces `dist/`.
- `wrangler deploy` deploys Worker `mapnesia`.
- `https://mapnesia.andrew-sebastian91.workers.dev` returns HTTP 200.
- Required CSS, JS, Leaflet, GeoJSON, and sample assets return HTTP 200.
- Trust pages return HTTP 200: `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/sources-licenses/`, `/data-methodology/`, `/limitations/`, `/changelog/`, and `/guides/mengapa-jumlah-wilayah-peta-berbeda/`.
- Unknown paths return HTTP 404.
- Responses include `X-Robots-Tag: noindex, nofollow, noarchive`.
- Responses include the Batch 1 Content Security Policy.
- `robots.txt` contains `Disallow: /`.
- The Playwright smoke flow passes against the live staging URL.

## Noindex Rule

Staging includes three layers of noindex protection:

- `robots.txt` blocks crawling.
- `_headers` sends `X-Robots-Tag: noindex, nofollow, noarchive`.
- `index.html` includes a robots meta tag.
- Trust pages include robots meta tags.

Do not add a canonical URL pointing to workers.dev, and do not activate the future custom domain in this batch. The current CSP allows same-origin scripts, styles, images, and fetches only; object/embed/base/form/frame entry points are blocked.

## Cache Behavior

The staging `_headers` file keeps deployment updates conservative:

- `/`, `/index.html`, `robots.txt`, and JSON control files use `Cache-Control: no-cache`.
- `/assets/*` uses short browser caching.
- `/data/*.geojson` uses one-day caching because current data filenames are not content-hashed.
- Year-long immutable browser caching is deferred until heavy assets have versioned filenames.

## Rollback

1. Open the Cloudflare dashboard for Worker `mapnesia`.
2. Review the Worker deployment/version history.
3. Select the last known-good deployment.
4. Roll back to that deployment.
5. Run `npm run verify:staging`.
6. Run the live smoke test with `PLAYWRIGHT_BASE_URL` set to the staging URL.

Do not re-enable GitHub Pages as part of rollback. Keep rollback on Cloudflare so the staging path remains consistent.

## GitHub Pages

GitHub Pages is not a deployment path for this repository. If Pages is ever found enabled again, disable it in repository Settings -> Pages before treating the Cloudflare migration as complete.
