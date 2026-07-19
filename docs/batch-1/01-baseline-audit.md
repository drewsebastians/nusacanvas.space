# Batch 1 Baseline Audit

Generated: 2026-07-19T16:41:39.167Z
Repository commit: `33519336c3718bdd3024461f594e04f28655829a`
Branch: `main`

## Runtime entry points

- `index.html` loads local Leaflet, application CSS, and five browser scripts.
- `assets/js/app.js` starts on `DOMContentLoaded` and fetches only the simplified geometry snapshot.
- `assets/js/project-storage.js` defines project schema validation, autosave, and JSON download.
- `assets/js/export.js` creates SVG and PNG files in the browser.

## Production files measured

| File | Raw bytes | Gzip bytes | SHA-256 |
|---|---:|---:|---|
| `_headers` | 918 | 448 | `c0dc03be1680e4d94ad7c29d25cc5f69d83c7cf60d0e528dda13b88c81445d4c` |
| `.nojekyll` | 2 | 22 | `7eb70257593da06f682a3ddda54a9d260d4fc514f645237f5ca74b08f8da61a6` |
| `index.html` | 7020 | 2136 | `574cba2232dd4e6e8db8c6e8de88d8ff2de673d3df333d6aa215dadefa9cf180` |
| `robots.txt` | 70 | 86 | `0c0051d8ae07363825c1f456610ebf7bfc14877cc1754563e45e103311ca91a1` |
| `assets/css/app.css` | 39521 | 7513 | `cefaf61bc1cb938761f57d253162b7f66e48a8135ae5d9dbcc77fd04e4d16739` |
| `assets/js/project-storage.js` | 51363 | 9483 | `f5cacf86f4c8e2eb67b0f7e487159d453a449b9b0bf85dd9b8ead4c0fdbb1f54` |
| `assets/js/import-core.js` | 16128 | 4566 | `f57d2b6e5a5e78ac07029ca65afbf003b887b11646622fee7028754c3f57d2c2` |
| `assets/js/xlsx-import.js` | 12785 | 3549 | `a8169a08d9db291c017d78bdc47254c802f6115b9ae20c4081b1f444d93fd0a6` |
| `assets/js/csv-import.js` | 6759 | 2004 | `9dec8aad1cce5f7f2f46bf8fc5bb490c8e90492d7ab778a82ccf4a4ba0c78360` |
| `assets/js/export.js` | 31376 | 8801 | `dc2254b2f683e1f6d36975074bce40d0d61b2d5141eaae67602735a28533224a` |
| `assets/js/map.js` | 24595 | 6487 | `14b01de5d84cf19034f33e6ae075d29b4682df68ff1653a4ce7744f4ce44f1a2` |
| `assets/js/app.js` | 86719 | 20162 | `f3ab152831f44fe6a58b4b8baed780fd15746951c895921048aaa09e4b90a60f` |
| `assets/vendor/leaflet/leaflet.css` | 14806 | 3524 | `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6` |
| `assets/vendor/leaflet/leaflet.js` | 147552 | 42494 | `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a` |
| `data/indonesia-adm2-simplified.geojson` | 2014724 | 518479 | `6d735512fb7cab04ac7ca6048aa41437eba4f53595b83d8da4f25c198ba01f91` |
| `sample/sample-project.json` | 990 | 478 | `acc3aea829f3654f97041dffade65aa7a7ae7ae3cbc1361166782e85e6974c83` |
| `sample/sample-region-colors.csv` | 227 | 197 | `10de9761ce0e394a3fb1084a8c157116aba4a2a05e6357dfe4ce56f63b7acd2d` |
| `data/indonesia-adm2-detailed.geojson` | 11002896 | 2999713 | `146653d488331086ddc43d159a261b01ea6dd08c7ed422e34a9886c3c690430c` |
| `data/indonesia-adm2-detailed-provinces-index.json` | 8763 | 2137 | `1f21757fb607d37340441c56dc95d7b6d231efa45d87489bb33474262bdff68e` |
| `data/indonesia-adm2-label-anchors.json` | 52007 | 14601 | `3dac2e7efd959362eec873ffd3af2a47b0ab00eab9c959c33ac49419a9be8b51` |
| `assets/vendor/read-excel-file/read-excel-file.min.js` | 37686 | 11957 | `9f2c26e44c7fdb69d8ea70f05e44eb64de152c084e15d245b114d0f8cf77db73` |
| `assets/js/matching-engine.js` | 10941 | 2861 | `7c86eb494320db5e25c78462744dcb0e9fe8d01cdbd045a27ca2fbf1c634a891` |
| `assets/js/visualization-engine.js` | 14064 | 4162 | `c3ab92d5f23ef7825b1ca1ace976f59e2f93cb135ea612c64e741d61a1b252d2` |
| `assets/vendor/leaflet/images/layers-2x.png` | 1259 | 1282 | `066daca850d8ffbef007af00b06eac0015728dee279c51f3cb6c716df7c42edf` |
| `assets/vendor/leaflet/images/layers.png` | 696 | 719 | `1dbbe9d028e292f36fcba8f8b3a28d5e8932754fc2215b9ac69e4cdecf5107c6` |
| `assets/vendor/leaflet/images/marker-icon-2x.png` | 2464 | 2487 | `00179c4c1ee830d3a108412ae0d294f55776cfeb085c60129a39aa6fc4ae2528` |
| `assets/vendor/leaflet/images/marker-icon.png` | 1466 | 1489 | `574c3a5cca85f4114085b6841596d62f00d7c892c7b03f28cbfa301deb1dc437` |
| `assets/vendor/leaflet/images/marker-shadow.png` | 618 | 641 | `264f5c640339f042dd729062cfc04c17f8ea0f29882b538e3848ed8f10edb4da` |
| `data/indonesia-adm2-registry.csv` | 133114 | 16350 | `db269ffe8bd12ba2c337fefd7812d9e4c9059e61bb5339a2697a78836c6ca116` |

