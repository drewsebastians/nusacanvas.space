# Current User Journeys

Baseline: `b88261f`. These are observed product paths, not recommended redesigns.

| Journey | Starting point and path | Current friction / terminology | Recovery and next action |
| --- | --- | --- | --- |
| Manual highlight | Workspace → Pilih Wilayah → Pilih Warna → Terapkan Warna | Manual coloring competes with spreadsheet import; `Grouping` is unexplained | Undo/reset exist; next action is visually unclear after applying |
| Paste two-column | Impor Data → Paste → Pratinjau Import → mapping → Terapkan Hasil Valid | User must understand header mapping and explicit apply | Cancel and preview preserve control; success is shown in table/map |
| CSV/TSV | Choose file → preview → map columns → apply | File picker and format choice appear together; “mapping” requires context | Invalid/unmatched rows remain visible; correction is project-scoped |
| XLSX | Choose XLSX → choose sheet → shared preview → apply | Sheet selection is hidden until XLSX is parsed; users may not understand local processing | Parser limits and cancel path protect the browser |
| Unmatched/ambiguous | Data table status → choose candidate/ignore → apply | `ambiguous`, `unmatched`, and `candidate` are domain terms | Explicit resolution prevents silent matching; warning must remain prominent |
| Visualization | Visualisasi dari data → choose method/classes/palette → preview → apply | Five methods and multiple settings are exposed; “divergen” and “kuantil” need plain explanations | Preview/apply separates experiment from commit; no-data remains distinct |
| Linked table/map | Data Anda → filter/sort → select row → map highlight | Table arrives below map and sidebar; selection relationship is not introduced early | Live announcement and selection status support recovery |
| SVG export | Ekspor → ratio/extent/labels → Ekspor SVG | Many options before the first export; “extent” is technical | Download success is browser-native; attribution is embedded |
| PNG export | Ekspor → size/background/detail → Ekspor PNG | High-detail option explains memory but increases decision load | Fallback path and size guard reduce failure; mobile needs short path |
| PDF export | Ekspor → metadata/ratio → Ekspor PDF | PDF is grouped with image exports although it has different expectations | Local raster PDF and warning are documented; success is download |
| Mapping CSV | Ekspor → Ekspor tabel mapping CSV | Useful for review but visually secondary; formula safety is invisible | Deterministic sanitized download; should be offered after match |
| Save/reopen project | Proyek → Simpan Proyek → Buka Proyek | Project feature is below many work controls; schema terms are hidden | Migration report and stable IDs protect old files |
| Autosave recovery | Reload or return → autosave status → recover/clear | Status is passive and may be missed | Local-only status and clear action exist; unsaved work needs stronger cue |
| Future Sales Territory | No runtime entry point; Batch 3 contract only | Correctly absent in Batch 2R; adding a shortcut now would violate freeze | Prompt 5+ may add it only after owner-approved direction and contract-compatible orchestration |
| Future Distribution Coverage | No runtime entry point; Batch 3 contract only | Correctly absent in Batch 2R; no external dataset is available | Prompt 5+ may add it only through user-supplied metrics and shared map engine |

## Cross-journey observations

- The most useful contextual next action is usually known (`preview`, `apply`, `visualize`, or `export`) but is not always visually dominant.
- The app has good safety checkpoints; the redesign should make them easier to notice rather than remove them.
- Mobile and keyboard paths must be tested at each journey transition, especially after moving export or data-table sections.
- The existing automated smoke suite covers these paths. Human comprehension remains unverified and must be tested separately using the existing manual protocol.
