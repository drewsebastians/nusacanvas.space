const { expect, test } = require("@playwright/test");
const brand = require("../../assets/js/brand-config.js");

const trustPages = [
  ["/about/", new RegExp(`About ${brand.productName}`, "i")],
  ["/contact/", /Contact and data reports/i],
  ["/privacy/", /Privacy notice/i],
  ["/terms/", /Terms of use/i],
  ["/sources-licenses/", /Sources and licenses/i],
  ["/data-methodology/", /Data method/i],
  ["/limitations/", /Data and app limitations/i],
  ["/changelog/", /Changelog/i],
  ["/guides/mengapa-jumlah-wilayah-peta-berbeda/", /Why map region counts can differ/i]
];

test("trust pages are reachable, lightweight, and noindex", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  for (const [url, heading] of trustPages) {
    const response = await page.goto(url);
    expect(response.status()).toBe(200);
    await expect(page.locator("h1")).toContainText(heading);
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/i);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("a.brand")).toHaveText(brand.productName);
    const html = await page.content();
    expect(html).not.toContain("assets/js/app.js");
    expect(html).not.toContain("assets/vendor/leaflet/leaflet.js");
    expect(html).not.toContain("indonesia-adm2-simplified.geojson");
  }
  expect(requests.some((url) => url.includes("indonesia-adm2-detailed.geojson"))).toBe(false);
});

test("report-error template copies only structured public fields", async ({ page }) => {
  await page.goto("/contact/#laporkan-data");
  await page.locator("#issueCategory").selectOption("region-code");
  await page.locator("#geometryId").fill("gb-22746128B65593111718524");
  await page.locator("#canonicalId").fill("idn-adm2-gb-22746128b65593111718524");
  await page.locator("#issueDescription").fill("Please check the comparison code against the official source.");
  await expect(page.locator("#reportOutput")).toContainText("App version: 1.0.0");
  await expect(page.locator("#reportOutput")).toContainText(`${brand.productName} data issue report`);
  await expect(page.locator("#reportOutput")).toContainText("Boundary version: IDN-ADM2-2020-geoboundaries-22746128");
  await expect(page.locator("#reportOutput")).toContainText("Registry version: IDN-ADM-REGISTRY-v1-2025-06-23");
  await expect(page.locator("form")).toHaveCount(0);
  await page.locator("#copyReportBtn").click();
  await expect(page.locator("#reportStatus")).toHaveAttribute("data-state", /copied|copy-failed/);
  const download = page.waitForEvent("download");
  await page.locator("#downloadReportBtn").click();
  expect((await download).suggestedFilename()).toBe(brand.defaults.issueReportFilename);
  await expect(page.locator("#reportStatus")).toHaveAttribute("data-state", "downloaded");
});

test("source/version links and unknown routes are handled", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  await expect(page.locator("#dataTruthBadge")).toHaveAttribute("data-boundary-version", "IDN-ADM2-2020-geoboundaries-22746128");
  await page.locator("[data-testid='report-data-error-link']").click();
  await expect(page).toHaveURL(/\/contact\/#laporkan-data$/);
  await expect(page.locator("#reportOutput")).toContainText("Boundary version");

  const missing = await request.get("/__missing-batch1-trust-check");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
});
