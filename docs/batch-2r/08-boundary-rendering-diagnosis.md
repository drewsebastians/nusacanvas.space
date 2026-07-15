# Batch 2R Prompt 8 — Boundary rendering diagnosis

## Scope and method

This review used the unchanged simplified source `data/indonesia-adm2-simplified.geojson` (boundary version `IDN-ADM2-2020-geoboundaries-22746128`, 519 features, 2,014,724 bytes). It separately inspected the interactive workspace, SVG output, PNG rasterisation, and PDF rasterisation. The detailed 10.5 MB collection was not requested during startup and was not used to improve normal rendering.

The test matrix covers national, Java, Greater Jakarta, Bali, Nusa Tenggara, Sulawesi, Maluku, Papua, and small-island views; desktop, mobile, DPR 2; and Chromium, Firefox, and WebKit. Evidence and exports are indexed by `artifacts/batch-2r/boundary-rendering-visual-review.json`.

## Findings before the change

1. The source coordinates are already simplified. At normal national zoom, some angularity is therefore a truthful consequence of the licensed simplified dataset; it must not be visually filtered or moved.
2. Interactive Leaflet polygons and exported SVG paths each applied a stroke per feature. The simplified collection contains 39,304 ring segments. 2,614 of them are exact shared administrative edges, so they could be painted twice with independent polygon strokes.
3. The old presentation used default per-feature joins. At dense adjacency and small islands, independent strokes could make seams look darker or less even than coast/external edges.
4. SVG export rounded projected output to two decimal display units. That is at most 0.01 export pixels and does not move geography visibly; it is retained because it bounds output size. The change eliminates duplicate painting rather than altering coordinate precision.
5. PNG and PDF are created from the same SVG; their boundary hierarchy should be fixed at the SVG source rather than separately tuned.

## Diagnosis by renderer

| Renderer | Cause observed | Resulting approach |
| --- | --- | --- |
| Leaflet interactive | Per-feature strokes and joins | Render fills without stroke, then render one exact boundary mesh. Canvas is used where Leaflet exposes it; SVG is an explicit fallback. |
| SVG export | Per-feature `path` strokes | Emit un-stroked fill paths and one rounded `boundary-mesh` path. |
| PNG | Rasterises generated SVG | Inherits the SVG mesh and `geometricPrecision` setting. |
| PDF | JPEG rasterisation of generated SVG | Inherits the SVG mesh, attribution, and selection outline. |

## Evidence

The controlled pair `before/java-independent-strokes.png` and `after/java-single-pass-mesh.png` uses the same source geometry and view: the before capture temporarily restores independent mitered strokes only for comparison; the after capture restores the production mesh. This is a rendering comparison, not a claim that source geometry changed.

Runtime evidence recorded in the benchmark shows 1,125 ms initial ready time and 588 ms selection/zoom in Chromium desktop during the final capture. Firefox, WebKit, and Chromium mobile each reached ready state with no detailed geometry request. These are local QA measurements, not a public performance promise.
