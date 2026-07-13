# Changelog

## Unreleased

- Batch 2: added local spreadsheet import (paste/CSV/TSV/XLSX), deterministic matching, linked data table, five deterministic visualization modes, shared export specification, SVG/PNG/PDF/mapping CSV export, and Batch 2 project state.
- Added Indonesian Excel-to-map preview content, synthetic examples, and release-closure evidence for workers.dev staging.

- Added a minimal Node 24 toolchain for deterministic build, local development, tests, measurements, and CI.
- Added an allowlisted static build into `dist/`.
- Added baseline size/checksum/network documentation and machine-readable artifacts.
- Added unit coverage for project JSON sanitization and rejection paths.
- Added Playwright smoke and axe accessibility checks.
- Added a least-privilege GitHub Actions CI workflow for non-deployment quality gates.
- Added Cloudflare Workers Static Assets staging configuration, noindex headers, robots.txt, and deployment workflow.
- Removed automatic detailed-geometry startup loading and external boundary fallback.
- Added explicit opt-in high-detail export, tiered runtime labels, PNG memory fallback, and automated performance budgets.
- Added canonical registry v1 with 38 provinces, 519 canonical geometry rows, complete old-ID crosswalk, stable-ID fixtures, and source/version manifest.
- Added project schema 1.1 with boundary/registry/source version fields, canonical region references, migration reports, unresolved highlight preservation, and prototype-pollution rejection.
- Added a compact source/version badge and export metadata that distinguish the 2020 boundary snapshot from current administrative metadata.
- Added deterministic offline data pipeline commands, immutable source inventory, machine-readable license manifest/schema, reproducibility and diff reports, expanded geometry validation, and CI data/license gates.
- Added Indonesian trust pages, data-error report template, CSP/security headers, browser matrix tests, static content checks, security/privacy audit, and the `verify:batch1` release gate.
