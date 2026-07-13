# Batch 2 Prompt 3 - XLSX Security and License Report

Date: 2026-07-13

Status: `IMPLEMENTED - SECURE LAZY XLSX IMPORT`

Commit target: `batch2: add secure lazy xlsx import`

## Scope Delivered

- Added local `.xlsx` import without creating a second import architecture.
- XLSX is converted into the same tabular contract used by paste/CSV/TSV, then handed to the existing preview, column mapping, validation, deterministic matching, and explicit apply flow.
- Added a sheet chooser when a workbook has more than one readable sheet.
- Added ZIP/container guards before parser handoff.
- Added a pinned, license-reviewed parser dependency and a vendored browser bundle served from the same origin.
- Kept spreadsheet contents local in the browser; no cloud conversion, AI, analytics, external geocoder, or remote parser was added.

## Dependency Decision

Selected dependency: `read-excel-file@9.3.1`

Rejected candidate:

- `xlsx@0.18.5` was rejected after local `npm audit --omit=dev` reported high severity advisories with no available fix.

Why `read-excel-file@9.3.1`:

- MIT license.
- Browser-focused `.xlsx` reader with a small shipped bundle.
- Narrower scope than full spreadsheet suites such as `exceljs`.
- Local value extraction only; no formula execution or external-link following is required by the product.
- Final production audit reported `found 0 vulnerabilities`.

Exact shipped asset:

- `assets/vendor/read-excel-file/read-excel-file.min.js`
- SHA-256: `9f2c26e44c7fdb69d8ea70f05e44eb64de152c084e15d245b114d0f8cf77db73`
- Size: 37,686 bytes raw / 11,957 bytes gzip
- License manifest entry: `vendor-read-excel-file-js`

The package is pinned in `package.json` and `package-lock.json`; Cloudflare can continue using npm clean install.

## Lazy Loading

Normal startup loads only the small adapter:

- `assets/js/xlsx-import.js`
- Size: 10,461 bytes raw / 3,224 bytes gzip

The parser bundle is not referenced by a normal `<script>` tag. It is added dynamically only after the user selects an `.xlsx` file and clicks preview.

E2E evidence:

- Startup and paste import do not request `read-excel-file.min.js`.
- XLSX preview does request `read-excel-file.min.js`.
- The XLSX preview reaches the same mapping and preview UI as paste/CSV/TSV.

## Security Guards

Before parser handoff, the adapter enforces:

- `.xlsx` only; `.xls`, `.xlsb`, `.xlsm`, and `.ods` are rejected.
- ZIP local-file signature and end-of-central-directory validation.
- maximum compressed bytes;
- maximum ZIP entries;
- maximum estimated uncompressed bytes;
- suspicious compression ratio guard;
- supported compression methods only;
- required XLSX workbook files;
- macro-bearing entries such as `xl/vbaProject.bin`;
- macro sheets;
- embedded objects;
- ActiveX/control properties;
- external workbook links;
- encrypted/password-protected package markers.

After parser handoff, the adapter enforces:

- maximum worksheets;
- maximum rows;
- maximum columns;
- maximum cells;
- maximum single-cell length;
- non-empty usable sheet requirement.

These are client-side risk-reduction controls, not a malware scanner.

## Cell Policy

- Strings are preserved as text.
- Numbers are converted to text for the shared import contract, then normalized by `ImportCore`.
- Booleans are represented as `TRUE`/`FALSE`.
- Blank cells remain blank.
- Dates returned by the parser are serialized as `YYYY-MM-DD`.
- Formula expressions are not evaluated by this application. The parser may expose cached values from workbook XML; those cached values are treated as ordinary cell values.
- Hyperlinks and external references are not followed. External-link workbook parts are rejected before parser handoff.
- Cell values are reviewed in preview and do not mutate the map until explicit apply.

## CSP and Worker Policy

The parser may use browser worker internals for heavier ZIP parsing. CSP was updated from `worker-src 'none'` to:

`worker-src 'self' blob:`

Network policy remains strict:

- `connect-src 'self'`;
- no CDN;
- no remote parser fallback;
- no external import/matching service.

## Supported and Unsupported Workbook Behavior

Supported:

- `.xlsx` workbook;
- one or more readable visible sheets;
- strings, numbers, booleans, blanks, dates, cached formula values;
- sheet selection before apply.

Rejected or unsupported:

- `.xls`, `.xlsb`, `.xlsm`, `.ods`;
- encrypted/password-protected workbook;
- macro-bearing workbook;
- embedded objects and ActiveX controls;
- external-link workbook parts;
- malformed/truncated ZIP;
- oversized ZIP, worksheet, row, column, cell, or cell-length cases.

Hidden-sheet treatment: the selected parser returns readable sheets as data. The application does not execute hidden-sheet content and still requires explicit user preview/apply. Prompt 4+ may add richer hidden-sheet labels if the project later needs workbook metadata beyond value import.

## Tests and Evidence

Commands run for Prompt 3:

- `node --test --test-isolation=none tests/unit/*.test.js` - 19/19 passed.
- `node scripts/build.js` - built `dist` with 36 allowlisted files.
- `playwright test tests/e2e/smoke.spec.js --project=chromium-desktop` - 6/6 passed.
- `node scripts/check-performance-budgets.js` - passed: initial `600270`, simplified `518479`, shell JS `72841` gzip bytes.
- `node scripts/data-pipeline.js verify-sources` - passed: 6 source records, 18 license assets.
- `node scripts/security-audit.js` - passed: 8 checks.
- `node scripts/check-static-content.js` - passed: 9 trust pages.
- `npm audit --omit=dev` via temporary npm CLI bootstrap - passed: 0 vulnerabilities.

Unit coverage includes:

- shared tabular handoff;
- deterministic sheet selection;
- macro-bearing workbook rejection;
- unsupported extension rejection;
- malformed archive rejection.

Browser coverage includes:

- parser absent from startup;
- parser absent from paste import;
- parser loaded only for XLSX preview;
- XLSX preview, mapping, sheet chooser, and sheet switching;
- no external network request during XLSX import.

## Known Limitations

- Cancellation is honest before and between async phases; once the third-party parser is actively parsing, the app discards canceled results but cannot fully interrupt all internal parser work in every browser.
- Hidden-sheet metadata is not displayed separately yet.
- The application does not attempt to repair corrupted workbook XML.
- This prompt does not implement matching v2, ambiguity-resolution UI, choropleth visualization, PDF export, or project schema 2.0 persistence.
