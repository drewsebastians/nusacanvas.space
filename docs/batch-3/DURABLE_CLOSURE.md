# Batch 3 durable closure

This document records the complete Batch 3 lifecycle and the final production gate.

1. **Starting baseline:** `main@95c66f4efa0e496fc720bfcdbdd21dc3f7120b52` plus a clean deterministic build.
2. **Forensic reconciliation:** Queue Item 2 established that production was source/build-equivalent; the approved runtime allowlist was empty.
3. **Queue Item 3:** no runtime implementation was required.
4. **Queue Item 4:** independently recorded FAIL for missing first-use guidance, boundary evidence failures, and an isolated mobile export flake. This historical failure is preserved.
5. **Queue 4R:** remediated the approved guidance contract and test-harness preconditions without changing map/data/schema behavior.
6. **Queue Item 5:** independently reviewed the remediation and marked the branch PASS and merge-ready.
7. **PR #6:** merged into `main` as `54985e7f21a3db6a9b23b1d4850ecc94d6d6bbb0`.
8. **Deployment:** exact merged `main` deployed through `npm run deploy`; Worker version `76f76701-872a-4f4f-9690-9614d41b6c1b` became active on 2026-07-23.
9. **Production verification:** PASS across routes, hashes, guidance, smoke, accessibility, performance, security/privacy, map, project, import, matching, visualization, and export behavior.
10. **Release decision:** no release/tag required or created.
11. **Rollback:** not required; previous version `9ef14418-227b-4635-a9d8-ff7097923034` remains the rollback reference.
12. **Durable closure:** this documentation/evidence change records the deployed identity and verification result. Its clean build is byte-identical to the deployed source build, so no redeployment is needed.
13. **Batch 4 eligibility:** after this closure PR merges, `productionVerified: true`, `batch4Allowed: true`, and Batch 4 may begin only through its own Queue Item 1 preflight. Batch 4 did not start here.
