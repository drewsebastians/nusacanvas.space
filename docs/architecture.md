# Architecture

NusaCanvas is a static Cloudflare Workers Static Assets application. Its canonical production origin is `https://nusacanvas.space`.

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
- `workspace-shell.js`: temporary presentation state for the NusaCanvas guided rail, drawer, goal entry, success/recovery messaging, and map-first mobile sheets. It does not own durable project data.
- `boundary-provider.js`: local-only versioned boundary adapter and compatibility metadata for lite/detailed tiers.

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
3. A deferred compact ADM2 anchor file feeds one Canvas label layer. It considers only the viewport after debounced map movement, uses a spatial grid for collision culling, and supports Minimal, Balanced, and Detailed density modes without per-region DOM markers.
4. User selections are stored by stable `region_id`.
5. Paste/CSV/TSV/XLSX and project files are processed locally by File APIs.
6. Matching decisions, visualization specification, and export metadata stay in browser state/project JSON.
7. SVG/PNG/PDF/mapping CSV export is generated in-browser; PDF is currently raster.
8. The national lite layer remains mounted and interactive. After a 300 ms settled move, close desktop views add at most three checksum-verified province detail overlays from `data/detailed-provinces/`; mobile waits for an explicit selection. Full `data/indonesia-adm2-detailed.geojson` is loaded only for detailed exports.

All runtime paths are relative so the app works consistently on the production domain.

## Experience and boundary presentation

The active desktop workspace follows the owner-approved Option A direction: one compact workflow rail, a dominant map, and a contextual rather than permanent third inspector. The phone experience follows Option C: map-first controls with collapsed, medium, and expanded sheets. The core Batch 2 engines remain unchanged behind this presentation layer.

Boundary fills render without independent polygon strokes. A single exact-coordinate shared boundary mesh renders neutral borders once; highlighted and selected regions receive separate rounded presentation outlines. Presentation view reuses the same mesh with softer neutral styling. This changes presentation only: the local 2020 source geometry, all 519 features, stable IDs, provider manifest, and project compatibility rules remain authoritative.

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

Province chunks are generated from the approved detailed GeoJSON at build time with exact shared-boundary meshes and the same stable IDs. They are same-origin, lazy, checksum-verified, provider-routed, and cached three at a time. The complete detailed GeoJSON is reserved for exports.

Trust/content pages do not load Leaflet, map JavaScript, GeoJSON, external fonts, analytics, ads, or third-party scripts.

## Security headers

Cloudflare production uses `_headers` for a locked-down browser security policy:
- `Content-Security-Policy` with same-origin scripts/connects, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, and `frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- restrictive `Permissions-Policy`

