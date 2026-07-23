# Batch 3 post-merge verification — completed

Completed against the exact merged `main` source `54985e7f21a3db6a9b23b1d4850ecc94d6d6bbb0` and active Worker version `76f76701-872a-4f4f-9690-9614d41b6c1b` on 2026-07-23.

| Check | Result | Evidence |
| --- | --- | --- |
| Merge identity and clean main | PASS | local and remote `main` equal `54985e7`; clean tree |
| Clean install/build | PASS | 70 allowlisted build files; 105-file inventory; 6 illustrations |
| Production deployment | PASS | `npm run deploy`; Worker version recorded in deployment report |
| Both production origins | PASS | apex and `www` consistent; no mixed cache state |
| Expected routes, canonicals, indexing, 404 | PASS | `npm run verify:production` and independent route check |
| Headers/CSP/runtime boundaries | PASS | restrictive CSP, workspace noindex, same-origin runtime |
| Spreadsheet/sample guidance | PASS | one visible block in each; required local-only/format/guide/keyboard copy |
| Manual guidance | PASS | hidden from visible manual flow; no map obstruction |
| Asset hashes | PASS | 22/22 compared production assets raw SHA-256 exact |
| Production smoke | PASS | 19/19 |
| Public shell/workspace | PASS | 8/8 and 5/5 |
| Accessibility | PASS | 3/3 |
| Performance | PASS | 7 requests; 1,430-byte shell; 146,640-byte hero |
| Security/privacy | PASS | no analytics beacon, external runtime, upload, backend, ads, or external tiles |
| Map/data/project/export | PASS | 519 features and existing compatibility/export gates |
| Visual evidence | PASS | fresh Playwright desktop/mobile evidence recorded externally and inventoried |
| Rollback trigger review | PASS | zero triggers; prior version remains available |
| Release/tag policy | PASS | no release/tag required or created |

Known non-blocking observations remain explicit: the existing workspace `<base>` element emits one CSP console warning under the existing `base-uri 'none'` policy; page errors remain zero. One original guidance assertion assumes localhost and falsely counts same-origin production requests; the corrected production harness passed. Neither requires runtime or test changes.

The post-merge checklist is complete. `productionVerified` is true; `batch4Allowed` becomes true only after the durable closure PR merges. No Batch 4 implementation is included.
