# Manual Upload Steps

NusaCanvas is deployed with Cloudflare Workers Static Assets.

GitHub Pages is no longer an approved deployment path for this repository. Do not upload files through the GitHub web UI and do not enable Pages.

The production URL is:

```text
https://nusacanvas.space
```

Use the Cloudflare workflow documented in `docs/deployment-guide.md`:

```text
npm run verify:batch1
npm run deploy
npm run verify:production
```

If GitHub Pages is ever found enabled again, disable it; Cloudflare Workers is the only production deployment path.
