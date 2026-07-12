# Known Limitations

- The production geometry is based on a 2020 COD-AB / geoBoundaries lineage, not a freshly verified 2026 official boundary.
- Current Indonesia has 38 provinces, but the inspected HDX ADM2 workbook represented 34 province codes.
- Papua Barat Daya, Papua Tengah, Papua Pegunungan, and Papua Selatan are not represented as separate ADM1 provinces in the inspected metadata.
- The geometry contains 519 ADM2 features; the HDX ADM2 workbook contains 522 rows. This differs from the commonly cited 514 autonomous kabupaten/kota count.
- 53 same-name geometry features could not be assigned an official code safely because the geometry file stores name-only attributes.
- DKI Jakarta administrative cities and Kepulauan Seribu are for visual reference, not legal boundary determination.
- Small islands are preserved in the GeoJSON where present, but clickability depends on browser zoom and screen size.
- SVG/PNG export uses a browser-side projection intended for presentation maps, not survey or legal mapping.
- Very large PNG exports may warn or fall back to 1920 x 1080 on memory-constrained browsers.
- High-detail export is opt-in and loads an additional local file of about 10.5 MB only after user confirmation.
- General map labels are intentionally tiered for performance; selected and highlighted labels remain prioritized, and all-label export remains available.
- Offline/PWA support is deferred; the app is currently an online static Cloudflare Workers app.
- This map is not a legal boundary determination.

## Data truth notes

- Boundary version `IDN-ADM2-2020-geoboundaries-22746128` is a historical geometry snapshot, not a current/latest boundary claim.
- Registry version `IDN-ADM-REGISTRY-v1-2025-06-23` records current 38-province metadata separately from the old geometry lineage.
- The 519 number is a geometry feature count. It should not be described as the current number of autonomous kabupaten/kota.
- Official province codes are intentionally blank in registry v1 until row-level lampiran evidence is committed.
- Project files may contain `unresolvedHighlights` after migration if a saved region cannot be applied to the active geometry.
- The deterministic pipeline validates parseability, rings, coordinates, joins, source checksums, license records, and reproducibility, but legal-grade topology overlap/gap review remains a manual/native-GIS release gate.
- `data:refresh` is not a normal build or CI step. New upstream data must stop for source, checksum, license, diff, versioning, and migration review before production use.
- The report-error page can copy/download a structured report, but external submission remains blocked until the owner approves a public contact destination.
- Live Cloudflare staging needs a fresh authorized deployment before the active workers.dev URL can pass noindex/CSP/trust-page verification.

