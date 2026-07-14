# Project Progress: Peta Warna Wilayah Indonesia

> Historical record: this document preserves the product name and environment claims used when the work was recorded. The current product identity is NusaCanvas.

## Repository inspection

Status: Complete

Work completed:
- Inspected the workspace before editing.
- Found the workspace was empty or nearly empty.
- Confirmed no `.git` directory is present in the workspace.
- Confirmed the `git` command is not available in this environment.

Files created or changed:
- `docs/project-progress.md`

Decisions made:
- Build a plain static Cloudflare Workers application with no backend.
- Use relative paths for all assets and data.
- Keep all imported user data in the browser.
- Use MIT for original project code unless a future repository owner chooses otherwise.

Problems found:
- No existing README, license, application code, map data, or documentation was present.
- Git branch, commits, pull request, and tag creation cannot be completed in this environment because Git is unavailable.

Remaining work:
- Manual Git commit/PR once Git is available.
- Cloudflare Workers deployment and deployed smoke test.
- Optional full topology validation with GIS tooling.

Blocking issues:
- Git operations require manual completion or an environment with Git installed.

## Boundary research and licensing

Status: Complete for initial public release candidate

Work completed:
- Selected geoBoundaries/HDX COD-AB Indonesia ADM2 as the public production source.
- Documented official government sources as preferred authority references where explicit redistribution was not confirmed.
- Recorded licensing and attribution separately from MIT application code.

Files created or changed:
- `docs/boundary-source-research.md`
- `ATTRIBUTION.md`
- `data/README.md`

Decisions made:
- Use CC BY-IGO / CC BY 3.0 IGO source lineage for public Cloudflare Workers use.
- Do not commit unverified official-government spatial data.

## Data preparation and validation

Status: Complete with documented limitations

Work completed:
- Downloaded geoBoundaries ADM2 simplified GeoJSON.
- Downloaded HDX ADM123 tabular workbook.
- Enriched 466 unique name matches.
- Left 53 ambiguous same-name features unresolved.
- Wrote registry, aliases, unresolved report, validation summary, reference GeoJSON, and app-optimized GeoJSON.

Files created or changed:
- `data/indonesia-adm2.geojson`
- `data/indonesia-adm2-simplified.geojson`
- `data/indonesia-adm2-registry.csv`
- `data/region-aliases.csv`
- `data/unmatched-and-extra-regions.csv`
- `data/boundary-validation-summary.json`
- `docs/data-inspection-report.md`
- `docs/boundary-validation-report.md`

Decisions made:
- Keep all 519 geometry features.
- Use stable geoBoundaries shape IDs for coloring.
- Use official-style HDX PCODEs only when matching is unambiguous.
- Use an app-optimized 2.0 MB GeoJSON for runtime performance.

Problems found:
- Larger shapefile and geoBoundaries archive downloads timed out.
- Source geometry lineage is 2020 and does not represent the latest 38-province structure.

## Application, testing, and documentation

Status: Complete for prerelease

Work completed:
- Built static Leaflet application.
- Implemented search, filter, click selection, coloring, highlight review, remove, undo, reset, CSV import, project save/open, autosave, legend editing, SVG export, and PNG export.
- Added privacy, deployment, update, testing, release, and known-limitations documentation.
- Ran automated data checks and local browser smoke test.

Files created or changed:
- `index.html`
- `assets/`
- `sample/`
- `tests/run_data_tests.py`
- `README.md`
- `PRIVACY.md`
- `docs/testing-report.md`
- `docs/deployment-guide.md`
- `docs/update-boundary-data.md`
- `docs/known-limitations.md`
- `docs/release-notes-v0.9.0.md`

Remaining work:
- Deploy staging to Cloudflare Workers.
- Verify the live URL.
- Run cross-browser manual tests.
- Create Git commits, branch, PR, and release tag in an environment with Git.
