const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");

const requiredFiles = [
  "_headers",
  ".nojekyll",
  "index.html",
  "robots.txt",
  "assets/css/app.css",
  "assets/css/content.css",
  "assets/js/app.js",
  "assets/js/import-core.js",
  "assets/js/xlsx-import.js",
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
  "about/index.html",
  "contact/index.html",
  "privacy/index.html",
  "terms/index.html",
  "sources-licenses/index.html",
  "data-methodology/index.html",
  "limitations/index.html",
  "changelog/index.html",
  "guides/mengapa-jumlah-wilayah-peta-berbeda/index.html",
  "sample/sample-project.json",
  "sample/sample-region-colors.csv"
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

const produced = listFiles(dist).length;
if (!produced) {
  throw new Error("Build produced no files.");
}

console.log(`Built dist with ${requiredFiles.length} allowlisted files.`);
