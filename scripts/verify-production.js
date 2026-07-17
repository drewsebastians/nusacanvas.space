const assert = require("node:assert/strict");

const baseUrl = (process.argv[2] || "https://nusacanvas.space").replace(/\/+$/, "");
const requiredPaths = [
  "/", "/workspace/", "/robots.txt", "/sitemap.xml",
  "/assets/css/app.css", "/assets/js/app.js", "/assets/vendor/leaflet/leaflet.js",
  "/data/indonesia-adm2-simplified.geojson", "/data/indonesia-adm2-detailed.geojson",
  "/sample/sample-region-colors.csv", "/sample/contoh-nilai-kota.csv", "/sample/contoh-nilai-kota.tsv",
  "/about/", "/contact/", "/privacy/", "/terms/", "/sources-licenses/",
  "/data-methodology/", "/limitations/", "/changelog/", "/excel-to-map/", "/guides/",
  "/guides/mengapa-jumlah-wilayah-peta-berbeda/", "/guides/cara-membuat-peta-kabupaten-kota-dari-excel/",
  "/guides/memperbaiki-nama-wilayah/", "/guides/csv-vs-xlsx-untuk-data-peta/",
  "/guides/equal-interval-vs-quantile/", "/guides/legenda-peta-tidak-menyesatkan/",
  "/guides/ekspor-peta-ke-powerpoint/", "/guides/contoh-peta-nilai-kota/"
];

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  return { response, text: await response.text() };
}

async function main() {
  for (const path of requiredPaths) {
    const { response, text } = await get(path);
    assert.equal(response.status, 200, `${path} returned ${response.status}`);
    assert.notEqual(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive", `${path} is still blocked from indexing`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path} missing nosniff`);
    assert.match(response.headers.get("content-security-policy") || "", /default-src 'self'/, `${path} missing CSP`);
    if (path === "/robots.txt") {
      assert.match(text, /Allow:\s*\//, "robots.txt does not allow crawling");
      assert.match(text, /Sitemap:\s*https:\/\/nusacanvas\.space\/sitemap\.xml/, "robots.txt is missing the production sitemap");
    }
    if (response.headers.get("content-type")?.includes("text/html")) {
      assert.match(text, /<link rel="canonical" href="https:\/\/nusacanvas\.space\//, `${path} missing canonical URL`);
      if (path === "/workspace/") assert.match(text, /<meta name="robots" content="noindex,follow">/, "workspace must remain noindex");
      else assert.doesNotMatch(text, /<meta name="robots"[^>]*noindex/i, `${path} still contains noindex metadata`);
    }
  }

  const unknown = await get(`/__missing-${Date.now()}`);
  assert.equal(unknown.response.status, 404, `unknown route returned ${unknown.response.status}`);
  console.log(`Verified production assets, headers, indexing, canonicals, and 404 at ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
