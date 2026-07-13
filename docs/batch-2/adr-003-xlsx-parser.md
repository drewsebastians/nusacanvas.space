# ADR 003 - XLSX Parser for Local Import

Date: 2026-07-13

Status: Accepted

## Context

Batch 2 Prompt 3 requires local, lazy-loaded XLSX import. The parser must not load on startup, must not use a CDN, must not evaluate formulas, must not execute macros or embedded objects, and must pass the repository license gate.

The existing app is static HTML/CSS/vanilla JavaScript. There is no bundler migration in scope.

## Options Evaluated

### SheetJS `xlsx@0.18.5`

Pros:

- Very common XLSX parser.
- Browser bundle available.

Cons:

- Local audit reported high severity prototype-pollution and ReDoS advisories.
- npm audit reported no available fix.

Decision: rejected for production.

### `exceljs@4.4.0`

Pros:

- MIT license.
- Broad workbook support.

Cons:

- Much larger package footprint.
- More capability than needed for value-only local import.
- Higher integration cost for a static no-bundler app.

Decision: rejected for Prompt 3.

### `read-excel-file@9.3.1`

Pros:

- MIT license.
- Focused on reading `.xlsx` values in browser/Node.
- Official browser bundle is included in the npm package.
- Smaller shipped asset: 11,957 gzip bytes for the parser bundle.
- Production audit reported 0 vulnerabilities.

Cons:

- Does not expose every workbook metadata detail.
- Cancellation cannot fully terminate every internal parse phase in every browser.
- Hidden-sheet metadata is not surfaced as a dedicated UX label.

Decision: accepted.

## Decision

Use `read-excel-file@9.3.1`, pinned in `package.json` and `package-lock.json`.

Ship the official browser bundle as:

`assets/vendor/read-excel-file/read-excel-file.min.js`

The app lazy-loads this file only when XLSX preview is requested. The adapter file `assets/js/xlsx-import.js` is a small startup module that performs file/ZIP guards and converts workbook data to the shared Batch 2 tabular import contract.

## Security Notes

- `.xls`, `.xlsb`, `.xlsm`, and `.ods` are rejected.
- Macro-bearing ZIP entries are rejected before parser handoff.
- External-link workbook parts are rejected.
- Embedded objects, ActiveX, and encrypted package markers are rejected.
- Formula expressions are not evaluated by the app; cached values are treated as values.
- `connect-src` remains `self`; there is no CDN or network fallback.
- `worker-src 'self' blob:` is allowed for local parser worker behavior.

## Rollback Plan

To remove the dependency:

1. Remove `read-excel-file` from `package.json` and `package-lock.json`.
2. Delete `assets/vendor/read-excel-file/`.
3. Remove `assets/js/xlsx-import.js` from `index.html`, `scripts/build.js`, performance budgets, and tests.
4. Remove `vendor-read-excel-file-js` from `data/license-manifest-v1.json`.
5. Re-run build, unit, smoke, security, source/license, and performance gates.

CSV/TSV/paste imports remain independent and should continue working after rollback.
