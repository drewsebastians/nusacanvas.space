# Privacy

NusaCanvas is a static browser application.

- Paste, CSV, TSV, XLSX, and project JSON files are processed only in the user's browser.
- Project JSON files are opened locally in the browser.
- The app does not create accounts, upload imported data, use analytics, or send imported CSV/project content to a server.
- Autosave and its local migration/recovery copies use browser `localStorage` on the same device and browser profile.
- When an older autosave is upgraded, the original compatibility copy is retained until the user explicitly deletes it.
- Before an explicit recovery, edit, project open, or **Start over** action replaces an unreadable current browser backup, that current copy is retained byte-for-byte in one local recovery slot. The app provides controls to download or permanently delete it.
- If a current or compatibility backup cannot be parsed, the app provides a local raw-text download before replacement. It does not log or upload that content.
- If the user declines to open a valid browser backup at startup, it remains unchanged until the app can verify a safety copy before the first replacement edit.
- **Start over** resets the workspace and removes the current autosave. It does not silently delete retained compatibility or replaced-backup recovery copies; those have separate delete controls.
- Autosave may disappear if browser data is cleared.
- Cloudflare may retain ordinary hosting access logs outside this application's control.
- Users must not commit confidential company data, customer data, employee data, or real sales data to the public repository.

Security review notes:

- No `eval()` is used.
- Imported text, spreadsheet cells, and export metadata are rendered as escaped text.
- CSV error reports prefix spreadsheet-formula-like values.
- Project JSON is schema-checked before applying.
- Large text, XLSX, and project files are rejected before or during guarded parsing.
- XLSX macros, embedded objects, external links, encryption markers, and unsupported workbook formats are rejected before normal parsing where detectable.
- The app uses relative same-site files and no external map tiles.

