const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const { expect, test } = require("@playwright/test");

const artifactDir = path.resolve(__dirname, "..", "..", "artifacts", "batch-1");
const forbiddenStartupPatterns = [
  "indonesia-adm2-detailed.geojson",
  "geoboundaries.org",
  "data.humdata.org",
  "hdx"
];
const encoder = new TextEncoder();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const raw = encoder.encode(file.content);
    const body = zlib.deflateRawSync(Buffer.from(raw));
    const method = 8;
    const crc = crc32(raw);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0), u32(crc),
      u32(body.length), u32(raw.length), u16(name.length), u16(0), Buffer.from(name), body
    ]);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0), u32(crc),
      u32(body.length), u32(raw.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), Buffer.from(name)
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  });
  const central = Buffer.concat(centralParts);
  return Buffer.concat([
    ...localParts,
    central,
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(central.length), u32(offset), u16(0)
  ]);
}

function writeSyntheticXlsx(filePath) {
  const files = [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Data" sheetId="1" r:id="rId1"/>
    <sheet name="Cadangan" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`
    },
    {
      name: "xl/styles.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cellStyleXfs count="1"><xf numFmtId="0"/></cellStyleXfs>
  <cellXfs count="1"><xf numFmtId="0" xfId="0"/></cellXfs>
</styleSheet>`
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:C3"/>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>wilayah</t></is></c><c r="B1" t="inlineStr"><is><t>provinsi</t></is></c><c r="C1" t="inlineStr"><is><t>nilai</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Kota Surabaya</t></is></c><c r="B2" t="inlineStr"><is><t>Jawa Timur</t></is></c><c r="C2"><v>125</v></c></row>
    <row r="3"><c r="A3" t="inlineStr"><is><t>Kota Denpasar</t></is></c><c r="B3" t="inlineStr"><is><t>Bali</t></is></c><c r="C3"><v>0</v></c></row>
  </sheetData>
</worksheet>`
    },
    {
      name: "xl/worksheets/sheet2.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:C2"/>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>wilayah</t></is></c><c r="B1" t="inlineStr"><is><t>provinsi</t></is></c><c r="C1" t="inlineStr"><is><t>nilai</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Kota Denpasar</t></is></c><c r="B2" t="inlineStr"><is><t>Bali</t></is></c><c r="C2"><v>77</v></c></row>
  </sheetData>
</worksheet>`
    }
  ];
  fs.writeFileSync(filePath, makeZip(files));
}

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
  await expect.poll(async () => page.locator(".leaflet-interactive").count()).toBeGreaterThan(500);
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
  const svg = await svgDownload;
  expect(svg.suggestedFilename()).toBe("peta-warna-indonesia.svg");
  const svgText = fs.readFileSync(await svg.path(), "utf8");
  expect(svgText).toContain("IDN-ADM2-2020-geoboundaries-22746128");
  expect(svgText).toContain("Referensi visual; bukan penetapan batas hukum");

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

test("CSV sample, undo, old project migration, and keyboard navigation work", async ({ page }) => {
  const sampleCsv = path.resolve(__dirname, "..", "..", "sample", "sample-region-colors.csv");
  const sampleProject = path.resolve(__dirname, "..", "..", "sample", "sample-project.json");
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });

  await page.locator("#csvFile").setInputFiles(sampleCsv);
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#csvPreview")).toContainText("3");
  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("3");
  await page.locator("#undoBtn").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#highlightCount")).toHaveText("0");

  await page.locator("#projectFile").setInputFiles(sampleProject);
  await expect(page.locator("#migrationReportBtn")).toBeVisible();
  await expect(page.locator("#autosaveStatus")).toContainText(/Migrasi|Proyek dibuka/i);
  await expect(page.locator("#highlightCount")).toHaveText("1");

  for (let index = 0; index < 20; index += 1) {
    await page.keyboard.press("Tab");
  }
  const activeElement = await page.evaluate(() => document.activeElement && document.activeElement.tagName);
  expect(activeElement).not.toBe("BODY");
});

test("paste import previews mapping and waits for explicit apply", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });

  await page.locator("#importPaste").fill("wilayah\tprovinsi\tnilai\nKota Surabaya\tJawa Timur\t125\nKota Denpasar\tBali\t0\n");
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#importMapping")).toContainText("Paste lokal");
  await expect(page.locator("#map-regionName")).toHaveValue("wilayah");
  await expect(page.locator("#map-province")).toHaveValue("provinsi");
  await expect(page.locator("#map-numericValue")).toHaveValue("nilai");
  await expect(page.locator("#csvPreview")).toContainText("2");
  await expect(page.locator("#highlightCount")).toHaveText("0");

  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("2");
});

