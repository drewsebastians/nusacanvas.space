# ADR: versioned boundary provider

- Status: accepted (Batch 2R Prompt 9)
- Date: 2026-07-15

## Decision

NusaCanvas separates the administrative registry from the geometry provider. Workflows, spreadsheet matching, autosaves, and project references operate on stable `region_id` values. A boundary provider owns only reviewed geometry artifacts, their provenance, integrity data, version, attribution, and compatibility policy.

The active adapter is `geoboundaries-hdx-idn-adm2-2020`, a local approved ADM2 snapshot. It exposes `getManifest`, national/province layers, lookup by stable ID, version, attribution, license information, crosswalk access, and project compatibility validation. It has no remote source URL at runtime: artifact requests are restricted to local `data/` paths.

The provider manifest is checked into `data/boundary-provider-manifest-v1.json` and duplicated as a frozen runtime manifest so the application does not add a manifest request at startup. The build/data checks verify the artifact checksums. Lite geometry is used at startup; detailed geometry remains an explicit lazy request for high-detail export.

## Project and migration rule

New projects record `boundaryProviderId` and `boundaryVersion`. Older projects with the active boundary version remain compatible. Projects with an unknown provider/version are not fuzzy-mapped or silently reinterpreted: colors and manual highlights are retained as unresolved, a compatibility report lists affected IDs, and the original autosave/file remains available through the existing backup path.

Replacing a provider requires a versioned crosswalk and a user-visible compatibility report before application. A crosswalk must identify one-to-one mappings, splits, merges, retirements, and unresolved IDs. It may never use display-name similarity as a substitute for an approved mapping.

## Consequences

- Matching remains source-independent and continues to target the canonical registry/stable IDs.
- Exports and mapping CSVs read attribution, provider ID, boundary version, and registry version from the provider.
- A future source can be evaluated without rewriting the workspace, but it cannot become active merely by adding a new file.
- The current 2020 snapshot, 519-feature expectation, and license gate remain unchanged.

## Non-goals

This ADR does not replace the production geometry, create a user-data backend, add external map tiles, or claim that a future boundary pipeline already exists.
