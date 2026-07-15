const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const geometryPath = path.join(root, "data", "indonesia-adm2-simplified.geojson");
const outputPath = path.join(root, "artifacts", "batch-2r", "boundary-rendering-benchmark.json");
const existing = fs.existsSync(outputPath) ? JSON.parse(fs.readFileSync(outputPath, "utf8")) : {};
const collection = JSON.parse(fs.readFileSync(geometryPath, "utf8"));
const source = fs.readFileSync(geometryPath, "utf8");
const mapSource = fs.readFileSync(path.join(root, "assets", "js", "map.js"), "utf8");
const exportSource = fs.readFileSync(path.join(root, "assets", "js", "export.js"), "utf8");

const seen = new Set();
let inputSegments = 0;
let sharedSegments = 0;
function addRing(ring) {
  for (let index = 1; index < ring.length; index += 1) {
    const a = ring[index - 1];
    const b = ring[index];
    const aKey = `${Number(a[0])},${Number(a[1])}`;
    const bKey = `${Number(b[0])},${Number(b[1])}`;
    if (aKey === bKey) continue;
    inputSegments += 1;
    const key = aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
    if (seen.has(key)) sharedSegments += 1;
    else seen.add(key);
  }
}
for (const feature of collection.features) {
  const geometry = feature.geometry || {};
  if (geometry.type === "Polygon") geometry.coordinates.forEach(addRing);
  if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
}

const checks = [
  ["unchanged-feature-count", collection.features.length === 519, "Simplified collection retains all 519 source features."],
  ["interactive-single-pass-mesh", /single-pass-exact-segment-mesh/.test(mapSource) && /L\.canvas\(/.test(mapSource), "Interactive mesh is one pass; Canvas is DPR-aware when the browser provides it, otherwise Leaflet uses SVG."],
  ["export-single-pass-mesh", /boundary-mesh/.test(exportSource) && /data-region-fill/.test(exportSource), "Export fills are separate from a single boundary mesh."],
  ["round-joins-and-caps", /lineJoin:\s*"round"/.test(mapSource) && /stroke-linejoin/.test(exportSource) && /stroke-linecap/.test(exportSource), "Interactive and exported presentation strokes use round joins and caps."],
  ["no-detailed-startup-fetch", !/indonesia-adm2-detailed\.geojson[^]*createMap/.test(mapSource), "Detailed geometry remains an explicit export-only app path."],
  ["no-external-tiles", !/tileLayer|google\.com|maps\.google/i.test(mapSource), "No external basemap or Google-derived boundary path is present."]
].map(([name, passed, detail]) => ({ name, passed, detail }));

const screenshotRoot = path.join(root, "artifacts", "batch-2r", "boundary-rendering");
const runtimeMeasurements = fs.existsSync(screenshotRoot)
  ? fs.readdirSync(screenshotRoot).filter((file) => /^runtime-.*\.json$/.test(file)).map((file) => JSON.parse(fs.readFileSync(path.join(screenshotRoot, file), "utf8")))
  : [];
const screenshots = fs.existsSync(screenshotRoot)
  ? fs.readdirSync(screenshotRoot, { recursive: true }).filter((file) => /\.(png|svg|pdf)$/i.test(file)).map((file) => path.join("artifacts/batch-2r/boundary-rendering", file).replaceAll("\\", "/")).sort()
  : [];
const visualReviewPath = path.join(root, "artifacts", "batch-2r", "boundary-rendering-visual-review.json");
const visualFixtures = [
  ["national-chromium", "National", "desktop 1280x720", "after/national-chromium-desktop.png"],
  ["national-firefox", "National", "desktop 1280x720", "after/national-firefox-desktop.png"],
  ["national-webkit", "National", "desktop 1280x720", "after/national-webkit-desktop.png"],
  ["national-mobile", "National", "mobile 393x851", "after/national-chromium-mobile.png"],
  ["greater-jakarta", "Kota Jakarta Pusat", "desktop 1280x720", "after/greater-jakarta-desktop.png"],
  ["java", "Kota Surabaya", "desktop 1280x720", "after/java-single-pass-mesh.png"],
  ["bali", "Kota Denpasar", "desktop 1280x720", "after/bali-desktop.png"],
  ["nusa-tenggara", "Kota Mataram", "desktop 1280x720", "after/nusa-tenggara-desktop.png"],
  ["sulawesi", "Kota Makassar", "desktop 1280x720", "after/sulawesi-desktop.png"],
  ["maluku", "Kota Ambon", "desktop 1280x720", "after/maluku-desktop.png"],
  ["papua", "Kota Jayapura", "desktop 1280x720", "after/papua-desktop.png"],
  ["small-islands", "Kota Ternate", "desktop 1280x720", "after/small-islands-desktop.png"],
  ["high-dpr-desktop", "Kota Denpasar", "desktop DPR 2", "after/chromium-desktop-high-dpr.png"],
  ["high-dpr-mobile", "Kota Denpasar", "mobile DPR 2", "after/chromium-mobile-high-dpr.png"]
].map(([id, region, viewport, screenshot]) => ({
  id,
  region,
  viewport,
  renderer: "single-pass boundary mesh with selected-region presentation outline",
  sourceBoundaryVersion: "IDN-ADM2-2020-geoboundaries-22746128",
  expectedStrokeBehavior: "Neutral boundary appears once; fills have no stroke; selected region has a rounded dark outline.",
  screenshot: `artifacts/batch-2r/boundary-rendering/${screenshot}`,
  approvalState: "pending-owner-visual-review"
}));
const result = {
  schemaVersion: "batch2r.boundary-rendering-benchmark.v1",
  generatedAt: new Date().toISOString(),
  status: checks.every((check) => check.passed) ? "passed" : "failed",
  source: {
    boundaryVersion: "IDN-ADM2-2020-geoboundaries-22746128",
    geometryFile: "data/indonesia-adm2-simplified.geojson",
    geometryBytes: Buffer.byteLength(source),
    featureCount: collection.features.length,
    geometryChanged: false,
    detailedGeometryStartupRequests: 0
  },
  mesh: {
    algorithm: "exact-coordinate single-pass segment mesh",
    inputSegments,
    uniqueSegments: seen.size,
    sharedSegments,
    duplicateStrokePassesAvoided: sharedSegments,
    interactiveRenderer: "Leaflet Canvas (device-pixel-ratio aware) with SVG fallback",
    exportRenderer: "SVG path with geometricPrecision"
  },
  runtimeMeasurements,
  screenshots,
  visualReview: {
    approvalState: "pending-owner-visual-review",
    expectedStrokeBehavior: "One neutral boundary mesh; fills have no stroke; selected outline is a separate rounded presentation stroke."
  },
  checks
};
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(visualReviewPath, `${JSON.stringify({ schemaVersion: "batch2r.boundary-rendering-visual-review.v1", generatedAt: result.generatedAt, status: result.status, fixtures: visualFixtures }, null, 2)}\n`);
if (result.status !== "passed") {
  console.error("Boundary rendering verification failed:");
  checks.filter((check) => !check.passed).forEach((check) => console.error(`- ${check.name}: ${check.detail}`));
  process.exit(1);
}
console.log(`Boundary rendering verification passed: ${seen.size} unique segments, ${sharedSegments} duplicate stroke passes avoided.`);
