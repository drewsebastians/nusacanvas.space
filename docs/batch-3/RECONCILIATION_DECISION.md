# Batch 3 reconciliation decision

## Decision

The authoritative visual and source baseline is `main` at `95c66f4efa0e496fc720bfcdbdd21dc3f7120b52` and its clean `dist` build. Confidence: **high**.

Production, current main, and the clean build are materially equivalent. The only two raw asset-hash differences normalize exactly after CRLF-to-LF conversion, so no runtime, build, deployment, map, or data reconciliation change is approved.

## Evidence and approval basis

The live 15-route inventory, clean-build inventory, DOM observations at 1440x1000 and 393x852, and 22-asset comparison are recorded in the Queue 2 manifests and artifacts. Merged PR #3 documents the approved public refresh and preservation of workspace behavior; PRs #4 and #5 document the carousel and edge-analytics hardening. Live behavior and hashes, rather than commit dates, confirm that the approved result is present.

## Rejected alternatives

- Copy live static assets back into source: rejected because source/build content is already equivalent and copying would preserve incidental CRLF representation.
- Change the build generator or navigation: rejected because it produces the approved current output.
- Treat Cloudflare cache or edge processing as a defect: rejected because headers, CSP, no-transform policy, no beacon markers, and normalized hashes show no material alteration.
- Normalize line endings: rejected by the queue preservation rules and unnecessary for product correctness.

## Scope and safeguards

Approved changed-file allowlist: **empty**. No implementation files need change to prevent recurrence. Protected files remain the Queue 1 protected UI and map/data manifests, including all boundary data, geometry, canonical IDs, provider versions, workspace runtime, root public HTML, generators, deployment configuration, dependencies, and tests.

Expected visible and non-visible result: none; production remains unchanged. Build consequence: a clean build remains deployable from `dist`. Deployment consequence: none is authorized. Migration, privacy, security, and performance impact: none.

## Test, visual, and rollback plan

Queue 3 should verify the no-op reconciliation against the recorded manifests and existing build checks; it must not widen scope. Rendered desktop/mobile DOM evidence is recorded. Screenshot capture should only be retried where the browser endpoint works. Rollback is not applicable because no runtime change is authorized; if a later deployment is separately approved, the documented prior release/Worker version remains the rollback reference.

## Prohibited implementation scope

No Batch 4 work; no map/boundary/data/schema changes; no new analytics, backend, auth, geocoding, localization, dependencies, visual redesign, deployment, or remote-main modification.
