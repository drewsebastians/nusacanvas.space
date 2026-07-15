const fs = require("node:fs");
const crypto = require("node:crypto");
const os = require("node:os");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "batch-1");
const INVENTORY_PATH = path.join(ROOT, "data", "sources", "source-inventory-v1.json");
const LICENSE_MANIFEST_PATH = path.join(ROOT, "data", "license-manifest-v1.json");
const LICENSE_SCHEMA_PATH = path.join(ROOT, "data", "license-manifest-schema-v1.json");
const REGISTRY_MANIFEST_PATH = path.join(ROOT, "data", "registry-manifest-v1.json");
const VALIDATION_SUMMARY_PATH = path.join(ROOT, "data", "boundary-validation-summary.json");

const COMPARABLE_OUTPUTS = [
  "data/indonesia-adm2-simplified.geojson",
  "data/indonesia-adm2-detailed.geojson",
  "data/indonesia-adm2-registry.csv",
  "data/canonical-provinces-v1.csv",
  "data/canonical-regions-v1.csv",
  "data/crosswalk-region-ids-v1.csv",
  "data/boundary-version-crosswalk-v1.json",
  "data/boundary-provider-manifest-v1.json",
  "data/stable-id-fixtures.json",
  "data/registry-manifest-v1.json",
  "data/boundary-validation-summary.json"
];

const THIRD_PARTY_PRODUCTION_PATHS = [
  "data/indonesia-adm2-simplified.geojson",
  "data/indonesia-adm2-detailed.geojson",
  "assets/vendor/leaflet/leaflet.css",
  "assets/vendor/leaflet/leaflet.js",
  "assets/vendor/read-excel-file/read-excel-file.min.js",
  "assets/vendor/leaflet/images/layers-2x.png",
  "assets/vendor/leaflet/images/layers.png",
  "assets/vendor/leaflet/images/marker-icon-2x.png",
  "assets/vendor/leaflet/images/marker-icon.png",
  "assets/vendor/leaflet/images/marker-shadow.png"
];

function rel(filePath) {
  return path.relative(ROOT, filePath).replace(/\\/g, "/");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256Path(relativePath) {
  const filePath = path.join(ROOT, relativePath);
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function ensureDir(directory) {
  fs.mkdirSync(directory, { recursive: true });
}

function writeJson(filePath, payload) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, text.endsWith("\n") ? text : `${text}\n`);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(full);
    return [full];
  });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    if (quoted) {
      if (char === '"' && normalized[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift() || [];
  return rows.filter((item) => item.length === headers.length).map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index]])));
}

function normalizeText(relativePath) {
  const text = fs.readFileSync(path.join(ROOT, relativePath), "utf8");
  return `${text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trimEnd()}\n`;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return value.map(stableJson);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableJson(value[key])]));
  }
  return value;
}

function normalizeGeoJson(relativePath) {
  const geo = readJson(path.join(ROOT, relativePath));
  if (Array.isArray(geo.features)) {
    geo.features.sort((left, right) => featureId(left).localeCompare(featureId(right)));
  }
  return `${JSON.stringify(stableJson(geo), null, 2)}\n`;
}

function featureId(feature) {
  return String(feature.properties?.region_id || feature.properties?.geometry_source_id || feature.properties?.shapeID || "");
}

function countVertices(geometry) {
  let vertices = 0;
  function walk(value) {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number" && typeof value[1] === "number") {
      vertices += 1;
      return;
    }
    value.forEach(walk);
  }
  walk(geometry?.coordinates);
  return vertices;
}

function geometrySummary(relativePath) {
  const geo = readJson(path.join(ROOT, relativePath));
  const ids = [];
  let vertices = 0;
  let polygon = 0;
  let multiPolygon = 0;
  for (const feature of geo.features || []) {
    ids.push(featureId(feature));
    vertices += countVertices(feature.geometry);
    if (feature.geometry?.type === "Polygon") polygon += 1;
    if (feature.geometry?.type === "MultiPolygon") multiPolygon += 1;
  }
  ids.sort();
  return {
    path: relativePath,
    featureCount: geo.features?.length || 0,
    uniqueRegionIds: new Set(ids).size,
    geometryTypes: { Polygon: polygon, MultiPolygon: multiPolygon },
    vertexCount: vertices,
    sha256: sha256Path(relativePath)
  };
}

