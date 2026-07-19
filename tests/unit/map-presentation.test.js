const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadMapPolicy() {
  const window = {};
  const sandbox = { window, Promise, Set, Map, Number, String, Object, Array, Math };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../assets/js/map.js"), "utf8"), sandbox);
  return window.IndonesiaMap;
}

test("adaptive geometry keeps overview lite and limits desktop detail to three province overlays", () => {
  const map = loadMapPolicy();
  assert.equal(map.geometryDetailForZoom(4.5, "detailed"), "lite");
  assert.equal(map.geometryDetailForZoom(7, "lite"), "detailed");
  assert.equal(map.geometryDetailForZoom(6.25, "detailed"), "detailed");
  assert.equal(map.geometryDetailForZoom(6.25, "lite"), "lite");
  assert.equal(map.geometryDetailForZoom(5.75, "detailed"), "lite");
  assert.deepEqual(Array.from(map.detailProvinceCodesForViewport({ zoom: 7, mobile: false, visibleProvinceCodes: ["31", "32", "36", "51"] })), ["31", "32", "36"]);
  assert.deepEqual(Array.from(map.detailProvinceCodesForViewport({ zoom: 8, mobile: true, visibleProvinceCodes: ["31"] })), []);
  assert.deepEqual(Array.from(map.detailProvinceCodesForViewport({ zoom: 5, mobile: true, selectedProvinceCode: "31", visibleProvinceCodes: ["31"] })), ["31"]);
});

test("labels are limited to selected, highlighted, or contextual regions", () => {
  const map = loadMapPolicy();
  const highlights = { highlighted: { color: "#087F73" } };
  const context = new Set(["context"]);
  assert.equal(map.labelPriority("selected", "selected", highlights, context, false), 3);
  assert.equal(map.labelPriority("highlighted", "selected", highlights, context, false), 2);
  assert.equal(map.labelPriority("context", "selected", highlights, context, false), 1);
  assert.equal(map.labelPriority("ordinary", "selected", highlights, context, false), 0);
  assert.equal(map.labelPriority("context", "selected", highlights, context, true), 0, "presentation view suppresses contextual labels");
});

test("canvas label modes prioritize selected and highlighted labels without pairwise collision work", () => {
  const map = loadMapPolicy();
  const anchors = [
    { id: "selected", name: "Selected", type: "Kabupaten", province: "Jawa Barat", priority: 1, lng: 107, lat: -6 },
    { id: "highlighted", name: "Highlighted", type: "Kabupaten", province: "Jawa Barat", priority: 1, lng: 107.01, lat: -6 },
    { id: "city", name: "Kota Bandung", type: "Kota", province: "Jawa Barat", priority: 3, lng: 107.02, lat: -6 },
    { id: "regency", name: "Kabupaten Bandung", type: "Kabupaten", province: "Jawa Barat", priority: 2, lng: 107.03, lat: -6 }
  ];
  const bounds = { minX: 106, minY: -7, maxX: 108, maxY: -5 };
  const highlights = { highlighted: { color: "#087F73" } };
  assert.deepEqual(map.labelCandidates(anchors, bounds, { zoom: 8, density: "minimal", selectedId: "selected", highlights, presentationView: false }).map((item) => item.id), ["selected", "highlighted"]);
  assert.deepEqual(map.labelCandidates(anchors, bounds, { zoom: 8, density: "balanced", selectedId: null, highlights: {}, presentationView: false }).map((item) => item.id), ["city", "regency"]);
  assert.equal(map.labelCandidates(anchors, bounds, { zoom: 8, density: "detailed", selectedId: null, highlights: {}, presentationView: false }).length, 4);
  assert.equal(map.labelCandidates(anchors, bounds, { zoom: 5, density: "detailed", selectedId: null, highlights: {}, presentationView: false })[0].text, "Jawa Barat");
  const placed = map.placeLabelsInGrid([
    { text: "Selected", x: 100, y: 100, fontSize: 12, rank: 100 },
    { text: "Nearby", x: 104, y: 100, fontSize: 12, rank: 10 },
    { text: "Far", x: 300, y: 100, fontSize: 12, rank: 10 }
  ]);
  assert.deepEqual(Array.from(placed, (item) => item.text), ["Selected", "Far"]);
  assert.equal(map.labelFontSize(5), 11);
  assert.equal(map.labelFontSize(9), 13);
});

test("viewport-scoped canvas labels handle pan, zoom, Jabodetabek density, mobile, and 519-region projects", () => {
  const map = loadMapPolicy();
  const anchorData = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../data/indonesia-adm2-label-anchors.json"), "utf8"));
  const anchors = anchorData.labels.map(map.normalizeLabelAnchor);
  const jakarta = { minX: 106.55, minY: -6.55, maxX: 107.25, maxY: -6.0 };
  const java = { minX: 105, minY: -8.5, maxX: 115, maxY: -5 };
  const dense = map.labelCandidates(anchors, jakarta, { zoom: 9, density: "detailed", selectedId: null, highlights: {}, presentationView: false });
  const panned = map.labelCandidates(anchors, java, { zoom: 8, density: "balanced", selectedId: null, highlights: {}, presentationView: false });
  assert.ok(dense.length > 1 && dense.length < 519, "Jabodetabek collision work is viewport scoped");
  assert.ok(panned.length > 0 && panned.length < 519, "a pan only considers the next viewport");
  const placed = map.placeLabelsInGrid(dense.map((anchor, index) => Object.assign(anchor, { x: 100 + (index % 6) * 18, y: 100 + Math.floor(index / 6) * 16, fontSize: 12 })));
  assert.ok(placed.length < dense.length, "dense labels are culled through the grid");
  const selected = dense[0];
  assert.deepEqual(Array.from(map.labelCandidates(anchors, jakarta, { zoom: 9, density: "minimal", selectedId: selected.id, highlights: {}, presentationView: false }), (item) => item.id), [selected.id], "mobile/minimal projects retain only explicit labels");
  assert.ok(map.labelCandidates(anchors, java, { zoom: 5, density: "detailed", selectedId: null, highlights: {}, presentationView: false }).length < 40, "overview uses province labels instead of ADM2 labels");
});
