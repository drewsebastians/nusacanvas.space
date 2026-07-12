const fs = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");

const artifactDir = path.resolve(__dirname, "..", "..", "artifacts", "batch-1");
const forbiddenStartupPatterns = [
  "indonesia-adm2-detailed.geojson",
  "geoboundaries.org",
  "data.humdata.org",
  "hdx"
];

test("load, color, save, SVG export, and smallest PNG export", async ({ page }) => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const requests = [];
  const failed = [];
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType() }));
  page.on("requestfailed", (request) => failed.push({ url: request.url(), errorText: request.failure() && request.failure().errorText }));
  page.on("response", (response) => {
    const url = response.url();
    if (url.startsWith("http://127.0.0.1:4173/") && response.status() >= 400) {
      failed.push({ url, status: response.status() });
    }
  });

  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await expect(page.locator("#dataTruthBadge")).toContainText(/snapshot ADM2 2020/i);
  await expect(page.locator("#dataTruthBadge")).toContainText(/Registry/i);
  await expect(page.locator(".leaflet-interactive").first()).toBeVisible();
  const forbiddenStartup = requests.filter((request) => forbiddenStartupPatterns.some((pattern) => request.url.toLowerCase().includes(pattern)));
  expect(forbiddenStartup).toEqual([]);

  const regionValue = await page.locator("#regionSelect option").evaluateAll((options) => {
    const option = options.find((item) => item.textContent && item.textContent.includes("Surabaya"));
    return option && option.value;
  });
  expect(regionValue).toBeTruthy();

  await page.locator("#regionSelect").selectOption(regionValue);
  await expect(page.locator("#selectedRegion")).toContainText("Surabaya");
  await page.locator("#colorPicker").evaluate((input) => {
    input.value = "#E74C3C";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#applyColorBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("1");
  await expect(page.locator(".region-name-label").filter({ hasText: "Surabaya" }).first()).toBeVisible();

  const projectDownload = page.waitForEvent("download");
  await page.locator("#saveProjectBtn").click();
  expect((await projectDownload).suggestedFilename()).toBe("peta-warna-indonesia-project.json");

  const svgDownload = page.waitForEvent("download");
  await page.locator("#exportSvgBtn").click();
  expect((await svgDownload).suggestedFilename()).toBe("peta-warna-indonesia.svg");

  await page.locator("#exportLabels").uncheck();
  await page.locator("#pngSize").selectOption("1920x1080");
  const pngDownload = page.waitForEvent("download");
  await page.locator("#exportPngBtn").click();
  expect((await pngDownload).suggestedFilename()).toBe("peta-warna-indonesia.png");

  fs.writeFileSync(path.join(artifactDir, "smoke-network.json"), `${JSON.stringify({ requests, failed }, null, 2)}\n`);
  expect(pageErrors).toEqual([]);
  expect(failed).toEqual([]);
});

test("startup labels are tiered on mobile and high-detail geometry is explicit", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push({ url: request.url(), method: request.method(), resourceType: request.resourceType() }));
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await expect.poll(async () => page.locator(".region-name-label").count()).toBeLessThan(80);
  expect(requests.some((request) => request.url.includes("indonesia-adm2-detailed.geojson"))).toBe(false);

  const regionValue = await page.locator("#regionSelect option").evaluateAll((options) => {
    const option = options.find((item) => item.textContent && item.textContent.includes("Surabaya"));
    return option && option.value;
  });
  await page.locator("#regionSelect").selectOption(regionValue);
  await expect(page.locator(".region-name-label").filter({ hasText: "Surabaya" }).first()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#exportHighDetail").check();
  const detailedRequest = page.waitForRequest((request) => request.url().includes("indonesia-adm2-detailed.geojson"));
  const download = page.waitForEvent("download");
  await page.locator("#exportSvgBtn").click();
  await detailedRequest;
  expect((await download).suggestedFilename()).toBe("peta-warna-indonesia.svg");
});

test("PNG export supports largest, transparent, and fallback paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });

  async function exportOneFeature(options) {
    return page.evaluate(async (exportOptions) => {
      const collection = await fetch("./data/indonesia-adm2-simplified.geojson").then((response) => response.json());
      return window.MapExport.exportPng([collection.features[0]], {
        title: "Tes Ekspor",
        highlights: {},
        legend: [],
        legendVisible: false,
        groupNames: {},
        groupMeta: {}
      }, Object.assign({
        labels: false,
        transparent: false,
        pngSize: "1920x1080"
      }, exportOptions));
    }, options);
  }

  let download = page.waitForEvent("download");
  const largest = await exportOneFeature({ pngSize: "3840x2160" });
  expect((await download).suggestedFilename()).toBe("peta-warna-indonesia.png");
  expect(largest.fallbackUsed).toBe(false);

  download = page.waitForEvent("download");
  const transparent = await exportOneFeature({ pngSize: "1920x1080", transparent: true });
  expect((await download).suggestedFilename()).toBe("peta-warna-indonesia.png");
  expect(transparent.fallbackUsed).toBe(false);

  download = page.waitForEvent("download");
  const fallback = await exportOneFeature({ pngSize: "2560x1440", forceCanvasFailure: true });
  expect((await download).suggestedFilename()).toBe("peta-warna-indonesia.png");
  expect(fallback.fallbackUsed).toBe(true);
  expect(fallback.size).toEqual({ width: 1920, height: 1080 });
});
