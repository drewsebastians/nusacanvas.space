# ADR 0001: Boundary snapshot, canonical registry, and stable IDs

Date: 2026-07-12

## Status

Accepted for Batch 1.

## Decision

Production keeps the existing geoBoundaries/HDX COD-AB Indonesia ADM2 geometry as a historical 2020 boundary snapshot. The app must not call this "latest", "current boundary", or "official legal boundary".

The production geometry artifact is:

- simplified runtime geometry: `data/indonesia-adm2-simplified.geojson`
- detailed opt-in export geometry: `data/indonesia-adm2-detailed.geojson`
- source boundary ID: `IDN-ADM2-22746128`
- represented year: 2020
- ADM level: ADM2
- feature count: 519 geometry features
- production boundary version: `IDN-ADM2-2020-geoboundaries-22746128`

The administrative metadata truth source is versioned separately:

- registry version: `IDN-ADM-REGISTRY-v1-2025-06-23`
- source version: `Kepmendagri-300.2.2-2138-2025-as-amended-by-300.2.2-2430-2025`
- province registry artifact: `data/canonical-provinces-v1.csv`
- ADM2/geometry registry artifact: `data/canonical-regions-v1.csv`

## Evidence

The geoBoundaries API reports boundary ID `IDN-ADM2-22746128`, represented year `2020`, ADM2 type, 519 units, and license `Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO)`.

The BPK/JDIH metadata page for Keputusan Mendagri Nomor 300.2.2-2138 Tahun 2025 identifies the subject as pemberian dan pemutakhiran kode, data wilayah administrasi pemerintahan, dan pulau, effective 2025-04-25, with downloadable regulation and attachment files. The BPK/JDIH metadata page for Keputusan Mendagri Nomor 300.2.2-2430 Tahun 2025 identifies the 2025-06-23 amendment.

The app uses those legal metadata pages for versioning and citation. It does not redistribute the Kemendagri attachment tables.

## Why retain the 2020 boundary snapshot?

No newer exact ADM2 geometry artifact has been proven in this repository to satisfy all of these requirements:

1. clear commercial reuse and modification rights;
2. exact topology compatibility;
3. feature-by-feature reconciliation with existing projects;
4. stable migration path for old project highlights;
5. acceptable startup size and performance.

Until all five are satisfied, the 2020 geometry remains the active production boundary snapshot.

## 38 current provinces vs 34 province geometry metadata

The current canonical province registry contains exactly 38 provinces. The 2020 geometry metadata still contains older province buckets, including pre-split Papua metadata. Those are not forced into newer provinces without row-level evidence.

Rows that can be linked safely retain verified geometry-snapshot metadata. Rows with same-name ambiguity remain `ambiguous_metadata_unresolved`.

## Why 519 geometry features may differ from common administrative counts

The number 519 is a feature count in the selected 2020 geometry snapshot, not a claim about the current number of autonomous kabupaten/kota. It also includes non-one-to-one cases from the source lineage and unresolved same-name cases.

Jakarta and other special/non-one-to-one cases are represented as geometry features from the snapshot. They should be treated as map units for visualization, not as legal assertions.

## Stable ID policy

Stable IDs are contracts:

- display-name changes must not change IDs;
- geometry feature IDs are not renamed in-place during Batch 1;
- old IDs map through `data/crosswalk-region-ids-v1.csv`;
- future split, merge, retirement, or boundary replacement events require explicit crosswalk rows;
- ambiguous metadata must stay explicit and reviewable;
- official codes are stored only when row-level evidence is committed.

The canonical region ID format for v1 is derived from the immutable geoBoundaries source feature ID:

`idn-adm2-gb-{lowercase geometry_source_id}`

## Version definitions

- `boundaryVersion`: selected geometry artifact and represented period.
- `registryVersion`: current repository registry schema/data release.
- `sourceVersion`: cited upstream source version bundle.
- `appVersion`: application code version that writes project files.

## Future migration trigger

A migration is required when any of these happens:

- a newer boundary artifact is accepted for production;
- a feature splits, merges, retires, or changes geometry lineage;
- a previously ambiguous region receives row-level evidence;
- official code evidence is added or corrected;
- project schema changes in a way that affects saved highlights or region references.
