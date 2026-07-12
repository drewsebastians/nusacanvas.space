# Batch 1 Work Package 4: Data truth, stable IDs, and project migration

Date: 2026-07-12

## Boundary decision summary

The app retains the geoBoundaries/HDX COD-AB Indonesia ADM2 2020 geometry snapshot. No newer exact boundary artifact is promoted to production because license, topology, compatibility, and project migration have not been proven.

Production boundary version: `IDN-ADM2-2020-geoboundaries-22746128`.

## Registry counts

- current canonical provinces: 38
- canonical region registry rows: 519
- production geometry features: 519
- unique-name metadata matches: 466
- ambiguous metadata rows: 53
- crosswalk rows: 519

## Crosswalk coverage

Every production geometry `region_id` appears in `data/crosswalk-region-ids-v1.csv`.

Status counts:

- `remapped_to_canonical_id`: 466
- `ambiguous_metadata`: 53

## Migration behavior

Project schema upgraded from `1.0` to `1.1`.

New project files include:

- schema version;
- app version;
- boundary version;
- registry version;
- source version;
- canonical region references;
- legacy source IDs;
- unresolved highlight preservation;
- migration report.

Existing highlights stay keyed by current geometry IDs for UI compatibility. The new stable references are stored next to them.

## Source and license status

Geometry source:

- geoBoundaries API, `IDN-ADM2-22746128`
- represented year 2020
- license reported by source: CC BY 3.0 IGO
- feature count 519

Administrative metadata source:

- Keputusan Mendagri 300.2.2-2138/2025
- amended by Keputusan Mendagri 300.2.2-2430/2025

The app records metadata source/version references but does not redistribute the Kemendagri attachment tables.

## Known unresolved risks

- Official province codes remain blank until row-level lampiran evidence is committed.
- The 53 ambiguous ADM2 metadata matches remain unresolved by design.
- Papua-region current province splits are represented in the 38-province registry, but the old 2020 geometry metadata is not forced into new province buckets.
- A future boundary replacement requires a separate topology/license/performance/migration review.

## Verification commands

Run:

```powershell
npm run check
```

Also verify staging/noindex once Cloudflare credentials are available:

```powershell
npm run verify:staging
```
