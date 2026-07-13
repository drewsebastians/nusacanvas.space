# Batch 2 Architecture And Data Flow

Batch 2 keeps the static vanilla JavaScript and Leaflet architecture. It adds spreadsheet-to-map modules incrementally rather than replacing the existing manual coloring workflow.

## State Flow

```text
Input -> Preview -> Map Columns -> Match -> Resolve -> Visualize -> Export
```

## Data Boundaries

- Input stores source metadata and raw rows locally.
- Preview reads raw rows and inferred column roles but does not mutate the map.
- Match produces canonical region evidence and unresolved states.
- Visualize consumes only resolved/aggregated region values and a versioned visualization spec.
- Export consumes a canonical export specification and required attribution.

## Module Plan

- `assets/js/import-core.js`: source acquisition, delimiter detection, record parsing, limits.
- `assets/js/import-normalize.js`: headers, typed values, locale numbers, validation issues.
- `assets/js/matching-v2.js`: deterministic region matching and ambiguity states.
- `assets/js/visualization-v2.js`: classification, palettes, legend specs.
- `assets/js/export-v2.js`: shared export specification for SVG, PNG, PDF, and mapping CSV.

These modules are planned contracts only. Prompt 1 does not add runtime code.
