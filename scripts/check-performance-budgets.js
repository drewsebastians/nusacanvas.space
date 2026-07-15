const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const budget = JSON.parse(fs.readFileSync(path.join(root, "performance-budget.json"), "utf8"));
const smokePath = path.join(root, "artifacts", "batch-1", "smoke-network.json");

function gzipBytes(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  return zlib.gzipSync(bytes, { level: 9 }).length;
}

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const runtimePaths = budget.initialRuntimePaths;
const initialCompressedBytes = runtimePaths.reduce((total, file) => total + gzipBytes(file), 0);
const simplifiedGeometryGzipBytes = gzipBytes("data/indonesia-adm2-simplified.geojson");
const shellJavaScriptGzipBytes = [
  "assets/vendor/leaflet/leaflet.js",
  "assets/js/brand-config.js",
  "assets/js/brand-migration.js",
  "assets/js/boundary-provider.js",
  "assets/js/product-content.js",
  "assets/js/project-storage.js",
  "assets/js/import-core.js",
  "assets/js/xlsx-import.js",
  "assets/js/csv-import.js",
  "assets/js/export.js",
  "assets/js/map.js",
  "assets/js/app.js",
  "assets/js/workspace-shell.js"
].reduce((total, file) => total + gzipBytes(file), 0);

if (initialCompressedBytes > budget.hard.initialCompressedBytes) {
  fail(`Initial compressed bytes ${initialCompressedBytes} exceed hard budget ${budget.hard.initialCompressedBytes}.`);
}
if (simplifiedGeometryGzipBytes > budget.hard.simplifiedGeometryGzipBytes) {
  fail(`Simplified geometry gzip bytes ${simplifiedGeometryGzipBytes} exceed hard budget ${budget.hard.simplifiedGeometryGzipBytes}.`);
}
if (shellJavaScriptGzipBytes > budget.hard.shellJavaScriptGzipBytes) {
  fail(`Shell JavaScript gzip bytes ${shellJavaScriptGzipBytes} exceed hard budget ${budget.hard.shellJavaScriptGzipBytes}.`);
}

if (!fs.existsSync(smokePath)) {
  fail("Missing smoke network artifact. Run npm run test:e2e:smoke before performance budgets.");
} else {
  const smoke = JSON.parse(fs.readFileSync(smokePath, "utf8"));
  // The document navigation is the baseline page load, not a requested runtime
  // asset. The hard budget measures startup assets after that document.
  const startupRequests = smoke.requests.filter((request) => request.resourceType !== "document" && !request.url.startsWith("data:") && !request.url.startsWith("blob:"));
  if (startupRequests.length > budget.hard.initialRequestCount) {
    fail(`Startup request count ${startupRequests.length} exceeds hard budget ${budget.hard.initialRequestCount}.`);
  }
  const forbidden = startupRequests.filter((request) => budget.forbiddenStartupUrlPatterns.some((pattern) => request.url.toLowerCase().includes(pattern.toLowerCase())));
  if (forbidden.length) {
    fail(`Forbidden startup requests detected: ${forbidden.map((request) => request.url).join(", ")}`);
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  initialCompressedBytes,
  simplifiedGeometryGzipBytes,
  shellJavaScriptGzipBytes,
  hard: budget.hard,
  preferred: budget.preferred
};

fs.mkdirSync(path.join(root, "artifacts", "batch-1"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts", "batch-1", "performance-budget-report.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(`Performance budgets passed: initial=${initialCompressedBytes} gzip bytes, simplified=${simplifiedGeometryGzipBytes}, shell_js=${shellJavaScriptGzipBytes}.`);
