# NusaCanvas public-site refresh release report

## Release identity

- Primary redesign PR: [#3](https://github.com/drewsebastians/nusacanvas.space/pull/3)
- Production hotfix PRs: [#4](https://github.com/drewsebastians/nusacanvas.space/pull/4), [#5](https://github.com/drewsebastians/nusacanvas.space/pull/5)
- Final merge and deployed commit: `909194db7066cde7ea3d92e547948a67132cefc7`
- Cloudflare Worker version: `b36ee764-d519-4989-bfc0-6ef5afef3558`
- Deployment completed: `2026-07-21T04:28:34.756Z`
- Production URL: <https://nusacanvas.space>
- Rollback reference: `4b4050541b48a45a02909ef551e481267c583bea` (initial redesign merge, before release-only fixes)

## Routes released and verified

- `/`
- `/highlight-regions/`
- `/excel-to-map/`
- `/sales-territories/`
- `/coverage-analysis/`
- `/workspace/`

`/workspace/` remains `noindex,follow`; public routes remain indexable. Sitemap, robots, canonical URLs, CSP, `nosniff`, and unknown-route `404` behavior passed production verification.

## Final test matrix

- GitHub Actions CI on final `main`: passed (`data-license`, `checks`)
- `npm ci` equivalent clean install: passed in final GitHub Actions CI
- `node scripts/build.js`: passed; 70 allowlisted files and six deterministic public illustrations
- `node scripts/verify-batch1.js`: passed before promotion
- `node scripts/verify-batch2r-public-shell.js`: passed
- `node scripts/verify-batch2r-closure.js`: passed
- `node scripts/check-public-performance.js`: passed
- Batch 2R public-shell Playwright: 16 passed across desktop and mobile
- `node scripts/verify-production.js https://nusacanvas.space`: passed after final deployment

## Production smoke results

- Desktop `1440 x 1000` and mobile `393 x 851`: landing page navigation, hero, dots, CTA, four feature cards, upcoming labels, and no horizontal overflow verified.
- Carousel: no arrows, no numerical slide counter, four named dots, and no aggressive counter labels. Seven-second timing is covered by the green desktop/mobile Playwright suite; the release browser tab correctly paused autoplay while hidden.
- Available and upcoming feature pages rendered with no external assets, no `noindex`, and no overflow.
- Workspace: Highlight-regions and spreadsheet goals opened; the map loaded with 519 regions and administrative labels; manual region selection and the two-row sample matching flow completed.
- Public asset inventory after final deploy contained only two local stylesheets, `public-shell.js`, and the first local hero SVG. No Leaflet, GeoJSON, XLSX, workspace `app.js`/`map.js`, or external request was present.

## Performance and evidence

- Public performance gate: 7 requests, `public-shell.js` 1,573 gzip bytes, first hero SVG 146,640 gzip bytes.
- Final browser asset inventory: 4 same-origin startup assets.
- Visual evidence:
  - `artifacts/batch-2r/public-shell-screenshots/home-desktop.png`
  - `artifacts/batch-2r/public-shell-screenshots/home-mobile.png`
  - `artifacts/batch-2r/workspace-screenshots/manual-desktop.png`
  - `artifacts/batch-2r/workspace-screenshots/spreadsheet-match-desktop.png`

## Release corrections

1. Removed changing assistive-technology slide-count labels so the carousel is dots-only and does not expose a `1 of 4`-style counter.
2. Added `Cache-Control: no-transform` so Cloudflare Web Analytics cannot inject an external beacon into public HTML.

No manual approval remains outstanding. There are no blocking limitations.
