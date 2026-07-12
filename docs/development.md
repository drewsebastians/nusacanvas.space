# Development and Testing

This repository is a static browser application. Batch 1 adds a reproducible local toolchain without changing the user-facing map workflow.

## Requirements

- Node.js 24.x
- npm
- Python 3.12 or newer

Install dependencies from a clean checkout:

```text
npm ci
```

## Commands

```text
npm run dev
```

Builds `dist/` and serves it through `wrangler dev`, matching the Cloudflare Workers Static Assets staging shape.

```text
npm run dev:static
```

Serves the repository root at `http://127.0.0.1:8000/` for simple static debugging.

```text
npm run build
```

Copies the allowlisted production files into `dist/`.

```text
npm run test:data
```

Runs the existing Python data validation.

```text
npm run test:unit
```

Runs Node unit tests for project parsing and sanitization.

```text
npm run test:e2e:smoke
```

Builds `dist/`, serves it locally, and verifies load, search/select, color, undo, CSV sample, old-project migration, SVG export, PNG export/fallback, and high-detail opt-in behavior across the configured browser matrix.

```text
npm run test:e2e:trust
```

Verifies trust page navigation, report-error template copy/download behavior, source/version links, noindex metadata, and unknown-route handling.

```text
npm run test:a11y
```

Runs an axe scan and fails on serious or critical violations. Full findings are written under `artifacts/batch-1/`.

```text
npm run test:content
```

Checks static trust-page HTML, internal links, no map bundle loading on content pages, report template fields, robots, and security header configuration.

```text
npm run test:security
```

Runs the local security/privacy audit: secrets scan, runtime external request inventory, CSP checks, project JSON limits, CSV formula escaping, object URL cleanup, Cloudflare-only docs scan, and dependency license manifest audit.

```text
npm run test:performance
```

Checks the versioned performance budget after smoke-test network evidence has been generated.

```text
npm run measure
```

Writes reproducible size, checksum, geometry, schema, and network-baseline artifacts under `artifacts/batch-1/` and refreshes `docs/batch-1/01-baseline-audit.md`.

```text
npm run check
```

Runs the legacy non-deployment local gate.

```text
npm run verify:batch1
```

Runs the complete Batch 1 local gate: clean build, data/license/reproducibility pipeline, geometry tests, unit/migration tests, browser smoke matrix, trust-page tests, accessibility matrix, performance budgets, static content checks, and security checks.

## Notes

- The application remains static and client-side.
- Do not add runtime AI, account systems, analytics, trackers, or unreviewed datasets.
- Cloudflare Workers is the staging deployment path for Batch 1.
