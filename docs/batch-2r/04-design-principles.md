# Batch 2R design principles

These principles govern the three isolated options. They are proposed constraints for owner review, not approval to edit the production experience.

## 1. Begin with the outcome

Ask “What do you want to map?” before exposing controls. Goal labels use the user's work—highlight, map, build, analyze—rather than engine or GIS terminology.

## 2. Make the next decision obvious

Each stage has one filled primary action with a verb-led label. Back, preview, sample, drawer, and same-page adjustments remain visually secondary. An error can temporarily replace the normal next action with the recovery action.

## 3. Keep the map dominant, not lonely

The map is the primary visual proof that the work is progressing. The task panel stays within 320–360 px on desktop, and the data table appears in a drawer or sheet. Contextual controls may overlay the map temporarily; a permanent third column is prohibited.

## 4. Treat data problems as work, not failure

Unmatched and needs-review rows remain visible, countable, and recoverable. Show the affected row, why it needs attention, and the available correction. Never collapse the condition into a toast or silently omit it from the user's understanding.

## 5. Progressive disclosure is contextual

Basic mode contains everything required for a credible map. Advanced options sit inside the stage where they matter and use a descriptive disclosure label. A global “Advanced product” mode would force users to learn a second interface and is not proposed.

## 6. Progress informs; it does not imprison

The four spreadsheet stages communicate place and completion, while Back and stage-revisit actions remain separate. Manual highlighting receives its own shorter flow. A stage change that would invalidate later work needs a warning in production.

## 7. Trust belongs beside the decision

Local-processing copy appears beside file selection, not only in a footer. Region source and version are easy to reach from the workspace. Privacy claims describe current behavior precisely: no account is required and the selected spreadsheet is processed locally in this browser.

## 8. Mobile is a map workspace, not a shrunken desktop

On small screens, the map occupies the canvas and the task becomes a sheet. The sheet has predictable collapsed, medium, and expanded positions, a separate data view, and safe-area padding. The page does not scroll sideways. Back closes the most temporary layer first.

## 9. Semantics and recovery outrank polish

Use native interactive elements, useful headings, visible focus, explicit labels, live status, and both summary and row-level errors. Aesthetic restraint cannot remove recovery controls or reduce touch targets. Animation must respect reduced-motion preferences and never delay work.

## 10. Separate interface color from map data

Brand/action color tells the user what is interactive. Map palettes encode user data and include a legend, labels or table values, and no-data treatment. A danger color is reserved for destructive or blocking states; it is never a routine navigation accent.

## Layout guardrails

| Surface | Guardrail |
| --- | --- |
| Public header | Product identity, concise navigation, and one Open workspace utility action; no dashboard clutter. |
| Desktop panel | 320–360 px target width, one main scroll area, stable primary action, contextual Advanced disclosure. |
| Map canvas | Largest workspace region; only zoom, fit/reset, and context-required controls remain visible. |
| Data/issues | Collapsible drawer on desktop; dedicated full/expanded sheet on mobile; row and map selection remain linked. |
| Context inspector | Temporary overlay/drawer; never a permanent third column. |
| Mobile sheet | Collapsed shows task/status, medium shows next decision, expanded shows complete step; uses safe-area insets. |
| Export state | Compact summary, clear success message, one main download, and a quiet next-workflow suggestion. |

## Candidate interface palette constraints

Each option explores a restrained direction around deep navy or charcoal text, light neutral surfaces, cool-gray borders, and a teal/blue-green primary action. The comparison is about hierarchy and density, not a conversion-color claim.

Before owner approval, every implemented candidate must pass these automated thresholds:

- normal text: at least 4.5:1 against its actual background;
- large text: at least 3:1;
- primary-action text: at least 4.5:1 against the button fill;
- essential borders, state marks, and focus treatment: at least 3:1 against adjacent colors;
- semantic success, warning, and danger states: color plus text/icon/shape, never color alone.

The exact computed pairs are recorded by `npm run verify:batch2r:prototypes` in `artifacts/batch-2r/prototype-review.json`. Palette direction remains an owner decision. Map-data colors are deliberately separate and must also have an equivalent table/legend value when adjacent polygon colors cannot maintain 3:1.

## Focus and interaction contract

- The first Tab reaches Skip to main content.
- Focus order follows header, current task, map controls, then contextual drawer content.
- Every interactive control receives a clearly visible focus indicator.
- Fixed headers and sheets leave the focused element at least partly visible; the prototype screenshot captures a representative focus state.
- All state examples can be reached without drag, hover, or an unlabeled icon.
- Controls target at least 44 by 44 CSS pixels where the layout allows, and never fall below the WCAG 2.2 24-pixel minimum without a documented exception.
- Loading and success examples use a live status region; validation uses text and a programmatic relationship.

## Motion and performance

Prototype transitions should be short and functional: panel/sheet position, drawer reveal, and selection feedback. Under `prefers-reduced-motion: reduce`, non-essential transitions stop. The prototype uses local HTML, CSS, JavaScript, SVG, and synthetic fixtures only; it does not load web fonts, analytics, remote maps, production data, or domain engines.

## Destructive and unsaved-work behavior

The prototypes show visual differentiation but do not implement production persistence. The later production contract should:

1. state the object and consequence before deletion or reset;
2. require explicit confirmation for irreversible work;
3. preserve autosave/recovery behavior from Prompt 3;
4. warn before navigation when a safe local copy is not available;
5. never use a danger action as the default keyboard focus.

## Quality gates

The isolated review command must cover all three routes at desktop and mobile widths, capture screenshots, run axe, detect page-level overflow, smoke-test keyboard focus and state navigation, validate representative contrast pairs, confirm noindex metadata and headers, confirm sitemap/public-navigation exclusion, and prove the production `dist` build contains no prototype payload.
