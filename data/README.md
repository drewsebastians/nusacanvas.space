# Data README

## Production files

- `indonesia-adm2.geojson`: browser-ready production GeoJSON.
- `indonesia-adm2-simplified.geojson`: app-optimized production geometry simplified from `indonesia-adm2.geojson` for practical browser use.
- `indonesia-adm2-registry.csv`: geometry registry with stable IDs and matched HDX ADM2 metadata where unambiguous.
- `canonical-provinces-v1.csv`: 38-province canonical registry v1.
- `canonical-regions-v1.csv`: ADM2/geometry canonical registry v1 that separates 2020 geometry metadata from current administrative metadata.
- `crosswalk-region-ids-v1.csv`: complete legacy `region_id` to canonical region ID crosswalk.
- `boundary-version-crosswalk-v1.json`: future migration structure for boundary replacements, splits, merges, and retirements.
- `registry-manifest-v1.json`: source URLs, versions, access dates, counts, and SHA-256 hashes.
- `stable-id-fixtures.json`: representative stable-ID and project migration cases.
- `region-aliases.csv`: starter alias table for future manual matching.
- `unmatched-and-extra-regions.csv`: unresolved geometry and official-reference matching issues.
- `boundary-validation-summary.json`: machine-readable validation summary.

## Source

Production geometry uses geoBoundaries IDN ADM2, sourced from the HDX/OCHA COD-AB Indonesia lineage.

- Boundary year represented: 2020
- geoBoundaries boundary ID: `IDN-ADM2-22746128`
- Feature count: 519
- License reported by geoBoundaries: CC BY 3.0 IGO
- HDX package license title: CC BY-IGO

The larger source shapefile and geoBoundaries archive were not committed because the downloads timed out in this environment and the browser application only needs the validated GeoJSON.

## Canonical registry v1

Current versions:

- boundary version: `IDN-ADM2-2020-geoboundaries-22746128`
- registry version: `IDN-ADM-REGISTRY-v1-2025-06-23`
- metadata source version: `Kepmendagri-300.2.2-2138-2025-as-amended-by-300.2.2-2430-2025`

The canonical province registry contains exactly 38 current provinces. Official province-code fields are intentionally blank until row-level lampiran evidence is committed.

The canonical ADM2/geometry registry contains 519 rows, one per production geometry feature. It preserves every existing `region_id`, assigns a stable canonical region ID, and marks unresolved same-name cases explicitly.

Geometry IDs are not renamed in-place. Project files and future migrations use the crosswalk/adapter layer instead.

## Matching status

The geometry contains names and geoBoundaries shape IDs. HDX tabular ADM2 data was used to enrich province names and official-style PCODEs where the geometry name matched exactly and uniquely.

- Geometry features: 519
- HDX ADM2 reference rows: 522
- Unique name matches: 466
- Ambiguous geometry names: 53
- Geometry features without any name candidate: 0
- Reference GeoJSON size: 9,930,000 bytes
- App GeoJSON size: 2,014,724 bytes
- App GeoJSON SHA-256: `6d735512fb7cab04ac7ca6048aa41437eba4f53595b83d8da4f25c198ba01f91`

## App simplification

The app file was simplified with Douglas-Peucker per linear ring at tolerance `0.018` degrees. Rings were preserved with fallback points so small islands/rings are not deliberately dropped. Vertex count changed from 260,746 to 44,950.

Ambiguous features remain usable for manual coloring by stable internal ID, but they are not assigned official codes automatically.

## 519 feature-count scope

The 519 count is the number of ADM2 geometry features in the selected 2020 source snapshot. It is not a claim about the current number of autonomous kabupaten/kota and must not be presented as "latest/current boundary" coverage.
