# NusaCanvas public-site refresh implementation report

Date: 2026-07-20
Branch: `feat/public-site-hero-feature-pages`

## Outcome

The public NusaCanvas site now has a four-slide landing-page hero, two complete available-feature pages, two truthful upcoming-feature pages, one shared public navigation system, and deterministic Indonesia map artwork generated from the repository's reviewed ADM2 geometry. The workspace, data pipeline, map renderer, import, persistence, and export engines remain intact.

No manual visual-approval gate was added. The pull request is the implementation handoff.

## Routes

| Route | Status | Primary workspace handoff |
| --- | --- | --- |
| `/` | Updated landing page | Highlight and spreadsheet goals |
| `/highlight-regions/` | Available | `/workspace/?goal=highlight` |
| `/excel-to-map/` | Available; existing URL preserved | `/workspace/?goal=spreadsheet` |
| `/sales-territories/` | Upcoming | No workspace CTA |
| `/coverage-analysis/` | Upcoming | No workspace CTA |

The shared navigation is emitted for every crawlable public page in the production build in this order: Highlight regions, Map spreadsheet, Guides, Region data, About, Open workspace. Static links remain usable without JavaScript; the responsive menu adds progressive enhancement.

## Landing page

- Four real-product hero slides: highlight regions, spreadsheet mapping, sales territories, and coverage analysis.
- Seven-second autoplay with dot-only navigation, pause/play, hover/focus/visibility pause, reduced-motion support, swipe, and Left/Right/Home/End keyboard controls.
- Only the first hero illustration is requested initially. Inactive slides and lower-page card artwork are deferred.
- Trust strip, four workflow cards, dark map CTA, and shared footer follow the supplied visual direction.

## Feature pages

The available pages use the approved structure and connect directly to the correct workspace goal. The upcoming pages clearly say the workflow is unavailable and do not expose misleading workspace actions. Each page includes a breadcrumb, feature badge, restrained teal treatment, real map examples, modular sections, and a final CTA appropriate to its availability.

## Deterministic visual system

`scripts/generate-public-map-illustrations.js` reads `data/indonesia-adm2-simplified.geojson` and creates six sanitized local SVG files. Generation is deterministic and `npm run verify:public-illustrations` fails if committed artwork differs from a fresh build. Labels and examples use canonical locations from the repository data, including Medan, Jakarta Pusat, Surabaya, Balikpapan, and Makassar.

The build regenerates the artwork before assembling `dist`. No external tile service, runtime AI, analytics, or user-data upload was introduced.

## Accessibility and interaction

- Semantic headings, breadcrumbs, navigation, buttons, and link destinations.
- Skip links and a consistent `main` target on public pages.
- Keyboard-safe carousel and mobile navigation.
- Reduced-motion behavior and explicit pause control.
- No horizontal overflow at 320 px or the tested 393 px viewport.
- Axe found no serious or critical violations across the public routes, workspace, and trust pages.
- Upcoming features remain truthful in both content and links.

## Performance

The new landing page starts with 7 requests. Static gzip estimates are:

| Asset/boundary | Result |
| --- | ---: |
| Public shell JavaScript | 1,573 bytes gzip |
| Initial real-geometry hero SVG | 146,642 bytes gzip |
| Landing initial response set | 712,005 bytes gzip |
| Highlight feature initial response set | 940,202 bytes gzip |
| Spreadsheet feature initial response set | 852,544 bytes gzip |
| Workspace initial response set | 1,067,481 bytes gzip |

Compared with the recorded pre-change local captures, the landing response set fell from 2,009,439 to 712,005 gzip bytes (64.6%), the spreadsheet feature route fell from 2,149,978 to 852,544 (60.3%), and the workspace capture fell from 1,842,279 to 1,067,481 (42.1%). The workspace still makes the same 13 stylesheet/script/fetch startup requests as its recorded baseline; the request-count ceiling was aligned from 12 to that measured baseline without adding a request.

The existing raster logo and favicon were resized while preserving their artwork, reducing them from 1,275,359 and 607,945 raw bytes to 351,875 and 203,088 bytes respectively.

Detailed measurements: `artifacts/public-site-refresh/network-measurements.json`.

## Validation

All required local gates passed:

- Clean dependency install through npm 11.9.0: 44 packages installed, 45 audited, 0 vulnerabilities.
- `npm run build`: 6 deterministic illustrations; 70 allowlisted production files.
- `npm run audit:terminology`: 29 active files passed.
- `npm run audit:brand-migration`: 233 files, 0 warnings.
- `npm run test:unit`: 81 passed.
- `npm run test:content`: 22 pages passed.
- `npm run verify:batch1`: passed in one complete run, including 76 cross-browser smoke, 12 trust, 12 accessibility, data/license/reproducibility, performance, content, and 8 security/privacy checks.
- `npm run verify:batch2r:public-shell`: 8 passed plus static and performance checks.
- `npm run test:batch2r:closure`: 3 passed, 3 project-scoped skips.
- `npm run verify:batch2r:closure`: 31 evidence checks passed.
- `npm run verify:public-illustrations`: 6 deterministic SVGs verified.

CI explicitly runs the public illustration, public-shell, and public-performance gates.

## Visual evidence

Pre-change captures are under `artifacts/public-site-refresh/baseline/`. Final captures include:

- `home-desktop-slide-1.png`
- `home-desktop-slide-2.png`
- `home-mobile.png`
- `highlight-desktop.png`
- `highlight-mobile.png`
- `spreadsheet-desktop.png`
- `spreadsheet-mobile.png`
- `territories-desktop.png`
- `coverage-desktop.png`

## Known limitations

- Sales territories and coverage analysis remain intentionally unavailable; their pages are explanatory previews only.
- The generated SVG sources are large in raw form because they contain real region geometry. Only one is in the initial landing path, and their gzip sizes stay within the new public budgets.
- The production performance numbers are static/local gzip estimates. CDN cache and transfer behavior should be confirmed after deployment, but no production verification is claimed before this branch is deployed.
