# Testing Report

Test date: 2026-07-12

## Integrated local gate

Command:

```text
npm run verify:batch1
```

Result: passed locally.

Coverage:

- clean allowlisted build;
- data/license/reproducibility pipeline;
- Python geometry and registry tests;
- Node unit tests for project parsing, migration, and rejection paths;
- Playwright smoke matrix across Chromium desktop, Firefox desktop, WebKit desktop, and Chromium mobile;
- trust-page navigation and report-error template tests;
- axe accessibility matrix with no serious or critical violations;
- performance budgets;
- static trust-content and header checks;
- security/privacy and forbidden-network checks.

## Evidence summary

- Data: 519 features, 287 Polygon, 232 MultiPolygon.
- Registry: 519 canonical regions, 38 canonical provinces, 53 ambiguous metadata rows preserved.
- Unit/migration: 9/9 passed.
- Browser smoke: 16/16 passed.
- Trust page tests: 12/12 passed.
- Accessibility: 8/8 passed.
- Performance: initial 590,827 gzip bytes; simplified geometry 518,479 gzip bytes; shell JS 63,795 gzip bytes.
- Static content: 9 trust pages checked.
- Security/privacy: 8 checks passed.

## Live staging status

Live Cloudflare deployment could not be performed in this run because the deployment action was blocked by approval policy. The existing staging URL still fails header verification because it has not received the new `_headers` configuration.

GitHub Pages verification through the GitHub API returned 404, which indicates Pages is not configured.
