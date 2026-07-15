# Batch 2R pattern research

Research date: 14 July 2026

Scope: information architecture and isolated prototypes only

Product position: NusaCanvas helps non-GIS users turn Indonesia data into clear, presentation-ready maps in minutes.

## Method and limits

This review uses current official standards, public design-system guidance, and first-party product documentation. It studies task patterns and documented behavior; it does not copy another product's layout, illustration, wording, or brand. “Evidence” below is a sourced observation. “Design response” is a NusaCanvas judgment that still needs owner review and later usability testing.

The coded options use synthetic fixtures and lightweight map stand-ins. They do not exercise, replace, or fork the production import, matching, visualization, export, storage, territory, or coverage engines. Automated accessibility checks can find a useful subset of defects; they are not a WCAG conformance claim or a substitute for testing with people.

## Prerequisite review

| Prerequisite | Result | Repository evidence |
| --- | --- | --- |
| Prompt 1 audit | Confirmed | `docs/batch-2r/00-preflight-and-experience-contract.md`, commit `deef83c` |
| Prompt 2 simple-English system | Confirmed | `docs/batch-2r/02-simple-english-content-system.md`, commit `90e67a3` |
| Prompt 3 NusaCanvas foundation | Confirmed | `docs/batch-2r/03-brand-and-storage-migration.md`, commit `1628498` |
| Batch 2 engines intact | Confirmed | Existing import, matching, visualization, map, export, and project-storage modules remain present and unchanged by this prompt |
| Batch 3 runtime frozen | Confirmed | Batch 3 remains contract-only; no territory or coverage runtime module or public route is introduced |

## Accessibility evidence

Sources in this section were accessed on 14 July 2026.

