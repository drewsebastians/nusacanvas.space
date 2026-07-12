# Prompt 3 Performance Report

Generated for Batch 1 Prompt 3.

## Summary

Normal startup now loads only the simplified production geometry. The detailed geometry remains a local, pinned, checksum-verified export asset and is fetched only after the user explicitly enables high-detail export.

## Before and After

| Metric | Before Prompt 3 | After Prompt 3 |
|---|---:|---:|
| Startup geometry files | simplified + detailed | simplified only |
| Startup boundary external fallback | geoBoundaries `/current/` present in runtime code | removed |
| Initial compressed transfer estimate | 3,587,970 bytes | 590,827 bytes |
| Simplified geometry gzip | 518,479 bytes | 518,479 bytes |
| Detailed geometry gzip | 2,999,956 bytes at startup | 2,999,956 bytes on demand only |
| Shell JavaScript gzip | about 60 KB | 63,795 bytes |
| Initial required request count | about 11 | 10 |
| Forbidden startup URL budget | not enforced | enforced by `npm run test:performance` |

The after values come from `artifacts/batch-1/performance-budget-report.json`. The before initial estimate is the after startup set plus the previously automatic detailed geometry gzip size recorded in `artifacts/batch-1/baseline-measurements.json`.

## Startup Network

Allowed startup data:

- `data/indonesia-adm2-simplified.geojson`

Forbidden startup requests:

- `data/indonesia-adm2-detailed.geojson`
- `geoboundaries.org`
- HDX or other unpinned external boundary datasets

The Playwright smoke test records startup network evidence in `artifacts/batch-1/smoke-network.json`; the performance budget script fails if forbidden startup URLs appear.

## Label Decision

The old runtime created permanent labels for every region. The new runtime uses tiered labels:

- selected label: always prioritized;
- highlighted labels: always prioritized;
- general labels: shown only above the zoom threshold;
- mobile uses a stricter threshold;
- collision handling runs only against visible permanent label candidates.

Region selection, search, hover tooltips, and accessible path labels remain available even when general labels are hidden.

## Export Decision

High-detail export is explicit. When selected, the app asks for confirmation, downloads only the pinned local detailed GeoJSON, verifies SHA-256, merges it into an export-only feature set, and does not replace the on-screen simplified map.

PNG export now estimates pixel and memory cost. Large exports warn before rendering. If rendering fails, the app retries at 1920 x 1080 and tells the user that fallback resolution was used.

## Cloudflare Cache Behavior

The staging `_headers` file keeps noindex safeguards and uses conservative cache behavior:

- HTML and deployment control files revalidate with `no-cache`;
- local app assets use short browser caching;
- unversioned GeoJSON uses one-day caching, not year-long immutable caching;
- Content Security Policy now allows same-origin runtime assets and blocks object/base/form/frame entry points.

## Residual Risks

- The detailed GeoJSON is still large and can be expensive on low-memory browsers when users opt into high-detail export.
- Label thresholds are deterministic lab defaults; real low-end phones still need manual device testing.
- Cloudflare live verification remains blocked until an authorized deployment updates the active staging target with the required noindex and CSP headers.
