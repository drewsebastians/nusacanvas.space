# Batch 2R prototype comparison

Status: design options ready; no owner selection or approval has been recorded.

The three options are isolated design hypotheses. They hold the same product promise, four goal entries, trust contract, spreadsheet stages, shorter manual flow, and safety rules. They differ in navigation emphasis, task-panel treatment, data-drawer behavior, density, and mobile hierarchy. Territory and coverage are visibly Upcoming in every option; neither runtime exists.

## Review routes

Run:

```text
npm run preview:batch2r:prototypes
```

Then open:

- review hub — `http://127.0.0.1:4174/design-preview/batch-2r/`
- Option A — `http://127.0.0.1:4174/design-preview/batch-2r/option-a/`
- Option B — `http://127.0.0.1:4174/design-preview/batch-2r/option-b/`
- Option C — `http://127.0.0.1:4174/design-preview/batch-2r/option-c/`

The normal production build and server do not contain these routes.

## Concise comparison

| Dimension | Option A — Guided Rail | Option B — Canvas Command | Option C — Map Studio Sheets |
| --- | --- | --- | --- |
| Core idea | A spacious goal-led homepage and a persistent 344 px workflow rail beside the map, with data in a bottom drawer. | A compact command header, horizontal process indicator, 348 px floating task panel, and right data/issues drawer. | A quiet editorial homepage and a maximally map-first studio with a compact goal dock and progressive task/data/inspector sheets. |
| Best fit | First-time and occasional non-GIS users who need the clearest next action. | Repeat analysts who want more map visible while comparing task and issues. | Presentation-focused users who value a polished canvas and are comfortable with progressive panels. |
| Density | Lowest; generous type and whitespace. | Highest; compact, precise, analyst-oriented. | Medium; public pages are spacious, workspace controls are compact. |
| Navigation emphasis | Full public navigation and prominent outcome cards; steps live in the rail. | Create command/dropdown plus outcome cards; steps run horizontally above the map. | Editorial public navigation; goal dock remains visible in the workspace. |
| Desktop panel | Stable left rail; easiest current-task scan. | Floating left task panel; right issues overlay can remain open. | Floating left sheet; data opens across the lower canvas and inspector is transient. |
| Data behavior | Bottom drawer keeps map and row context visible; it costs vertical map space while open. | Right overlay supports issue-by-issue work; two panels can visually compete. | Full-width lower drawer makes the linked table easiest to scan; it temporarily covers more of the map. |
| Mobile behavior | Map-first shell; workflow becomes a bottom sheet and data becomes a dedicated sheet. | Horizontal progress remains visible; task/data become layered bottom sheets. | Most native sheet-like behavior, with collapsed/medium/expanded task states and a dedicated data view. |
| Feature discovery | Strongest first-use discovery because all four goals and next actions are explicit. | Strong public discovery and a compact Create menu; future goals are easy to revisit. | Persistent goal dock helps cross-workflow discovery; icon-led workspace entry takes more learning. |
| Implementation complexity | Medium. The panel/drawer model is closest to a simple orchestration shell. | High. Floating task, right drawer, mobile conversion, and two progress models need careful state/focus control. | Highest. Goal dock, multiple overlay types, sheet heights, back behavior, and responsive focus restoration form a larger state machine. |

## Option A — Guided Rail

**Best qualities.** The current stage, explanation, issue count, and next action stay in one predictable column. The wide map remains the dominant desktop surface, while the data drawer proves that table detail does not require a permanent third column. The homepage uses the clearest outcome hierarchy of the three.

**Trade-offs.** A persistent rail consumes width on smaller laptops and may feel more guided than an experienced analyst needs. Long matching or Advanced content will require careful internal scrolling so the primary action remains reachable.

**Accessibility implications.** The reading and focus order is straightforward: header, rail, map, then drawer. The visible step labels reduce memory load. Production will still need focus restoration when the drawer closes and a guarantee that sticky actions never obscure the focused control.

**Mobile.** The rail becomes a sheet with collapsed, medium, and expanded states. A full data sheet is clear and touch-friendly, but returning from the table to the exact unresolved control must remain predictable.

**Discovery effect.** Highest expected first-use comprehension. The explicit goal grid and post-export suggestion make a second workflow visible without competing with the current primary action.

**Risks.** Over-guidance for frequent users, rail overflow as features grow, and temptation to place too many controls in the stable column.

## Option B — Canvas Command

**Best qualities.** The horizontal process reads quickly, the floating panel keeps more of the canvas visible, and the right issues drawer supports direct comparison without turning the whole interface into a dashboard. The action and focus treatment is especially strong.

**Trade-offs.** The task panel, right drawer, process header, and map controls create the highest visual density. When both panels are open, the map is visible but less dominant. The compact public header assumes more navigation confidence.

**Accessibility implications.** The step indicator has explicit labels and separate navigation. The two overlay planes require strong focus management, Escape/Back precedence, and announcement of which drawer is open. Its yellow focus cue is reinforced by a dark outer ring; the recorded effective focus contrast is 14.62:1.

**Mobile.** The process remains at the top while issues become a large bottom sheet. This makes progress easy to recall, but sheet stacking and safe-area action placement need careful production testing.

**Discovery effect.** Strong for users who already understand Create and for repeat users moving between workflows. Slightly less gentle than Option A because the workspace begins in a command-oriented frame.

**Risks.** Competing overlays, accidental density growth, and a stronger divide between public navigation and workspace commands.

