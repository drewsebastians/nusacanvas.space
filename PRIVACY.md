# Privacy

Peta Warna Wilayah Indonesia is a static browser application.

- CSV files are processed only in the user's browser.
- Project JSON files are opened locally in the browser.
- The app does not create accounts, upload imported data, use analytics, or send imported CSV/project content to a server.
- Autosave uses browser `localStorage` on the same device and browser profile.
- Autosave may disappear if browser data is cleared.
- Cloudflare may retain ordinary hosting access logs outside this application's control.
- Users must not commit confidential company data, customer data, employee data, or real sales data to the public repository.

Security review notes:

- No `eval()` is used.
- Imported CSV text is displayed using escaped text.
- CSV error reports prefix spreadsheet-formula-like values.
- Project JSON is schema-checked before applying.
- Large CSV and project files are rejected.
- The app uses relative same-site files and no external map tiles.