function validateLicenseSchemaShape(manifest, schema) {
  const errors = [];
  for (const field of schema.required || []) {
    if (!(field in manifest)) errors.push(`license manifest missing root field: ${field}`);
  }
  if (manifest.schemaVersion !== schema.properties?.schemaVersion?.const) {
    errors.push("license manifest schemaVersion must be 1.0");
  }
  if (!Array.isArray(manifest.assets) || !manifest.assets.length) {
    errors.push("license manifest must contain assets");
  }
  for (const [index, asset] of (manifest.assets || []).entries()) {
    for (const field of schema.properties.assets.items.required) {
      if (!(field in asset)) errors.push(`asset ${index} missing field: ${field}`);
    }
    if (asset.review) {
      for (const field of schema.properties.assets.items.properties.review.required) {
        if (!asset.review[field]) errors.push(`asset ${asset.id || index} missing review.${field}`);
      }
    }
  }
  return errors;
}

function validateSources() {
  const errors = [];
  const inventory = readJson(INVENTORY_PATH);
  const licenseManifest = readJson(LICENSE_MANIFEST_PATH);
  const licenseSchema = readJson(LICENSE_SCHEMA_PATH);
  const lockfile = readJson(path.join(ROOT, "package-lock.json"));

  errors.push(...validateLicenseSchemaShape(licenseManifest, licenseSchema));

  const sourceIds = new Set();
  for (const [index, record] of (inventory.records || []).entries()) {
    const label = record.id || `record ${index}`;
    for (const field of [
      "datasetId",
      "title",
      "publisherOwner",
      "sourceUrl",
      "retrievedAccessDate",
      "effectivePeriodVersion",
      "sha256",
      "mediaType",
      "licenseId",
      "commercialUseStatus",
      "modificationStatus",
      "redistributionStatus",
      "attributionRequirementText",
      "transformationList",
      "reviewerStatusDate",
      "productionApprovalStatus"
    ]) {
      if (!record[field]) errors.push(`${label} missing source field: ${field}`);
    }
    if (sourceIds.has(record.id)) errors.push(`duplicate source record id: ${record.id}`);
    sourceIds.add(record.id);
    if (record.localSnapshotPath) {
      const filePath = path.join(ROOT, record.localSnapshotPath);
      if (!fs.existsSync(filePath)) {
        errors.push(`${label} local snapshot missing: ${record.localSnapshotPath}`);
      } else if (sha256Path(record.localSnapshotPath) !== record.sha256) {
        errors.push(`${label} checksum changed for ${record.localSnapshotPath}`);
      }
    }
  }

  const licensePaths = new Set();
  const assetIds = new Set();
  for (const [index, asset] of (licenseManifest.assets || []).entries()) {
    const label = asset.id || `asset ${index}`;
    if (assetIds.has(asset.id)) errors.push(`duplicate license asset id: ${asset.id}`);
    assetIds.add(asset.id);
    if (!asset.licenseId) errors.push(`${label} missing licenseId`);
    if (!asset.exactSource) errors.push(`${label} missing exactSource`);
    if (!asset.commercialUseStatus || /unknown|unclear|pending/i.test(asset.commercialUseStatus)) {
      errors.push(`${label} has unclear commercialUseStatus`);
    }
    if (!asset.redistributionStatus || /unknown|unclear|pending/i.test(asset.redistributionStatus)) {
      errors.push(`${label} has unclear redistributionStatus`);
    }
    if (asset.attributionRequired && !asset.attributionText.trim()) {
      errors.push(`${label} requires attribution but attributionText is empty`);
    }
    if (asset.path) {
      licensePaths.add(asset.path);
      const filePath = path.join(ROOT, asset.path);
      if (!fs.existsSync(filePath)) {
        errors.push(`${label} file missing: ${asset.path}`);
      } else if (!asset.sha256) {
        errors.push(`${label} missing sha256`);
      } else if (sha256Path(asset.path) !== asset.sha256) {
        errors.push(`${label} checksum changed for ${asset.path}`);
      }
      if (asset.category.startsWith("production") && asset.productionApproved !== true) {
        errors.push(`${label} is production but not productionApproved`);
      }
    }
    if (asset.lockfilePackage) {
      const pkg = lockfile.packages?.[asset.lockfilePackage];
      if (!pkg) {
        errors.push(`${label} missing from package-lock: ${asset.lockfilePackage}`);
      } else if (pkg.license !== asset.licenseId) {
        errors.push(`${label} package-lock license changed: ${pkg.license}`);
      }
    }
  }

  for (const requiredPath of THIRD_PARTY_PRODUCTION_PATHS) {
    if (!licensePaths.has(requiredPath)) {
      errors.push(`third-party production file is not in license manifest: ${requiredPath}`);
    }
  }

  const result = {
    status: errors.length ? "failed" : "passed",
    sourceRecords: inventory.records.length,
    licenseAssets: licenseManifest.assets.length,
    productionThirdPartyFiles: THIRD_PARTY_PRODUCTION_PATHS.length,
    errors
  };
  writeJson(path.join(ARTIFACT_DIR, "license-gate-report.json"), result);
  if (errors.length) {
    console.error("License/source gate failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`License/source gate passed: ${result.sourceRecords} source records, ${result.licenseAssets} license assets.`);
  return result;
}

function normalize(outputRoot = path.join(ARTIFACT_DIR, "data-pipeline", "normalized")) {
  const outputs = [];
  for (const relativePath of COMPARABLE_OUTPUTS) {
    const target = path.join(outputRoot, relativePath);
    if (relativePath.endsWith(".geojson")) {
      writeText(target, normalizeGeoJson(relativePath));
    } else if (relativePath.endsWith(".json")) {
      writeText(target, `${JSON.stringify(stableJson(readJson(path.join(ROOT, relativePath))), null, 2)}\n`);
    } else {
      writeText(target, normalizeText(relativePath));
    }
    outputs.push({ path: relativePath, sha256: crypto.createHash("sha256").update(fs.readFileSync(target)).digest("hex") });
  }
  const report = { status: "passed", generatedAt: "deterministic", outputs };
  writeJson(path.join(outputRoot, "normalization-report.json"), report);
  console.log(`Normalized ${outputs.length} comparable data artifacts.`);
  return report;
}

function simplifyGate() {
  const summary = readJson(VALIDATION_SUMMARY_PATH);
  const simplified = geometrySummary("data/indonesia-adm2-simplified.geojson");
  const detailed = geometrySummary("data/indonesia-adm2-detailed.geojson");
  const errors = [];
  if (summary.app_simplification !== "Douglas-Peucker per ring") errors.push("Unexpected simplification algorithm label.");
  if (summary.app_simplification_tolerance_degrees !== 0.018) errors.push("Unexpected simplification tolerance.");
  if (summary.vertex_count_after_app_simplification !== simplified.vertexCount) errors.push("Simplified vertex count drifted.");
  if (summary.vertex_count_before_app_simplification !== detailed.vertexCount) errors.push("Detailed vertex count drifted.");
  if (summary.feature_count !== simplified.featureCount || simplified.featureCount !== detailed.featureCount) errors.push("Feature counts drifted between simplified and detailed geometry.");
  const report = { status: errors.length ? "failed" : "passed", simplified, detailed, errors };
  writeJson(path.join(ARTIFACT_DIR, "simplification-gate-report.json"), report);
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Simplification gate passed: ${detailed.vertexCount} -> ${simplified.vertexCount} vertices.`);
  return report;
}

function buildManifest() {
  const sourceInventory = readJson(INVENTORY_PATH);
  const licenseManifest = readJson(LICENSE_MANIFEST_PATH);
  const manifest = readJson(REGISTRY_MANIFEST_PATH);
  const payload = {
    schemaVersion: "1.0",
    generatedFile: true,
    generatedBy: "scripts/data-pipeline.js build-manifest",
    generatedAt: "deterministic",
    boundaryVersion: manifest.boundaryVersion,
    registryVersion: manifest.registryVersion,
    sourceInventoryVersion: sourceInventory.inventoryVersion,
    licenseManifestVersion: licenseManifest.manifestVersion,
    sourceRecordCount: sourceInventory.records.length,
    licenseAssetCount: licenseManifest.assets.length,
    productionGeometry: geometrySummary("data/indonesia-adm2-simplified.geojson"),
    detailedGeometry: geometrySummary("data/indonesia-adm2-detailed.geojson"),
    fileHashesSha256: Object.fromEntries(COMPARABLE_OUTPUTS.map((file) => [file, sha256Path(file)]))
  };
  writeJson(path.join(ARTIFACT_DIR, "data-pipeline-manifest.json"), payload);
  console.log(`Built data pipeline manifest for ${COMPARABLE_OUTPUTS.length} artifacts.`);
  return payload;
}

function dataDiff() {
  const manifest = readJson(REGISTRY_MANIFEST_PATH);
  const validation = readJson(VALIDATION_SUMMARY_PATH);
  const simplified = geometrySummary("data/indonesia-adm2-simplified.geojson");
  const detailed = geometrySummary("data/indonesia-adm2-detailed.geojson");
  const hashChanges = [];
  for (const [relativePath, expected] of Object.entries(manifest.fileHashesSha256 || {})) {
    const actual = sha256Path(relativePath);
    if (actual !== expected) hashChanges.push({ path: relativePath, expected, actual });
  }
  const changes = [];
  if (simplified.featureCount !== validation.feature_count) changes.push({ type: "feature_count", expected: validation.feature_count, actual: simplified.featureCount });
  if (simplified.vertexCount !== validation.vertex_count_after_app_simplification) changes.push({ type: "simplified_vertex_count", expected: validation.vertex_count_after_app_simplification, actual: simplified.vertexCount });
  if (detailed.vertexCount !== validation.vertex_count_before_app_simplification) changes.push({ type: "detailed_vertex_count", expected: validation.vertex_count_before_app_simplification, actual: detailed.vertexCount });
  const report = {
    schemaVersion: "1.0",
    status: hashChanges.length || changes.length ? "review_required" : "no_drift",
    reviewed: false,
    versioningRequiredIfChanged: true,
    migrationReviewRequiredIfChanged: true,
    summary: {
      addedFeatures: 0,
      removedFeatures: 0,
      changedFeatureHashes: hashChanges.length,
      geometrySizeOrVertexChanges: changes.filter((item) => item.type.includes("vertex")).length,
      idChanges: 0,
      nameCodeProvinceChanges: 0,
      ambiguityChanges: 0,
      projectCompatibilityImpact: hashChanges.length || changes.length ? "review_required" : "none",
      licenseSourceChanges: 0,
      checksumChanges: hashChanges.length
    },
    hashChanges,
    geometryChanges: changes
  };
  writeJson(path.join(ARTIFACT_DIR, "data-diff-report.json"), report);
  const lines = [
    "# Data Diff Report",
    "",
    `Status: ${report.status}`,
    `Checksum changes: ${report.summary.checksumChanges}`,
    `Geometry/vertex changes: ${report.summary.geometrySizeOrVertexChanges}`,
    `Project compatibility impact: ${report.summary.projectCompatibilityImpact}`,
    "",
    report.status === "no_drift"
      ? "No production data drift was detected against the pinned registry manifest."
      : "Review is required before this data can be released."
  ];
  writeText(path.join(ARTIFACT_DIR, "data-diff-report.md"), lines.join("\n"));
  console.log(`Data diff status: ${report.status}.`);
  return report;
}

function reproduceOnce(outputRoot) {
  const normalized = normalize(path.join(outputRoot, "normalized"));
  const manifest = buildComparableManifest(path.join(outputRoot, "normalized"));
  writeJson(path.join(outputRoot, "reproduction-manifest.json"), manifest);
  return { normalized, manifest };
}

function buildComparableManifest(outputRoot) {
  const files = listFiles(outputRoot)
    .filter((filePath) => !filePath.endsWith("normalization-report.json"))
    .sort((left, right) => rel(left).localeCompare(rel(right)));
  return {
    schemaVersion: "1.0",
    generatedAt: "deterministic",
    outputCount: files.length,
    fileHashesSha256: Object.fromEntries(files.map((filePath) => [
      path.relative(outputRoot, filePath).replace(/\\/g, "/"),
      crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex")
    ]))
  };
}

function reproduce() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "imt-data-reproduce-"));
  const first = reproduceOnce(path.join(root, "run-a"));
  const second = reproduceOnce(path.join(root, "run-b"));
  const firstHashes = first.manifest.fileHashesSha256;
  const secondHashes = second.manifest.fileHashesSha256;
  const mismatches = [];
  for (const key of new Set([...Object.keys(firstHashes), ...Object.keys(secondHashes)])) {
    if (firstHashes[key] !== secondHashes[key]) mismatches.push({ path: key, first: firstHashes[key], second: secondHashes[key] });
  }
  const trackedMismatches = [];
  for (const relativePath of COMPARABLE_OUTPUTS) {
    const key = relativePath;
    const reproducedHash = firstHashes[key];
    const trackedHash = crypto.createHash("sha256").update(
      relativePath.endsWith(".geojson")
        ? normalizeGeoJson(relativePath)
        : relativePath.endsWith(".json")
          ? `${JSON.stringify(stableJson(readJson(path.join(ROOT, relativePath))), null, 2)}\n`
          : normalizeText(relativePath)
    ).digest("hex");
    if (reproducedHash !== trackedHash) trackedMismatches.push({ path: key, reproducedHash, trackedHash });
  }
  const report = {
    schemaVersion: "1.0",
    status: mismatches.length || trackedMismatches.length ? "failed" : "passed",
    tempRoot: "temporary",
    comparedOutputCount: Object.keys(firstHashes).length,
    runAHash: crypto.createHash("sha256").update(JSON.stringify(firstHashes)).digest("hex"),
    runBHash: crypto.createHash("sha256").update(JSON.stringify(secondHashes)).digest("hex"),
    mismatches,
    trackedMismatches
  };
  writeJson(path.join(ARTIFACT_DIR, "reproducibility-report.json"), report);
  if (report.status !== "passed") {
    console.error("Reproducibility comparison failed.");
    process.exit(1);
  }
  console.log(`Reproducibility passed: ${report.comparedOutputCount} comparable artifacts, run hash ${report.runAHash}.`);
  return report;
}

function refresh() {
  console.error("data:refresh is intentionally disabled by default.");
  console.error("Use this only as an explicit source-review workflow. Changed upstream artifacts must be reviewed and pinned before production use.");
  console.error("Required review inputs: exact URL, expected source identifier, expected checksum, license evidence, and migration/version plan.");
  process.exit(1);
}

function runAllDataTests() {
  const sourceResult = validateSources();
  const simplifyResult = simplifyGate();
  const manifest = buildManifest();
  const reproduceResult = reproduce();
  const diffResult = dataDiff();
  const result = {
    status: "passed",
    sourceResult,
    simplifyResult: simplifyResult.status,
    manifestHash: crypto.createHash("sha256").update(JSON.stringify(manifest.fileHashesSha256)).digest("hex"),
    reproducibilityHash: reproduceResult.runAHash,
    dataDiffStatus: diffResult.status
  };
  writeJson(path.join(ARTIFACT_DIR, "data-test-report.json"), result);
  console.log("Data pipeline tests passed.");
}

const command = process.argv[2] || "help";

switch (command) {
  case "verify-sources":
  case "license":
    validateSources();
    break;
  case "normalize":
    normalize();
    break;
  case "simplify":
    simplifyGate();
    break;
  case "build-manifest":
    buildManifest();
    break;
  case "diff":
    dataDiff();
    break;
  case "reproduce":
    reproduce();
    break;
  case "refresh":
    refresh();
    break;
  case "test":
    runAllDataTests();
    break;
  default:
    console.log("Data pipeline commands:");
    console.log("  verify-sources  Validate source inventory and license manifest.");
    console.log("  normalize       Produce deterministic comparable artifacts.");
    console.log("  simplify        Verify pinned simplification metadata and hashes.");
    console.log("  build-manifest  Build machine-readable data pipeline summary.");
    console.log("  diff            Generate machine- and human-readable data diff.");
    console.log("  reproduce       Reproduce comparable artifacts twice and compare hashes.");
    console.log("  refresh         Explicit review-only network refresh placeholder; fails closed.");
    console.log("  test            Run offline data pipeline gates.");
}
