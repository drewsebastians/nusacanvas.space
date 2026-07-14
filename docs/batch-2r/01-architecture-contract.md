# Batch 2R Architecture Contract

## Purpose

The Experience Reset is an incremental presentation and orchestration change over stable local domain engines. The map engine, matching rules, project sanitizer, export attribution, and source/license gates are preserved. A prototype may be isolated, but it may not fork business logic.

## Three layers

### 1. Domain engines

| Capability | Current contract location | Preservation rule |
| --- | --- | --- |
| Import parsing/limits | `assets/js/import-core.js`, `assets/js/csv-import.js`, `assets/js/xlsx-import.js` | Keep local-only parsing, limits, formula/macro/external-link protections, row states, and column mapping |
| Deterministic matching | `assets/js/matching-engine.js`, `data/canonical-region-registry.json`, `data/crosswalk.json` | Official code first, explicit ambiguity, stable canonical IDs; no silent fuzzy match |
| Visualization | `assets/js/visualization-engine.js` | Preserve five deterministic modes, no-data behavior, palettes, class rules, and shared legend shape |
| Map data/rendering | `assets/js/map.js`, `data/indonesia-adm2-simplified.geojson`, detailed geometry | Preserve 519 features, boundary/source versions, selection callbacks, and lazy detail load |
| Export | `assets/js/export.js`, `assets/js/report-template.js` | Preserve SVG/PNG/PDF/mapping CSV, attribution, extent, metadata sanitization, and formula-safe output |
| Project storage | `assets/js/project-storage.js` | All save/open/autosave/migration flows pass through schema sanitizer; never bypass stable-ID adapter |
| Future territory | frozen `docs/batch-3/00-preflight-and-contract.md` | Contract only in Batch 2R; no runtime implementation |
| Future coverage | frozen `docs/batch-3/00-preflight-and-contract.md` | Contract only in Batch 2R; no external datasets or runtime implementation |

### 2. Application orchestration

`assets/js/app.js` currently owns the state machine and most event orchestration. It binds the DOM by stable IDs, manages `workflowStage`, `uiMode`, import preview/apply, matching corrections, visualization preview/apply, table/map selection, project persistence, autosave, and exports. This is the safest first extraction target after the prototype decision:

1. keep the existing state shape and commands;
2. introduce small command adapters around import, match, visualize, project, and export calls;
3. centralize stage transitions and recovery messages;
4. let presentation components subscribe/render from orchestration state;
5. migrate one journey at a time with existing IDs and E2E evidence;
6. remove obsolete DOM coupling only after all tests and saved-project fixtures pass.

No rewrite or framework migration is justified by this audit.

### 3. Presentation

`index.html`, `assets/css/app.css`, `assets/css/content.css`, static public route HTML, and the DOM-facing portions of `app.js` are presentation. Prompt 2 may introduce a content/terminology dictionary and tokens; Prompt 5 may introduce reusable shell components after owner visual approval. Presentation must not duplicate matching, geometry, visualization, export, or persistence logic.

## Current mixed responsibilities

- `app.js` mixes event binding, state mutation, domain calls, HTML templating, status copy, and accessibility announcements.
- `index.html` exposes all controls at once and acts as an implicit API through IDs consumed by tests and `app.js`.
- `map.js` combines Leaflet setup with selection presentation; callbacks must remain compatible while orchestration is extracted.
- `project-storage.js` is correctly defensive but its constants and adapter are consumed by both domain and app code; move imports behind an adapter, not by editing schema behavior.
- Export metadata is collected from UI fields in `app.js` and interpreted in `export.js`; a future form model must preserve exact field semantics.

## Prototype isolation

Prompt 4 prototypes must be static or feature-flagged previews under `artifacts/`/`docs/` or a clearly isolated route. They may use representative copy and tokens but must not write localStorage, mutate project state, or replace the production map engine. The owner review artifact in Prompt 4B is the only authorization to carry a visual direction into production UI.

## Saved-project compatibility

Existing schema `1.1`, legacy `1.0`, boundary version, registry version, canonical references, import corrections, visualization, export settings, and migration reports remain compatible. UI labels can change, but serialized fields and migration semantics cannot be renamed casually. If a new orchestration field is needed, add a versioned optional field with a migration fixture and explicit report.

## Future BoundaryProvider connection

The future provider should expose a read-only boundary bundle with `boundaryVersion`, `registryVersion`, `sourceVersion`, `features`, `featureByCanonicalId`, and attribution metadata. `matching-engine.js`, `project-storage.js`, and exports should consume the provider adapter rather than raw GeoJSON. The current provider remains the existing local 519-region bundle. No geometry transformation or Google-derived boundary work is allowed in Batch 2R.

## Non-negotiable contracts

- no imported content, filenames, free text, or raw errors leave the browser;
- no runtime AI, accounts, backend storage, analytics, ads, external map tiles, or runtime CDN;
- no silent ambiguity or duplicate assignment;
- no boundary/stable-ID/source/license drift;
- no production domain/indexing activation;
- every visual change reruns mobile, keyboard, accessibility, performance, and export gates.
