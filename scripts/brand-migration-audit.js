const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const outputPath = path.join(root, "artifacts", "batch-2r", "brand-migration-audit.json");

const PRODUCT_NAME = "NusaCanvas";
const FUTURE_CANONICAL_ORIGIN = "https://nusacanvas.space";
const CURRENT_STAGING_ORIGIN = "https://mapnesia.andrew-sebastian91.workers.dev";
const CURRENT_REPOSITORY = "drewsebastians/Indonesian-map-tools";
const TARGET_REPOSITORY = "drewsebastians/nusacanvas.space";
const TARGET_STAGING_ORIGIN = "https://nusacanvas-space.andrew-sebastian91.workers.dev";
const PACKAGE_NAME = "nusacanvas";
const CURRENT_WORKER_NAME = "mapnesia";
const NEUTRAL_STORAGE_KEY = "indonesia-region-map-autosave-v2";
const LEGACY_STORAGE_KEY = "peta-warna-indonesia-autosave-v1";
const LEGACY_NEUTRAL_EXPORT_PREFIX = "indonesia-region-map";

const activeHtml = [
  "index.html", "about/index.html", "contact/index.html", "privacy/index.html", "terms/index.html",
  "sources-licenses/index.html", "data-methodology/index.html", "limitations/index.html", "changelog/index.html",
  "excel-to-map/index.html", "guides/mengapa-jumlah-wilayah-peta-berbeda/index.html",
  "guides/cara-membuat-peta-kabupaten-kota-dari-excel/index.html", "guides/memperbaiki-nama-wilayah/index.html",
  "guides/csv-vs-xlsx-untuk-data-peta/index.html", "guides/equal-interval-vs-quantile/index.html",
  "guides/legenda-peta-tidak-menyesatkan/index.html", "guides/ekspor-peta-ke-powerpoint/index.html",
  "guides/contoh-peta-nilai-kota/index.html"
];

const activeMetadata = [
  "README.md", "PRIVACY.md", "ATTRIBUTION.md", "LICENSE", "package.json", "package-lock.json", "wrangler.jsonc", "MANUAL_UPLOAD_STEPS.md",
  "docs/architecture.md", "docs/deployment-guide.md", "docs/project-progress.md"
];

const historicalPrefixes = [
  "artifacts/batch-1/", "artifacts/batch-2/", "artifacts/batch-3/", "artifacts/batch-2r/",
  "docs/batch-1/", "docs/batch-2/", "docs/batch-3/"
];
const historicalFiles = new Set([
  "CHANGELOG.md", "docs/project-progress.md", "docs/batch-2r/00-preflight-and-experience-contract.md",
  "docs/batch-2r/01-architecture-contract.md", "docs/batch-2r/01-current-experience-audit.md",
  "docs/batch-2r/01-current-journeys.md", "docs/batch-2r/02-simple-english-content-system.md",
  "docs/batch-2r/02-terminology-glossary.md", "docs/batch-2r/03-brand-and-storage-migration.md",
  "docs/batch-2r/03-legacy-reference-allowlist.md", "scripts/build-batch2r-inventory.js"
]);

const migrationTestPattern = /^tests\/(?:unit|e2e)\/[^/]*(?:brand|migration|project-storage)[^/]*\.(?:js|cjs|mjs)$/;
const migrationFixturePrefix = "tests/fixtures/brand-migration/";
const excludedDirectoryNames = new Set([".git", "node_modules", "dist", "test-results", "playwright-report"]);
const textExtensions = new Set([".html", ".js", ".cjs", ".mjs", ".json", ".md", ".txt", ".yml", ".yaml", ".jsonc"]);

const failures = [];
const warnings = [];
const allowlistedReferences = [];
const scanned = new Set();
let customDomainActivated = false;

function normalize(relative) {
  return relative.replace(/\\/g, "/").replace(/^\.\//, "");
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

function listFiles(relativeDirectory, extensions = textExtensions) {
  const absolute = path.join(root, relativeDirectory);
  if (!fs.existsSync(absolute)) return [];
  const result = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isDirectory() && excludedDirectoryNames.has(entry.name)) continue;
      const absoluteEntry = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absoluteEntry);
      else if (extensions.has(path.extname(entry.name).toLowerCase())) result.push(normalize(path.relative(root, absoluteEntry)));
    }
  };
  visit(absolute);
  return result;
}