- **Reflow.** WCAG 2.2 requires ordinary content to work at a width equivalent to 320 CSS pixels without loss or two-dimensional page scrolling. A map or data table can require two-dimensional interaction for meaning, but the surrounding page chrome and task controls still need to reflow. [W3C, Understanding 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
- **Text and control contrast.** Normal text needs at least 4.5:1 contrast; essential control boundaries, states, focus cues, and meaningful graphics need at least 3:1 against adjacent colors. Ratios are thresholds and must not be rounded up. [W3C, Understanding 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html), [W3C, Understanding 1.4.11 Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
- **Focus.** Keyboard focus must be visible, ordered by task, and not entirely hidden by author-created sticky content. This is especially relevant to a fixed header, map controls, and mobile bottom sheets. [W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/), [W3C, Understanding 2.4.11 Focus Not Obscured](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html)
- **Targets.** WCAG 2.2 AA sets a 24 by 24 CSS pixel minimum with defined exceptions. The prototypes use a larger 44-pixel product target where practical because the interface is touch-heavy; map geometry itself may use the essential-position exception, but map controls do not. [W3C, Understanding 2.5.8 Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- **Errors.** Errors must be identified in text, with a correction suggestion when known. Color cannot be the only signal. [W3C, WCAG 2.2, 3.3.1 and 3.3.3](https://www.w3.org/TR/WCAG22/)
- **Status.** A loading, matching, save, or export message should be programmatically available to assistive technology without unexpectedly moving focus. [W3C, Understanding 4.1.3 Status Messages](https://www.w3.org/WAI/WCAG22/Understanding/status-messages.html)

### NusaCanvas response

The prototypes therefore use semantic buttons and headings, a skip link, visible `:focus-visible` treatment, live status examples, textual labels beside semantic colors, and a single-column mobile shell. Fixed mobile actions leave space for safe-area insets and do not cover the active map controls. The dedicated data sheet may scroll horizontally inside its own bounded table region, while the page itself must not.

## Service-design evidence

Sources in this section were accessed on 14 July 2026.

### Actions and destructive behavior

GOV.UK recommends a sentence-case label that describes the action, one default button for the main call to action, and left alignment with the form. USWDS similarly recommends short, verb-led labels, a visibly distinct important action, and restraint in the number of buttons. [GOV.UK, Button](https://design-system.service.gov.uk/components/button/), [USWDS, Button](https://designsystem.digital.gov/components/button/)

**Design response:** each workspace step gets one filled primary action. Back, preview, and same-page adjustments are quieter. “Start over” and row removal never borrow the primary teal treatment; destructive work requires explicit, consequence-first confirmation in production.

### Forms, uploads, and errors

GOV.UK's question-page form pattern says to ask only for necessary information, keep each page focused on one question where practical, provide a predictable Back path, and add progress only when research shows it helps. Its upload guidance says to request a file only when necessary, allows both chooser and drag/drop in the enhanced control, requires an associated label/hint, and recommends specific messages for missing, wrong-type, empty, or oversized files. Its error-summary pattern places a linked summary at the top and repeats the message beside the problem field. USWDS says file input must retain a native-input fallback, use proper labels, explain type/size limits, work on mobile, and not depend on drag alone. [GOV.UK, Question pages](https://design-system.service.gov.uk/patterns/question-pages/), [GOV.UK, File upload](https://design-system.service.gov.uk/components/file-upload/), [GOV.UK, Error summary](https://design-system.service.gov.uk/components/error-summary/), [GOV.UK, Error message](https://design-system.service.gov.uk/components/error-message/), [USWDS, File input](https://designsystem.digital.gov/components/file-input/)

**Design response:** NusaCanvas offers paste, file, and sample paths at Add data; a file control remains the underlying mechanism. Accepted formats and local-processing behavior appear before selection. The error example says what failed, what remains safe, and how to recover. Match errors appear in the issue summary and on the affected rows.

### Summaries and long task structures

GOV.UK advises a plain summary list for a small set of related facts and warns against unnecessary summary cards. Its task list is intended for long, complex work whose tasks can be completed in a user-chosen order, not a required sequence. [GOV.UK, Summary list](https://design-system.service.gov.uk/components/summary-list/), [GOV.UK, Task list](https://design-system.service.gov.uk/components/task-list/)

**Design response:** export confirmation uses a compact fact summary, not cards inside cards. The spreadsheet journey is a four-step linear process, so it is not represented as a free-order task list.

### Progress

USWDS recommends a step indicator for three or more high-level screens in a linear process. It must not be the navigation itself; Back/Next controls remain separate. The current step needs explicit visual treatment and `aria-current`, a real heading below it, and “step of total” near the heading. A process list is better for explaining a sequence, not current progress. [USWDS, Step indicator](https://designsystem.digital.gov/components/step-indicator/), [USWDS, Process list](https://designsystem.digital.gov/components/process-list/), [USWDS, Progress easily](https://designsystem.digital.gov/patterns/complete-a-complex-form/progress-easily/)

**Design response:** Map spreadsheet data uses Add data, Match regions, Design map, and Export as high-level stages, but the rail/indicator never traps navigation. Manual highlighting has a shorter contextual flow and does not pretend it has four spreadsheet stages.

## First-party mapping-product patterns

Sources in this section were accessed on 14 July 2026.

| Source evidence | Useful pattern | NusaCanvas judgment |
| --- | --- | --- |
| Google My Maps accepts spreadsheet formats, expects titled columns, asks for a location/place column, and supports matching datasets by shared columns. [Google My Maps, Import map features](https://support.google.com/mymaps/answer/3024836?co=GENIE.Platform%3DDesktop&hl=en) | Make file requirements and column choice explicit instead of guessing invisibly. | Detect likely columns, explain the suggestion, and require a clear confirmation before matching. Keep the NusaCanvas journey Indonesia-region-specific and much simpler than a general mapping tool. |
| Datawrapper offers upload, paste/sample data, a distinct Match/Check stage, highlights unmatched regions, and lets users correct them before visualization. [Datawrapper Academy, Create a choropleth map](https://academy.datawrapper.de/article/115-how-to-import-data-choropleth-map) | Unmatched rows are a normal, recoverable data state, not a generic failure. Sample data supports low-risk exploration. | Keep issue count, affected table rows, candidate region choices, and map feedback linked. Preserve unresolved data and disclose what export will omit. Do not copy Datawrapper's tabs or visual layout. |
| Kepler.gl opens with Add data, includes sample data, and documents that its client-side app keeps local-file data in the browser. [kepler.gl, Add Data to the Map](https://docs.kepler.gl/docs/user-guides/b-kepler-gl-workflow/a-add-data-to-the-map), [kepler.gl, Get Started](https://docs.kepler.gl/docs/user-guides/j-get-started) | A sample is a first-class entry. A concrete local-processing statement can reduce upload anxiety. | Pair “Your spreadsheet stays on your device” with precise supporting copy: processing happens locally in this browser and no account is required. Avoid claims about all future integrations. Keep advanced layers and GIS terminology out of Basic mode. |
| Datawrapper distinguishes choropleth, symbol, and locator map purposes. [Datawrapper Academy, Maps you can create](https://academy.datawrapper.de/article/166-maps-you-can-create-with-datawrapper) | A mapping goal should precede tool configuration. | Lead with four outcome cards, not a generic blank editor. Show territory and coverage as Upcoming because their Batch 3 contracts exist but runtime does not. |

## Research questions and decisions to prototype

| Question | Evidence-informed prototype response | What owner review must decide |
| --- | --- | --- |
| How do users select a goal? | Four outcome cards under a single Create entry; availability is explicit. | Card prominence and whether the homepage feels focused enough. |
| How is spreadsheet data added? | Paste, choose file, or try a synthetic sample, with formats and local-processing copy before action. | Whether upload or paste should be visually dominant. |
| How is column mapping introduced? | Show detected Region and Value columns as an explainable suggestion before continuing. | How much column detail belongs in Basic mode. |
| How are unmatched rows resolved? | Dedicated Match step, issue count, row-level problem, suggestions, and a bounded data/issues drawer. | Whether correction belongs inline, in a drawer, or in a full sheet. |
| How do map and table stay linked? | Row selection and region selection share a highlight; issue filters affect both views. | How often the data drawer should remain visible. |
| How are Basic and Advanced separated? | Basic contains the next decision; Advanced is a labeled disclosure inside the relevant step, never a global alternate product. | Which controls deserve promotion later. |
| How is success and export presented? | Clear success heading, export summary, primary download action, and one relevant next workflow. | Desired celebration level and post-export density. |
| How is a second workflow discovered? | Contextual suggestion after completion or in quiet supporting space, not a competing primary action. | Which next task is most relevant to real users. |
| How does mobile adapt? | Map-first canvas plus collapsed/medium/expanded task sheet and a dedicated data view. | Preferred sheet behavior and default height. |
| How are map controls kept calm? | Only zoom/reset/fit and the current task affordance; labels replace tiny mystery icons. | Minimum useful always-visible control set. |
| How is privacy communicated? | Short trust point plus precise local-processing explanation near file selection. | Whether users understand “device” and “browser” consistently. |
| How are destructive actions differentiated? | Quiet danger treatment, consequence text, confirmation, and separation from Continue/Export. | Exact production recovery behavior, outside this prototype prompt. |
| How does progress avoid a restrictive wizard? | Four high-level stages with separate back/forward actions; completed stages may be revisited; manual flow is shorter. | Rail, horizontal indicator, or progressive-sheet treatment. |

## Research synthesis

The strongest direction is not a generic dashboard. NusaCanvas should begin with the user's mapping outcome, then keep one current decision adjacent to a dominant map. The spreadsheet path benefits from explicit progress because it has four meaningful stages; the manual path does not. Data problems belong in a recoverable linked table, not a transient toast. Privacy belongs beside the data action, and the exact claim must match the local engine. A useful prototype comparison therefore varies navigation emphasis, panel persistence, data-drawer behavior, and density while holding these safety principles constant.
