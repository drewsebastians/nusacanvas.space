# Batch 2 Prompt 1 - Resolved Preflight Blockers

Date: 2026-07-13

Status: `RESOLVED`

This file records the initial Batch 2 preflight blocker and its resolution. Batch 2 Prompt 1 originally stopped because live Cloudflare Workers staging had not yet passed noindex/header verification. That blocker was resolved on 2026-07-13 after Cloudflare direct deployment and live verification passed.

Original blocked commit: `0bd660512cc2a388df1fdf60e965befad8a34e94`

Resolved staging commit: `8655c6821f57f47e1029e67cbac3fbad38eacc80`

Branch: `main`

Repository state before this blocker report: `main` was ahead of `origin/main` by 7 commits and had no uncommitted changes.

## Gate summary

| Gate | Status | Evidence |
|---|---:|---|
| Clean build | PASS | `node scripts/build.js` built `dist` with 32 allowlisted files. |
| Data/source/license/reproducibility pipeline | PASS | `node scripts/data-pipeline.js test` passed: 6 source records, 17 license assets, 10 comparable artifacts, reproducibility hash `a9f6c8612e79d6325dd9415d329851313637c4cf998b54d787f6811637cd13e8`, `dataDiffStatus=no_drift`. |
| Geometry/registry data tests | PASS | `python tests/run_data_tests.py` passed: 519 features, 287 Polygon, 232 MultiPolygon, 519 canonical regions, 38 provinces, 53 ambiguous rows. |
| Unit and migration tests | PASS | `node --test --test-isolation=none tests/unit/*.test.js` passed 9/9 tests. |
| Trust/static content checks | PASS | `node scripts/check-static-content.js` passed: 9 trust pages. |
| Security/privacy audit | PASS | `node scripts/security-audit.js` passed 8 checks. |
| Batch 1 full local release gate | PASS | `docs/batch-1/06-completion-report.md` records `npm run verify:batch1` passed locally, including browser matrix, accessibility matrix, performance budgets, trust pages, and security/privacy checks. |
| GitHub Pages shutdown | PASS | `docs/batch-1/02-github-pages-shutdown-evidence.md` and Batch 1 completion report record GitHub Pages API returning HTTP 404/not configured. |
| Cloudflare deployment | PASS | Cloudflare direct build deployed the current branch to Worker `mapnesia`. |
| Live Cloudflare noindex verification | PASS | `node scripts/verify-staging.js https://mapnesia.andrew-sebastian91.workers.dev` passed on 2026-07-13. |
| Unknown route live verification | PASS | The same live verifier confirmed unknown routes return 404. |

## Blockers by type

### Environment / policy blocker

Codex cannot publish this build to Cloudflare Workers from the current execution environment. The owner approved the staging publish explicitly, but the execution policy still rejected the operation as an external export from the workspace.

Required resolution: deploy the current committed build manually or from an environment where publishing to Cloudflare Workers is allowed.

### Live deployment blocker

The active staging URL does not yet reflect the local Batch 1 release hardening. The root path currently lacks the required `X-Robots-Tag: noindex, nofollow, noarchive` header.

Required resolution: after manual/out-of-Codex deployment, rerun live staging verification against:

`https://mapnesia.andrew-sebastian91.workers.dev`

Expected command:

`npm run verify:staging`

### Owner decision blocker

The no-account data-reporting path is locally implemented as a copy/download template, but a public submission destination is not yet approved. This is documented in Batch 1 as `PASS WITH DOCUMENTED LIMITATION`, not as the immediate Batch 2 stop condition.

Required resolution before a broader public release: approve one public contact/report destination.

## Updated Batch 2 decision

`docs/batch-2/00-preflight-and-contract.md` may now be created.

Batch 2 Prompt 1 may define contracts, budgets, fixtures, architecture, privacy, and test planning. Runtime spreadsheet-to-map features remain out of scope until Prompt 2.

The owner still needs to approve a public contact/report destination before broader public release, but that is documented as a release limitation rather than a Batch 2 preflight blocker.
