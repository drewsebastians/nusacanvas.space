const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const providerApi = require(path.join(root, "assets/js/boundary-provider.js"));

test("province overlay cache stays bounded through zoom, pan, and province switching", async () => {
  const requests = [];
  const provider = providerApi.createCurrentBoundaryProvider({
    baseUrl: "../",
    verifyChecksums: false,
    fetchImpl: async (url) => ({ ok: true, text: async () => { requests.push(url); return fs.readFileSync(path.join(root, url.replace(/^\.\.\//, "")), "utf8"); } })
  });
  for (const code of ["11", "12", "13", "14", "11"]) await provider.getProvinceLayer(code).load();
  assert.equal(requests.filter((url) => /detailed-provinces\/11\.geojson$/.test(url)).length, 2, "the oldest of three chunks is evicted before a later pan returns");
  assert.equal(requests.filter((url) => /detailed-provinces-index\.json$/.test(url)).length, 1);
  assert.equal(requests.filter((url) => /indonesia-adm2-detailed\.geojson$/.test(url)).length, 0, "interactive switching never fetches national detail");
});

test("three cached province chunks remain below the full detailed geometry memory ceiling", () => {
  const index = JSON.parse(fs.readFileSync(path.join(root, "data/indonesia-adm2-detailed-provinces-index.json"), "utf8"));
  const fullBytes = fs.statSync(path.join(root, "data/indonesia-adm2-detailed.geojson")).size;
  const largestThreeBytes = index.chunks
    .map((chunk) => fs.statSync(path.join(root, chunk.artifact)).size)
    .sort((a, b) => b - a)
    .slice(0, 3)
    .reduce((total, bytes) => total + bytes, 0);
  assert.ok(largestThreeBytes < fullBytes, "the bounded overlay cache uses less geometry memory than a complete detailed collection");
});

test("build chunks retain every stable ID and exact approved detailed topology", () => {
  const source = JSON.parse(fs.readFileSync(path.join(root, "data/indonesia-adm2-detailed.geojson"), "utf8"));
  const sourceGeometry = new Map(source.features.map((feature) => [String(feature.properties.shapeID), JSON.stringify(feature.geometry)]));
  const index = JSON.parse(fs.readFileSync(path.join(root, "data/indonesia-adm2-detailed-provinces-index.json"), "utf8"));
  const ids = new Set();
  index.chunks.forEach((chunk) => {
    const collection = JSON.parse(fs.readFileSync(path.join(root, chunk.artifact), "utf8"));
    collection.features.forEach((feature) => {
      ids.add(feature.properties.region_id);
      assert.equal(JSON.stringify(feature.geometry), sourceGeometry.get(String(feature.properties.geometry_source_id)));
    });
  });
  assert.equal(ids.size, 519);
});
