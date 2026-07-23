# Batch 3 production verification report

## Scope and deployment identity

Verified origins: `https://nusacanvas.space` and `https://www.nusacanvas.space`. Deployed source is `main@54985e7f21a3db6a9b23b1d4850ecc94d6d6bbb0`, active Worker version `76f76701-872a-4f4f-9690-9614d41b6c1b`.

## Results

- `npm run verify:production`: PASS; routes, headers, indexing, canonicals, and 404 verified.
- Asset comparison: 22/22 raw SHA-256 matches against the clean build; no mismatch.
- Production smoke: 19/19.
- Batch 2R public shell: 8/8.
- Batch 2R workspace: 5/5.
- Accessibility: 3/3.
- Performance: 7 initial public requests; 1,430-byte gzip shell; 146,640-byte gzip hero.
- Security/privacy: PASS. Restrictive CSP, same-origin runtime, no analytics beacon, no external runtime/data request, no ads, no backend, no upload, and no external tiles.
- Map/data/project/export compatibility: PASS; 519 mapped features and SVG, PNG, PDF, and mapping-CSV flows remain covered.

## Guidance acceptance

The spreadsheet and sample flows each contain exactly one visible first-use guidance block. It mentions CSV, TSV, and XLSX, says data stays on the device, links the spreadsheet guide, and includes keyboard guidance. The manual flow has zero visible guidance and no map obstruction. No duplicate or new network request was observed.

## Visual and edge evidence

Fresh Playwright evidence covers public desktop/mobile, spreadsheet first use, sample export-ready, manual highlighting, and mobile sheet states. Both origins returned consistent content and ETags; no mixed cache state or stale deployment was found. Page errors were zero.

Known non-blocking observations are preserved honestly: the existing workspace `<base>` element produces one CSP console warning under the existing `base-uri 'none'` policy, and one original guidance assertion is localhost-specific and falsely counts same-origin production requests. A corrected production harness passed. Neither observation is a product regression or rollback trigger.

## Decision and gate

Rollback trigger count: 0. Final production decision: **PASS**. `productionVerified` is true. `batch4Allowed` becomes true only after this durable closure PR merges. No Batch 4 implementation is included here.