## Geometry baseline

- Simplified geometry: 519 features.
- Detailed geometry: 519 features.
- Detailed province chunks: 35; largest three cached chunks: 4767764 bytes.
- Simplified SHA-256: `6d735512fb7cab04ac7ca6048aa41437eba4f53595b83d8da4f25c198ba01f91`.
- Detailed SHA-256: `146653d488331086ddc43d159a261b01ea6dd08c7ed422e34a9886c3c690430c`.
- Geometry types: {"Polygon":287,"MultiPolygon":232}.

## Current schema versions

- App version: `null`.
- Project schema: `1.1`.
- Sample project schema: `1.1`.
- Boundary version: `IDN-ADM2-2020-geoboundaries-22746128`.
- Data registry schema: No explicit version field found in data/indonesia-adm2-registry.csv.

## Network and deployment baseline

- Initial app files are local relative URLs.
- Detailed geometry is an on-demand export asset, not a startup asset.
- External URLs visible in source: none.
- Browser smoke testing records runtime requests under `artifacts/batch-1/smoke-network.json` when `npm run test:e2e:smoke` is run.
- GitHub workflow directory currently exists: true.
- `.nojekyll` currently exists: true.
- README currently mentions GitHub Pages: false.

## Current checks

- Pre-Batch 1 repository had one Python data check: `python tests/run_data_tests.py`.
- Batch 1 adds deterministic build, unit, smoke, accessibility, measurement, and CI checks.

## Accessibility and mobile risks visible in implementation

- The sidebar contains many controls and can be dense on small screens.
- Canvas labels are viewport-scoped and collision-culled; hidden regions remain searchable and selectable.
- Several icon-like buttons use text or symbols inherited from the current UI.
- Batch 1 records serious/critical axe failures as a blocking gate and lower-severity findings as artifacts.

## Baseline load, color, save, and export behavior

- Load: fetch local simplified geometry at startup; deferred label anchors feed one Canvas layer, close views add only visible province detail overlays, and the full local detail file remains export-only.
- Color: users select a region, choose a color, and apply it to the in-browser highlight state.
- Save: project JSON is built in the browser and downloaded locally; autosave uses browser localStorage.
- Export: SVG and PNG are generated in-browser without uploading project contents.

## Measurement limitations

- Raw and gzip sizes are filesystem measurements, not CDN transfer logs.
- Browser network evidence depends on the local Playwright environment and is stored separately by the smoke test.
- Accessibility evidence starts with automated axe checks only; manual keyboard and screen-reader testing remain required in later batches.
- The baseline does not verify legal currency of administrative boundaries.
