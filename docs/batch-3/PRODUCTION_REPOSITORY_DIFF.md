# Production / repository forensic comparison

## 1. Executive summary

**Verified fact:** the 15 required production routes returned HTTP 200 and their normalized metadata, navigation, canonical URLs, public/workspace runtime boundary, and referenced clean-build assets match the clean `dist` build from `95c66f4`. Twenty of 22 referenced assets are byte-identical. The two JavaScript byte differences (`export.js` and generated `project-storage.js`) are exactly CRLF-versus-LF transport differences: their UTF-8 LF-normalized SHA-256 values match.

**Decision:** current `main` source plus its clean generated `dist` output is the authoritative production baseline. No runtime reconciliation is required.

## 2. Production route findings

All required routes in `manifests/production-route-inventory.json` returned 200 without redirects. They carry the expected canonical URLs, English document language, public navigation, no external analytics/beacon scripts, and workspace/map runtime only on `/workspace/`. The synthetic workspace variants `?goal=highlight`, `?goal=spreadsheet`, and `?sample=1` loaded the map runtime without supplied user data.

## 3. Clean-build route findings

`npm ci` and `npm run build` completed successfully, generating `dist` with 70 allowlisted files. The repository-supported static server served all 15 equivalent routes successfully. `manifests/build-route-inventory.json` and `artifacts/batch-3/build-observations.json` record the route, desktop, and mobile DOM evidence.

## 4. Root-source findings

Public HTML remains build input, not the final sole owner: `scripts/build.js` adds canonical links and public-shell assets, then normalizes public navigation. Workspace source modules are bundled for `dist/assets/js/project-storage.js`. Root source and the clean output agree on the observed public structure.

## 5. Asset/hash comparison

`artifacts/batch-3/production-build-comparison.json` compares 22 referenced assets by path. Twenty match byte-for-byte. Production `assets/js/export.js` has 216 CRLF line endings and `project-storage.js` has 11; clean `dist` has LF. LF-normalized SHA-256 values match for both, proving content equality. This is a harmless deterministic generated/transport difference, not an application difference.

## 6. DOM and navigation comparison

The production and local-build observations record the same titles, canonical links, navigation labels/active state, heading landmarks, and public-versus-workspace map boundary at 1440x1000 and 393x852. The initial local-manifest runtime field was an array coercion artifact and was corrected in the normalized comparison; it is not a site mismatch.

## 7. Screenshot comparison

The in-app browser rendered every route at both required viewports, but its `Page.captureScreenshot` endpoint timed out for full-page, viewport, and clipped captures. `production-observations.json`, `production-mobile-observations.json`, and `build-observations.json` preserve the rendered DOM evidence and the capture limitation. This limitation is not material because the stronger route, DOM, and hash evidence establishes equality; no screenshot is used as proof.

## 8. Security-header comparison

Production responses include CSP restricting scripts and connections to `self`, `X-Content-Type-Options: nosniff`, a restrictive Permissions-Policy, and `Referrer-Policy: strict-origin-when-cross-origin`. Asset and route cache headers include `no-transform`; Cloudflare headers show normal cache hits.

## 9. Cache/edge findings

**Verified fact:** production returned Cloudflare cache headers, but byte/normalized-hash equality rules out a cache-only content mismatch. **Supported inference:** Cloudflare is serving the expected static output and is not altering meaningful HTML or injecting analytics. This is consistent with merged PR #5 and `_headers` protections. No external analytics or beacon script was observed.

## 10. Git/deployment provenance

The release report identifies `909194d` as the deployed public-refresh release record. Later `a750f5e` and `95c66f4` refine public carousel CSS/shell files; those assets match production. Merged PR #3 supplies the approved public refresh and workspace-preservation intent; PR #4 removes carousel counters; PR #5 prevents edge analytics injection. Commit dates are supporting context only; the live hash and DOM comparison is the deployment evidence.

## 11. Build-generator findings

`scripts/build.js` owns the strict 70-file allowlist, generated illustrations, canonical injection, public navigation normalization, public-shell asset insertion, and workspace-runtime bundling. `wrangler.jsonc` deploys `dist`; `_headers` supplies no-transform/cache/security policy. A clean deployment therefore preserves, rather than restores over, the approved layout.

## 12. Source-of-truth conflicts

There are intentional layered owners (root HTML inputs and build generator) but no uncontrolled conflict: the clean build equals production. The only raw-byte divergence is CRLF/LF representation in two JavaScript assets.

## 13. Difference classification

| Difference | Classification | Evidence |
| --- | --- | --- |
| 20 referenced assets | no difference | exact SHA-256 match |
| `export.js` raw hash | harmless deterministic generated/transport difference | LF-normalized SHA-256 match |
| `project-storage.js` raw hash | harmless deterministic generated/transport difference | LF-normalized SHA-256 match |
| Production HTML/DOM/navigation | no material difference | route + desktop/mobile observation manifests |
| Analytics/edge behavior | approved production difference absent | CSP, no-transform, no beacon markers, PR #5 |

## 14. Root-cause analysis

The apparent two-asset mismatch is line-ending representation introduced before or during static-asset delivery. It is content-preserving. No source defect, build-generation defect, stale deployment, or edge-transformation defect was found.

## 15. Risks if no reconciliation occurs

There is no visible or functional reconciliation risk. Treating raw line-ending hashes as a defect would create unnecessary churn and violate the Batch 3 preservation rules.

## 16. Remaining uncertainties

The browser screenshot API could not capture files in this environment. This is recorded evidence-collection tooling failure, not a material product uncertainty. Future screenshot capture can be repeated in an environment whose capture endpoint responds.

## 17. Evidence references

- `docs/batch-3/manifests/production-route-inventory.json`
- `docs/batch-3/manifests/production-asset-hashes.json`
- `docs/batch-3/manifests/build-route-inventory.json`
- `docs/batch-3/manifests/build-asset-hashes.json`
- `artifacts/batch-3/production-build-comparison.json`
- `artifacts/batch-3/production-observations.json`
- `artifacts/batch-3/production-mobile-observations.json`
- `artifacts/batch-3/build-observations.json`
