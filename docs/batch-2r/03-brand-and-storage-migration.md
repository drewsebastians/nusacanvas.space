# NusaCanvas brand and storage migration

This note records the Batch 2R Prompt 3 implementation contract. It describes the active code, the compatibility boundary, and the checks that must be green before Prompt 3 closes. It does not rename or operate any remote platform resource.

## Prerequisite evidence

Prompt 2 is present at commit `90e67a3` (`batch2r: establish simple english product language`). The committed and regenerated `artifacts/batch-2r/terminology-audit.json` records `status: "passed"` and `language: "en"` for the governed active product surfaces. The reproducible prerequisite command is:

```powershell
npm run audit:terminology
```

Official Indonesia place names, spreadsheet header aliases, and source or licence names remain documented exceptions; active instructions, controls, errors, trust pages, and guides use simple English.

## Central brand architecture

`assets/js/brand-config.js` is the single active source for product identity. It exposes an immutable `ProductBrand` configuration with:

- product name: `NusaCanvas`;
- positioning: “Create clear Indonesia regency and city maps from spreadsheet data.”;
- future canonical origin: `https://nusacanvas.space`;
- current staging origin: the existing Worker origin, retained only as a Prompt 10 operational identifier;
- current contact and issue-report paths, with no invented public email address;
- the default project title and export, project, migration-report, and data-issue-report filenames;
- application ID, version, language, title, and description;
- the planned Prompt 10 repository and replacement staging targets.

The application, export module, project storage, report template, and simple-English content system read defaults from this configuration. `ProductBrand.apply()` owns the small set of HTML brand hooks. `scripts/build.js` bundles the brand configuration, project-field migration, and product content into the root application runtime, while retaining the standalone brand configuration for content pages that need it. Durable project identifiers remain brand-neutral: the app ID and new storage keys describe an Indonesia region-map document rather than a marketing name.

`assets/js/brand-migration.js` is deliberately separate from the active configuration. It contains only the exact former default titles and filename prefixes needed to recognize an old file. It replaces an exact product-supplied default, but preserves a user-authored title or filename even when that text happens to mention a former identity. The input object is copied before migration, and a second execution has no further changes.

## Browser storage inventory

A code audit of `assets/js`, the root HTML, and first-party scripts found one persistence implementation: `localStorage` calls in `assets/js/project-storage.js`.

| Kind | Identifier | Purpose and Prompt 3 behavior |
| --- | --- | --- |
| Current autosave | `indonesia-region-map-autosave-v2` | Brand-neutral validated project copy used for all new autosaves. |
| Former autosave | `peta-warna-indonesia-autosave-v1` | Read-only compatibility source. It is retained after a successful copy and can be recovered explicitly. |
| Migration state | `indonesia-region-map-storage-migration-v1` | Versioned marker recording `migrated`, `current`, or `cleared`; prevents an intentionally cleared current backup from being silently restored from the retained source. An existing invalid or unreadable marker fails closed. |
| Replaced-target recovery | `indonesia-region-map-autosave-recovery-v1` | Brand-neutral, single-slot byte-for-byte copy of the current target before an explicit recovery replaces it. It can be downloaded or permanently deleted in the Project controls. |

The audit found:

- no IndexedDB database or object store;
- no `sessionStorage`, Web SQL, or Cache Storage persistence;
- no separate recent-project key;
- no separate export-preference key;
- no separate boundary-data cache or cached-boundary metadata key.

Export preferences and boundary provenance are fields inside the project/autosave document. Project JSON files are opened from a user-selected local file and saved through a browser download; they are not placed in another browser database.

## Project, export, and boundary inventory

The current project schema is `1.1`; schema `1.0` remains an explicit supported input. The shared project-file contract accepts up to 5,000 imported rows and a maximum 20,000,000-byte downloaded JSON file. `buildProject()`, project download, browser autosave, and project open use the same contract, so the app does not knowingly save a project file that its own open flow rejects. Save failures remain visible. A normalized project contains:

- `appVersion`, `schemaVersion`, `boundaryVersion`, `registryVersion`, `sourceVersion`, `savedAt`, and the user-editable `title`;
- `highlights`, `manualHighlights`, `regionRefs`, `unresolvedHighlights`, `legend`, `legendVisible`, `legendPosition`, `groupNames`, and `groupMeta`;
- `importCorrections`, `importRows`, `visualization`, `workflowStage`, and `uiMode`;
- `exportMeta` with `subtitle`, `source`, `period`, `footnote`, `legendTitle`, and `filenameSlug`;
- `exportSettings` with `ratio`, `extent`, `labels`, `transparent`, `highDetail`, and `pngSize`;
- a project update report when a schema, region reference, brand default, or storage location was migrated.

The active provenance constants are:

