const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const providerApi = require(path.join(root, "assets/js/boundary-provider.js"));
const manifestFile = JSON.parse(fs.readFileSync(path.join(root, "data/boundary-provider-manifest-v1.json"), "utf8"));

function digest(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relativePath))).digest("hex");
}

test("current boundary provider manifest is complete and matches reviewed local artifacts", () => {
  assert.equal(providerApi.validateManifest(providerApi.CURRENT_MANIFEST), true);
  assert.throws(() => providerApi.validateManifest({}), /missing schemaVersion/i);
  assert.deepEqual(JSON.parse(JSON.stringify(providerApi.CURRENT_MANIFEST)), manifestFile);
  assert.equal(manifestFile.providerId, providerApi.CURRENT_MANIFEST.providerId);
  assert.equal(manifestFile.boundaryVersion, providerApi.CURRENT_MANIFEST.boundaryVersion);
  assert.equal(manifestFile.detailTiers.lite.sha256, digest("data/indonesia-adm2-simplified.geojson"));
  assert.equal(manifestFile.detailTiers.detailed.sha256, digest("data/indonesia-adm2-detailed.geojson"));
  assert.equal(manifestFile.detailTiers.provinceChunks.sha256, digest("data/indonesia-adm2-detailed-provinces-index.json"));
  assert.equal(manifestFile.featureCount, 519);
  const chunkIndex = JSON.parse(fs.readFileSync(path.join(root, "data/indonesia-adm2-detailed-provinces-index.json"), "utf8"));
  assert.equal(chunkIndex.chunkCount, 35);
  assert.equal(chunkIndex.chunks.reduce((total, chunk) => total + chunk.featureCount, 0), 519);
});

test("provider defers detailed geometry and never builds an external runtime request", async () => {
  const requests = [];
  const readLocalArtifact = (url) => fs.readFileSync(path.join(root, url.replace(/^\.\.\//, "")), "utf8");
  const provider = providerApi.createCurrentBoundaryProvider({
    baseUrl: "../",
    verifyChecksums: false,
    fetchImpl: async (url) => {
      requests.push(url);
      assert.match(url, /^\.\.\/data\//);
      assert.doesNotMatch(url, /^https?:/i);
      return { ok: true, text: async () => readLocalArtifact(url) };
    }
  });
  const lite = provider.getNationalLayer("ADM2", "lite");
  const detailed = provider.getNationalLayer("ADM2", "detailed");
  assert.equal(requests.length, 0, "constructing layers must not fetch data");
  assert.equal(lite.lazy, false);
  assert.equal(detailed.lazy, true);
  const collection = await lite.load();
  assert.equal(collection.features.length, 519);
  assert.ok(collection.features[0].properties.region_id);
  assert.ok(collection.features[0].properties.display_name);
  assert.deepEqual(requests, ["../data/indonesia-adm2-simplified.geojson"]);
  const detailCollection = await detailed.load();
  assert.equal(detailCollection.features.length, 519);
  assert.equal(detailCollection.features[0].properties.region_id, collection.features[0].properties.region_id);
  const jakarta = await provider.getProvinceLayer("31").load();
  assert.equal(jakarta.features.length, 6);
  assert.ok(jakarta.mesh.segments.length);
  assert.ok(jakarta.features.every((feature) => feature.properties.province_code === "31"));
  assert.equal(requests.filter((url) => url.includes("indonesia-adm2-detailed.geojson")).length, 1, "full detail remains an export-only request");
  assert.ok(requests.some((url) => url.includes("detailed-provinces/31.geojson")));
  await assert.rejects(async () => providerApi.createCurrentBoundaryProvider({ baseUrl: "https://example.test/" }).getNationalLayer("ADM2", "lite"), /remote runtime source/i);
});

test("provider reports compatibility instead of reinterpreting a different boundary version", () => {
  const legacy = providerApi.current.validateProjectCompatibility({ boundaryVersion: providerApi.current.getVersion(), highlights: { "gb-example": {} } });
  assert.equal(legacy.status, "legacy-compatible");
  assert.equal(legacy.requiresUserReview, false);
  const unknown = providerApi.current.validateProjectCompatibility({ boundaryProviderId: "new-source", boundaryVersion: "IDN-ADM2-2030", highlights: { "gb-example": {} } });
  assert.equal(unknown.status, "review-required");
  assert.deepEqual(unknown.affectedStableRegionIds, ["gb-example"]);
  assert.equal(providerApi.current.getCrosswalk("IDN-ADM2-2030", providerApi.current.getVersion()).requiresReview, true);
});
