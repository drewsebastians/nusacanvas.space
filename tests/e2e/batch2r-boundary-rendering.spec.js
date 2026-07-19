const fs = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");

const root = path.resolve(__dirname, "../..");
const artifactRoot = path.join(root, "artifacts", "batch-2r", "boundary-rendering");
const afterDir = path.join(artifactRoot, "after");
const beforeDir = path.join(artifactRoot, "before");
const exportDir = path.join(artifactRoot, "exports");
const boundaryVersion = "IDN-ADM2-2020-geoboundaries-22746128";

async function ready(page) {
  await page.goto("/workspace/");
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
}

async function selectNamedRegion(page, text) {
  const manualGoal = page.locator("[data-workspace-goal='manual']");
  if (await manualGoal.isVisible()) await manualGoal.click();
  await expect(page.locator("#regionSelect")).toBeVisible();
  const value = await page.locator("#regionSelect option").evaluateAll((options, name) => {
    const option = options.find((item) => item.textContent && item.textContent.includes(name));
    return option && option.value;
  }, text);
  expect(value, `region fixture ${text}`).toBeTruthy();
  await page.locator("#regionSelect").selectOption(value);
  await expect(page.locator("#selectedRegion")).toContainText(text.replace(/^Kota\s+/, ""));
}

function writeMetric(project, metric) {
  fs.mkdirSync(artifactRoot, { recursive: true });
  fs.writeFileSync(path.join(artifactRoot, `runtime-${project}.json`), `${JSON.stringify(metric, null, 2)}\n`);
}

test("single-pass boundary mesh preserves startup policy and produces cross-browser evidence", async ({ page }, testInfo) => {
  fs.mkdirSync(afterDir, { recursive: true });
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  const startedAt = Date.now();
  await ready(page);
  const renderReadyMs = Date.now() - startedAt;
  const diagnostics = await page.evaluate(() => window.NusaCanvasBoundaryRendering);
  expect(diagnostics).toEqual(expect.objectContaining({
    boundaryVersion,
    strategy: "single-pass-exact-segment-mesh",
    inputSegments: expect.any(Number),
    uniqueSegments: expect.any(Number),
    sharedSegments: expect.any(Number)
  }));
  expect(diagnostics.uniqueSegments).toBeLessThan(diagnostics.inputSegments);
  expect(diagnostics.sharedSegments).toBeGreaterThan(2000);
  expect(diagnostics.renderer).toMatch(/Leaflet (Canvas|SVG fallback)/);
  await expect(page.locator("[data-boundary-mesh='single-pass']")).toHaveCount(1);
  await expect(page.locator(".leaflet-interactive")).toHaveCount(519);
  expect(requests.some((url) => /indonesia-adm2-detailed\.geojson/i.test(url))).toBe(false);
  expect(requests.some((url) => /^https?:\/\/(?!127\.0\.0\.1|localhost)/i.test(url))).toBe(false);

  await page.locator("#map").screenshot({ path: path.join(afterDir, `national-${testInfo.project.name}.png`) });
  const selectStartedAt = Date.now();
  await selectNamedRegion(page, "Kota Jakarta Pusat");
  await expect(page.locator("#map")).toHaveAttribute("data-geometry-detail", "province-overlay", { timeout: 60000 });
  const selectionAndZoomMs = Date.now() - selectStartedAt;
  await page.locator("#map").screenshot({ path: path.join(afterDir, `jakarta-${testInfo.project.name}.png`) });
  writeMetric(testInfo.project.name, {
    browser: testInfo.project.name,
    viewport: testInfo.project.use.viewport,
    renderer: diagnostics.renderer,
    renderReadyMs,
    selectionAndZoomMs,
    inputSegments: diagnostics.inputSegments,
    uniqueSegments: diagnostics.uniqueSegments,
    sharedSegments: diagnostics.sharedSegments,
    detailedGeometryRequests: requests.filter((url) => /indonesia-adm2-detailed\.geojson/i.test(url)).length,
    provinceChunkRequests: requests.filter((url) => /detailed-provinces\/[^/]+\.geojson/i.test(url)).length,
    sourceBoundaryVersion: boundaryVersion
  });
});

