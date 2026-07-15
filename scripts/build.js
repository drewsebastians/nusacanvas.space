const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const requiredFiles = [
  "_headers",
  ".nojekyll",
  "index.html",
  "workspace/index.html",
  "robots.txt",
  "assets/css/app.css",
  "assets/css/content.css",
  "assets/css/design-system.css",
  "assets/js/public-shell.js",
  "assets/js/workspace-shell.js",
  "assets/js/brand-config.js",
  "assets/js/boundary-provider.js",
  "assets/js/app.js",
  "assets/js/import-core.js",
  "assets/js/xlsx-import.js",
  "assets/js/matching-engine.js",
  "assets/js/visualization-engine.js",
  "assets/js/csv-import.js",
  "assets/js/export.js",
  "assets/js/map.js",
  "assets/js/project-storage.js",
  "assets/js/report-template.js",
  "assets/vendor/leaflet/leaflet.css",
  "assets/vendor/leaflet/leaflet.js",
  "assets/vendor/leaflet/images/layers-2x.png",
  "assets/vendor/leaflet/images/layers.png",
  "assets/vendor/leaflet/images/marker-icon-2x.png",
  "assets/vendor/leaflet/images/marker-icon.png",
  "assets/vendor/leaflet/images/marker-shadow.png",
  "assets/vendor/read-excel-file/read-excel-file.min.js",
  "assets/vendor/read-excel-file/LICENSE",
  "data/indonesia-adm2-detailed.geojson",
  "data/indonesia-adm2-simplified.geojson",
  "data/boundary-provider-manifest-v1.json",
  "about/index.html",
  "contact/index.html",
  "privacy/index.html",
  "terms/index.html",
  "sources-licenses/index.html",
  "data-methodology/index.html",
  "limitations/index.html",
  "changelog/index.html",
  "guides/mengapa-jumlah-wilayah-peta-berbeda/index.html",
  "guides/index.html",
  "guides/cara-membuat-peta-kabupaten-kota-dari-excel/index.html",
  "guides/memperbaiki-nama-wilayah/index.html",
  "guides/csv-vs-xlsx-untuk-data-peta/index.html",
  "guides/equal-interval-vs-quantile/index.html",
  "guides/legenda-peta-tidak-menyesatkan/index.html",
  "guides/ekspor-peta-ke-powerpoint/index.html",
  "guides/contoh-peta-nilai-kota/index.html",
  "excel-to-map/index.html",
  "sample/sample-project.json",
  "sample/sample-region-colors.csv",
  "sample/contoh-nilai-kota.csv",
  "sample/contoh-nilai-kota.tsv"
];

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(dist, relativePath);
  if (!fs.existsSync(source)) {
    throw new Error(`Required production file is missing: ${relativePath}`);
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return [path.relative(directory, fullPath)];
  });
}

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

requiredFiles.forEach(copyFile);

function bundleWorkspaceRuntime() {
  const earlyRuntimeModules = [
    "assets/js/brand-config.js",
    "assets/js/brand-migration.js",
    "assets/js/boundary-provider.js"
  ];
  const appRuntimeModules = ["assets/js/product-content.js"];
  const afterAppRuntimeModules = ["assets/js/workspace-shell.js"];
  const runtimeModules = [...earlyRuntimeModules, ...appRuntimeModules, ...afterAppRuntimeModules];
  const projectStoragePath = path.join(dist, "assets/js/project-storage.js");
  const appPath = path.join(dist, "assets/js/app.js");
  const indexPath = path.join(dist, "workspace", "index.html");
  const readModule = (relativePath) => {
    const sourcePath = path.join(root, relativePath);
    if (!fs.existsSync(sourcePath)) throw new Error(`Required root runtime source is missing: ${relativePath}`);
    return fs.readFileSync(sourcePath, "utf8");
  };
  const earlyModules = earlyRuntimeModules.map(readModule);
  const appModules = appRuntimeModules.map(readModule);
  const afterAppModules = afterAppRuntimeModules.map(readModule);
  const projectStorage = fs.readFileSync(projectStoragePath, "utf8");
  const app = fs.readFileSync(appPath, "utf8");
  let index = fs.readFileSync(indexPath, "utf8");

  runtimeModules.forEach((relativePath) => {
    const filename = path.basename(relativePath).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const scriptMarker = new RegExp(`\\s*<script src="(?:\\.\\.\\/|\\.\\/)assets\\/js\\/${filename}"><\\/script>`);
    if (!scriptMarker.test(index)) {
      throw new Error(`workspace/index.html is missing the ${path.basename(relativePath)} script marker required by the build.`);
    }
    index = index.replace(scriptMarker, "");
  });

  // Project storage is the earliest runtime dependency that needs both brand
  // configuration and migration. Bundling them here keeps the startup request
  // count unchanged while also making the config available to export.js.
  fs.writeFileSync(projectStoragePath, `${earlyModules.join("\n")}\n${projectStorage}`);
  // Keep workspace-shell after app.js: it observes the rendered workspace,
  // while bundling it avoids an otherwise separate startup request.
  fs.writeFileSync(appPath, `${appModules.join("\n")}\n${app}\n${afterAppModules.join("\n")}`);
  fs.writeFileSync(indexPath, index);
}

bundleWorkspaceRuntime();

const produced = listFiles(dist).length;
if (!produced) {
  throw new Error("Build produced no files.");
}

console.log(`Built dist with ${requiredFiles.length} allowlisted files.`);
