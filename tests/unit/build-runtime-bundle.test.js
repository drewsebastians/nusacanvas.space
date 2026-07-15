const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");

test("production build bundles brand modules in dependency order without adding startup requests", () => {
  assert.equal(fs.existsSync(path.join(root, "dist/assets/js/app.js")), true, "Run the production build before this test.");
  const index = fs.readFileSync(path.join(root, "dist/index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "dist/assets/js/app.js"), "utf8");
  const projectStorage = fs.readFileSync(path.join(root, "dist/assets/js/project-storage.js"), "utf8");
  const contact = fs.readFileSync(path.join(root, "dist/contact/index.html"), "utf8");

  assert.doesNotMatch(index, /assets\/js\/(?:brand-config|brand-migration|boundary-provider|product-content|workspace-shell)\.js/);
  const earlyMarkers = [
    "root.ProductBrand = config",
    "root.ProductBrandMigration = api",
    "root.NusaCanvasBoundaryProvider = api",
    "const brand = window.ProductBrand"
  ];
  const earlyPositions = earlyMarkers.map((marker) => projectStorage.indexOf(marker));
  earlyPositions.forEach((position, index) => assert.notEqual(position, -1, `Missing early bundle marker: ${earlyMarkers[index]}`));
  assert.deepEqual(earlyPositions, [...earlyPositions].sort((left, right) => left - right));

  const appMarkers = [
    "root.ProductContent = content",
    "const brand = window.ProductBrand"
  ];
  const appPositions = appMarkers.map((marker) => app.indexOf(marker));
  appPositions.forEach((position, index) => assert.notEqual(position, -1, `Missing app bundle marker: ${appMarkers[index]}`));
  assert.deepEqual(appPositions, [...appPositions].sort((left, right) => left - right));

  assert.match(contact, /\.\.\/assets\/js\/brand-config\.js/);
  assert.equal(fs.existsSync(path.join(root, "dist/assets/js/brand-config.js")), true);
  assert.equal(fs.existsSync(path.join(root, "dist/assets/js/brand-migration.js")), false);
  assert.equal(fs.existsSync(path.join(root, "dist/assets/js/boundary-provider.js")), true);
  assert.equal(fs.existsSync(path.join(root, "dist/assets/js/workspace-shell.js")), true);
  assert.equal(fs.existsSync(path.join(root, "dist/assets/js/product-content.js")), false);
});
