# Current Experience Audit

## Audit scope

This audit describes the UI at baseline commit `b88261f`, before the NusaCanvas Experience Reset. Evidence is generated from the live local build, the 28-image screenshot manifest, the HTML route inventory, and the existing cross-browser gates.

## What the user sees

The root route is a single map workspace. A persistent control sidebar contains trust links, workflow stage, Basic/Advanced mode, manual region coloring, grouping, legend editing, import, visualization, project persistence, and export. The map occupies the main area. Public trust pages use a separate static layout and currently display the Mapnesia brand.

Primary actions are distributed across the sidebar: `Coba contoh lokal`, `Pratinjau Import`, `Terapkan Hasil Valid`, `Pratinjau visualisasi`, `Terapkan visualisasi`, project actions, and four export actions. The current stage indicator helps orientation, but there is no single persistent primary CTA that always represents the next best action.

## Main findings

### Information hierarchy

- The page exposes almost every capability at once, so a first-time user must scan manual coloring, import, visualization, project, and export sections before knowing what matters now.
- Metadata fields such as title, source, period, filename, and footnote appear before the user has a map, competing with the first input action.
- Trust links are correct and important, but they visually compete with the work surface instead of being a quiet support layer.
- Export contains useful safeguards, but its many format, extent, label, detail, size, and background choices create a late-stage decision wall.

### Language and terminology

The product is mostly Indonesian, but the visible UI still mixes terms such as `Grouping`, `Import`, `Visualisasi`, `Mode`, `Basic/Advanced` concepts in copy, `mapping`, `sheet`, `preview`, and file-format acronyms. These are not necessarily wrong; they need a consistent plain-language glossary and contextual explanations. The complete generated string list is in `artifacts/batch-2r/current-string-inventory.json`.

### Brand and route evidence

Public pages visibly use `Mapnesia`; the root title is `Peta Warna Wilayah Indonesia`. Old staging/brand references must be inventoried before any rename. This prompt intentionally does not replace them. Repository, Worker, and domain renames are explicitly deferred to the operational prompt.

### Responsive behavior

The current mobile layout keeps the map reachable and the professional export test passes with real pointer interaction. However, a full sidebar still creates long vertical travel. Export and data-table states are particularly tall in the mobile screenshots. The next design should preserve the fixed hit-testing fix while reducing simultaneous surface area, not by removing capabilities.

### Recovery and trust

The product has explicit preview/apply/cancel steps, ambiguity states, migration reports, autosave status, no-data styling, and local-only privacy copy. These are valuable trust patterns. They are currently spread across many sections and should be surfaced at the moment a user needs them.

## Highest-risk coupling points

1. `assets/js/app.js` owns state, DOM binding, workflow stages, rendering orchestration, import handoff, visualization handoff, table rendering, persistence, and export event wiring.
2. `index.html` is both the presentation tree and the public contract of control IDs consumed by `app.js` and E2E tests.
3. `assets/js/map.js` owns Leaflet presentation and selection callbacks while `app.js` owns selection state; changing either can break bidirectional table/map selection.
4. `assets/js/project-storage.js` performs schema migration, stable-ID adaptation, sanitization, autosave, and download; UI changes must not bypass it.
5. Lazy modules `matching-engine.js`, `visualization-engine.js`, and `xlsx-import.js` are loaded by DOM event paths and must remain local and bounded.
6. `assets/js/export.js` receives state-shaped objects from the app and carries attribution, extent, geometry detail, and formula-safe mapping export rules.
7. CSS stacking and responsive order are part of the mobile export contract; changes to panel positioning require the full mobile smoke matrix.

## Release risks to carry forward

- Do not make a visual prototype depend on a second map engine or duplicate import logic.
- Do not hide unresolved or ambiguous rows behind a friendlier but unsafe default.
- Do not move export controls without retaining keyboard order, focus management, and real touch activation.
- Do not translate dynamic copy by editing only static HTML; the string inventory must be regenerated after each copy migration.
- Do not claim a human comprehension result from the automated screenshot or smoke evidence.

## Evidence links

- Screenshot manifest: `artifacts/batch-2r/baseline/manifest.json`
- Machine-readable experience inventory: `artifacts/batch-2r/current-experience-inventory.json`
- Machine-readable string inventory: `artifacts/batch-2r/current-string-inventory.json`
- Existing closure: `docs/batch-2/08-batch-2-closure.md`
- Frozen Batch 3 contract: `docs/batch-3/00-preflight-and-contract.md`
