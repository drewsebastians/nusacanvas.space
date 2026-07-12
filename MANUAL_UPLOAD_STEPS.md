# Manual Upload Steps

This file is retained only as a deployment-history note.

GitHub Pages is no longer an approved deployment path for this repository. Do not upload files through the GitHub web UI and do not enable Pages.

The only Batch 1 staging target is Cloudflare Workers Static Assets:

```text
https://mapnesia.andrew-sebastian91.workers.dev
```

Use the Cloudflare workflow documented in `docs/deployment-guide.md`:

```text
npm run verify:batch1
npm run deploy
npm run verify:staging
```

If GitHub Pages is ever found enabled again, disable it before treating the Cloudflare migration as complete.
