# Peta Warna Wilayah Indonesia

Peta Warna Wilayah Indonesia is a static browser app for coloring Indonesia kabupaten/kota regions for reports, presentations, and planning notes. It is designed for non-GIS users: select a region, choose a color, review highlights, then export the map.

Target staging URL: `https://mapnesia.andrew-sebastian91.workers.dev` (Cloudflare Workers; must remain noindex before migration is considered complete).

## Features

- Indonesia ADM2 map with 519 kabupaten/kota-level polygons.
- Search, province filter, dropdown selection, and click selection.
- Multiple region colors with remove, undo, and reset.
- Highlighted-region review list.
- CSV import processed only in the browser.
- Project JSON save/open with optional browser autosave.
- Live legend for highlighted kabupaten/kota regions.
- Always-visible kabupaten/kota names on the map.
- SVG and PNG export for the whole map or the current zoomed map view.
- Lightweight trust pages for sources, methodology, limitations, privacy, terms, changelog, and data-error reports.
- No backend, database, accounts, analytics, external map tiles, or API keys.

## Screenshot

Screenshot capture should be added after running the app locally or on the Cloudflare staging URL:

```text
docs/screenshots/app.png
```

## How to use

1. Open the app.
2. Search or choose a province and kabupaten/kota.
3. Choose a color.
4. Select **Terapkan Warna**.
5. Repeat for other regions.
6. Review **Wilayah Disorot**.
7. Export SVG or PNG.

## CSV format

Use `sample/sample-region-colors.csv` as a starting point.

Required headers:

```csv
Official_Code,Province,Region_Name,Color,Value,Category
```

Matching priority:

1. `Official_Code`
2. `Province` + `Region_Name`

Ambiguous names are not applied automatically. Use official codes where possible.

## Project save and load

Use **Simpan Proyek** to download a JSON project file. Use **Buka Proyek** to reopen it. Autosave is browser-specific and may disappear if browser data is cleared.

## Export

SVG export is best for PowerPoint and editing. PNG export supports 1920 x 1080, 2560 x 1440, and 3840 x 2160. Choose **Tampilan peta saat ini** in the export ratio menu to export only the area currently visible on the map while keeping the highlighted-region legend.

## Data source

Production geometry is based on geoBoundaries Indonesia ADM2 using the HDX/OCHA COD-AB Indonesia lineage.

- Boundary year represented: 2020
- Feature count: 519
- License reported by source metadata: CC BY-IGO / CC BY 3.0 IGO
- Unique metadata matches: 466
- Ambiguous same-name geometry features: 53

See `ATTRIBUTION.md`, `data/README.md`, and `docs/boundary-source-research.md`.

Trust pages:

- `/about/`
- `/contact/`
- `/privacy/`
- `/terms/`
- `/sources-licenses/`
- `/data-methodology/`
- `/limitations/`
- `/changelog/`
- `/guides/mengapa-jumlah-wilayah-peta-berbeda/`

## Privacy

Imported CSV and project files stay in the browser. The app does not upload user data or use analytics. See `PRIVACY.md`.

## Known limitations

The boundary data is for visual reference and is not a legal boundary determination. It uses a 2020 source lineage and does not fully represent the latest 38-province administrative structure. See `docs/known-limitations.md`.

## Local development

Use Node.js 24.x and npm, then install dependencies:

```text
npm ci
```

Serve the Cloudflare Workers static-assets build locally:

```text
npm run dev
```

Then open:

```text
Wrangler will print the local preview URL.
```

Create the deployable static build:

```text
npm run build
```

The build copies only allowlisted production files into `dist/`.

## Cloudflare Workers deployment

The staging target is Cloudflare Workers Static Assets at `https://mapnesia.andrew-sebastian91.workers.dev`. See `docs/deployment-guide.md`.

## Testing

Run the complete non-deployment local gate:

```text
npm run verify:batch1
```

Individual checks:

```text
npm run test:data
npm run test:unit
npm run test:e2e:smoke
npm run test:e2e:trust
npm run test:a11y
npm run test:content
npm run test:security
npm run measure
```

Batch 1 baseline evidence is generated in `artifacts/batch-1/` and summarized in `docs/batch-1/01-baseline-audit.md`. See `docs/development.md` for command details.

## License

Application code is MIT licensed. Third-party boundary data remains under its source license. Leaflet is BSD 2-Clause licensed.

## Contributing

Keep the app static, privacy-preserving, and friendly for non-GIS users. Do not commit confidential data or unlicensed geographic datasets.

## Updating boundary data

See `docs/update-boundary-data.md` for the repeatable update process.
