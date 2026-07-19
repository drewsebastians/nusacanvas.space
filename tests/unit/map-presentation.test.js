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
