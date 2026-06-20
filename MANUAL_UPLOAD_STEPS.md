# Manual Upload Steps

Repository: https://github.com/analystdjaya/indonesia-map-highlighter

## Files to upload

Upload the contents of this folder:

`manual-upload-package`

Do not upload the `manual-upload-package` folder itself as a nested folder. Open it, select everything inside it, then upload those files and folders to the repository root.

## Browser upload

1. Open https://github.com/analystdjaya/indonesia-map-highlighter
2. Sign in to GitHub.
3. If the repository is empty, choose **uploading an existing file**.
4. If the repository already has files, choose **Add file** then **Upload files**.
5. In Windows File Explorer, open:

   `C:\Users\andrew.sebastian\Documents\indonesia-map-highlighter\manual-upload-package`

6. Select all files and folders inside that folder.
7. Drag them into the GitHub upload area.
8. Wait until all files finish uploading.
9. In the commit message box, enter:

   `Update map legend labels and current view export`

10. Choose **Commit directly to the main branch** if this is your first upload.
11. Click **Commit changes**.

## Important

- Make sure `.nojekyll` is uploaded at the repository root.
- Make sure `index.html` is uploaded at the repository root.
- Do not upload private company data, real sales data, API keys, or personal files.
- GitHub may reject a very large single file over its browser-upload limit. The largest included app file is below that normal limit.

## Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Open **Pages**.
4. Under **Build and deployment**, set **Source** to **Deploy from a branch**.
5. Select branch: `main`.
6. Select folder: `/ (root)`.
7. Click **Save**.
8. Wait a few minutes.
9. Open the GitHub Pages URL shown on that page.

Expected URL:

`https://analystdjaya.github.io/indonesia-map-highlighter/`

## Smoke test after deployment

1. Open the live URL.
2. Confirm the map loads and says `519 wilayah dimuat`.
3. Search `Surabaya`.
4. Select `Kota Surabaya - Jawa Timur`.
5. Choose a color and click **Terapkan Warna**.
6. Confirm the highlighted count becomes `1`.
7. Try **Ekspor SVG**.
8. Try **Ekspor PNG**.
9. Try importing `sample/sample-region-colors.csv`.
