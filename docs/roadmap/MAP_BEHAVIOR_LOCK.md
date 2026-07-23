# Map behavior lock

Preserve one shared map instance, national lightweight startup geometry, detailed export geometry, 519 mapped features, shared-boundary mesh, outlines, administrative labels, density/debounce behavior, lazy province overlays/cache limit, mobile overlays, canonical/legacy IDs, provider/registry versions, and attribution.

Preserve Schema 1.0 fixture compatibility, Schema 1.1 save/open, autosave, manual/imported rows, corrections, visualization/export settings, unresolved highlights, sample project, SVG/PNG/PDF/CSV exports, and no second renderer. Public pages do not load map runtime; workspace starts with simplified geometry and loads detail lazily. Map, provider, project/import/match/visualization/export modules, registries, GeoJSON, labels, fixtures, and boundary tests require special protection and focused review.

Boundary evidence tests must select the real goal control, wait on the observable province-overlay state, and apply a highlight before asserting export controls. These are valid test preconditions, not changes to map behavior.

Production verification at Worker version `76f76701-872a-4f4f-9690-9614d41b6c1b` confirmed no map, boundary, registry, project-schema, or renderer change: 519 mapped features, shared boundaries, labels, lazy detail behavior, and existing SVG/PNG/PDF/CSV exports remain intact. The Batch 3 closure changed documentation/evidence only.
