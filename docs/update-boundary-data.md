# Update Boundary Data

1. Find a newer authoritative reference from Kemendagri, BPS, BIG, Ina-Geoportal, Satu Data Indonesia, HDX, or geoBoundaries.
2. Confirm the license explicitly permits public redistribution, modification/simplification, and Cloudflare Workers hosting.
3. Download the source data without bypassing authentication, CAPTCHA, or access controls.
4. Inspect format, fields, CRS, feature count, geometry types, and province/ADM2 code fields.
5. Convert SHP, KML, geodatabase, WFS, or FeatureServer output to EPSG:4326 GeoJSON.
6. Preserve Polygon and MultiPolygon geometry.
7. Validate null geometry, coordinate ranges, invalid rings, duplicate IDs, overlaps, and gaps.
8. Do not rename existing geometry IDs in-place. Create a candidate boundary version and a crosswalk first.
9. Match official codes and names without forcing ambiguous matches.
10. Update `indonesia-adm2-registry.csv`, `canonical-regions-v1.csv`, `crosswalk-region-ids-v1.csv`, `boundary-version-crosswalk-v1.json`, `unmatched-and-extra-regions.csv`, and `boundary-validation-summary.json`.
11. Simplify only a copy, preserving small islands as far as practical.
12. Update `ATTRIBUTION.md`, `data/README.md`, and source-research documentation.
13. Add project migration fixtures for unchanged, split, merge, retired, ambiguous, and missing regions.
14. Run data, CSV, project, migration, performance, and export tests.
15. Version the boundary data and disclose any changes in release notes.

## Boundary replacement gate

A newer administrative list is not sufficient to replace the active geometry. A production replacement requires:

- clear redistribution and modification rights;
- exact source artifact and checksum;
- topology validation;
- crosswalk coverage for all existing project IDs;
- migration preview/report behavior;
- startup performance proof;
- updated noindex/staging verification.

