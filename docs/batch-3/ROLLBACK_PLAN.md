# Batch 3 rollback plan

Batch 3 began from `main@95c66f4efa0e496fc720bfcdbdd21dc3f7120b52` on `codex/batch-3-production-reconciliation`. Queue commits are `ba1a936`, `0c9ab8f`, `e24c0e9`, `ce7b95b` (Queue 4), and `c3f57bc` (Queue 4R).

No runtime, project data, database, server migration, or deployment changed. To abandon the local unmerged documentation branch, switch to `main` or start a new branch at the documented baseline; do not force-push shared history. If documentation commits are merged, use normal `git revert` commits.

The production rollback reference is `docs/public-site-refresh/RELEASE_REPORT.md`. Any authorized future production rollback needs fresh production, security, performance, and route checks. Recovery clone: `C:\dev\nusacanvas.space-recovered-20260722-135156`; backup: `C:\dev\nusacanvas-recovery-backup\20260722-135156`.

## Queue Item 4R

Queue 4 (`ce7b95b`) and Queue 4R (`c3f57bc`) are committed on the local branch. After merge, reverse the focused remediation with a normal `git revert <queue-4r-commit>` and verify guidance, workspace, smoke, accessibility, and production. Do not force-push. Before merge, abandon it by leaving the branch unmerged; the external checkpoints contain the exact pre-completion diffs and hashes. Reversal affects only static guidance, test setup, and Batch 3 documentation/evidence—no project data, database, server migration, or deployed resource.

Queue Item 5 is documentation-only. If its closure commit must be reversed, use `git revert <queue-5-commit>` and rerun the documentation/queue-state checks. Post-merge production rollback remains separately authorized work; use the deployed SHA and normal provider rollback procedure, never a forced history rewrite.

## Durable production closure

PR #6 merged `main` at `54985e7f21a3db6a9b23b1d4850ecc94d6d6bbb0` and deployed Worker version `76f76701-872a-4f4f-9690-9614d41b6c1b` on 2026-07-23. The prior known-good Worker version is `9ef14418-227b-4635-a9d8-ff7097923034`; rollback was not required because production verification passed.

If the documentation-only closure is abandoned before merge, leave the closure branch unmerged or remove only that local branch after confirming it is not shared. If it is merged, revert the closure merge with a normal `git revert` and rerun JSON, build-equivalence, documentation, and production checks. This does not alter deployed runtime because the closure build is byte-identical to the deployed source build.

If a future runtime incident meets a critical trigger, use the Worker rollback reference above, verify both domains and `npm run verify:production`, then keep `productionVerified` false and Batch 4 blocked until a separately reviewed recovery is complete. No database, server, project-data, or schema migration exists.
