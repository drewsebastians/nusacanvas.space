const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const artifactsDir = path.join(root, "artifacts", "batch-1");
const docsDir = path.join(root, "docs", "batch-1");

const runtimeFiles = [
  "index.html",
  "robots.txt",
  "assets/css/app.css",
  "assets/js/project-storage.js",
  "assets/js/import-core.js",
  "assets/js/xlsx-import.js",
  "assets/js/csv-import.js",
  "assets/js/export.js",
  "assets/js/map.js",
  "assets/js/app.js",
  "assets/vendor/leaflet/leaflet.css",
  "assets/vendor/leaflet/leaflet.js",
  "data/indonesia-adm2-simplified.geojson",
  "sample/sample-project.json",
  "sample/sample-region-colors.csv"
];

const onDemandFiles = [
  "data/indonesia-adm2-detailed.geojson",
  "data/indonesia-adm2-detailed-provinces-index.json",
  "assets/vendor/read-excel-file/read-excel-file.min.js",
  "assets/js/matching-engine.js",
  "assets/js/visualization-engine.js"
];

const productionFiles = [
  "_headers",
  ".nojekyll",
  ...runtimeFiles,
  ...onDemandFiles,
  "assets/vendor/leaflet/images/layers-2x.png",
  "assets/vendor/leaflet/images/layers.png",
  "assets/vendor/leaflet/images/marker-icon-2x.png",
  "assets/vendor/leaflet/images/marker-icon.png",
  "assets/vendor/leaflet/images/marker-shadow.png",
  "data/indonesia-adm2-registry.csv"
];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath));
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function fileMetric(relativePath) {
  const bytes = read(relativePath);
  return {
    path: relativePath,
    bytes: bytes.length,
    gzipBytes: zlib.gzipSync(bytes, { level: 9 }).length,
    sha256: sha256(bytes)
  };
}

function gitDirectory() {
  const gitPath = path.join(root, ".git");
  const stat = fs.statSync(gitPath);
  if (stat.isDirectory()) return gitPath;
  const content = fs.readFileSync(gitPath, "utf8").trim();
  const match = content.match(/^gitdir:\s*(.+)$/);
  if (!match) throw new Error("Cannot resolve .git directory.");
  return path.resolve(root, match[1]);
}