function isHistorical(relative) {
  const file = normalize(relative);
  if (historicalFiles.has(file)) return true;
  return historicalPrefixes.some((prefix) => file.startsWith(prefix));
}

function canContainLegacyStorageKey(relative) {
  const file = normalize(relative);
  return file === "assets/js/project-storage.js" || file.startsWith(migrationFixturePrefix) || migrationTestPattern.test(file);
}

function canContainLegacyProjectDefault(relative, code) {
  const file = normalize(relative);
  return (file === "assets/js/brand-migration.js" || migrationTestPattern.test(file) || file.startsWith(migrationFixturePrefix))
    && ["old-product-name", "old-product-title", "old-default-name"].includes(code);
}

function recordAggregate(collection, entry) {
  const current = collection.find((item) => item.file === entry.file && item.code === entry.code && item.reason === entry.reason);
  if (current) current.count += 1;
  else collection.push({ ...entry, count: 1 });
}

function codeForMatch(value) {
  const lower = value.toLowerCase();
  if (lower === CURRENT_STAGING_ORIGIN.toLowerCase()) return "current-worker-origin";
  if (lower === CURRENT_REPOSITORY.toLowerCase() || lower === `https://github.com/${CURRENT_REPOSITORY}`.toLowerCase() || lower === `https://github.com/${CURRENT_REPOSITORY}.git`.toLowerCase()) return "current-repository-origin";
  if (lower === LEGACY_STORAGE_KEY) return "legacy-storage-key";
  if (lower.includes("drewsebastians.github.io/indonesian-map-tools")) return "old-future-url";
  if (/^https?:\/\//.test(lower) && lower.includes("mapnesia")) return "old-future-url";
  if (lower === "peta warna wilayah indonesia" || lower === "peta sorotan wilayah indonesia") return "old-product-title";
  if (lower === "mapnesia") return "old-product-name";
  if (lower.startsWith("mapnesia-") || lower.startsWith("mapnesia_")) return "old-default-name";
  if (lower.startsWith("peta-warna-indonesia") || lower.startsWith("peta-warna-wilayah-indonesia") || lower.startsWith("peta-wilayah-indonesia")) return "old-default-name";
  return "legacy-reference";
}

function isOperationalReference(file, code, line, lines, index) {
  const nearby = lines.slice(Math.max(0, index - 4), index + 2).join("\n");
  if (file === "README.md" && code === "current-worker-origin") return /^Current staging remains at /.test(line);
  if (file === "about/index.html" && code === "current-repository-origin") return /This repository is maintained as/.test(line);
  if (file === "assets/js/brand-config.js" && code === "current-worker-origin") return /currentStagingOrigin\s*:/.test(line);
  if (file === "package.json" && code === "current-worker-origin") return /"verify:staging"\s*:/.test(line);
  if (file === "scripts/verify-staging.js" && code === "current-worker-origin") return /const\s+baseUrl\s*=/.test(line);
  if (file === ".github/workflows/deploy-cloudflare.yml" && code === "current-worker-origin") return /Manual deploy fallback URL:/.test(line);
  if (file === "MANUAL_UPLOAD_STEPS.md" && code === "current-worker-origin") return /only Batch 1 staging target/.test(nearby);
  if (file === "wrangler.jsonc" && code === "old-product-name") return /^\s*"name"\s*:\s*"mapnesia"\s*,?\s*$/.test(line);
  if (file === "docs/deployment-guide.md" && code === "current-worker-origin") {
    return /PLAYWRIGHT_BASE_URL|returns HTTP 200/.test(line)
      || (/^https:\/\/mapnesia\.andrew-sebastian91\.workers\.dev\s*$/.test(line) && /current staging deployment target/.test(nearby));
  }
  if (file === "docs/deployment-guide.md" && code === "old-product-name") {
    return /wrangler deploy.*Worker `mapnesia`|Cloudflare dashboard for Worker `mapnesia`/.test(line);
  }
  return false;
}

function scanFile(relative, category) {
  const file = normalize(relative);
  if (!exists(file) || scanned.has(file)) return;
  scanned.add(file);
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const lines = source.split(/\r?\n/);
  const expression = /https:\/\/mapnesia\.andrew-sebastian91\.workers\.dev|https:\/\/github\.com\/drewsebastians\/Indonesian-map-tools(?:\.git)?|drewsebastians\/Indonesian-map-tools|https?:\/\/drewsebastians\.github\.io\/Indonesian-map-tools\/?|https?:\/\/(?:www\.)?mapnesia\.[a-z0-9.-]+(?:\/[^\s"'<>)]*)?|peta-warna-indonesia-autosave-v1|Peta (?:Warna|Sorotan) Wilayah Indonesia|\bmapnesia(?:[-_.][a-z0-9][a-z0-9._-]*)?\b|\bpeta-(?:warna-(?:wilayah-)?|wilayah-)?indonesia(?:[-_][a-z0-9][a-z0-9._-]*)?\b/gi;
  lines.forEach((line, index) => {
    expression.lastIndex = 0;
    let match;
    while ((match = expression.exec(line)) !== null) {
      const value = match[0];
      const code = codeForMatch(value);
      if (isHistorical(file)) {
        recordAggregate(allowlistedReferences, { file, code, reason: "truthful historical evidence or an explicit migration note" });
      } else if (code === "legacy-storage-key" && canContainLegacyStorageKey(file)) {
        recordAggregate(allowlistedReferences, { file, code, reason: "exact compatibility token required for local recovery tests or migration" });
      } else if (canContainLegacyProjectDefault(file, code)) {
        recordAggregate(allowlistedReferences, { file, code, reason: "legacy project default recognized only by the local project-field migration" });
      } else if (code === "current-worker-origin" && isOperationalReference(file, code, line, lines, index)) {
        recordAggregate(warnings, { file, code: "prompt10-operational-identifier", reason: "current Worker remains unchanged until Prompt 10" });
      } else if (code === "current-repository-origin" && isOperationalReference(file, code, line, lines, index)) {
        recordAggregate(warnings, { file, code: "prompt10-operational-identifier", reason: "current repository remains unchanged until Prompt 10" });
      } else if (code === "old-product-name" && value === "mapnesia" && isOperationalReference(file, code, line, lines, index)) {
        recordAggregate(warnings, { file, code: "prompt10-worker-name", reason: "current Worker service name remains unchanged until Prompt 10" });
      } else {
        failures.push({ file, line: index + 1, column: match.index + 1, code, match: value });
      }
    }

    const oldNeutralDefault = line.match(/["']indonesia-region-map["']/i)
      || line.match(/["']indonesia-region-map(?:-project)?\.(?:svg|png|pdf|json)["']/i);
    if (oldNeutralDefault) {
      if (canContainLegacyProjectDefault(file, "old-default-name")) {
        recordAggregate(allowlistedReferences, { file, code: "old-default-name", reason: "legacy project default recognized only by the local project-field migration" });
      } else if (file === "assets/js/brand-config.js" && /\bid\s*:\s*["']indonesia-region-map["']/.test(line)) {
        recordAggregate(allowlistedReferences, { file, code: "neutral-durable-id", reason: "brand-neutral application identifier, not an export filename" });
      } else {
        failures.push({ file, line: index + 1, column: oldNeutralDefault.index + 1, code: "old-default-name", match: oldNeutralDefault[0] });
      }
    }
  });
}

function validatePackageMetadata() {
  const packageRelative = "package.json";
  const lockRelative = "package-lock.json";
  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(root, packageRelative), "utf8"));
    if (packageJson.name !== PACKAGE_NAME) failures.push({ file: packageRelative, line: 0, column: 0, code: "invalid-package-name", match: String(packageJson.name) });
    if (typeof packageJson.description !== "string" || !packageJson.description.includes(PRODUCT_NAME)) failures.push({ file: packageRelative, line: 0, column: 0, code: "invalid-package-description", match: String(packageJson.description) });
  } catch (error) {
    failures.push({ file: packageRelative, line: 0, column: 0, code: "invalid-package-metadata", match: String(error && error.message ? error.message : error) });
  }
  try {
    const lock = JSON.parse(fs.readFileSync(path.join(root, lockRelative), "utf8"));
    if (lock.name !== PACKAGE_NAME || !lock.packages || !lock.packages[""] || lock.packages[""].name !== PACKAGE_NAME) {
      failures.push({ file: lockRelative, line: 0, column: 0, code: "invalid-lockfile-package-name", match: `${lock.name}; ${lock.packages && lock.packages[""] && lock.packages[""].name}` });
    }
  } catch (error) {
    failures.push({ file: lockRelative, line: 0, column: 0, code: "invalid-lockfile-metadata", match: String(error && error.message ? error.message : error) });
  }
}

function validateDeploymentDeferral() {
  const relative = "wrangler.jsonc";
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const workerName = source.match(/"name"\s*:\s*"([^"]+)"/);
  if (!workerName || workerName[1] !== CURRENT_WORKER_NAME) {
    failures.push({ file: relative, line: 0, column: 0, code: "worker-rename-before-prompt10", match: workerName ? workerName[1] : "missing" });
  }
  if (!/"workers_dev"\s*:\s*true/.test(source)) {
    failures.push({ file: relative, line: 0, column: 0, code: "workers-dev-disabled-before-prompt10", match: "workers_dev" });
  }
  customDomainActivated = /"routes?"\s*:|"custom_domain"\s*:|nusacanvas\.space/i.test(source);
  if (customDomainActivated) {
    failures.push({ file: relative, line: 0, column: 0, code: "custom-domain-activated-too-early", match: FUTURE_CANONICAL_ORIGIN });
  }
}

function validateBrandConfig() {
  const relative = "assets/js/brand-config.js";
  if (!exists(relative)) {
    failures.push({ file: relative, line: 0, column: 0, code: "missing-brand-config", match: "ProductBrand" });
    return;
  }
  let brand;
  try {
    const modulePath = path.join(root, relative);
    delete require.cache[require.resolve(modulePath)];
    brand = require(modulePath);
  } catch (error) {
    failures.push({ file: relative, line: 0, column: 0, code: "invalid-brand-config", match: String(error && error.message ? error.message : error) });
    return;
  }
  const expected = [
    ["schemaVersion", brand && brand.schemaVersion, "batch2r.brand.v1"],
    ["productName", brand && brand.productName, PRODUCT_NAME],
    ["futureCanonicalOrigin", brand && brand.futureCanonicalOrigin, FUTURE_CANONICAL_ORIGIN],
    ["currentStagingOrigin", brand && brand.currentStagingOrigin, CURRENT_STAGING_ORIGIN],
    ["prompt10Targets.repository", brand && brand.prompt10Targets && brand.prompt10Targets.repository, TARGET_REPOSITORY],
    ["prompt10Targets.stagingOrigin", brand && brand.prompt10Targets && brand.prompt10Targets.stagingOrigin, TARGET_STAGING_ORIGIN]
  ];
  for (const [property, actual, value] of expected) {
    if (actual !== value) {
      failures.push({ file: relative, line: 0, column: 0, code: "invalid-brand-config-field", match: `${property}=${JSON.stringify(actual)}; expected ${JSON.stringify(value)}` });
    }
  }
  if (!brand || typeof brand.positioning !== "string" || !brand.positioning.trim()) {
    failures.push({ file: relative, line: 0, column: 0, code: "missing-brand-positioning", match: "positioning" });
  }
  if (!brand || !brand.defaults || typeof brand.defaults.projectTitle !== "string" || !brand.defaults.projectTitle.includes(PRODUCT_NAME)) {
    failures.push({ file: relative, line: 0, column: 0, code: "invalid-default-project-title", match: "defaults.projectTitle" });
  }
  if (!brand || !brand.defaults || !/^nusacanvas(?:-|$)/.test(String(brand.defaults.exportFilenamePrefix || ""))) {
    failures.push({ file: relative, line: 0, column: 0, code: "invalid-export-filename-prefix", match: "defaults.exportFilenamePrefix" });
  }
  if (!brand || !brand.app || !brand.app.id || !brand.app.title || !brand.app.description) {
    failures.push({ file: relative, line: 0, column: 0, code: "missing-app-metadata", match: "app" });
  }
}

function validateNeutralStorageKey() {
  const relative = "assets/js/project-storage.js";
  if (!exists(relative)) {
    failures.push({ file: relative, line: 0, column: 0, code: "missing-storage-module", match: NEUTRAL_STORAGE_KEY });
    return;
  }
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  if (!new RegExp(`const\\s+STORAGE_KEY\\s*=\\s*[\"']${NEUTRAL_STORAGE_KEY}[\"']`).test(source)) {
    failures.push({ file: relative, line: 0, column: 0, code: "missing-neutral-storage-key", match: NEUTRAL_STORAGE_KEY });
  }
  if (!source.includes(LEGACY_STORAGE_KEY)) {
    failures.push({ file: relative, line: 0, column: 0, code: "missing-legacy-storage-detection", match: LEGACY_STORAGE_KEY });
  }
  const projectStorageObject = source.match(/window\.ProjectStorage\s*=\s*\{([\s\S]*?)\n\s*\};/);
  if (!projectStorageObject || !/\bSTORAGE_KEY\b/.test(projectStorageObject[1])) {
    failures.push({ file: relative, line: 0, column: 0, code: "storage-key-not-exported", match: "ProjectStorage.STORAGE_KEY" });
  }
}

for (const file of activeHtml) scanFile(file, "active-product");
for (const file of listFiles("assets/js", new Set([".js"]))) scanFile(file, "active-product");
for (const file of listFiles("content", new Set([".json"]))) scanFile(file, "active-product");
for (const file of listFiles("tests", new Set([".js", ".cjs", ".mjs", ".json"]))) scanFile(file, "active-test");
for (const file of listFiles("sample", new Set([".csv", ".tsv", ".json"]))) scanFile(file, "active-sample");
for (const file of activeMetadata) scanFile(file, "active-metadata");
for (const file of listFiles("docs")) scanFile(file, "documentation");
for (const file of listFiles(".github/workflows", new Set([".yml", ".yaml"]))) scanFile(file, "active-operation");
for (const file of listFiles("scripts", new Set([".js", ".cjs", ".mjs"]))) {
  if (!["scripts/brand-migration-audit.js", "scripts/terminology-audit.js", "scripts/build-batch2r-inventory.js"].includes(file)) scanFile(file, "active-operation");
}

for (const directory of ["docs/batch-1", "docs/batch-2", "docs/batch-3", "docs/batch-2r", "artifacts/batch-1", "artifacts/batch-2", "artifacts/batch-3", "artifacts/batch-2r"]) {
  for (const file of listFiles(directory)) {
    if (file !== normalize(path.relative(root, outputPath))) scanFile(file, "historical-evidence");
  }
}
for (const file of ["CHANGELOG.md", "scripts/build-batch2r-inventory.js"]) scanFile(file, "historical-evidence");

validateBrandConfig();
validateNeutralStorageKey();
validatePackageMetadata();
validateDeploymentDeferral();

failures.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.code.localeCompare(b.code));
warnings.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code));
allowlistedReferences.sort((a, b) => a.file.localeCompare(b.file) || a.code.localeCompare(b.code));

const report = {
  schemaVersion: "batch2r.brand-migration-audit.v1",
  generatedAt: new Date().toISOString(),
  status: failures.length ? "failed" : "passed",
  expectedIdentity: {
    productName: PRODUCT_NAME,
    futureCanonicalOrigin: FUTURE_CANONICAL_ORIGIN,
    currentStagingOrigin: CURRENT_STAGING_ORIGIN,
    currentWorkerName: CURRENT_WORKER_NAME,
    targetRepository: TARGET_REPOSITORY,
    targetReplacementStagingOrigin: TARGET_STAGING_ORIGIN,
    packageName: PACKAGE_NAME,
    neutralStorageKey: NEUTRAL_STORAGE_KEY
  },
  remoteOperationsDeferredUntilPrompt10: true,
  customDomainActivated,
  migrationCompatibility: {
    legacyStorageKey: LEGACY_STORAGE_KEY,
    allowedStorageCode: ["assets/js/project-storage.js"],
    allowedSyntheticFixtures: ["tests/fixtures/brand-migration/*.json"],
    allowedProjectDefaultCode: ["assets/js/brand-migration.js", "tests/{unit,e2e}/*{brand,migration,project-storage}*.js"],
    sourceDeletionAuthorized: false
  },
  counts: {
    scannedFiles: scanned.size,
    failures: failures.length,
    warnings: warnings.reduce((sum, item) => sum + item.count, 0),
    allowlistedReferences: allowlistedReferences.reduce((sum, item) => sum + item.count, 0)
  },
  failures,
  warnings,
  allowlistedReferences,
  scannedFiles: [...scanned].sort((a, b) => a.localeCompare(b)),
  allowlistPolicyDocument: "docs/batch-2r/03-legacy-reference-allowlist.md"
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error(`Brand migration audit failed with ${failures.length} active reference(s):`);
  failures.slice(0, 40).forEach((failure) => console.error(`- ${failure.file}:${failure.line}:${failure.column} [${failure.code}] ${failure.match}`));
  if (failures.length > 40) console.error(`- ...and ${failures.length - 40} more. See ${normalize(path.relative(root, outputPath))}.`);
  process.exit(1);
}

console.log(`Brand migration audit passed: ${report.counts.scannedFiles} files; ${report.counts.warnings} Prompt 10 operational warning(s); ${report.counts.allowlistedReferences} allowlisted historical/migration reference(s).`);
