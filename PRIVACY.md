# Privacy

Peta Warna Wilayah Indonesia is a static browser application.

- Paste, CSV, TSV, XLSX, and project JSON files are processed only in the user's browser.
- Project JSON files are opened locally in the browser.
- The app does not create accounts, upload imported data, use analytics, or send imported CSV/project content to a server.
- Autosave uses browser `localStorage` on the same device and browser profile.
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

