# Batch 3 visual evidence

`npm run capture:public-site-refresh` passed and generated nine fresh local public screenshots plus network measurements at desktop `1440x1000` and mobile `393x851`. Generated screenshots are not committed. Representative inspection confirmed navigation, hero, trust banner, truthful availability/upcoming cards, CTA, and footer. Captures cover home (two desktop hero states and mobile), Highlight Regions (desktop/mobile), Excel to Map (desktop/mobile), Sales Territories, and Coverage Analysis.

Production/build DOM observations at `1440x1000` and `393x852` remain in the Batch 3 artifacts: 15 route navigation/headings/runtime boundaries matched. Workspace browser tests passed for goal handoffs, workflow rail, Data and Issues drawer, map-first mobile, recovery, and local-data behavior.

The prior in-app screenshot endpoint timed out. Repository capture succeeds for public pages but not every requested workspace surface; fresh pixel verification of every workspace surface is incomplete. DOM/browser evidence is not claimed as pixel equivalence. This would be non-blocking only with a passing test matrix; Queue 4 is FAIL because guidance and boundary tests fail.

## Queue Item 4R local workspace evidence

Fresh Playwright evidence from the remediated local build is preserved outside Git at `C:\dev\nusacanvas-recovery-backup\20260722-135156\batch3-4r-timeout-continuation\workspace-visual` with SHA-256 hashes. It covers desktop `1440x1000` and mobile `393x851`: goal choice, spreadsheet first use, direct spreadsheet route, sample route, manual selection/highlight, add-data/match/design/export stages, collapsed/medium/expanded sheets, representative boundary views, high-DPI map evidence, and valid export-ready controls.

Representative inspection confirms readable guidance, no overlap/clipping, a dominant map, valid-state-only export controls, usable mobile sheets, and unchanged map rendering. The new guidance is verified locally only; it is not claimed as already present or pixel-equivalent on live production.

## Queue Item 5 visual classification

Queue 4R local Playwright captures and DOM/browser evidence were sufficient for the owner-review visual classification. The repository capture tooling did not provide fresh pixel evidence for every workspace surface, and live production did not yet contain the branch-only guidance at that time. No visual redesign or runtime reconciliation was performed.

## Authorized production evidence addendum

Fresh Playwright Chromium production captures were completed after deployment at desktop `1440x1000` and mobile `393x852`. The external inventory covers the homepage, spreadsheet first-use, sample/export-ready, manual highlight, and mobile medium/expanded/collapsed sheet states. Representative images were inspected for readable guidance, no clipping/overlap, dominant map behavior, usable controls, and unchanged map rendering. DOM/browser checks recorded HTTP 200, zero page errors, and no off-origin requests.

This is pixel evidence for the listed captures only; it does not claim screenshot coverage for every possible interaction. The existing CSP console warning and localhost-specific test assertion are documented non-blocking observations, not visual regressions. The durable screenshot inventory is `artifacts/batch-3/production-screenshot-inventory.json`; binary screenshots remain outside Git.
