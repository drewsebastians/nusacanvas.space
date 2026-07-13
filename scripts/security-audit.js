const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function repositoryFiles(directory = ROOT) {
  const excluded = new Set([".git", "node_modules", "dist", "playwright-report", "test-results", ".wrangler", ".pnpm-store"]);
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (excluded.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return repositoryFiles(full);
    return [path.relative(ROOT, full).replace(/\\/g, "/")];
  });
}

function scanSecrets() {
  const patterns = [
    [/CLOUDFLARE_API_TOKEN\s*=\s*['"][^'"]+/i, "Cloudflare token assignment"],
    [/sk-[A-Za-z0-9_-]{20,}/, "API key-like secret"],
    [/-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/, "private key"],
    [/[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{32,}\.[A-Za-z0-9_-]{32,}/, "JWT-like token"]
  ];
  for (const file of repositoryFiles()) {
    if (file.startsWith("package-lock.json")) continue;
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full) || fs.statSync(full).size > 2_000_000) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const [pattern, label] of patterns) {
      if (pattern.test(text)) failures.push(`possible ${label} in ${file}`);
    }
  }
}

function assertContains(relativePath, text, label) {
  if (!read(relativePath).includes(text)) failures.push(`${relativePath} missing ${label}`);
}

function scanRuntimeExternalRequests() {
  if (!fs.existsSync(DIST)) {
    failures.push("dist missing; run build before security audit");
    return;
  }
  const runtimeFiles = [
    "index.html",
    "assets/js/import-core.js",
    "assets/js/xlsx-import.js",
    "assets/js/app.js",
    "assets/js/map.js",
    "assets/js/export.js",
    "assets/js/csv-import.js",
    "assets/js/project-storage.js",
    "assets/js/report-template.js",
    "assets/vendor/read-excel-file/read-excel-file.min.js"
  ];
  const forbiddenRuntimePatterns = [
    /fetch\(["']https?:\/\//i,
    /https?:\/\/[^"']*geoboundaries\.org/i,
    /https?:\/\/[^"']*data\.humdata\.org/i
  ];
  for (const file of runtimeFiles) {
    const full = path.join(DIST, file);
    if (!fs.existsSync(full)) {
      failures.push(`runtime file missing from dist: ${file}`);
      continue;
    }
    const text = fs.readFileSync(full, "utf8");
    for (const pattern of forbiddenRuntimePatterns) {
      if (pattern.test(text)) failures.push(`runtime file contains forbidden external boundary request marker: ${file}`);
    }
  }
}

function scanHeaders() {
  const headers = read("_headers");
  const csp = headers.split(/\r?\n/).find((line) => line.trim().startsWith("Content-Security-Policy:")) || "";
  for (const directive of ["default-src 'self'", "connect-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", "frame-src 'none'", "worker-src 'self' blob:"]) {
    if (!csp.includes(directive)) failures.push(`CSP missing directive: ${directive}`);
  }
}

function scanSafetyControls() {
  assertContains("assets/js/project-storage.js", "DANGEROUS_KEYS", "project JSON dangerous-key rejection");
  assertContains("assets/js/project-storage.js", "File proyek terlalu besar", "project JSON size limits");
  assertContains("assets/js/csv-import.js", "escapeFormula", "CSV formula injection escaping");
  assertContains("assets/js/export.js", "URL.revokeObjectURL", "download object URL cleanup");
  assertContains("assets/js/app.js", "indonesia-adm2-detailed.geojson", "explicit local detailed geometry path");
  assertContains("assets/js/app.js", "confirm(\"Gunakan geometri detail lokal", "explicit high-detail export confirmation");
}

function scanDocumentation() {
  const manual = read("MANUAL_UPLOAD_STEPS.md");
  if (/Enable GitHub Pages|github\.io\/indonesia-map-highlighter/i.test(manual)) {
    failures.push("MANUAL_UPLOAD_STEPS.md still documents GitHub Pages deployment");
  }
  const privacy = fs.existsSync(path.join(ROOT, "privacy", "index.html")) ? fs.readFileSync(path.join(ROOT, "privacy", "index.html"), "utf8") : "";
  if (/GitHub Pages may retain/i.test(privacy)) failures.push("privacy page still references GitHub Pages hosting logs");
}

function scanDependencyManifest() {
  const lock = JSON.parse(read("package-lock.json"));
  const manifest = JSON.parse(read("data/license-manifest-v1.json"));
  const reviewed = new Map((manifest.assets || []).filter((asset) => asset.lockfilePackage).map((asset) => [asset.lockfilePackage, asset.licenseId]));
  for (const name of ["node_modules/@playwright/test", "node_modules/axe-core", "node_modules/wrangler", "node_modules/read-excel-file"]) {
    const pkg = lock.packages && lock.packages[name];
    if (!pkg) failures.push(`dependency missing from lockfile: ${name}`);
    if (!reviewed.has(name)) failures.push(`dependency missing from license manifest: ${name}`);
    if (pkg && reviewed.get(name) !== pkg.license) failures.push(`dependency license drift for ${name}: ${pkg.license}`);
  }
}

scanSecrets();
scanRuntimeExternalRequests();
scanHeaders();
scanSafetyControls();
scanDocumentation();
scanDependencyManifest();

const report = {
  status: failures.length ? "failed" : "passed",
  checks: [
    "secrets scan",
    "runtime external request inventory",
    "CSP/security headers",
    "project JSON parsing limits",
    "CSV formula-injection protections",
    "download object URL cleanup",
    "Cloudflare-only documentation scan",
    "dependency license manifest audit"
  ],
  failures
};

fs.mkdirSync(path.join(ROOT, "artifacts", "batch-1"), { recursive: true });
fs.writeFileSync(path.join(ROOT, "artifacts", "batch-1", "security-audit-report.json"), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error("Security/privacy audit failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Security/privacy audit passed: ${report.checks.length} checks.`);