## Option C — Map Studio Sheets

**Best qualities.** The strongest visual polish and map prominence. Public content uses an editorial hierarchy instead of generic SaaS cards. The goal dock, task sheet, data sheet, and inspector demonstrate a coherent progressive workspace rather than three fixed columns.

**Trade-offs.** The compact dock introduces the most icon learning. A full-width data drawer is excellent for rows but obscures a larger portion of the map. Users need to understand which sheet is temporary and how Back unwinds it.

**Accessibility implications.** All icon controls have names and the sheet states have visible text. The more complex state graph increases focus-restoration and screen-reader announcement work in production. The prototype's landmarks, focus order, and all axe rules pass after review.

**Mobile.** The most deliberate mobile direction: map canvas first, then a predictable task sheet or dedicated data view. It offers the strongest future basis for safe-area and viewport-height handling.

**Discovery effect.** The goal dock keeps other tasks in view after entry, but its compact presentation may encourage exploration before a novice has completed the current map.

**Risks.** Highest implementation/state complexity, icon discoverability, overlay layering, and the chance that visual polish outruns first-use clarity.

## Palette evidence

These are interface-action pairs, not map-data palette approval:

| Option | Direction | Primary text/fill | Focus evidence |
| --- | --- | ---: | ---: |
| A | Deep navy, restrained teal, blue focus | 5.50:1 | 6.09:1 |
| B | Charcoal/navy, restrained teal, amber plus dark focus | 5.69:1 | 14.62:1 effective dark ring |
| C | Deep navy, restrained teal, blue focus; violet/amber reserved for sample data | 6.29:1 | 5.63:1 |

All exceed 4.5:1 for primary-action text and 3:1 for the recorded focus indicator. Semantic states include text and shape, not color alone. Map colors remain separate from interface action color and have equivalent table/legend values.

## Screenshot evidence

Each option has six committed screenshots: desktop home, desktop unmatched workspace, desktop visible focus, mobile home, mobile unmatched workspace, and the dedicated mobile data view.

- Option A — `artifacts/batch-2r/prototype-screenshots/option-a/`
- Option B — `artifacts/batch-2r/prototype-screenshots/option-b/`
- Option C — `artifacts/batch-2r/prototype-screenshots/option-c/`

The machine-readable manifest and measurements are in `artifacts/batch-2r/prototype-review.json`.

## Advisor recommendation

**Recommend Option A — Guided Rail as the production starting direction, subject to owner approval.**

It best matches the stated primary audience: non-GIS users who need a light, friendly path and one clear next action. Its implementation risk is lower than the multi-overlay alternatives, and the bottom data drawer preserves the linked map/table value without permanently shrinking the map into three columns.

If the owner chooses A, retain two ideas for Prompt 4B consideration rather than silently merging them now:

- Option C's editorial content treatment and disciplined mobile sheet states;
- Option B's focused issues presentation and dual-color focus treatment.

This is an advisor recommendation only. `selectedOption` remains `null`, no approval artifact exists, and no production component has been authorized.

## Automated evidence

`npm run verify:batch2r:prototypes` records:

- 3 options;
- 24 required-state checks;
- 39 axe runs with zero violations;
- 45 page-level overflow checks at 1440, 393, and 320 px;
- 18 screenshots;
- keyboard activation, first-focus, task-before-map order, drawer Escape/focus restoration, and two-way map/table linkage checks;
- explicit column confirmation plus contextual Basic/Advanced checks;
- collapsed, medium, expanded, dedicated-data, safe-area, browser-Back, and unsaved-work mobile checks;
- the shorter Option A manual flow remains manual through style and export;
- primary-action and focus contrast checks;
- no external requests or console errors;
- noindex metadata/header checks;
- production-build, public-navigation, and sitemap isolation.

The same evidence proves `dist/design-preview` does not exist after a normal production build.

## Owner review checklist

Use a fresh desktop window and a mobile-sized window for each option. Do not treat this checklist as approval; record observations first.

### Task comprehension

- [ ] Find where to highlight regions.
- [ ] Find where to upload or paste a spreadsheet.
- [ ] Explain the four spreadsheet steps without reopening the homepage.
- [ ] Identify the one primary action in the current step.
- [ ] Identify how to fix unmatched regions.
- [ ] Identify how to export the map.
- [ ] Find a second relevant workflow after success.
- [ ] Explain what happens to the selected spreadsheet data.

### Workspace judgment

- [ ] Judge whether the map is visually dominant on desktop.
- [ ] Judge whether the data/issues view is discoverable without crowding the map.
- [ ] Judge whether Basic options are sufficient and Advanced options stay contextual.
- [ ] Judge whether map controls are restrained and understandable.
- [ ] Judge whether error, loading, and success states are calm and actionable.
- [ ] Judge whether the mobile primary action is reachable without covering map controls.
- [ ] Judge whether collapsed, medium, expanded, and data-sheet behavior is predictable.
- [ ] Judge whether mobile has any horizontal page scrolling.

### Decision record for Prompt 4B

Record all of the following before running Prompt 4B:

- selected option;
- elements to retain from the other options;
- required changes;
- rejected patterns;
- preferred palette direction;
- preferred density;
- header/navigation preference;
- desktop workspace preference;
- mobile sheet behavior preference;
- any other must-change constraint.

Prompt 4B—not this document—creates the approval record. Do not queue Prompt 5 before Prompt 4B returns the approved design direction.
