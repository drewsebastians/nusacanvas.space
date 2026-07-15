# ADR: Google Maps boundary policy

- Status: accepted (Batch 2R Prompt 9)
- Date: 2026-07-15

## Decision

Google Maps is not a NusaCanvas production boundary source. It may be assessed only in a separately licensed hosted-display experiment, or as a human visual reference during review. It must not be scraped, bulk-downloaded, traced, digitized, cached beyond applicable terms, or converted into NusaCanvas GeoJSON, TopoJSON, tiles, stable-ID data, or downloadable exports.

Production maps and exports must instead use controlled, approved, reproducible artifacts with a documented source, license, checksum, boundary version, and attribution. No Google integration is implemented by this decision.

Any future Google Maps experiment needs a separate ADR and legal, privacy, billing, attribution, quota, architecture, and user-data review. It must be isolated from the boundary build pipeline and must not receive user spreadsheets unless that review explicitly approves the data flow.

## Evidence and scope

Google's current Maps Platform terms prohibit extraction/export/scraping of Maps Content for use outside the services, restrict caching, and prohibit creating content from Google Maps Content, including tracing or digitizing. The Maps JavaScript API policy also requires appropriate terms, privacy information, and attribution for a compliant use. These are operational guardrails, not legal advice; the owner must obtain advice for a proposed integration.

Sources accessed 2026-07-15:

- [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms?hl=en-EN)
- [Maps JavaScript API policies and attributions](https://developers.google.com/maps/documentation/javascript/policies)

## Consequences

- No Google API key, SDK, tile, runtime request, or Google-derived geometry enters this repository.
- A visual comparison never creates a right to copy geometry.
- A proposal to use Google-hosted display is evaluated separately from the reproducible boundary provider contract.
