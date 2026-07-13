# Architecture

Peta Warna Wilayah Indonesia is a static Cloudflare Workers Static Assets application.

## Runtime

- `index.html`
- Local CSS in `assets/css/app.css`
- Lightweight content CSS in `assets/css/content.css`
- Local JavaScript in `assets/js/`
- Local Leaflet 1.9.4 in `assets/vendor/leaflet/`
- Local GeoJSON data in `data/`
- Static trust and preview pages under `/about/`, `/contact/`, `/privacy/`, `/terms/`, `/sources-licenses/`, `/data-methodology/`, `/limitations/`, `/changelog/`, `/excel-to-map/`, and `/guides/`

No backend, database, API key, external tiles, analytics, or CDN dependency is required at runtime.

## Modules

- `app.js`: UI state, events, region selection, highlighting, import workflow, save/load, export actions.
- `map.js`: Leaflet map rendering and interaction.
- `import-core.js`, `csv-import.js`, and `xlsx-import.js`: one local spreadsheet pipeline with parsing limits and guards.
- `matching-engine.js`: lazy deterministic canonical matching and correction rules.
- `visualization-engine.js`: lazy local palette registry and deterministic classification.
- `project-storage.js`: project schema, JSON validation, local autosave, visualization, manual colors, and export metadata.
- `export.js`: shared export specification for SVG, PNG, raster PDF, and mapping CSV.
- `report-template.js`: data-error report copy/download helper used only on `/contact/`.

## Registry and project versioning

The runtime geometry remains keyed by legacy `region_id` values for compatibility. Batch 1 adds a registry adapter layer:

- `data/canonical-provinces-v1.csv` defines 38 current provinces.
- `data/canonical-regions-v1.csv` defines stable canonical region IDs for all 519 production geometry features.
- `data/crosswalk-region-ids-v1.csv` maps every legacy geometry ID to a canonical ID.
- `project-storage.js` writes project schema `1.1` with `boundaryVersion`, `registryVersion`, `sourceVersion`, `regionRefs`, and `migrationReport`.

This avoids destructive geometry renaming while giving saved projects a forward migration path.

## Data flow

1. Browser loads `data/indonesia-adm2-simplified.geojson`.
2. Leaflet renders polygons without a basemap.
3. Runtime labels are tiered: selected and highlighted labels are prioritized, while general labels appear only above the configured zoom threshold.
4. User selections are stored by stable `region_id`.
5. Paste/CSV/TSV/XLSX and project files are processed locally by File APIs.
6. Matching decisions, visualization specification, and export metadata stay in browser state/project JSON.
7. SVG/PNG/PDF/mapping CSV export is generated in-browser; PDF is currently raster.
7. If the user explicitly selects high-detail export, the browser fetches the pinned local `data/indonesia-adm2-detailed.geojson` file, verifies its checksum, and uses it only for that export. The on-screen map remains on the simplified snapshot.

All paths are relative so the app works from the Cloudflare Workers staging host and future custom domain.

## Network Inventory

Normal startup uses same-origin static assets only:

- `index.html`
- local CSS and JavaScript
- local Leaflet vendor files
- `data/indonesia-adm2-simplified.geojson`

Normal startup must not request:

- `data/indonesia-adm2-detailed.geojson`
- geoBoundaries `/current/`
- HDX or other unpinned external boundary data

The detailed GeoJSON is allowed only after explicit high-detail export selection.

Trust/content pages do not load Leaflet, map JavaScript, GeoJSON, external fonts, analytics, ads, or third-party scripts.

## Security headers

Cloudflare staging uses `_headers` to keep the workers.dev site non-indexable and locked down:

- `X-Robots-Tag: noindex, nofollow, noarchive`
- `Content-Security-Policy` with same-origin scripts/connects, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, and `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- restrictive `Permissions-Policy`