- boundary: `IDN-ADM2-2020-geoboundaries-22746128`;
- registry: `IDN-ADM-REGISTRY-v1-2025-06-23`;
- source: `geoBoundaries-IDN-ADM2-22746128 + Kepmendagri-300.2.2-2138/2025 amended 300.2.2-2430/2025`.

Brand migration does not change region IDs, boundary version, registry version, source version, colours, rows, visualization settings, or export settings other than an exact former default filename prefix. During schema `1.0` normalization, known legacy region IDs remain the highlight keys and receive current canonical `regionRefs`. An unknown ID and its colour are moved to `unresolvedHighlights`; an ambiguous match is retained and marked for review. This keeps saved regions visible in the report instead of silently dropping them.

The default project title is `NusaCanvas Indonesia region map`, and the default export filename prefix is `nusacanvas-indonesia-map`. These values come from the central configuration rather than the durable schema definition.

## Versioned local migration

The storage migration version is `1`. `ProjectStorage.loadAutosave()` runs the migration before offering a browser backup to the user.

1. Read the current neutral target without modifying either key.
2. If the target exists, parse and sanitize it through the same schema and region adapter used for project files. A valid target returns `already-current`, reports whether the compatibility source still exists, and is not rewritten. This is the normal idempotent repeat path.
3. If the current target is absent and the state marker says `cleared`, return no project. The retained compatibility source is not resurrected automatically. If an existing marker is corrupt, version-mismatched, or unreadable, fail closed with `failed-migration-state`; only an explicit recovery can continue.
4. Otherwise, locate the former autosave key. Parse it, migrate only exact former product defaults, and sanitize the complete project. A parse, schema, unsafe-structure, invalid-colour, or region migration failure leaves the source untouched.
5. If the neutral target exists but is unreadable, automatic migration stops with `failed-invalid-target`; the unreadable bytes and older compatibility source both remain unchanged. If there is no compatibility source, the status is `failed-validation`. In either case a raw-text download control is exposed. Only an explicit recovery or a later edit protected by a verified byte-for-byte safety copy may replace it.
6. Before explicit recovery overwrites any current target, copy its exact bytes to the single replaced-target recovery slot and verify that copy. An occupied slot containing different bytes blocks another recovery until the user downloads it if needed and deletes the stored slot.
7. Copy the validated project to the neutral target. Read it back and sanitize the stored copy again. Only a successful write and verification produces `migrated`, `recovered-invalid-target`, or `recovered-retained-source`.
8. Retain the original source key as the recovery copy and record and verify the migration marker. The compatibility source is never deleted by automatic migration.
9. A reload of a valid neutral target returns `already-current` and does not rewrite the stored JSON, timestamp, or report. Restoring or recovering a validated project only renders it; a user-selected project file performs one explicit autosave attempt after safe application.

Failures are explicit:

- storage read, validation, target write, and post-write verification have distinct failure statuses;
- unresolved and unsupported counts are attached to the report;
- the interface says that no work was cleared and exposes recovery when a retained source exists;
- malformed current and compatibility values can be downloaded as raw text without logging or uploading their contents;
- an edit, project open, or Start over operation first copies and verifies any malformed current value in the replaced-target slot; an occupied different slot blocks the overwrite;
- runtime errors do not call `clearAutosave()`;
- a failed target write can be retried because the original source remains unchanged.

“Start over” removes the current neutral autosave before resetting the visible workspace. It first protects any unreadable target, records and verifies the `cleared` marker, does not silently remove either recovery class, and reports what remains. The “Recover previous browser backup” action calls `recoverRetainedAutosave()`, revalidates the retained source, preserves the target it will replace, and replaces the displayed project only after every validation succeeds. Separate controls permanently delete the previous compatibility source, download either unreadable source as raw text, download the replaced-target slot, or permanently delete that slot.

## Migration reports

Every browser-storage report contains these exact fields:

- `migrationVersion`;
- `createdAt`;
- `status`;
- `sourceKey` and `targetKey`;
- `migratedFields`;
- `retainedFields`;
- `unresolvedEntries`;
- `droppedEntries`;
- `backupStatus`;
- `sourceRetained`;
- `recoverySourceKey`;
- `replacedTargetBackupKey`;
- `replacedTargetRetained`;
- `unreadableBackupKeys`;
- `unreadableBackupRetained`;
- `protectCurrentTargetBeforeWrite`;
- `migrationStateRecorded`.

The exact-default brand report contains `migrationVersion`, `createdAt`, `status`, the four migrated/retained/unresolved/dropped arrays, and `backupStatus`. After safe project normalization, those four arrays are composed with the post-sanitizer field report so they cannot claim that an unsupported field was retained. It is attached as `brandMigrationReport` and under `migrationReport.brandMigration`. The detailed post-sanitizer comparison is attached under `migrationReport.projectFields`. The storage report is attached as `storageMigrationReport` and under `migrationReport.storageMigration`.

