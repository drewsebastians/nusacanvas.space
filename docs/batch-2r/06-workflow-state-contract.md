# Batch 2R Prompt 6 — Workflow state contract

## Durable versus temporary state

| State | Owner | Persistence |
| --- | --- | --- |
| Highlights, import rows, matching corrections, visualization, export metadata, stable region IDs, boundary/registry version | Existing Batch 2 engines and project storage | Existing project/autosave contract |
| Goal selection, current displayed panel, drawer visibility, mobile sheet height, project panel visibility, export toast | `workspace-shell.js` | Temporary only; never added to project files |

## Entry and transitions

| From | Event | To | Guard |
| --- | --- | --- | --- |
| Choose | Highlight regions | Manual | Map is ready; selection controls receive focus. |
| Choose | Map spreadsheet data | Add data | Paste area receives focus. |
| Choose | Try a sample | Match regions | Existing sample import preview runs before matching can be applied. |
| Add data | Preview input | Match regions | Existing import/matching engine produces rows; no data is applied yet. |
| Match regions | Use matches | Design map | Existing engine requires valid/resolved rows. |
| Design map | Safe forward navigation | Export | Existing engine requires at least one highlighted region. |
| Any spreadsheet stage | Backward step | Earlier valid stage | Existing workflow guard preserves current imported/project data. |
| Any state | Project open/start-over | Existing project safety path | Existing warning/confirmation and migration paths remain authoritative. |

The visual stage is not treated as proof of readiness. Existing import rows, resolved matches, and highlights remain the source of truth for forward guards.

## Accessibility contract

- Step labels are visible and state changes are announced through the existing workflow status plus a concise workspace live status.
- Drawer and project controls expose `aria-expanded`; closing the project panel restores focus to its trigger.
- Keyboard users can reach the region selector, search, table, matching controls, export controls, and project actions without map-pointer interaction.
- The map/table selection linkage remains owned by the existing map and table code.
- Mobile sheet state is predictable and safe-area-aware; the map remains visible while the sheet is collapsed or medium.

## Regression coverage

`npm run test:batch2r:workspace` covers manual selection and handoff, spreadsheet stages, the data drawer, export feedback, mobile sheet transitions, narrow overflow, and visual capture. Existing Batch 2 smoke tests retain XLSX security, ambiguity resolution, deterministic visualization, project migration, export attribution, keyboard, and mobile checks.
