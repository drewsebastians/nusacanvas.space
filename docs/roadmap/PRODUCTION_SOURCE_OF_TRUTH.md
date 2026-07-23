# Production source of truth

Canonical production origin: `https://nusacanvas.space/`. Secondary custom domain: `https://www.nusacanvas.space/`.

The authoritative deployable source is merged `main` at `54985e7f21a3db6a9b23b1d4850ecc94d6d6bbb0` and its clean deterministic `dist` build. That source is production-equivalent and is deployed to Worker `nusacanvas-space`, active version `76f76701-872a-4f4f-9690-9614d41b6c1b` from 2026-07-23. Future commits become authoritative only after review, merge, clean build, deployment, and live production verification; the historical SHA is not an eternal authority.

Route inputs are public `index.html` files and `workspace/index.html`; `scripts/build.js` owns the strict build allowlist and generated illustrations, while `wrangler.jsonc` deploys `dist`. `_headers` owns security/cache policy. Use `npm run verify:production`, clean-build route/hash manifests, and live headers/DOM as evidence.

The deployment build contained 70 allowlisted files and 6 deterministic illustrations. The full closure inventory contained 105 files; all 105 files matched before and after documentation-only closure changes. Production comparison found 22/22 allowlisted assets byte-identical to the clean build. Compare bytes first; use CRLF-to-LF normalization only as a secondary documented comparison and never alter line-ending policy for evidence convenience.

The approved production guidance is one visible spreadsheet/sample first-use block with CSV/TSV/XLSX, local-device, guide, and keyboard messaging; it is hidden from the visible manual flow and adds no request. Closure-only documentation commits do not change deployable runtime when `dist` remains byte-identical. The next runtime deployment must record its own source SHA, Worker version, timestamp, route/hash evidence, security/privacy result, rollback reference, and release decision.

A source/build/production mismatch requires evidence collection and a reviewed smallest-scope remediation. Never copy edge output into source, infer deployment from dates or screenshots, or treat documentation closure as a deployment. Deployment requires explicit authorization and a clean reviewed `main`.
