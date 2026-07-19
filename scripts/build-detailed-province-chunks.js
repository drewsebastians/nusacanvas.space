const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const outputDir = path.join(dataDir, "detailed-provinces");

function digest(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function coordinateKey(point) {
  return `${Number(point[0])},${Number(point[1])}`;
}

function addRingSegments(ring, seen, segments, stats) {
  for (let index = 1; index < ring.length; index += 1) {
    const start = ring[index - 1];
    const end = ring[index];
    const startKey = coordinateKey(start);
    const endKey = coordinateKey(end);
    if (startKey === endKey) continue;
    stats.inputSegments += 1;
    const key = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
    if (seen.has(key)) {
      stats.sharedSegments += 1;
      continue;
    }
    seen.add(key);
    segments.push([[start[1], start[0]], [end[1], end[0]]]);
  }
}

function buildMesh(features) {
  const seen = new Set();
  const segments = [];
  const stats = { inputSegments: 0, uniqueSegments: 0, sharedSegments: 0 };
  features.forEach((feature) => {
    const geometry = feature.geometry || {};
    if (geometry.type === "Polygon") geometry.coordinates.forEach((ring) => addRingSegments(ring, seen, segments, stats));
    if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => addRingSegments(ring, seen, segments, stats)));
  });
  stats.uniqueSegments = segments.length;
  return { segments, stats };
}

function createChunks() {
  const lite = JSON.parse(fs.readFileSync(path.join(dataDir, "indonesia-adm2-simplified.geojson"), "utf8"));
  const detailed = JSON.parse(fs.readFileSync(path.join(dataDir, "indonesia-adm2-detailed.geojson"), "utf8"));
  const liteBySourceId = new Map(lite.features.map((feature) => [String(feature.properties.geometry_source_id), feature]));
  if (liteBySourceId.size !== 519 || detailed.features.length !== 519) throw new Error("Approved ADM2 source counts changed; province chunks were not generated.");
  const groups = new Map();
  detailed.features.forEach((detailFeature) => {
    const base = liteBySourceId.get(String(detailFeature.properties && detailFeature.properties.shapeID));
    if (!base) throw new Error("Detailed geometry cannot be matched to a stable ADM2 ID; province chunks were not generated.");
    const provinceCode = /^[0-9]{2}$/.test(String(base.properties.province_code || ""))
      ? String(base.properties.province_code)
      : "__unresolved";
    const feature = { type: "Feature", properties: Object.assign({}, base.properties), geometry: detailFeature.geometry };
    if (!groups.has(provinceCode)) groups.set(provinceCode, []);
    groups.get(provinceCode).push(feature);
  });
  const seenIds = new Set(Array.from(groups.values()).flat().map((feature) => feature.properties.region_id));
  if (seenIds.size !== 519) throw new Error("Province chunks do not preserve all stable region IDs.");
  return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })).map(([provinceCode, features]) => ({
    provinceCode,
    provinceName: features[0].properties.province_name || "Province not linked",
    features
  }));
}

function buildProvinceChunks({ write = true } = {}) {
  const chunks = createChunks();
  const entries = chunks.map(({ provinceCode, provinceName, features }) => {
    const artifact = `data/detailed-provinces/${provinceCode}.geojson`;
    const collection = {
      type: "FeatureCollection",
      features,
      mesh: buildMesh(features)
    };
    const text = `${JSON.stringify(collection)}\n`;
    if (write) {
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(root, artifact), text);
    }
    return { provinceCode, provinceName, featureCount: features.length, artifact, sha256: digest(text) };
  });
  const index = {
    schemaVersion: "nusacanvas.detailed-province-index.v1",
    boundaryVersion: "IDN-ADM2-2020-geoboundaries-22746128",
    featureCount: 519,
    chunkCount: entries.length,
    chunks: entries
  };
  const indexText = `${JSON.stringify(index, null, 2)}\n`;
  const indexArtifact = "data/indonesia-adm2-detailed-provinces-index.json";
  if (write) fs.writeFileSync(path.join(root, indexArtifact), indexText);
  return { index, indexArtifact, indexSha256: digest(indexText) };
}

if (require.main === module) {
  const result = buildProvinceChunks();
  console.log(`Built ${result.index.chunkCount} detailed province chunks (${result.index.featureCount} stable ADM2 IDs).`);
  console.log(`${result.indexArtifact} sha256 ${result.indexSha256}`);
}

module.exports = { buildProvinceChunks, buildMesh };
