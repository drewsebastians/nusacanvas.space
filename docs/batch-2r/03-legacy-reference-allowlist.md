# Prompt 3 legacy-reference allowlist

This document defines the complete Batch 2R Prompt 3 exception policy for legacy product identifiers. The gate is implemented by `scripts/brand-migration-audit.js`. An exception documented here permits an identifier only in the stated file and context; it does not permit the old identity to appear in the active product experience.

## Failing references

The audit fails when an active product, test, metadata, or future-facing documentation file contains any of the following:

- the former display name `Mapnesia`;
- the former titles `Peta Warna Wilayah Indonesia` and `Peta Sorotan Wilayah Indonesia`;
- a former default filename beginning with `mapnesia-`, `mapnesia_`, `peta-warna-indonesia`, `peta-warna-wilayah-indonesia`, `peta-wilayah-indonesia`, or the exact former neutral prefix `indonesia-region-map` when it is used as an export/project filename;
- the retired GitHub Pages origin under `drewsebastians.github.io/Indonesian-map-tools`;
- the legacy browser-storage key outside the exact migration locations below.

The active scan covers the workspace and trust HTML pages, first-party browser JavaScript, governed content JSON, tests and JSON fixtures, active root/package metadata, current operational workflow metadata, and active architecture/deployment documentation. Adding a new first-party JavaScript file under `assets/js`, content JSON under `content`, or test/fixture file under `tests` automatically places it inside the gate.

## Local migration exception

The only permitted legacy storage token is:

`peta-warna-indonesia-autosave-v1`

It may appear only in:

- `assets/js/project-storage.js`, where it is detected for an idempotent local migration;
- `tests/fixtures/brand-migration/*.json`, where synthetic old states exercise compatibility and recovery;
- migration-focused unit or end-to-end test filenames containing `brand`, `migration`, or `project-storage`.

The replacement key is brand-neutral: `indonesia-region-map-autosave-v2`. The exception does not permit a legacy display name, export filename, URL, or any other former identifier in those files. Project content is never uploaded or logged by the audit.

`assets/js/brand-migration.js` has one additional, file-scoped exception for former product titles and default filename prefixes that it must recognize in old project files. The same exact values may appear in synthetic fixtures under `tests/fixtures/brand-migration/` and migration-focused unit or end-to-end test filenames containing `brand`, `migration`, or `project-storage`, so retention and replacement behavior can be proved. These files may not contain an old remote URL. The exception does not extend to any rendering, export, or content module.

## Truthful historical evidence

Legacy references are allowed in immutable or retrospective evidence under:

- `docs/batch-1/`, `docs/batch-2/`, and `docs/batch-3/`;
- `docs/project-progress.md`, whose opening block explicitly labels the document as a historical record and names the current identity separately;
- Prompt 0–2 Batch 2R evidence and the two Prompt 3 migration notes under `docs/batch-2r/`;
- `artifacts/batch-1/`, `artifacts/batch-2/`, `artifacts/batch-3/`, and `artifacts/batch-2r/`;
- `CHANGELOG.md` and the Prompt 1 inventory builder.

These paths preserve what the product, repository, and deployment were called when evidence was recorded. They are not sources for current product copy. The audit reports their matches as allowlisted references rather than silently ignoring them.

## Prompt 10 operational identifiers

Prompt 3 explicitly does not rename remote infrastructure. Until Prompt 10, these exact operational identifiers are reported as warnings, not failures:

- current repository: `drewsebastians/Indonesian-map-tools` and its exact GitHub URL;
- current Worker service name: lowercase `mapnesia`;
- current staging origin: `https://mapnesia.andrew-sebastian91.workers.dev`.

They are permitted only in deployment/runtime configuration, the current staging verifier, the central brand configuration's `currentStagingOrigin`, the About page's factual current-repository note, and documentation that clearly labels the current staging or deployment target. They are not permitted as the public product name, canonical production origin, default filename, or user-facing brand.

The future canonical origin must be `https://nusacanvas.space`. The Prompt 10 targets are `drewsebastians/nusacanvas.space` and `https://nusacanvas-space.andrew-sebastian91.workers.dev`. Recording those targets does not activate a domain or rename either remote resource.

## Removal condition

Prompt 10 must replace or retire the current repository and Worker warnings after remote migration is explicitly authorized and verified. The local-storage compatibility exception remains until a separately reviewed retention decision confirms that removing it cannot strand user work.
