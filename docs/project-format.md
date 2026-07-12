# Project file format

## Current schema: 1.1

Project files are JSON and are processed entirely in the browser.

Required version fields:

- `schemaVersion`: project schema, currently `1.1`.
- `appVersion`: app writer version.
- `boundaryVersion`: active geometry snapshot, currently `IDN-ADM2-2020-geoboundaries-22746128`.
- `registryVersion`: active registry release, currently `IDN-ADM-REGISTRY-v1-2025-06-23`.
- `sourceVersion`: human-readable source bundle.
- `savedAt`: ISO timestamp.

Highlight data remains keyed by the existing geometry `region_id` so old UI behavior stays compatible:

```json
{
  "highlights": {
    "gb-22746128B123": {
      "color": "#4472C4",
      "category": "Kategori",
      "value": "Nilai"
    }
  }
}
```

Schema 1.1 adds stable references:

```json
{
  "regionRefs": {
    "gb-22746128B123": {
      "canonicalRegionId": "idn-adm2-gb-22746128b123",
      "legacyRegionId": "gb-22746128B123",
      "geometryFeatureId": "gb-22746128B123",
      "migrationStatus": "mapped",
      "boundaryVersion": "IDN-ADM2-2020-geoboundaries-22746128",
      "registryVersion": "IDN-ADM-REGISTRY-v1-2025-06-23"
    }
  }
}
```

If a region cannot be applied to the active geometry, it is stored in `unresolvedHighlights` and recorded in `migrationReport`. The app must not discard it silently.

## Migration behavior

Supported input schemas:

- `1.0`: migrated to `1.1`.
- `1.1`: sanitized and rewritten as `1.1`.

Unsupported versions fail safely.

Migration report classes:

- `unchanged`: already carries the expected canonical reference.
- `mapped`: old geometry ID mapped to canonical ID.
- `ambiguous`: highlight is preserved, but official metadata is unresolved.
- `missing`: highlight could not be applied to active geometry and is retained under `unresolvedHighlights`.
- `unsupported`: reserved for future unsupported item-level states.

The app validates object size, nesting depth, color format, and dangerous keys such as `__proto__`, `constructor`, and `prototype`.
