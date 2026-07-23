# Batch 3 Queue Item 4R remediation report

Queue Item 4R started from `ce7b95bfca704b4a423a9052a6a6d423d637904f` with the focused changes uncommitted. External checkpoints preserve the pre-completion and timeout-continuation states under `C:\dev\nusacanvas-recovery-backup\20260722-135156`.

## Changes and root causes

`workspace/index.html` restores one semantic `#workspaceFirstUse` block for the spreadsheet input state. It names CSV/TSV/XLSX, local-device privacy, the current guide, and keyboard operation. Batch 2R documentation and the existing guidance assertion prove this remained an approved contract; this is a restoration, not a redesign.

`tests/e2e/batch2r-boundary-rendering.spec.js` makes two test-only corrections. The representative helper now targets the goal button rather than both the button and `#appShell`, then waits on the existing province-overlay state. The high-DPI flow applies a real highlight before asserting export-control visibility and target size. No map, boundary, export, or runtime behavior changed.

The original Chromium-mobile smallest-PNG failure did not reproduce in 10 isolated runs or five seven-test sequence contexts. No retry, timeout, skip, assertion, product, or test change was used; final classification is an isolated prior environmental flake.

## Verification

- Guidance: 20/20 across five complete runs; final suite 4/4.
- Boundary rendering: three complete runs, each 8 passed and 8 configured browser-scope skips.
- Smoke: all 76 expected IDs passed across four projects using exhaustive project/title partitions.
- Mobile PNG: 10/10 isolated and 5/5 sequence contexts.
- Unit 81/81; trust 12/12; accessibility 12/12; workspace 5/5; public shell 8/8; closure 3 passed plus 3 configured skips.
- Data, content, performance, security, terminology, brand, Batch 1 constituents, Batch 2R structural checks, and production verification passed.
- The exact `verify:batch1` and `check` wrappers exceeded the foreground limit. Their scripts contain only deterministic child commands; every child contract passed. They are recorded as decomposed contracts, not directly executed wrapper passes.

Fresh local visual evidence covers desktop/mobile guidance, direct spreadsheet and sample routes, goal choice, workflow stages, mobile sheet states, representative boundaries, and valid export-ready controls. Representative images were inspected: no clipping, overlap, redesign, or map regression was observed. The live production workspace does not yet contain the approved branch-only guidance restoration; no production pixel-equivalence claim is made for that element.

Public performance remains 7 requests, 1,430-byte gzip shell, and 146,640-byte gzip hero. Workspace budgets pass with no new request. Security/privacy remains local-only with no analytics, ads, upload, backend, authentication, API key, geocoding, external tiles, or CDN runtime.

## Protected areas, rollback, and decision

No map, boundary, canonical registry, data, dependency, deployment, project-schema, public UI, or runtime JavaScript file changed. Broader product changes, sleeps, retries, line-ending changes, and dependency changes were rejected.

Rollback is a normal `git revert` of the eventual Queue 4R commit. No data or server migration exists. Final decision: **VERIFIED**. Queue Item 5 may independently review the focused commit; deployment remains prohibited.

## Post-merge production addendum

The statements above are the Queue 4R pre-merge snapshot and intentionally preserve that historical gate. They were superseded after PR #6 merged and the exact merged `main` source was deployed and verified at Worker version `76f76701-872a-4f4f-9690-9614d41b6c1b`. Production verification passed; deployment is complete, rollback was not required, and Batch 4 is allowed only after the separate durable closure PR merges.