The region/schema report separately records `fromSchemaVersion`, `toSchemaVersion`, boundary and registry versions, the `unchanged`, `mapped`, `ambiguous`, `missing`, and `unsupported` entries, their summary counts, `silentLoss`, and `requiresUserReview`. A normal brand/storage migration has zero dropped entries. If the safe project sanitizer encounters an unsupported top-level project field, that field is counted in `droppedEntries` rather than disappearing without evidence. Missing and ambiguous regions are unresolved, not dropped.

The downloadable report filename is provided by the brand configuration. Synthetic fixtures under `tests/fixtures/brand-migration/` contain no raw user data.

## Recovery and compatibility coverage

The migration-focused unit fixtures and tests cover:

- a former autosave on the old key;
- a Batch 1 schema `1.0` project with a known and an unresolved stable ID;
- copying only after validation;
- repeat execution without rewriting a valid target;
- explicit clear without accidental source resurrection;
- corrupt, version-mismatched, and unreadable clear markers failing closed;
- explicit recovery from the retained source;
- recovery from an invalid current target;
- refusal to overwrite an invalid current target before explicit recovery;
- byte-for-byte preservation of a replaced target, occupied-slot protection, download, and explicit deletion;
- direct raw download of malformed current or compatibility values, including a zero-byte value;
- automatic byte-for-byte protection of a malformed target before an edit, project open, or clear;
- a declined startup restore remaining byte-identical until the first replacement edit creates and verifies a safety copy, with occupied-slot refusal;
- target-write failure followed by a later successful retry;
- invalid former data remaining untouched with a visible failure report;
- exact old defaults moving to NusaCanvas defaults;
- user-authored values remaining unchanged;
- repeat brand-field migration producing no further changes;
- an exact stored-string check proving that an accepted browser restore does not rewrite on reload;
- a 5,000-row project round trip under the shared 20,000,000-byte contract;
- empty legends, cleared Undo history, and canceled pending import/visualization work on project replacement.

The existing project sanitizer continues to reject unsupported schemas, unsafe object structures, invalid colours, and oversized payloads. Schema `1.0` and `1.1` compatibility, stable region references, boundary provenance, project save/open, and export regression coverage remain part of the full gate.

## Active identity and historical evidence

Active UI, active content and trust pages, package metadata, generated filenames, tests, samples, and future-facing documentation use NusaCanvas and `https://nusacanvas.space`. `scripts/brand-migration-audit.js` scans governed active files and fails on the former product name, former product titles, former default filename prefixes, the retired future-facing URL, or the compatibility storage key outside its exact migration locations.

`docs/batch-2r/03-legacy-reference-allowlist.md` is the reviewable exception policy. It permits legacy strings only when they are necessary to open old work, prove migration behavior, preserve truthful Batch 1/2 evidence, or identify the still-current remote resources pending Prompt 10. The generated evidence is `artifacts/batch-2r/brand-migration-audit.json`; allowed matches are reported rather than silently skipped.

Old Batch 1 and Batch 2 closure reports, migration notes, old screenshots, deployment evidence, and commit references remain historically truthful. They must not be rewritten to imply that NusaCanvas existed when they were captured.

## Security and privacy boundary

The migration is entirely local and synchronous in the browser. It adds:

- no telemetry or analytics;
- no upload or remote migration endpoint;
- no logging of project content;
- no content-derived analytics event;
- no raw user-data fixture.

Reports contain validation status, affected field names, counts, and the stable region identifiers needed for local review; they do not copy spreadsheet row values into telemetry or logs. Project content stays in the selected file, generated download, or browser storage controlled by the user.

## Remote operations deferred to Prompt 10

Prompt 3 does not rename the GitHub repository or Cloudflare Worker. `wrangler.jsonc` intentionally keeps the current Worker service name and contains no custom-domain route. The current staging origin remains an operational identifier only.

The planned Prompt 10 targets are:

- repository: `drewsebastians/nusacanvas.space`;
- replacement staging: `https://nusacanvas-space.andrew-sebastian91.workers.dev`;
- future canonical production origin: `https://nusacanvas.space`.

Recording these targets does not attach, verify, deploy, or index the custom domain. Remote changes require Prompt 10 authorization and verification.

## Reproducible checks

Run these commands against the final Prompt 3 worktree. The command output and regenerated JSON artifacts are the closure evidence; this design note does not freeze or invent pass counts.

```powershell
npm run audit:terminology
npm run audit:brand-migration
npm run test:unit
npm run build
npm run test:data
npm run data:verify-sources
npm run data:test
npm run test:content
npm run test:security
npm run test:performance
npm run check
npm run test:e2e:smoke
npm run test:e2e:trust
npm run test:a11y
```

Acceptance requires both audit artifacts to report `passed`, all migration and compatibility tests to pass, the full project/export regressions to pass, and `wrangler.jsonc` to remain free of a custom-domain route. The GitHub repository and Worker remote names must still be unchanged at this prompt boundary.
