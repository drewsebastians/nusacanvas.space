const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const artifactPath = path.join(root, "artifacts", "batch-2r", "terminology-audit.json");
const glossary = JSON.parse(fs.readFileSync(path.join(root, "content", "terminology.json"), "utf8"));
const activeHtml = [
  "index.html", "about/index.html", "contact/index.html", "privacy/index.html", "terms/index.html",
  "sources-licenses/index.html", "data-methodology/index.html", "limitations/index.html", "changelog/index.html",
  "excel-to-map/index.html", "guides/mengapa-jumlah-wilayah-peta-berbeda/index.html",
  "guides/cara-membuat-peta-kabupaten-kota-dari-excel/index.html", "guides/memperbaiki-nama-wilayah/index.html",
  "guides/csv-vs-xlsx-untuk-data-peta/index.html", "guides/equal-interval-vs-quantile/index.html",
  "guides/legenda-peta-tidak-menyesatkan/index.html", "guides/ekspor-peta-ke-powerpoint/index.html",
  "guides/contoh-peta-nilai-kota/index.html"
];
const activeJs = [
  "assets/js/product-content.js", "assets/js/app.js", "assets/js/csv-import.js", "assets/js/import-core.js",
  "assets/js/xlsx-import.js", "assets/js/matching-engine.js", "assets/js/visualization-engine.js",
  "assets/js/map.js", "assets/js/export.js", "assets/js/project-storage.js", "assets/js/report-template.js"
];
const failures = [];
const warnings = [];

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}

function visibleHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z0-9#]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const legacyIndonesianUi = [
  "Pilih Wilayah", "Terapkan Warna", "Hapus Warna", "Reset Semua", "Wilayah Disorot", "Tambah Legenda",
  "Impor Data", "Pratinjau Import", "Terapkan Hasil Valid", "Batalkan Import", "Visualisasi dari data",
  "Pratinjau visualisasi", "Terapkan visualisasi", "Simpan Proyek", "Buka Proyek", "Bersihkan Proyek",
  "Ekspor PNG", "Ekspor SVG", "Ekspor PDF", "Memuat peta", "Belum ada data yang diterapkan",
  "Laporkan kesalahan data", "Kebijakan privasi", "Ketentuan penggunaan", "Sumber & Lisensi"
];

for (const relative of activeHtml) {
  const html = read(relative);
  if (!/<html\s+lang="en"/i.test(html)) failures.push(`${relative}: active page must declare lang=en`);
  const visible = visibleHtml(html);
  for (const phrase of legacyIndonesianUi) {
    if (visible.toLocaleLowerCase("id-ID").includes(phrase.toLocaleLowerCase("id-ID"))) failures.push(`${relative}: legacy Indonesian UI text '${phrase}'`);
  }
  const mixedSentences = visible.split(/[.!?]/).filter((sentence) => /\b(create|map|match|upload|export|save|open|fix|continue|cancel)\b/i.test(sentence) && /\b(dan|yang|untuk|dari|dengan|tidak|pilih|wilayah|peta|proyek)\b/i.test(sentence));
  for (const sentence of mixedSentences.slice(0, 4)) failures.push(`${relative}: mixed-language sentence '${sentence.trim().slice(0, 140)}'`);
  const brandCount = (html.match(/Mapnesia/gi) || []).length + (html.match(/Peta Warna Wilayah Indonesia/gi) || []).length;
  if (brandCount) failures.push(`${relative}: ${brandCount} legacy product-name reference(s); Prompt 3 requires NusaCanvas on active pages`);
}

const basicHtml = read("index.html").replace(/<details[\s\S]*?<\/details>/gi, " ");
for (const advanced of glossary.advancedOnly) {
  const pattern = new RegExp(`\\b${advanced.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  if (pattern.test(visibleHtml(basicHtml))) failures.push(`index.html: Basic mode exposes advanced term '${advanced.term}'`);
}

const appSource = read("assets/js/app.js");
for (const phrase of ["Resolve</button>", " unresolved.", "parser dimuat lazy", "fallback ", "mode raster aman", "vektor", "Geometri detail"]) {
  if (appSource.includes(phrase)) failures.push(`assets/js/app.js: raw or mixed product term '${phrase}'`);
}
for (const relative of activeJs) {
  const source = read(relative);
  for (const phrase of legacyIndonesianUi) {
    if (source.toLocaleLowerCase("id-ID").includes(phrase.toLocaleLowerCase("id-ID"))) failures.push(`${relative}: legacy Indonesian product text '${phrase}'`);
  }
  const brandCount = (source.match(/Mapnesia/gi) || []).length + (source.match(/Peta Warna Wilayah Indonesia/gi) || []).length;
  if (brandCount) failures.push(`${relative}: ${brandCount} legacy product-name reference(s); Prompt 3 requires NusaCanvas in active modules`);
}

for (const required of ["Region", "Match regions", "Unmatched regions", "Color by value", "Color by category", "Design map", "Export map", "Save project", "Open project", "Clear map", "Start over"]) {
  if (!glossary.terms.some((term) => term.preferred === required)) {
    failures.push(`content/terminology.json: missing governed term '${required}'`);
  }
}

const report = {
  schemaVersion: "batch2r.terminology-audit.v1",
  generatedAt: new Date().toISOString(),
  status: failures.length ? "failed" : "passed",
  language: "en",
  filesChecked: activeHtml.length + activeJs.length,
  activeHtml,
  activeJs,
  historicalExemptions: glossary.exemptions.historicalPaths,
  officialDataExemptions: glossary.exemptions.officialData,
  failures,
  warnings
};
fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
fs.writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
if (failures.length) {
  console.error("Terminology audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Terminology audit passed: ${report.filesChecked} active files; legacy product names are blocked.`);
