# Batch 2 Prompt 2 - Import Core Report

Date: 2026-07-13

Status: `IMPLEMENTED - PASTE CSV TSV CORE`

Commit target: `batch2: add paste csv tsv import pipeline`

## Scope Delivered

- Added `assets/js/import-core.js` as the single parser/normalizer for paste, CSV, and TSV text.
- Reworked `assets/js/csv-import.js` into a compatibility adapter that uses Import Core and performs deterministic region matching.
- Added paste textarea, CSV/TSV file input, delimiter override, locale override, mapping controls, cancel, local preview, and explicit apply.
- Preserved old six-header CSV sample behavior through the new pipeline.
- Kept imported data local; no network, analytics, backend, or runtime AI was added.

## Supported Inputs

| Input | Status | Notes |
|---|---:|---|
| Paste from Excel/Sheets | PASS | Supports tabs, newlines, headers, preview, mapping, cancel, explicit apply. |
| Comma CSV | PASS | Quoted delimiters, escaped quotes, BOM, CRLF/LF, trailing empty cells. |
| Semicolon CSV | PASS | Auto-detected or manually selected. |
| TSV/text | PASS | Auto-detected or manually selected. |
| Flexible headers | PASS | Bahasa Indonesia and common English aliases. |
| Locale numbers | PASS | `id-ID`, `en-US`, auto mode, percentages, negatives, accounting parentheses. |
| XLSX | NOT APPLICABLE | Deferred to Prompt 3; no parser dependency added. |

## Safety And Privacy

- Import parsing runs in the browser.
- The map is not mutated during preview or mapping changes.
- Raw rows are not sent to a server or analytics service.
- Error reports are downloaded locally and formula-like CSV fields are escaped.
- Size, row, column, cell, and cell-length limits fail before expensive work.
- Local filename is not stored in the import source label; labels are generic such as `File CSV lokal`.

## Limits

Limits are inherited from `artifacts/batch-2/resource-budget-v1.json`:

- text input: 1 MB;
- upload bytes: 2 MB;
- rows: 5000;
- columns: 50;
- cells: 100000;
- single cell length: 2000;
- table windowing threshold for later UI: 500 rows.

## Benchmark

`artifacts/batch-2/import-core-benchmark.json` records a generated 5000-row, 5-column CSV:

- bytes: 181987;
- cells: 25000;
- parse time: 19.83 ms;
- detected delimiter: comma.

Because the approved allowed text case remains near-instant in this environment, Prompt 2 keeps parsing synchronous and uses explicit cancel for pending imports. Worker/yield offload remains the thresholded path for XLSX and larger parsing work in later prompts.

## Tests Run

- `node --test --test-isolation=none tests/unit/*.test.js` - 14/14 passed.
- `node scripts/build.js` - built `dist` with 33 allowlisted files.
- `playwright test smoke.spec.js --project=chromium-desktop` - 5/5 passed.
- `playwright test smoke.spec.js` - 20/20 passed across Chromium desktop, Firefox desktop, WebKit desktop, and Chromium mobile.
- `node scripts/check-performance-budgets.js` - passed: initial `592139`, simplified `518479`, shell JS `64675` gzip bytes.

## Compatibility Result

The old sample CSV workflow still works:

- file input accepts `sample/sample-region-colors.csv`;
- preview validates 3 rows;
- explicit apply colors 3 regions;
- undo restores 0 highlights.

## Known Limits

- XLSX is intentionally not implemented in Prompt 2.
- Matching remains deterministic and conservative; ambiguous names such as shared city/regency names require more evidence.
- Full progress UI/worker parsing is deferred until XLSX/larger work makes it necessary.
- This prompt does not implement the final data table, ambiguity-resolution UI, choropleth visualization, PDF export, or project schema 2.0 persistence.
