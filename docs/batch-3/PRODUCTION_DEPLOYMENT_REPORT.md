# Batch 3 production deployment report

## Authorization and source

The owner authorized deployment and post-deployment verification in the Batch 3 production prompt. The exact merged `main` commit deployed was `54985e7f21a3db6a9b23b1d4850ecc94d6d6bbb0`, with application branch parent `9dd0ff63b8c7e846efd17df7425aac9e13fabb02` and PR #6.

## Deployment

- Method: `npm run deploy` using the repository-documented local Wrangler fallback because workflow dispatch was unavailable in the connected tooling.
- Worker: `nusacanvas-space`.
- Routes: `nusacanvas.space` and `www.nusacanvas.space`.
- Previous version: `9ef14418-227b-4635-a9d8-ff7097923034`.
- Active version: `76f76701-872a-4f4f-9690-9614d41b6c1b`.
- Timestamp: `2026-07-23T05:22:35.733Z`.
- Build: 70 allowlisted files, 105-file deployable inventory, 6 deterministic illustrations.
- Wrangler result: 5 uploaded files, 99 already uploaded, 139 files read; deployment succeeded.

Production changed exactly once, from the previous Worker version to the active version above. Both origins propagated consistently. No rollback occurred, and the prior version remains available as the rollback reference.

## Rollback and release

Rollback was not required: no availability, route, asset, security, privacy, performance, or functional trigger occurred. If needed, the documented first action is `wrangler rollback 9ef14418-227b-4635-a9d8-ff7097923034`, followed by `npm run verify:production`.

No release or tag was required or created; repository history and `docs/deployment-guide.md` establish deploy/verify practice but no release/tag convention.

## Evidence

Sanitized durable artifacts are in `artifacts/batch-3/`: deployment summary, verification summary, screenshot inventory, and build-equivalence proof. Operator-side deployment logs and screenshots remain external; no secrets, tokens, credentials, or raw environment output were copied into the repository.

No unrelated source, test, dependency, schema, map, boundary, data, or deployment-configuration changes were authored. This closure is documentation/evidence-only and does not require another deployment.
