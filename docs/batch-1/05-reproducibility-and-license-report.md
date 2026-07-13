# Batch 1 Prompt 5 - Reproducibility and License Report

## Outcome

Prompt 5 adds an offline, deterministic data and license pipeline for the current Batch 1 data release. Normal build, normal CI, and normal app runtime do not fetch live boundary data. Any future source refresh is explicit and fails closed until the new artifact, checksum, license evidence, diff, versioning, and migration review are committed.

## Pipeline commands

- `npm run data:verify-sources` validates `data/sources/source-inventory-v1.json`, `data/license-manifest-v1.json`, checks local SHA-256 values, and rejects unclear commercial-use or redistribution status.
- `npm run data:license` is an alias for the same license/source gate.
- `npm run data:normalize` writes deterministic comparable artifacts under `artifacts/batch-1/data-pipeline/normalized/`.
- `npm run data:match` regenerates canonical registry/crosswalk artifacts from committed registry logic.
- `npm run data:simplify` verifies the pinned simplification metadata, feature counts, and vertex counts.
- `npm run data:build-registry` regenerates registry artifacts from `scripts/generate-canonical-registry.js`.
- `npm run data:build-manifest` writes `artifacts/batch-1/data-pipeline-manifest.json`.
- `npm run data:test` runs the offline source/license, simplification, manifest, reproducibility, and diff gates.
- `npm run data:diff` writes machine-readable and human-readable drift reports.
- `npm run data:reproduce` reproduces comparable artifacts twice in clean temporary output directories and compares hashes.
- `npm run data:refresh` exists only as an explicit review-only placeholder and fails closed by default.

## Inventory and manifest counts

- Source inventory records: 6
- License manifest assets: 17
- Third-party production files covered by license gate: 9
- Comparable reproducibility artifacts: 10
- Geometry features: 519
- Canonical regions: 519
- Canonical provinces: 38
- Ambiguous metadata rows intentionally preserved: 53

## Reproducibility result

`npm run data:reproduce` passed.

- Run A hash: `215deb9d81f1ddfe40656dd2191d9ad872646863844971084b756167a4baac61`
- Run B hash: `215deb9d81f1ddfe40656dd2191d9ad872646863844971084b756167a4baac61`
- Mismatches: 0
- Tracked-output mismatches: 0

## Data diff result

`npm run data:diff` reported `no_drift`.

- Added features: 0
- Removed features: 0
- Changed feature hashes: 0
- ID changes: 0
- Name/code/province changes: 0
- Ambiguity changes: 0
- Project compatibility impact: none
- License/source changes: 0
- Checksum changes: 0

If any of these values changes in a future release, the data release must be reviewed and version/migration documentation must be updated before production approval.

## License gate result

`npm run data:verify-sources` passed.

The gate fails on missing license IDs, missing exact sources, missing local checksums, empty required attribution, unclear commercial-use status, unclear redistribution status, checksum drift, and unmanifested third-party production files.

The application's MIT license remains separate from third-party boundary data, Leaflet, and official-reference material.

## Expanded validation

The data test now checks:

- valid FeatureCollection shape and expected 519-feature count;
- Polygon/MultiPolygon-only geometry;
- finite Indonesia-range coordinates;
- non-empty and closed rings with positive-area coverage;
- duplicate region IDs and duplicate non-empty official codes;
- registry-to-geometry joins;
- province hierarchy references;
- crosswalk completeness;
- stable-ID/project fixture coverage;
- representative small-island fixtures;
- boundary/registry version consistency.

Deep topology validation such as legal-grade overlap/gap repair remains a documented review gate because the project deliberately avoids heavyweight native GIS dependencies in Batch 1.

## CI integration

CI now has a dedicated `data-license` job that runs before browser/app checks:

- source/license manifest validation;
- deterministic reproduction;
- data diff report;
- geometry/registry tests;
- failure artifact upload.

The Cloudflare deploy workflow also runs `npm run data:test` before the normal quality gate.

## Remaining manual review gaps

- The 2020 geometry is still a historical geoBoundaries/HDX snapshot, not a latest official boundary.
- Kemendagri official code fields remain blank until row-level lampiran evidence is committed.
- `data:refresh` is intentionally not automated; a new upstream artifact must be pinned, reviewed, diffed, and versioned manually.
- Full topology validation remains a manual/native-GIS review gate for future boundary replacements.
- Cloudflare live staging passed noindex/header verification on 2026-07-13 after direct Cloudflare deployment.
