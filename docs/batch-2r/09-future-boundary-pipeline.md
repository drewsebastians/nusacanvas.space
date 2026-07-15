# Future boundary build pipeline contract

This is an implementation-ready specification for a separate build-time repository, for example `nusacanvas-boundaries`. It is not a production pipeline yet and does not accept user spreadsheets.

## Deterministic stages

```text
Pinned source + license record
  -> checksum verification
  -> CRS normalization
  -> geometry repair
  -> coverage/shared-edge validation
  -> stable-ID assignment and crosswalk
  -> coverage-aware simplification
  -> Lite / Standard / Detailed / Export-high artifacts
  -> GeoJSON and, where useful, TopoJSON
  -> numerical + visual QA
  -> manifest, changelog, rollback artifact
  -> NusaCanvas provider compatibility tests
```

Pin tool versions, source URLs, source dates, and source checksums. A rebuild must use a committed container/image or lockfile and emit the same manifest from the same inputs.

## Tooling evaluation

- **GDAL/OGR**: ingestion, format conversion, CRS work, field inspection, and `makevalid`-style repair where licensed/source-appropriate.
- **PostGIS/GEOS**: reproducible validity, overlap/gap, containment, and topology checks for larger review runs.
- **Mapshaper**: topology-preserving/coverage-aware simplification and controlled export.
- **TopoJSON tooling**: optional shared-arc artifact generation when it reduces payload or guarantees common edges.
- **Custom scripts**: only deterministic glue for manifest creation, ID assignment, crosswalk reporting, and exact project fixtures.

Independent per-polygon simplification is not acceptable where neighboring borders must stay identical. Simplify a topology/coverage, then validate shared edges afterward. Small islands, enclaves, and multi-part regions require explicit retention fixtures.

## Resolution policy

- **Lite**: national overview; smallest approved payload.
- **Standard**: normal interactive use; loaded only when a workflow asks for it.
- **Detailed**: province zoom or explicit action; never normal startup.
- **Export high**: presentation output when the device/memory budget allows; show a safe fallback when it does not.

Each tier records artifact checksum, feature count, tolerated area change, simplification method, and expected render/export budget in the manifest.

## Required gates before a new provider can be active

1. Source, license, redistribution/commercial status, and attribution reviewed.
2. File hashes and source lineage pinned; rebuild is deterministic.
3. Valid geometry; expected coverage; no undocumented gaps or overlaps.
4. Shared-edge consistency; coastline/external-border and island fixtures pass.
5. Stable IDs complete and unique; feature count and label anchors reviewed.
6. Area-change tolerance, payload, rendering, memory, and export benchmarks meet approved budgets.
7. SVG/PNG/PDF visual diffs approved for national, Java/Jakarta, Bali/Nusa Tenggara, Sulawesi, Maluku, Papua, and small-island views.
8. A complete crosswalk lists unchanged IDs, splits, merges, retirements, and unresolved IDs.
9. Project compatibility and rollback artifact tested; no silent re-mapping.
10. Provider manifest/changelog reviewed, then the application adapter is updated in a separate change.

If a gate fails, retain the current provider and publish an evidence report; do not replace geometry in place.
