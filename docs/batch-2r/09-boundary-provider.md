# Batch 2R Prompt 9: BoundaryProvider implementation

## What changed

`assets/js/boundary-provider.js` is the current provider interface and adapter. It validates its metadata before use and supplies the approved local 2020 ADM2 artifacts behind a small contract:

- manifest, version, attribution, and license information;
- national and province layer descriptors;
- stable-ID lookup;
- version crosswalk lookup;
- project compatibility report.

`app.js` now requests the lite and detailed layers through this adapter. `project-storage.js`, `export.js`, `map.js`, and the issue-report template use provider metadata rather than their own boundary source/version literals. The matching engine remains independent from source geometry properties and continues to use stable region IDs.

## Runtime behavior

The manifest is embedded in the provider and mirrored in `data/boundary-provider-manifest-v1.json`. This intentional duplication keeps startup requests unchanged while leaving a reviewable, pipeline-facing JSON artifact. The adapter only accepts local `data/` artifact paths; remote base URLs fail clearly. It verifies a fetched artifact checksum and validates the expected 519-feature FeatureCollection before use.

| Tier | Current artifact | When requested |
| --- | --- | --- |
| Lite | simplified ADM2 GeoJSON | normal startup |
| Standard | current alias of Lite | explicit provider request only |
| Detailed | detailed ADM2 GeoJSON | explicit high-detail export request |

## Compatibility behavior

Projects saved now include `boundaryProviderId`. Existing Batch 1/2 projects that pin the current boundary version open normally. An unknown/mismatched provider or boundary version produces a migration report, preserves its region entries as unresolved, and makes no claim that those IDs refer to the current geometry. Existing backup/recovery behavior is not removed.

## Verification

The unit contract checks manifest completeness, actual lite/detailed SHA-256 values, 519 features, local-only request paths, lazy detailed loading, export provenance, legacy compatibility, and unknown-version preservation. Existing data tests remain the baseline for all stable IDs.
