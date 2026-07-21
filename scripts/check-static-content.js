const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DIST = path.join(ROOT, "dist");

const requiredPages = [
  "index.html",
  "about/index.html",
  "contact/index.html",
  "privacy/index.html",
  "terms/index.html",
  "sources-licenses/index.html",
  "data-methodology/index.html",
  "limitations/index.html",
  "changelog/index.html",
  "guides/index.html",
  "guides/mengapa-jumlah-wilayah-peta-berbeda/index.html",
  "guides/cara-membuat-peta-kabupaten-kota-dari-excel/index.html",
  "guides/memperbaiki-nama-wilayah/index.html",
  "guides/csv-vs-xlsx-untuk-data-peta/index.html",
  "guides/equal-interval-vs-quantile/index.html",
  "guides/legenda-peta-tidak-menyesatkan/index.html",
  "guides/ekspor-peta-ke-powerpoint/index.html",
  "guides/contoh-peta-nilai-kota/index.html",
  "excel-to-map/index.html",
  "highlight-regions/index.html",
  "sales-territories/index.html",
  "coverage-analysis/index.html"
];

const forbiddenContentPageAssets = [
  "assets/vendor/leaflet/leaflet.js",
  "assets/js/app.js",
  "assets/js/map.js",
  "assets/js/export.js",
  "assets/js/csv-import.js",
  "data/indonesia-adm2-simplified.geojson",
  "data/indonesia-adm2-detailed.geojson"
];

function fail(message) {
  throw new Error(message);
}

function read(relativePath) {
  return fs.readFileSync(path.join(DIST, relativePath), "utf8");
}

function targetExists(href, fromFile) {
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return true;
  if (/^[a-z]+:/i.test(href)) return false;
  const clean = href.split("#")[0].split("?")[0];
  if (!clean) return true;
  const base = path.dirname(path.join(DIST, fromFile));
  let target = path.resolve(base, clean);
  if (!target.startsWith(DIST)) return false;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  if (clean.endsWith("/")) target = path.join(path.resolve(base, clean), "index.html");
  return fs.existsSync(target);
}

function extractAttributes(html, attribute) {
  const pattern = new RegExp(`${attribute}=["']([^"']+)["']`, "gi");
  const values = [];
  let match = pattern.exec(html);
  while (match) {
    values.push(match[1]);
    match = pattern.exec(html);
  }
  return values;
}

function checkHeaders() {
  const headers = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
  const required = [
    "Content-Security-Policy:",
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
    "X-Content-Type-Options: nosniff",
    "Referrer-Policy: strict-origin-when-cross-origin",
    "Permissions-Policy:",
    "Cache-Control: no-transform"
  ];
  for (const item of required) {
    if (!headers.includes(item)) fail(`_headers missing ${item}`);
  }
  if (/X-Robots-Tag:\s*noindex/i.test(headers)) fail("_headers must not block production indexing");
  const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
  if (!/User-agent:\s*\*/i.test(robots) || !/Allow:\s*\//i.test(robots) || !/Sitemap:\s*https:\/\/nusacanvas\.space\/sitemap\.xml/i.test(robots)) {
    fail("robots.txt must expose the production sitemap and allow crawling");
  }
}

function checkPage(relativePath) {
  const html = read(relativePath);
  if (!/<html lang="en">/i.test(html)) fail(`${relativePath} missing lang=en`);
  if (!/<main[\s>]/i.test(html)) fail(`${relativePath} missing semantic main`);
  if (/<meta name="robots"[^>]*noindex/i.test(html)) fail(`${relativePath} must not contain production noindex metadata`);
  const canonicalPath = relativePath === "index.html" ? "/" : `/${relativePath.replace(/index\.html$/, "").replaceAll("\\", "/")}`;
  if (!html.includes(`<link rel="canonical" href="https://nusacanvas.space${canonicalPath}">`)) fail(`${relativePath} has an incorrect production canonical URL`);
  if (!html.includes("assets/css/content.css") && !relativePath.startsWith("guides/")) {
    fail(`${relativePath} missing content stylesheet`);
  }
  if (/<form[\s>]/i.test(html)) fail(`${relativePath} must not use a form submission`);
  for (const forbidden of forbiddenContentPageAssets) {
    if (html.includes(forbidden)) fail(`${relativePath} loads map/runtime asset ${forbidden}`);
  }
  for (const href of extractAttributes(html, "href")) {
    if (href === "#") fail(`${relativePath} has a placeholder href`);
    if (href.startsWith("https://nusacanvas.space/")) continue;
    if (!targetExists(href, relativePath)) fail(`${relativePath} has broken href: ${href}`);
  }
  for (const src of extractAttributes(html, "src")) {
    if (!targetExists(src, relativePath)) fail(`${relativePath} has broken src: ${src}`);
  }
}

function checkPublicNavigation(relativePath) {
  const html = read(relativePath);
  const navigation = html.match(/<div id="public-navigation" class="nav-links">([\s\S]*?)<\/div>/i)?.[1];
  if (!navigation) fail(`${relativePath} missing responsive public navigation`);
  const labels = [...navigation.matchAll(/<a\b[^>]*>([^<]+)<\/a>/gi)].map((match) => match[1].trim());
  const expected = ["Highlight regions", "Map spreadsheet", "Guides", "Region data", "About", "Open workspace"];
  if (JSON.stringify(labels) !== JSON.stringify(expected)) fail(`${relativePath} has incorrect public navigation order: ${labels.join(", ")}`);
  if (!html.includes("assets/js/public-shell.js")) fail(`${relativePath} missing public navigation behavior`);
}

function main() {
  if (!fs.existsSync(DIST)) fail("dist does not exist; run build first");
  for (const page of requiredPages) {
    if (!fs.existsSync(path.join(DIST, page))) fail(`missing trust page in dist: ${page}`);
    checkPage(page);
    checkPublicNavigation(page);
  }
  for (const page of ["sales-territories/index.html", "coverage-analysis/index.html"]) {
    const html = read(page);
    if (!/Coming soon/i.test(html) || !/not available yet/i.test(html)) fail(`${page} must state truthfully that the feature is coming soon and unavailable`);
  }
  const contact = read("contact/index.html");
  for (const id of ["issueCategory", "geometryId", "canonicalId", "issueDescription", "copyReportBtn", "downloadReportBtn", "reportOutput"]) {
    if (!contact.includes(`id="${id}"`)) fail(`contact report template missing ${id}`);
  }
  checkHeaders();
  console.log(`Static content checks passed: ${requiredPages.length} trust pages.`);
}

main();
