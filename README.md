# NusaCanvas

NusaCanvas turns spreadsheet data into clear Indonesia regency and city maps. It is a static, local-first app for people who do not use GIS: add data, review region matches, choose an easy-to-explain color method, check the table, map, and legend, then export.

Future production origin: `https://nusacanvas.space`. The custom domain is not attached or indexed yet.

Current staging remains at `https://mapnesia.andrew-sebastian91.workers.dev` and is intentionally `noindex`. The existing GitHub repository and Cloudflare Worker identifiers stay unchanged until the planned remote-platform migration.

## Current features

- Local paste, CSV, TSV, and XLSX input through one import workflow.
- Column matching, Indonesian and international number formats, and browser-side input limits.
- Deterministic region matching; ambiguous names, unmatched names, duplicates, and ignored rows stay visible.
- Local review or ignore actions for uncertain rows without uploading data.
- A four-step flow: Add data, Match regions, Design map, and Export map.
- Categories, equal ranges, ranked groups, manual ranges, and colors around a midpoint; empty data is never treated as zero.
- SVG, PNG, raster PDF, and region-match CSV exports with required attribution.
- Local project files and browser autosave for manual colors, imported rows, match decisions, visualization settings, and export details.

There is no backend, account system, analytics, external map tile service, runtime AI, or runtime CDN.

## How to use NusaCanvas

1. Open the workspace and choose **Try a sample**, paste a table, or select a file.
2. Preview the input and confirm the suggested columns.
3. Fix uncertain region names or add a province or region code.
4. Use the valid rows, choose a visualization, and check the map, table, and legend.
5. Add a title, source, period, and optional note.
6. Export SVG, PNG, PDF, or a region-match CSV.

Synthetic examples are available as [CSV](./sample/contoh-nilai-kota.csv) and [TSV](./sample/contoh-nilai-kota.tsv). See the [Excel to map](./excel-to-map/) preview and the guides in `guides/`.

## Spreadsheet formats and safety

Headers are not fixed. The column mapper recognizes region, province, code, value, category, source, and period columns. Official codes take priority, followed by region name plus province. Ambiguous names are not applied automatically.

XLSX files are processed locally after a ZIP structure check. The app rejects macro-enabled workbooks, embedded objects, external links, encryption markers, and unsupported formats. These safeguards limit browser processing; they are not malware protection or a forensic document scan.

## Exports and privacy

SVG works well for PowerPoint and editing, PNG for a ready-to-use image, and PDF for a local A4 or A3 raster document. The region-match CSV records match results and escapes formula prefixes. You explicitly choose either **All of Indonesia** or **Current map view**.

Imported data and project files are processed in your browser. NusaCanvas does not upload user data or add analytics. Cloudflare may keep standard hosting access logs outside the app's control. Read [PRIVACY.md](./PRIVACY.md) and the [architecture notes](./docs/architecture.md).

## Data and limitations

Production boundaries follow the geoBoundaries/HDX OCHA COD-AB Indonesia ADM2 lineage for a 2020 snapshot with 519 mapped shapes. They are a visual reference, not a legal boundary record or a claim about the latest administrative structure. Required attribution remains in every export.

See [ATTRIBUTION.md](./ATTRIBUTION.md), `data/license-manifest-v1.json`, and [known limitations](./docs/known-limitations.md). PDFs are currently raster images, several source rows are not automatically combined into one region, and large projects are limited by browser storage.

## Development and quality gates

Use Node.js 24.x.

```text
npm ci
npm run build
npm run verify:batch1
```

`npm run build` copies only approved production assets to `dist/`. See `docs/development.md`, `docs/deployment-guide.md`, and the historical reports in `docs/batch-2/` for testing and staging details.

## License

Application code uses the MIT License. Boundary data and third-party libraries remain subject to their own source licenses and attribution requirements.
