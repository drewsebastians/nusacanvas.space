# Batch 2R remote recovery and validation

Date: 2026-07-16

## Recovery finding

The local repository is a single linear `main` history rooted at remote `390c9de`. Prompt 9 is proven in the chain (`19e75f8`, `batch2r: add versioned boundary provider architecture`) and is an ancestor of the current local head `9d72173`. No detached worktree or alternate branch was found.

The local recovery validation reran the boundary suite after restoring the static preview server: 8 tests passed and 8 project-scoped duplicate scenarios were skipped by design. The earlier 96-test browser matrix had 93 passes and three Chromium-mobile interaction failures; the smoke test now dismisses the success overlay and transitions the mobile sheet explicitly, and the Chromium-mobile smoke suite passes 19/19.

## Remote state

- Original remote: the pre-migration GitHub repository recorded in the historical platform evidence.
- GitHub CLI authentication is now valid for `drewsebastians` with repository administration and workflow scopes.
- Target `drewsebastians/nusacanvas.space` was absent before the authorized rename. The repository was renamed without changing its id (`1297315717`), `origin` was updated, and `main` was pushed at recovery commit `e659222`.
- Cloudflare deployment remains blocked because Wrangler is not authenticated. The old Worker remains available for rollback; the custom domain remains unattached and staging remains noindex.

## Safe operator sequence

1. Commit the recovery documents and current smoke-test fix. **Completed:** `e659222`.
2. Rename the GitHub repository through the authenticated API, verify the repository id is unchanged, update `origin`, and push `main` without force. **Completed:** remote `main` is `e659222`.
3. Authenticate Wrangler, deploy Worker `nusacanvas-space`, and verify the workers.dev origin with `npm run verify:staging` plus live smoke checks. **Blocked:** Wrangler reports `You are not authenticated`.
4. Record the exact remote heads, deployed commit, headers, noindex, 404 behavior, and rollback reference. Remote head is recorded; live deployment fields remain pending.

No custom-domain attachment, DNS change, indexing change, old-Worker deletion, or Batch 3R runtime work is authorized by this recovery record.
