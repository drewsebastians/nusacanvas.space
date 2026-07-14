const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const root = path.resolve(__dirname, "../..");
const outputDir = path.join(root, "artifacts", "batch-2r", "baseline");
const docsDir = path.join(root, "docs", "batch-2r", "screenshots", "baseline");
fs.mkdirSync(outputDir, { recursive: true });
fs.mkdirSync(docsDir, { recursive: true });

test.setTimeout(300000);

async function ready(page) {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
}

async function capture(page, name, description, screenshots) {
  const file = path.join(outputDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push({ name, description, file: path.relative(root, file).replaceAll("\\", "/") });
}

test("capture current experience baseline across required viewports", async ({ browser }) => {
  const viewports = [
    ["desktop-1440", { width: 1440, height: 900 }],
    ["laptop-1280", { width: 1280, height: 720 }],
    ["narrow-900", { width: 900, height: 900 }],
    ["mobile-pixel5", { width: 393, height: 851 }]
  ];
  const screenshots = [];
  for (const [key, viewport] of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: key === "mobile-pixel5" });
    const page = await context.newPage();
    await ready(page);
    await capture(page, `${key}-empty`, "Empty workspace on initial load", screenshots);
    await page.locator("#advancedModeBtn").click();
    await capture(page, `${key}-advanced-mode`, "Advanced mode expanded", screenshots);
    await page.locator("#basicModeBtn").click();
    await page.locator("#importPaste").fill("wilayah\tprovinsi\tnilai\nKota Surabaya\tJawa Timur\t125\nKota Denpasar\tBali\t77\n");
    await page.locator("#previewCsvBtn").click();
    await page.locator("#applyCsvBtn").click();
    await expect(page.locator("#highlightCount")).toHaveText("2");
    await capture(page, `${key}-populated`, "Populated spreadsheet map", screenshots);
    await page.locator("#dataTablePanel").scrollIntoViewIfNeeded();
    await capture(page, `${key}-data-table`, "Linked data table and map", screenshots);
    await page.locator("#vizPreviewBtn").click();
    await page.locator("#vizApplyBtn").click();
    await capture(page, `${key}-visualization`, "Visualization method and shared legend", screenshots);
    await page.locator("#exportSection").scrollIntoViewIfNeeded();
    await capture(page, `${key}-export`, "Export options and actions", screenshots);
    await ready(page);
    await page.locator("#importPaste").fill("wilayah\tnilai\nWilayah Tidak Dikenal\t10\n");
    await page.locator("#previewCsvBtn").click();
    await capture(page, `${key}-unmatched`, "Unmatched-region warning before apply", screenshots);
    await context.close();
  }
  fs.writeFileSync(path.join(outputDir, "manifest.json"), `${JSON.stringify({
    schemaVersion: "batch2r.baseline-screenshots.v1",
    generatedAt: new Date().toISOString(),
    screenshots
  }, null, 2)}\n`);
  fs.writeFileSync(path.join(docsDir, "README.md"), [
    "# Batch 2R baseline screenshots",
    "",
    "Generated with `npm run capture:batch2r:baseline`. These images record the current UI before the Experience Reset; they are evidence, not proposed designs.",
    "See `artifacts/batch-2r/baseline/manifest.json` for the viewport/state manifest.",
    ""
  ].join("\n"));
});
