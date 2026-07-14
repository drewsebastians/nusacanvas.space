const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const artifactsDir = path.join(root, "artifacts", "batch-2r");
fs.mkdirSync(artifactsDir, { recursive: true });

const routeFiles = ["index.html"];
for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || [".git", "dist", "node_modules", "test-results", "playwright-report"].includes(entry.name)) continue;
  const candidate = path.join(root, entry.name, "index.html");
  if (fs.existsSync(candidate)) routeFiles.push(path.relative(root, candidate));
}

function normalize(value) {
  return value.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim();
}

const visibleText = [];
const attributes = [];
const routes = [];
for (const relative of routeFiles.sort()) {
  const source = fs.readFileSync(path.join(root, relative), "utf8");
  const route = relative === "index.html" ? "/" : `/${path.dirname(relative).replaceAll("\\", "/")}/`;
  routes.push(route);
  const stripped = source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
  for (const match of stripped.matchAll(/>([^<>]+)</g)) {
    const value = normalize(match[1]);
    if (value && !/^\{\{|^\$\{/.test(value)) visibleText.push({ route, value });
  }
  for (const match of source.matchAll(/\b(aria-label|placeholder|title|alt|value)="([^"]*)"/gi)) {
    const value = normalize(match[2]);
    if (value) attributes.push({ route, attribute: match[1], value });
  }
}

const allStrings = [...visibleText.map((item) => item.value), ...attributes.map((item) => item.value)];
const legacyBrandMentions = allStrings.filter((value) => /mapnesia/i.test(value));
const mixedLanguageCandidates = allStrings.filter((value) => /\b(grouping|import|export|preview|status|data|sheet|mode|basic|advanced|mapping|CSV|TSV|XLSX|PDF|PNG|SVG)\b/i.test(value));
const inventory = {
  schemaVersion: "batch2r.current-string-inventory.v1",
  generatedAt: new Date().toISOString(),
  routeFiles,
  routes,
  visibleText,
  attributes,
  legacyBrandMentions,
  mixedLanguageCandidates,
  notes: [
    "This inventory is evidence of the current experience, not a translation decision.",
    "Dynamic strings rendered by JavaScript are recorded in the human audit and must be added to this inventory when copy is migrated.",
    "Historical documents are intentionally not rewritten by this generator."
  ]
};
fs.writeFileSync(path.join(artifactsDir, "current-string-inventory.json"), `${JSON.stringify(inventory, null, 2)}\n`);

const controlIds = [];
const indexSource = fs.readFileSync(path.join(root, "index.html"), "utf8");
for (const match of indexSource.matchAll(/\bid="([^"]+)"/g)) controlIds.push(match[1]);
const experienceInventory = {
  schemaVersion: "batch2r.current-experience-inventory.v1",
  generatedAt: new Date().toISOString(),
  testedBaseline: "b88261f",
  routes,
  publicNavigation: ["Tentang", "Sumber & Lisensi", "Metodologi Data", "Batasan", "Kontak"],
  workflow: ["Input", "Match", "Visualize", "Export"],
  modes: ["Dasar", "Lanjutan"],
  controlIds,
  journeys: [
    { id: "manual-highlight", start: "workspace", path: ["Pilih Wilayah", "Pilih Warna", "Terapkan Warna"], success: "Wilayah masuk daftar sorotan" },
    { id: "paste-two-column", start: "Impor Data", path: ["Paste dari Excel/Sheets", "Pratinjau Import", "Terapkan Hasil Valid", "Visualisasi dari data", "Ekspor"], success: "Mapping export berhasil" },
    { id: "csv-tsv", start: "Impor Data", path: ["Pilih file CSV/TSV/XLSX", "Pratinjau Import", "mapping kolom", "Terapkan Hasil Valid"], success: "Data tabel dan peta terhubung" },
    { id: "xlsx-sheet", start: "Impor Data", path: ["Pilih file XLSX", "Pilih sheet", "Pratinjau Import", "Terapkan Hasil Valid"], success: "Sheet diproses lokal" },
    { id: "resolve-match", start: "Data Anda", path: ["lihat status unmatched/ambiguous", "pilih kandidat atau abaikan", "terapkan hasil valid"], success: "Tidak ada ambiguity yang diterapkan diam-diam" },
    { id: "visualize", start: "Visualisasi dari data", path: ["pilih metode", "Pratinjau visualisasi", "Terapkan visualisasi"], success: "Legenda bersama diterapkan" },
    { id: "linked-table", start: "Data Anda", path: ["filter/urutkan tabel", "pilih baris", "lihat sorotan peta"], success: "Selection table-map linked" },
    { id: "export-svg", start: "Ekspor", path: ["pilih cakupan/metadata", "Ekspor SVG"], success: "SVG download" },
    { id: "export-png", start: "Ekspor", path: ["pilih ukuran/background", "Ekspor PNG"], success: "PNG download" },
    { id: "export-pdf", start: "Ekspor", path: ["isi metadata", "Ekspor PDF"], success: "PDF download" },
    { id: "export-mapping", start: "Ekspor", path: ["Ekspor tabel mapping CSV"], success: "Mapping CSV download" },
    { id: "project", start: "Proyek", path: ["Simpan Proyek", "Buka Proyek"], success: "Versioned project JSON" },
    { id: "autosave", start: "Proyek", path: ["wait for autosave", "recover on reload"], success: "Local recovery status" },
    { id: "future-territory", start: "no runtime entry point", path: ["Batch 3 contract only"], success: "Must remain frozen in Batch 2R" },
    { id: "future-coverage", start: "no runtime entry point", path: ["Batch 3 contract only"], success: "Must remain frozen in Batch 2R" }
  ],
  stateCoverage: ["empty", "loading", "error", "warning", "recovery", "success", "unsaved", "unmatched", "ambiguous", "mobile", "keyboard"],
  riskFindings: [
    "A single long sidebar exposes manual coloring, import, visualization, project, and export at once.",
    "The primary next action changes by workflow stage but is not a persistent single CTA.",
    "Terms such as Grouping, mapping, diverging, and advanced import require explanation for non-GIS users.",
    "Export has many options and appears below several competing sections on narrow screens.",
    "Trust/source links are present but visually compete with the workspace controls.",
    "Future Sales Territory and Distribution Coverage are contracts only; no current runtime entry point exists."
  ]
};
fs.writeFileSync(path.join(artifactsDir, "current-experience-inventory.json"), `${JSON.stringify(experienceInventory, null, 2)}\n`);
console.log(`Wrote ${routeFiles.length} route inventories to ${artifactsDir}`);
