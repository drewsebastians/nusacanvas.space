# Batch 2R Prompt 6 — Workspace architecture

## Outcome

`/workspace/` now uses the approved NusaCanvas composition without replacing the Batch 2 domain engines. The workspace is a 344 px workflow rail plus a dominant map canvas on desktop, and a map-first sheet interface on mobile.

The legacy import, matching, visualization, map, export, and project-storage modules remain their own owners of domain state. `assets/js/workspace-shell.js` adds only temporary presentation/orchestration state:

- selected goal (`choose`, `manual`, or `spreadsheet`);
- current display stage derived from the existing workflow status;
- data drawer open/closed state;
- mobile sheet state (`collapsed`, `medium`, `expanded`);
- project actions panel and transient export toast.

None of those values are written into project JSON. Existing durable project data, stable region IDs, boundary version, migration, autosave, and export behavior therefore remain unchanged.

## Layout

- **Desktop:** minimal map header, stable left rail, map canvas, restrained zoom/reset controls, and a collapsible data/issues drawer over the lower canvas. The selected-region controls function as the contextual inspector; no permanent third column exists.
- **Mobile:** the map fills the visual workspace. The controls rail becomes a safe-area-aware bottom sheet. The existing Controls button cycles collapsed, medium, and expanded states; the data table remains a dedicated drawer view.
- **Errors:** the existing safe error message is retained as an alert and receives the Option B-inspired bordered error treatment. It explains the current problem without clearing data.
- **Project safety:** the top Project action opens explicit Save, Open, and Start over actions. Their existing safe download/file/confirmation behavior remains authoritative.

## Goal entry

The entry card presents Highlight regions, Map spreadsheet data, and Try a sample. Sales territories and coverage are described as upcoming only; no Batch 3 route or runtime was added.

Manual highlighting exposes selection, style, legend, and export without the four spreadsheet steps. It includes the owner-required handoff: users with a value for each region are directed to the spreadsheet workflow, which links rows to regions and builds a legend.

## Performance and privacy

The workspace still loads the map engine only at `/workspace/`; public pages remain map-free. No data is uploaded, no workspace telemetry was added, and no additional map tiles or external services are requested.