test("ambiguous import row can be resolved locally before apply", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });

  await page.locator("#importPaste").fill("wilayah\tnilai\nBandung\t50\n");
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#csvPreview")).toContainText("ambiguous");
  await expect(page.locator("#applyCsvBtn")).toBeDisabled();

  const candidateSelect = page.locator("[data-candidate-for]").first();
  await expect(candidateSelect).toBeVisible();
  await candidateSelect.selectOption({ index: 1 });
  await page.locator("[data-resolve-row]").first().click();
  await expect(page.locator("#csvPreview")).toContainText("user-resolved");
  await expect(page.locator("#applyCsvBtn")).toBeEnabled();

  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("1");
});

test("XLSX import lazy-loads parser and uses the shared preview pipeline", async ({ page }, testInfo) => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const safeProjectName = testInfo.project.name.replace(/[^a-z0-9_-]+/gi, "-");
  const xlsxPath = path.join(artifactDir, `synthetic-import-${safeProjectName}.xlsx`);
  writeSyntheticXlsx(xlsxPath);
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));

  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  expect(requests.some((url) => url.includes("read-excel-file.min.js"))).toBe(false);

  await page.locator("#importPaste").fill("wilayah\tnilai\nKota Surabaya\t125\n");
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#importMapping")).toContainText("Paste lokal");
  expect(requests.some((url) => url.includes("read-excel-file.min.js"))).toBe(false);

  await page.locator("#importPaste").evaluate((textarea) => {
    textarea.value = "";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.locator("#csvFile").setInputFiles(xlsxPath);
  await expect.poll(() => page.locator("#csvFile").evaluate((input) => input.files.length)).toBe(1);
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#importMapping")).toContainText("File XLSX lokal");
  await expect(page.locator("#importMapping")).toContainText("Sheet: Data");
  await expect(page.locator("#xlsxSheet")).toBeVisible();
  await expect(page.locator("#csvPreview")).toContainText("2");
  expect(requests.some((url) => url.includes("read-excel-file.min.js"))).toBe(true);
  expect(requests.filter((url) => /^https?:\/\//.test(url) && !url.startsWith("http://127.0.0.1:4173/"))).toEqual([]);

  await page.locator("#xlsxSheet").selectOption("Cadangan");
  await expect(page.locator("#importMapping")).toContainText("Sheet: Cadangan");
  await expect(page.locator("#csvPreview")).toContainText("1");
});

test("beginner workflow example keeps table and map selection linked", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await expect(page.locator("#workflowSteps")).toContainText("Input");
  await page.locator("#exampleBtn").click();
  await expect(page.locator("#workflowStatus")).toContainText(/Match|baris siap/i);
  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#dataTablePanel")).toBeVisible();
  await expect(page.locator("#dataTable tbody tr")).toHaveCount(2);
  await expect(page.locator("#workflowStatus")).toContainText(/Visualize|wilayah tampil/i);

  await page.locator("#dataTable tbody tr").first().click();
  await expect(page.locator("#mapSelectionStatus")).toContainText(/dipilih/i);
  await expect(page.locator("#dataTable tbody tr").first()).toHaveClass(/selected/);

  const surabayaPath = page.locator('.leaflet-interactive[aria-label*="Surabaya"]').first();
  await surabayaPath.click();
  await expect(page.locator("#dataTable tbody tr").filter({ hasText: "Surabaya" }).first()).toHaveClass(/selected/);

  await page.locator("#dataTableFilter").fill("Denpasar");
  await expect(page.locator("#dataTable tbody tr")).toHaveCount(1);
  await page.locator("#advancedModeBtn").click();
  await expect(page.locator("#dataTableCount")).toHaveText("1");
  await page.locator("#basicModeBtn").click();
  await expect(page.locator("#dataTableCount")).toHaveText("1");
});

test("mobile layout keeps the map reachable before the control panel", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  const positions = await page.evaluate(() => ({
    map: document.querySelector(".map-area").getBoundingClientRect().top,
    panel: document.querySelector(".control-panel").getBoundingClientRect().top
  }));
  expect(positions.map).toBeLessThanOrEqual(positions.panel);
  await expect(page.locator("#map")).toBeVisible();
});

