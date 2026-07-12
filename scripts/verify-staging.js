const assert = require("node:assert/strict");

const baseUrl = (process.argv[2] || "https://mapnesia.andrew-sebastian91.workers.dev").replace(/\/+$/, "");

const requiredPaths = [
  "/",
  "/robots.txt",
  "/assets/css/app.css",
  "/assets/js/app.js",
  "/assets/vendor/leaflet/leaflet.js",
  "/data/indonesia-adm2-simplified.geojson",
  "/data/indonesia-adm2-detailed.geojson",
  "/sample/sample-region-colors.csv",
  "/about/",
  "/contact/",
  "/privacy/",
  "/terms/",
  "/sources-licenses/",
  "/data-methodology/",
  "/limitations/",
  "/changelog/",
  "/guides/mengapa-jumlah-wilayah-peta-berbeda/"
];

async function get(path) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  const text = await response.text();
  return { response, text };
}

async function main() {
  for (const path of requiredPaths) {
    const { response, text } = await get(path);
    assert.equal(response.status, 200, `${path} returned ${response.status}`);
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow, noarchive", `${path} missing X-Robots-Tag`);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path} missing nosniff`);
    assert.match(response.headers.get("content-security-policy") || "", /default-src 'self'/, `${path} missing CSP`);
    if (path === "/robots.txt") assert.match(text, /Disallow:\s*\//, "robots.txt does not block crawling");
  }

  const unknown = await get(`/__missing-${Date.now()}`);
  assert.equal(unknown.response.status, 404, `unknown route returned ${unknown.response.status}`);

  console.log(`Verified staging assets, headers, robots.txt, and 404 at ${baseUrl}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