function gitInfo() {
  const dir = gitDirectory();
  const head = fs.readFileSync(path.join(dir, "HEAD"), "utf8").trim();
  if (!head.startsWith("ref: ")) {
    return { commit: head, branch: "detached", status: "Not recorded by measurement script." };
  }
  const ref = head.slice(5);
  const refPath = path.join(dir, ref.replace(/\//g, path.sep));
  let commit = "";
  if (fs.existsSync(refPath)) {
    commit = fs.readFileSync(refPath, "utf8").trim();
  } else {
    const packedRefs = path.join(dir, "packed-refs");
    const line = fs.existsSync(packedRefs)
      ? fs.readFileSync(packedRefs, "utf8").split(/\r?\n/).find((item) => item.endsWith(` ${ref}`))
      : "";
    commit = line ? line.split(" ")[0] : "";
  }
  return {
    commit,
    branch: ref.replace(/^refs\/heads\//, ""),
    status: "Use `git status --short` for working tree state; this script avoids spawning git."
  };
}

function collectExternalUrls() {
  const files = ["index.html", "assets/js/app.js", "assets/js/export.js", "assets/js/map.js", "assets/js/csv-import.js", "assets/js/project-storage.js"];
  const urls = new Set();
  const pattern = /https?:\/\/[^"'\s)]+/g;
  files.forEach((file) => {
    const text = read(file).toString("utf8");
    for (const match of text.matchAll(pattern)) {
      if (match[0] === "http://www.w3.org/2000/svg") continue;
      urls.add(match[0]);
    }
  });
  return Array.from(urls).sort();
}

function geoSummary(relativePath) {
  const collection = JSON.parse(read(relativePath).toString("utf8"));
  const geometryTypes = {};
  const properties = new Set();
  for (const feature of collection.features || []) {
    const type = feature.geometry && feature.geometry.type;
    geometryTypes[type] = (geometryTypes[type] || 0) + 1;
    Object.keys(feature.properties || {}).forEach((key) => properties.add(key));
  }
  return {
    path: relativePath,
    featureCount: (collection.features || []).length,
    geometryTypes,
    propertyFields: Array.from(properties).sort()
  };
}

function provinceChunkSummary() {
  const index = JSON.parse(read("data/indonesia-adm2-detailed-provinces-index.json").toString("utf8"));
  const bytes = index.chunks.map((chunk) => fs.statSync(path.join(root, chunk.artifact)).size).sort((a, b) => b - a);
  return {
    chunkCount: index.chunkCount,
    featureCount: index.featureCount,
    largestChunkBytes: bytes[0],
    largestThreeChunkBytes: bytes.slice(0, 3).reduce((total, value) => total + value, 0),
    totalChunkBytes: bytes.reduce((total, value) => total + value, 0)
  };
}

function projectSchemaVersions() {
  const storage = read("assets/js/project-storage.js").toString("utf8");
  const sample = JSON.parse(read("sample/sample-project.json").toString("utf8"));
  return {
    appVersion: (storage.match(/APP_VERSION = "([^"]+)"/) || [null, null])[1],
    projectSchema: (storage.match(/PROJECT_SCHEMA = "([^"]+)"/) || [null, null])[1],
    sampleProjectSchema: sample.schemaVersion,
    boundaryVersion: sample.boundaryVersion || "IDN-ADM2-2020-CODAB-geoboundaries",
    dataRegistrySchema: "No explicit version field found in data/indonesia-adm2-registry.csv"
  };
}

function pagesState() {
  return {
    workflowDirectoryExists: fs.existsSync(path.join(root, ".github", "workflows")),
    nojekyllExists: fs.existsSync(path.join(root, ".nojekyll")),
    docsMentionGitHubPages: read("README.md").toString("utf8").includes("GitHub Pages")
  };
}

function writeMarkdown(measurements) {
  const lines = [
    "# Batch 1 Baseline Audit",
    "",
    `Generated: ${measurements.generatedAt}`,
    `Repository commit: \`${measurements.git.commit}\``,
    `Branch: \`${measurements.git.branch}\``,
    "",
    "## Runtime entry points",
    "",
    "- `index.html` loads local Leaflet, application CSS, and five browser scripts.",
    "- `assets/js/app.js` starts on `DOMContentLoaded` and fetches only the simplified geometry snapshot.",
    "- `assets/js/project-storage.js` defines project schema validation, autosave, and JSON download.",
    "- `assets/js/export.js` creates SVG and PNG files in the browser.",
    "",
    "## Production files measured",
    "",
    "| File | Raw bytes | Gzip bytes | SHA-256 |",
    "|---|---:|---:|---|",
    ...measurements.files.map((file) => `| \`${file.path}\` | ${file.bytes} | ${file.gzipBytes} | \`${file.sha256}\` |`),
    "",
    "## Geometry baseline",
    "",
    `- Simplified geometry: ${measurements.geometry.simplified.featureCount} features.`,
    `- Detailed geometry: ${measurements.geometry.detailed.featureCount} features.`,
    `- Detailed province chunks: ${measurements.geometry.provinceChunks.chunkCount}; largest three cached chunks: ${measurements.geometry.provinceChunks.largestThreeChunkBytes} bytes.`,
    `- Simplified SHA-256: \`${measurements.geometryFiles.simplified.sha256}\`.`,
    `- Detailed SHA-256: \`${measurements.geometryFiles.detailed.sha256}\`.`,
    `- Geometry types: ${JSON.stringify(measurements.geometry.simplified.geometryTypes)}.`,
    "",
    "## Current schema versions",
    "",
    `- App version: \`${measurements.schema.appVersion}\`.`,
    `- Project schema: \`${measurements.schema.projectSchema}\`.`,
    `- Sample project schema: \`${measurements.schema.sampleProjectSchema}\`.`,
    `- Boundary version: \`${measurements.schema.boundaryVersion}\`.`,
    `- Data registry schema: ${measurements.schema.dataRegistrySchema}.`,
    "",
    "## Network and deployment baseline",
    "",
    "- Initial app files are local relative URLs.",
    "- Detailed geometry is an on-demand export asset, not a startup asset.",
    `- External URLs visible in source: ${measurements.network.externalUrls.length ? measurements.network.externalUrls.map((url) => `\`${url}\``).join(", ") : "none"}.`,
    "- Browser smoke testing records runtime requests under `artifacts/batch-1/smoke-network.json` when `npm run test:e2e:smoke` is run.",
    `- GitHub workflow directory currently exists: ${measurements.deployment.workflowDirectoryExists}.`,
    `- \`.nojekyll\` currently exists: ${measurements.deployment.nojekyllExists}.`,
    `- README currently mentions GitHub Pages: ${measurements.deployment.docsMentionGitHubPages}.`,
    "",
    "## Current checks",
    "",
    "- Pre-Batch 1 repository had one Python data check: `python tests/run_data_tests.py`.",
    "- Batch 1 adds deterministic build, unit, smoke, accessibility, measurement, and CI checks.",
    "",
    "## Accessibility and mobile risks visible in implementation",
    "",
    "- The sidebar contains many controls and can be dense on small screens.",
    "- Permanent map labels can collide or become visually busy even with collision hiding.",
    "- Several icon-like buttons use text or symbols inherited from the current UI.",
    "- Batch 1 records serious/critical axe failures as a blocking gate and lower-severity findings as artifacts.",
    "",
    "## Baseline load, color, save, and export behavior",
    "",
    "- Load: fetch local simplified geometry at startup; close views add only visible province detail overlays while the full local detail file remains export-only.",
    "- Color: users select a region, choose a color, and apply it to the in-browser highlight state.",
    "- Save: project JSON is built in the browser and downloaded locally; autosave uses browser localStorage.",
    "- Export: SVG and PNG are generated in-browser without uploading project contents.",
    "",
    "## Measurement limitations",
    "",
    "- Raw and gzip sizes are filesystem measurements, not CDN transfer logs.",
    "- Browser network evidence depends on the local Playwright environment and is stored separately by the smoke test.",
    "- Accessibility evidence starts with automated axe checks only; manual keyboard and screen-reader testing remain required in later batches.",
    "- The baseline does not verify legal currency of administrative boundaries."
  ];
  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(path.join(docsDir, "01-baseline-audit.md"), `${lines.join("\n")}\n`);
}

fs.mkdirSync(artifactsDir, { recursive: true });

const measurements = {
  generatedAt: new Date().toISOString(),
  environment: {
    node: process.version,
    platform: process.platform
  },
  git: gitInfo(),
  files: productionFiles.filter((file) => fs.existsSync(path.join(root, file))).map(fileMetric),
  runtimeInitialAssets: runtimeFiles.map(fileMetric),
  runtimeOnDemandAssets: onDemandFiles.map(fileMetric),
  geometryFiles: {
    simplified: fileMetric("data/indonesia-adm2-simplified.geojson"),
    detailed: fileMetric("data/indonesia-adm2-detailed.geojson"),
    provinceIndex: fileMetric("data/indonesia-adm2-detailed-provinces-index.json")
  },
  geometry: {
    simplified: geoSummary("data/indonesia-adm2-simplified.geojson"),
    detailed: geoSummary("data/indonesia-adm2-detailed.geojson"),
    provinceChunks: provinceChunkSummary()
  },
  schema: projectSchemaVersions(),
  network: {
    externalUrls: collectExternalUrls(),
    initialRuntimeAssetUrls: runtimeFiles
  },
  deployment: pagesState()
};

fs.writeFileSync(path.join(artifactsDir, "baseline-measurements.json"), `${JSON.stringify(measurements, null, 2)}\n`);
writeMarkdown(measurements);
console.log(`Wrote ${path.relative(root, path.join(artifactsDir, "baseline-measurements.json"))}`);
console.log(`Wrote ${path.relative(root, path.join(docsDir, "01-baseline-audit.md"))}`);
