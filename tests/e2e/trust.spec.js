const { expect, test } = require("@playwright/test");

const trustPages = [
  ["/about/", /Tentang Mapnesia/i],
  ["/contact/", /Kontak dan laporan data/i],
  ["/privacy/", /Kebijakan privasi/i],
  ["/terms/", /Ketentuan penggunaan/i],
  ["/sources-licenses/", /Sumber dan lisensi/i],
  ["/data-methodology/", /Metodologi data/i],
  ["/limitations/", /Batasan data/i],
  ["/changelog/", /Changelog/i],
  ["/guides/mengapa-jumlah-wilayah-peta-berbeda/", /Mengapa jumlah wilayah/i]
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
    await expect(page.locator("a", { hasText: "Mapnesia" }).first()).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("assets/js/app.js");
    expect(html).not.toContain("assets/vendor/leaflet/leaflet.js");
    expect(html).not.toContain("indonesia-adm2-simplified.geojson");
  }
  expect(requests.some((url) => url.includes("indonesia-adm2-detailed.geojson"))).toBe(false);
});

test("report-error template copies only structured public fields", async ({ page }) => {
  await page.goto("/contact/#laporkan-data");
  await page.locator("#issueCategory").selectOption("Kode wilayah");
  await page.locator("#geometryId").fill("gb-22746128B65593111718524");
  await page.locator("#canonicalId").fill("idn-adm2-gb-22746128b65593111718524");
  await page.locator("#issueDescription").fill("Kode pembanding perlu dicek ulang dari sumber resmi.");
  await expect(page.locator("#reportOutput")).toContainText("App version: 1.0.0");
  await expect(page.locator("#reportOutput")).toContainText("Boundary version: IDN-ADM2-2020-geoboundaries-22746128");
  await expect(page.locator("#reportOutput")).toContainText("Registry version: IDN-ADM-REGISTRY-v1-2025-06-23");
  await expect(page.locator("form")).toHaveCount(0);
  await page.locator("#copyReportBtn").click();
  await expect(page.locator("#reportStatus")).toContainText(/disalin|Clipboard tidak tersedia/i);
  const download = page.waitForEvent("download");
  await page.locator("#downloadReportBtn").click();
  expect((await download).suggestedFilename()).toBe("laporan-kesalahan-data-mapnesia.txt");
});

test("source/version links and unknown routes are handled", async ({ page, request }) => {
  await page.goto("/");
  await expect(page.locator("#dataTruthBadge")).toContainText(/snapshot ADM2 2020/i, { timeout: 60000 });
  await page.locator(".trust-links a", { hasText: "Laporkan kesalahan data" }).click();
  await expect(page).toHaveURL(/\/contact\/#laporkan-data$/);
  await expect(page.locator("#reportOutput")).toContainText("Boundary version");

  const missing = await request.get("/__missing-batch1-trust-check");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["x-robots-tag"]).toBe("noindex, nofollow, noarchive");
});
