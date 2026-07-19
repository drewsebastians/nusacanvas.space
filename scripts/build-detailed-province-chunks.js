const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const outputDir = path.join(dataDir, "detailed-provinces");
const labelArtifact = "data/indonesia-adm2-label-anchors.json";

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

function largestRing(geometry = {}) {
  const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.map((polygon) => polygon[0]) : [];
  return rings.filter((ring) => Array.isArray(ring) && ring.length > 2).sort((a, b) => Math.abs(ringArea(b)) - Math.abs(ringArea(a)))[0] || [];
}

function ringArea(ring) {
  return ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length] || point;
    return area + Number(point[0]) * Number(next[1]) - Number(next[0]) * Number(point[1]);
  }, 0) / 2;
}

function ringAnchor(ring) {
  const area = ringArea(ring);
  if (!area) return ring[0] || [0, 0];
  const centroid = ring.reduce((sum, point, index) => {
    const next = ring[(index + 1) % ring.length] || point;
    const cross = Number(point[0]) * Number(next[1]) - Number(next[0]) * Number(point[1]);
    sum[0] += (Number(point[0]) + Number(next[0])) * cross;
    sum[1] += (Number(point[1]) + Number(next[1])) * cross;
    return sum;
  }, [0, 0]);
  return [Number((centroid[0] / (6 * area)).toFixed(6)), Number((centroid[1] / (6 * area)).toFixed(6))];
}

function buildLabelAnchors({ write = true } = {}) {
  const collection = JSON.parse(fs.readFileSync(path.join(dataDir, "indonesia-adm2-simplified.geojson"), "utf8"));
  const labels = collection.features.map((feature) => {
    const p = feature.properties || {};
    const type = p.region_type === "Kota" ? "Kota" : p.region_type === "Kabupaten" ? "Kabupaten" : "Unresolved";
    const area = Number(p.area_sqkm || 0);
    const priority = type === "Kota" ? 3 : type === "Kabupaten" && area > 0 && area <= 1500 ? 2 : type === "Kabupaten" ? 1 : 0;
    const anchor = ringAnchor(largestRing(feature.geometry));
    return [String(p.region_id), String(p.display_name || p.region_name || "Region"), type, String(p.province_name || ""), priority, anchor[0], anchor[1]];
  });
  if (new Set(labels.map((label) => label[0])).size !== 519) throw new Error("Label anchors do not preserve all stable region IDs.");
  const text = `${JSON.stringify({ schemaVersion: "nusacanvas.adm2-label-anchors.v1", labels })}\n`;
  if (write) fs.writeFileSync(path.join(root, labelArtifact), text);
  return { featureCount: labels.length, artifact: labelArtifact, sha256: digest(text) };
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
  return { index, indexArtifact, indexSha256: digest(indexText), labelAnchors: buildLabelAnchors({ write }) };
}

if (require.main === module) {
  const result = buildProvinceChunks();
  console.log(`Built ${result.index.chunkCount} detailed province chunks (${result.index.featureCount} stable ADM2 IDs).`);
  console.log(`${result.indexArtifact} sha256 ${result.indexSha256}`);
}

module.exports = { buildProvinceChunks, buildMesh, buildLabelAnchors };
