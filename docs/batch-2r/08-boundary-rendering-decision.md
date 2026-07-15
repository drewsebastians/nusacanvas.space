# Batch 2R Prompt 8 — Boundary rendering decision

## Decision

Adopt an exact-coordinate, single-pass boundary mesh for both the interactive map and exports.

- Region fills render with `stroke: none`.
- Every exact source segment is collected once, without coordinate smoothing, snapping, or topology repair.
- A neutral mesh renders the 36,690 unique segments with rounded joins and caps.
- A selected region receives a separate dark, rounded presentation outline. It does not change the region geometry or its stable ID.
- SVG exports use the same fill/mesh/selection hierarchy. PNG and PDF derive from that SVG.

## Why this option

It removes 2,614 known duplicate administrative-stroke passes while preserving coastlines, island rings, enclaves, holes, and unmatched geometric edges. A full topology reconstruction was rejected: the source is GeoJSON rather than a guaranteed topology graph, and an inferred topology could incorrectly join islands or enclaves.

The interactive mesh asks Leaflet for its Canvas renderer, which is device-pixel-ratio aware. If that capability is unavailable, Leaflet falls back to SVG while retaining the one-mesh hierarchy. This fallback was used by the local automated runner and is covered by Chromium, Firefox, and WebKit screenshots.

## Non-decisions and safeguards

- The geometry files, feature count, source version, and `region_id` values are unchanged.
- No coordinate smoothing filter, Google-derived data, external tile layer, or startup detailed geometry request was added.
- Existing high-detail export remains explicit and on-demand.
- Transparent SVG/PNG continue to omit the background, while PDF remains opaque because it is JPEG-rasterised.
- Attribution remains in SVG and PDF metadata/output.

## Performance and acceptance evidence

`artifacts/batch-2r/boundary-rendering-benchmark.json` records the geometry size, mesh counts, startup request policy, and local runtime measurements. `tests/e2e/batch2r-boundary-rendering.spec.js` covers startup requests, mesh presence, stable interactive feature count, cross-browser screenshot generation, high-DPR/mobile controls, and SVG/PNG/PDF export smoke. `tests/unit/boundary-rendering.test.js` proves a shared edge is emitted once without mutating input IDs.

Visual review remains `pending-owner-visual-review`; the automated result verifies mechanics and captures, not aesthetic owner approval.
