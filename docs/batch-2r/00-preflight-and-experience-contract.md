# Batch 2R Prompt 1 — Preflight and Experience Contract

Date: 14 July 2026  
Repository: `drewsebastians/Indonesian-map-tools`  
Branch: `main`  
Verified baseline: `b88261f` (`docs: add synthetic trial samples`)  
Staging inherited from Batch 2: `https://mapnesia.andrew-sebastian91.workers.dev`

## Decision

The Batch 2 functional release remains intact. Batch 3 runtime implementation has **not** started: only the Batch 3 domain contracts and preflight artifacts exist. Batch 2R therefore freezes the domain engines and begins with an evidence-backed Experience Reset. No production UI redesign, translation, repository rename, Cloudflare rename, territory runtime, coverage runtime, custom domain, indexing, analytics, ads, or AI is introduced by this prompt.

## Gate result

| Gate | Result | Evidence |
| --- | --- | --- |
| Build | pass | `node scripts/build.js`; 48 allowlisted files |
| Source/license/reproducibility | pass | 6 sources, 18 license assets, no drift, run hash `215deb9d81f1ddfe40656dd2191d9ad872646863844971084b756167a4baac61` |
| Geometry and stable IDs | pass | 519 features, 519 canonical regions, 38 provinces, 53 explicit ambiguous fixtures |
| Unit/migration | pass | 31/31 |
| Cross-browser smoke | pass | 56/56 across Chromium desktop/mobile, Firefox, WebKit; includes mobile professional export and two-column official-code evidence |
| Trust/content browser | pass | 12/12 |
| Accessibility | pass | 8/8 serious/critical axe gate |
| Performance | pass | initial 611,579 B gzip; simplified geometry 518,479 B; shell JS 81,974 B |
| Static content | pass | 17 pages |
| Security/privacy | pass | 8/8 |
| Current-state screenshots | pass | 28 images, four viewports, seven states per viewport |
| Batch 3 runtime freeze | pass | no territory/coverage runtime modules or routes found; contracts remain frozen |
| Lint/typecheck | not-applicable | no scripts declared in `package.json` |

The canonical release command was rerun with Node 24.x. The first attempt in the restricted shell returned browser `spawn EPERM`; rerunning with the approved browser environment passed. This is recorded as environment handling, not a product waiver.

## Current product contract to preserve

The stable user journey remains `Input → Match → Visualize → Export`. Input, matching, visualization, export, and project persistence remain local-only. Ambiguous regions remain visible and require explicit user action. Empty, zero, invalid, unresolved, and no-data states remain distinct. Saved projects continue to be migrated through the existing versioned sanitizer.

Batch 3 contracts in `docs/batch-3/00-preflight-and-contract.md` are read-only dependencies in Batch 2R. Do not implement their runtime models here. `sample/` data remains synthetic and clearly labeled.

## Experience-reset contract

Batch 2R may change presentation, copy, navigation, layout, and orchestration boundaries incrementally. It may not change canonical region IDs, boundary geometry, source/license approvals, matching semantics, project schema compatibility, export attribution, XLSX safeguards, privacy behavior, or performance hard budgets without a separate reviewed contract.

The experience must converge toward:

1. one obvious next action for the current workflow stage;
2. simple Indonesian copy with domain terms explained at the point of use;
3. a calm workspace that reveals advanced controls only when needed;
4. recoverable progress and explicit success/error states;
5. the same shared engines for future templates and workflows;
6. content pages that remain separate from the heavy map workspace bundle;
7. keyboard, touch, mobile low-end, and screen-reader behavior as release gates.

The current UI inventory, string inventory, journeys, screenshot manifest, and architecture contract are the baseline evidence for Prompt 2. They describe the existing product and do not claim human usability testing.

## Reproducible commands

```text
node scripts/verify-batch1.js
npm run inventory:batch2r
npm run capture:batch2r:baseline
npm run verify:batch2r:preflight
```

The screenshot command uses the repository Playwright `webServer` configuration and writes only evidence under `artifacts/batch-2r/baseline/` and `docs/batch-2r/screenshots/baseline/`.

## Prompt 2 gate

Prompt 2 may proceed after this commit. Prompt 4 must produce prototype options and an owner review pause before Prompt 5 or later production redesign work is queued. No visual direction is assumed by this preflight.

**READY FOR BATCH 2R PROMPT 2**
