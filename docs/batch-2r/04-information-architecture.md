# Batch 2R information architecture

## Product promise

**NusaCanvas helps non-GIS users turn Indonesia data into clear, presentation-ready maps in minutes.**

The public experience starts with an outcome, not a map-engine concept. The workspace then reveals only the decisions required for that outcome. “Region” is the plain collective term for Indonesian regencies and cities; source and version detail remains available through Region data.

## Proposed public structure

```text
NusaCanvas
├── Create
│   ├── Highlight regions             Available — Batch 2 engine
│   ├── Map spreadsheet data          Available — Batch 2 engine
│   ├── Build sales territories       Upcoming — Batch 3 contract only
│   └── Analyze coverage              Upcoming — Batch 3 contract only
├── Templates
├── Examples
├── Guides
├── Region data
├── About
└── Open workspace
```

This structure is a design proposal, not a production-route migration. Prompt 4 adds no public navigation link, sitemap entry, territory runtime, coverage runtime, custom domain, or indexed page.

### Label rationale

- **Create** groups work by intended result and avoids an abstract “Tools” menu.
- **Highlight regions** is concrete for a manual color map and avoids GIS terminology.
- **Map spreadsheet data** names both the user's input and outcome.
- **Build sales territories** and **Analyze coverage** remain visible for product discovery but must display `Upcoming`; no Start action may imply that either works.
- **Templates** supports repeatable goals, while **Examples** demonstrates finished outputs. They are separate because “start from this” and “learn what is possible” are different tasks.
- **Region data** is the plain entry to coverage, boundary version, sources, licenses, and known limitations.
- **Open workspace** is a utility action for returning users. It must not replace the goal-led Create path for first-time users.

## Homepage content order

1. Minimal product header and goal-led navigation.
2. Hero:
   - heading: **Turn Indonesia data into clear, presentation-ready maps.**
   - support: **Highlight regions, upload a spreadsheet, build sales territories, or analyze coverage — no GIS skills required.**
   - primary action: **Create a map**;
   - secondary action: **Try a sample**.
3. Four goal cards with Available or Upcoming status.
4. Trust evidence:
   - Works in your browser;
   - No account required;
   - Your spreadsheet stays on your device;
   - Indonesia region data with source and version details.
5. A concise example/template preview.
6. Supporting Guides, Region data, and About routes.

The trust statement should not rely on icons alone. “Stays on your device” is supported near Add data with “NusaCanvas processes this file locally in this browser.” Future connected-data features would need their own precise disclosure.

## Goal entry contracts

| Goal | Entry promise | First useful action | Availability contract |
| --- | --- | --- | --- |
| Highlight regions | Select Indonesian regions and assign clear colors. | Search or select a region. | Available; opens the existing manual-highlight capability in a shorter contextual flow. |
| Map spreadsheet data | Match region names and values from a table to the map. | Paste, choose a file, or load sample data. | Available; orchestrates existing Batch 2 engines. |
| Build sales territories | Group regions into sales areas and review assignments. | None in Prompt 4. | Upcoming; may link only to honest explanatory content until Batch 3 implementation is approved. |
| Analyze coverage | Compare presence or reach across regions. | None in Prompt 4. | Upcoming; may link only to honest explanatory content until Batch 3 implementation is approved. |

## Spreadsheet journey

### 1. Add data

The user chooses Paste data, Choose a spreadsheet, or Try sample data. Before selection the screen states accepted formats and local processing. After parsing, it shows file name or source, row/column counts, and suggested Region and Value columns. The primary action is **Review region matches**.

### 2. Match regions

The screen reports matched, needs-review, and unmatched counts in text. A linked issues/table view focuses the affected rows. Each unresolved row offers a clear correction choice or retains an unresolved state; nothing is silently dropped. The map previews confirmed matches. The primary action changes according to state: **Fix unmatched regions** while blocking issues remain, then **Design map**.

### 3. Design map

Basic controls cover map title, value/color method, palette, and legend. Advanced is a contextual disclosure for formatting that is not required to make a good map. The map remains dominant and updates with the synthetic prototype fixture. The primary action is **Review export**.

### 4. Export

The screen summarizes title, mapped-region count, unresolved count, format, source/version attribution, and whether a legend is included. A successful export has a programmatic status, an obvious **Download map** action, and a quieter edit action. A contextual suggestion can point to Highlight regions or an honest Upcoming workflow without competing with the download.

Users may go back and revisit completed stages. The step treatment communicates location; it is not the only navigation mechanism and does not discard later work without warning.

## Manual highlighting journey

Manual work uses a shorter contextual sequence:

1. **Choose regions** — search, select on map, or select from a region list.
2. **Set color or group** — apply a clear color and optional group name.
3. **Export** — review title/legend and download.

The interface may show these as contextual tasks or a compact status, but must not force the user through Add data and Match regions. Spreadsheet-specific terminology stays absent.

## Workspace composition

### Desktop

- minimal app header for identity, save state, help, and exit/back;
- one 320–360 px workflow panel;
- dominant map canvas;
- collapsible data/issues drawer;
- contextual inspector as an overlay or temporary panel, not a permanent third column;
- no more than the essential map controls;
- one visually filled primary action per stage.

### Mobile

- map-first canvas;
- bottom or full-step sheet with collapsed, medium, and expanded states;
- dedicated data/issues sheet rather than a squeezed desktop table;
- no horizontal page scrolling;
- padding for `env(safe-area-inset-*)`;
- primary action remains reachable without covering map controls;
- browser Back first closes a temporary drawer/sheet, then returns a step, then leaves the workspace;
- leaving with unsaved work requires explicit protection in production.

The prototype demonstrates these states but does not replace production history or autosave behavior.

## Map–table relationship

The map and table are two views of one selection. Selecting a region on the map highlights or reveals its row; selecting a row highlights or frames the region. A filter such as “Unmatched only” affects issue navigation, not underlying data. Hover may supplement this relationship but cannot be the only method because touch and keyboard users must receive the same information.

## Content and state model

Every active workflow state should expose:

- `goal`: manual highlight or spreadsheet map;
- `stage`: add, match, design, or export where applicable;
- `completion`: not started, current, complete, needs attention;
- `save state`: saved locally, unsaved, or recovery required;
- `issue counts`: matched, needs review, unmatched;
- `data provenance`: synthetic sample or user-selected local file;
- `boundary source/version`: available through the workspace and Region data;
- `availability`: available or upcoming for goal discovery.

State must not depend on color alone. Loading and completion should use a status region; errors should be linked to the affected control or row.

## Prototype route architecture

The review-only routes are:

- `/design-preview/batch-2r/option-a/`
- `/design-preview/batch-2r/option-b/`
- `/design-preview/batch-2r/option-c/`

Each route is served only by the prototype verification server during this prompt. The production build allowlist does not include `design-preview/`; the root app, public navigation, `robots.txt`, and deployment configuration are unchanged. Every prototype document carries `noindex, nofollow, noarchive` metadata, and the test server also sends an `X-Robots-Tag` header.

## Success measures for owner review

This prompt does not claim measured usability. The owner checkpoint should determine whether a reviewer can, without coaching:

- locate Highlight regions and spreadsheet upload;
- explain the four spreadsheet stages;
- distinguish the primary action from supporting controls;
- find and correct unmatched rows;
- find export and the next relevant workflow;
- accurately explain local spreadsheet processing;
- keep the map as the visual center on desktop and mobile.