test("representative dense, island, and eastern views have controlled before and after captures", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "The full fixture matrix is captured once in Chromium; national/Jakarta captures cover every browser.");
  fs.mkdirSync(beforeDir, { recursive: true });
  fs.mkdirSync(afterDir, { recursive: true });
  await ready(page);
  await selectNamedRegion(page, "Kota Surabaya");
  await page.evaluate(() => {
    document.querySelector("[data-boundary-mesh='single-pass']").style.visibility = "hidden";
    document.querySelectorAll(".leaflet-interactive").forEach((path) => {
      path.setAttribute("stroke", "#aeb8c2");
      path.setAttribute("stroke-width", "0.8");
      path.setAttribute("stroke-linejoin", "miter");
    });
  });
  await page.locator("#map").screenshot({ path: path.join(beforeDir, "java-independent-strokes.png") });
  await page.evaluate(() => {
    document.querySelector("[data-boundary-mesh='single-pass']").style.visibility = "visible";
    document.querySelectorAll(".leaflet-interactive").forEach((path) => {
      path.setAttribute("stroke", "none");
      path.removeAttribute("stroke-width");
      path.removeAttribute("stroke-linejoin");
    });
  });
  await page.locator("#map").screenshot({ path: path.join(afterDir, "java-single-pass-mesh.png") });

  const fixtures = [
    ["Greater Jakarta", "Kota Jakarta Pusat", "greater-jakarta"],
    ["Bali", "Kota Denpasar", "bali"],
    ["Nusa Tenggara", "Kota Mataram", "nusa-tenggara"],
    ["Sulawesi", "Kota Makassar", "sulawesi"],
    ["Maluku", "Kota Ambon", "maluku"],
    ["Papua", "Kota Jayapura", "papua"],
    ["Small islands", "Kota Ternate", "small-islands"]
  ];
  for (const [, region, file] of fixtures) {
    await selectNamedRegion(page, region);
    await page.locator("#map").screenshot({ path: path.join(afterDir, `${file}-desktop.png`) });
  }
});

test("SVG, PNG, and PDF retain the boundary hierarchy and attribution", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "Binary export smoke is captured once in Chromium.");
  fs.mkdirSync(exportDir, { recursive: true });
  await ready(page);
  await selectNamedRegion(page, "Kota Surabaya");
  await page.locator("#applyColorBtn").click();
  await page.locator("#presentationView").check();

  let download = page.waitForEvent("download");
  await page.locator("#exportSvgBtn").click();
  const svgDownload = await download;
  const svgPath = await svgDownload.path();
  const svg = fs.readFileSync(svgPath, "utf8");
  expect(svg).toContain('id="boundary-mesh"');
  expect(svg).toContain('data-boundary-mesh="single-pass"');
  expect(svg).toContain('data-selected-outline=');
  expect(svg).toContain('data-highlight-outline=');
  expect(svg).toContain('stroke-linejoin="round" stroke-linecap="round"');
  expect(svg).toContain('&quot;presentationMode&quot;:true');
  expect(svg).toContain('&quot;geometryDetail&quot;:&quot;detailed&quot;');
  expect(svg).toContain("For visual reference only; not a legal boundary decision.");
  await svgDownload.saveAs(path.join(exportDir, "boundary-polish.svg"));

  await page.locator("#pngSize").selectOption("2560x1440");
  download = page.waitForEvent("download");
  await page.locator("#exportPngBtn").click();
  await (await download).saveAs(path.join(exportDir, "boundary-polish.png"));

  download = page.waitForEvent("download");
  await page.locator("#exportPdfBtn").click();
  const pdf = await download;
  await pdf.saveAs(path.join(exportDir, "boundary-polish.pdf"));
  expect(fs.readFileSync(path.join(exportDir, "boundary-polish.pdf")).subarray(0, 5).toString()).toBe("%PDF-");
});

test.describe("high-DPI and mobile", () => {
  test.use({ deviceScaleFactor: 2 });

  test("high-DPI desktop and mobile export controls remain usable", async ({ page }, testInfo) => {
    test.skip(!["chromium-desktop", "chromium-mobile"].includes(testInfo.project.name), "High-DPI evidence is captured in Chromium desktop and mobile.");
    fs.mkdirSync(afterDir, { recursive: true });
    if (testInfo.project.name === "chromium-mobile") await page.setViewportSize({ width: 393, height: 851 });
    await ready(page);
    await selectNamedRegion(page, "Kota Denpasar");
    await page.locator("#map").screenshot({ path: path.join(afterDir, `${testInfo.project.name}-high-dpr.png`) });
    await page.locator("#exportSection").scrollIntoViewIfNeeded();
    const box = await page.locator("#exportSvgBtn").boundingBox();
    expect(box && box.width >= 44 && box.height >= 36).toBeTruthy();
  });
});