test("deterministic visualization preview applies a shared legend", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await expect(page.locator("#vizMode")).toBeVisible();
  await page.locator("#exampleBtn").click();
  await page.locator("#applyCsvBtn").click();
  await page.locator("#vizMode").selectOption("equal-interval");
  await page.locator("#vizClasses").fill("3");
  await page.locator("#vizPreviewBtn").click();
  await expect(page.locator("#vizSummary")).toContainText(/wilayah berwarna/i);
  await expect.poll(() => requests.some((url) => url.includes("visualization-engine.js"))).toBe(true);
  await page.locator("#vizApplyBtn").click();
  await expect(page.locator("#map .map-legend")).toContainText(/Legenda|Tidak ada data/i);
  await expect(page.locator("#dataTable tbody tr").first()).toContainText(/exact|siap/i);
});

test("numeric visualization returns blank values to the no-data map state", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await page.locator("#importPaste").fill("wilayah\tprovinsi\tnilai\nKota Surabaya\tJawa Timur\t125\nKota Denpasar\tBali\t\n");
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#applyCsvBtn")).toBeEnabled();
  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("2");
  await page.locator("#vizMode").selectOption("equal-interval");
  await page.locator("#vizPreviewBtn").click();
  await page.locator("#vizApplyBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("1");
  await expect(page.locator("#map .map-legend")).toContainText(/Tidak ada data/i);
});

test("professional export writes PDF and mapping CSV with safe metadata", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await page.locator("#exampleBtn").click();
  await page.locator("#applyCsvBtn").click();
  await page.locator("#exportSubtitle").fill("Ringkasan <aman>");
  await page.locator("#exportSource").fill("Sumber lokal");
  await page.locator("#exportPeriod").fill("2025");
  await page.locator("#exportFilenameSlug").fill("uji metadata / aman");
  await page.locator("#exportRatio").selectOption("a3");
  await page.locator("#exportExtent").selectOption("national");

  const mappingDownload = page.waitForEvent("download");
  await page.locator("#exportMappingBtn").click();
  const mapping = await mappingDownload;
  expect(mapping.suggestedFilename()).toBe("uji-metadata-aman-mapping.csv");
  expect(fs.readFileSync(await mapping.path(), "utf8")).toContain("Canonical_Region_ID");

  const pdfDownload = page.waitForEvent("download");
  await page.locator("#exportPdfBtn").click();
  const pdf = await pdfDownload;
  expect(pdf.suggestedFilename()).toBe("uji-metadata-aman.pdf");
  const pdfBytes = fs.readFileSync(await pdf.path());
  expect(pdfBytes.subarray(0, 8).toString()).toBe("%PDF-1.4");
  expect(pdfBytes.toString("latin1")).toContain("IDN-ADM2-2020");
});

test("assisted first-user flow reaches a valid export within five minutes", async ({ page }) => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const started = Date.now();
  const marks = {};
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await page.locator("#importPaste").fill("wilayah\tprovinsi\tnilai\nKota Surabaya\tJawa Timur\t125\nKota Denpasar\tBali\t77\n");
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#csvPreview")).toContainText("2");
  marks.firstValidPreviewMs = Date.now() - started;
  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("2");
  marks.resolvedDatasetMs = Date.now() - started;
  await page.locator("#vizMode").selectOption("equal-interval");
  await page.locator("#vizPreviewBtn").click();
  await expect(page.locator("#vizApplyBtn")).toBeEnabled();
  await page.locator("#vizApplyBtn").click();
  await expect(page.locator("#map .map-legend")).toBeVisible();
  marks.firstValidMapMs = Date.now() - started;
  await page.locator("#exportSource").fill("Uji alur sintetis");
  await page.locator("#exportPeriod").fill("2025");
  const download = page.waitForEvent("download");
  await page.locator("#exportSvgBtn").click({ force: true });
  expect((await download).suggestedFilename()).toMatch(/\.svg$/);
  marks.firstExportMs = Date.now() - started;
  const result = { contract: "batch2.first-user-flow.v1", dataset: "synthetic-three-column", marks, blockingErrors: 0, unclearDecisions: 0, automatedAssistance: true, humanComprehensionVerified: false, pageErrors: errors };
  fs.writeFileSync(path.join(artifactDir, "first-user-flow.json"), `${JSON.stringify(result, null, 2)}\n`);
  expect(marks.firstExportMs).toBeLessThan(300000);
  expect(errors).toEqual([]);
});
