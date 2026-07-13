# Batch 2 Test Matrix

| Exit Gate | Evidence Type | Planned Command Or Artifact |
|---|---|---|
| Batch 1 regressions remain green | Automated | `npm run verify:batch1` |
| Cloudflare staging remains noindex | Automated/live | `npm run verify:staging` |
| Import parser handles CSV/TSV/paste | Unit | Prompt 2 parser tests using `tests/fixtures/batch-2/import/` |
| Header aliases and mapping are deterministic | Unit/integration | Prompt 2 mapping tests |
| Locale numbers preserve blank versus zero | Unit | Prompt 2 numeric parser tests |
| Large allowed import remains responsive | Benchmark/E2E | Prompt 2 benchmark report |
| XLSX is lazy and local | Unit/E2E/license | Prompt 3 lazy-load and license tests |
| Matching ambiguity is explicit | Unit/E2E | Prompt 4 match fixtures |
| Basic workflow completes on mobile | E2E | Prompt 5 mobile flow |
| Table-map selection works both ways | E2E/a11y | Prompt 5 table-map tests |
| Visualization classes are deterministic | Unit/property | Prompt 6 classification tests |
| Legend/map/table/export agree | E2E | Prompt 6/7 consistency tests |
| SVG/PNG/PDF export share one spec | Unit/E2E | Prompt 7 export tests |
| Project v2 saves and reopens | Unit/E2E | Prompt 7 persistence tests |
| No user data leaves browser | Static/runtime scan | Security audit plus import network tests |
| No indexing before production domain | Static/live | `_headers`, `robots.txt`, `verify:staging` |
