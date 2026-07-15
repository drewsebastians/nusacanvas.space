const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadExport() {
  const window = {
    ProductBrand: {
      productName: "NusaCanvas",
      defaults: { exportFilenamePrefix: "nusacanvas-map", projectTitle: "NusaCanvas map" }
    }
  };
  const sandbox = { window, Map, Set, Number, String, Object, Array, Math, JSON, TextEncoder, Blob, URL, Image: class {}, navigator: {} };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, "../../assets/js/export.js"), "utf8"), sandbox);
  return window.MapExport;
}

function feature(id, coordinates) {
  return {
    type: "Feature",
    properties: { region_id: id, display_name: id },
    geometry: { type: "Polygon", coordinates: [coordinates] }
  };
}

test("SVG draws exact shared boundaries once while leaving stable feature IDs untouched", () => {
  const mapExport = loadExport();
  const features = [
    feature("west", [[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]),
    feature("east", [[1, 0], [2, 0], [2, 1], [1, 1], [1, 0]])
  ];
  const before = JSON.parse(JSON.stringify(features));
  const svg = mapExport.buildSvg(features, {
    title: "Shared edge test",
    highlights: { west: { color: "#4472C4" } },
    legend: [],
    legendVisible: false,
    groupNames: {},
    groupMeta: {}
  }, { labels: false, selectedId: "west", ratio: "1:1" });

  assert.equal((svg.match(/id="boundary-mesh"/g) || []).length, 1);
  assert.equal((svg.match(/data-region-fill=/g) || []).length, 2);
  assert.equal((svg.match(/stroke="none"/g) || []).length, 2);
  assert.match(svg, /data-selected-outline="west"/);
  assert.match(svg, /stroke-linejoin="round" stroke-linecap="round"/);
  const mesh = svg.match(/id="boundary-mesh"[^>]*d="([^"]+)"/);
  assert.ok(mesh);
  assert.equal((mesh[1].match(/ L/g) || []).length, 7, "two adjacent squares have seven unique boundary segments");
  assert.deepEqual(features, before);
});
