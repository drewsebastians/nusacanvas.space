# Batch 2 Prompt 1 - Preflight and Spreadsheet-to-Map Contracts

Date: 2026-07-13

Status: `READY FOR BATCH 2`

Verified branch: `main`

Verified deployment commit: `8655c6821f57f47e1029e67cbac3fbad38eacc80`

Batch 2 may begin because Batch 1 is present on the current branch, CI is green, Cloudflare Workers staging is deployed, and live staging remains non-indexable. This prompt intentionally does not implement spreadsheet-to-map runtime features.

## Batch 1 Gate Table

| Gate | Status | Evidence |
|---|---:|---|
| Clean install/build | PASS | GitHub `CI` run `29222660931` succeeded; local `node scripts/build.js` built 32 allowlisted files. |
| Source/license gate | PASS | `node scripts/data-pipeline.js verify-sources`; `data/license-manifest-v1.json`; `data/sources/source-inventory-v1.json`. |
| Deterministic data pipeline | PASS | `node scripts/data-pipeline.js test`; reproducibility hash `215deb9d81f1ddfe40656dd2191d9ad872646863844971084b756167a4baac61`. |
| Geometry/registry tests | PASS | `python tests/run_data_tests.py`: 519 ADM2 features, 38 provinces, 519 canonical regions, 53 ambiguous rows. |
| Unit/project migration tests | PASS | `node --test --test-isolation=none tests/unit/project-storage.test.js` in Batch 1 gate. |
| Browser smoke matrix | PASS | Live staging smoke passed 16/16 across Chromium desktop, Firefox desktop, WebKit desktop, and Chromium mobile. |
| Accessibility matrix | PASS | Recorded in `docs/batch-1/06-completion-report.md`: 8/8 axe checks, no serious/critical issues. |
| Performance budget | PASS | `artifacts/batch-1/performance-budget-report.json`: initial `590827`, simplified `518479`, shell JS `63795` gzip bytes. |
| Startup detailed-geometry/network ban | PASS | Smoke/performance gates prohibit startup request for detailed geometry, geoBoundaries, HDX, or data.humdata.org. |
| Source/version truthfulness | PASS | Trust pages and data badge describe ADM2 2020 snapshot and registry metadata v1. |
| License and production asset approval | PASS | 17 license assets, 9 third-party production files, approved statuses in `data/license-manifest-v1.json`. |
| Cloudflare staging noindex | PASS | `node scripts/verify-staging.js https://mapnesia.andrew-sebastian91.workers.dev` passed. |
| GitHub Pages inactive | PASS | `docs/batch-1/02-github-pages-shutdown-evidence.md`; API returned HTTP 404/not configured. |
| Public contact destination | PASS WITH DOCUMENTED LIMITATION | Local report template works; owner must approve a public destination before broader release. |

## Contract Artifacts

- `docs/batch-2/contracts/spreadsheet-to-map-contracts.schema.json`
- `artifacts/batch-2/resource-budget-v1.json`
- `artifacts/batch-2/preflight.json`
- `tests/fixtures/batch-2/import/`

The schema is versioned as `batch2.contracts.v1`. It defines runtime-validatable shapes for imported source metadata, raw rows, column mapping, match results, visualization specifications, export metadata, and project persistence. Future runtime code must validate untrusted imported/project data against these contracts or stricter derived validators.

## Domain Decisions

- Imported source labels must be user-facing but must not expose local filenames to telemetry or logs.
- Raw cell values and normalized typed values stay separate.
- Row IDs are stable import-local IDs, not table indexes.
- Header inference is deterministic and user-overridable.
- Matching states are explicit: exact code, exact canonical name plus province, exact alias plus province, normalized deterministic, ambiguous, unmatched, invalid, duplicate target, and user resolved.
- Visualization specs store method, parameters, breaks, palette, no-data style, number format, legend labels, and deterministic version.
- Project persistence stores versions for app, schema, boundary, registry, import, matching, visualization, palette, and export.

## Resource And Security Budget

Initial limits live in `artifacts/batch-2/resource-budget-v1.json`.

The first implementation should reject inputs before expensive parsing when hard limits are exceeded; yield or worker-offload above the measured threshold; keep imported data local; prohibit import/match/visualize/export network requests; and retain Batch 1 export memory limits.

## Documentation And Planning

- Data flow: `docs/batch-2/01-architecture-data-flow.md`
- Privacy threat model: `docs/batch-2/02-import-privacy-threat-model.md`
- Test matrix: `docs/batch-2/03-test-matrix.md`
- Changelog entry: `changelog/index.html`

## Known Non-Blocking Items

- The repository still includes a manual GitHub Actions deploy fallback, now `workflow_dispatch` only. Cloudflare direct build is the active deploy path for staging.
- A public contact/report destination is still an owner decision before broader public release.
- No Batch 2 runtime UI, importer, XLSX parser, matching UI, data table, choropleth engine, PDF export, analytics, ads, indexing, or custom domain has been added.
