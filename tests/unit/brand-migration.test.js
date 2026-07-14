const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const brand = require(path.resolve(__dirname, "..", "..", "assets", "js", "brand-config.js"));
globalThis.ProductBrand = brand;
const migration = require(path.resolve(__dirname, "..", "..", "assets", "js", "brand-migration.js"));
delete globalThis.ProductBrand;

test("migrates exact Batch 1 and Batch 2 defaults without mutating the source", () => {
  const source = {
    schemaVersion: "1.0",
    title: "Peta Sorotan Wilayah Indonesia",
    exportMeta: { filenameSlug: "peta-warna-indonesia", source: "User source" },
    highlights: {}
  };

  const result = migration.migrateProject(source);

  assert.equal(result.project.title, brand.defaults.projectTitle);
  assert.equal(result.project.exportMeta.filenameSlug, brand.defaults.exportFilenamePrefix);
  assert.equal(result.project.exportMeta.source, "User source");
  assert.equal(source.title, "Peta Sorotan Wilayah Indonesia");
  assert.equal(source.exportMeta.filenameSlug, "peta-warna-indonesia");
  assert.deepEqual(result.report.migratedFields, ["title", "exportMeta.filenameSlug"]);
  assert.deepEqual(result.report.unresolvedEntries, []);
  assert.deepEqual(result.report.droppedEntries, []);
});

test("migrates the Prompt 2 neutral defaults to NusaCanvas defaults", () => {
  const result = migration.migrateProject({
    schemaVersion: "1.1",
    title: "Indonesia region map",
    exportMeta: { filenameSlug: "indonesia-region-map" }
  });

  assert.equal(result.report.status, "migrated");
  assert.equal(result.project.title, "NusaCanvas Indonesia region map");
  assert.equal(result.project.exportMeta.filenameSlug, "nusacanvas-indonesia-map");
});

test("retains user-authored titles and filenames even when they mention an old identity", () => {
  const result = migration.migrateProject({
    schemaVersion: "1.1",
    title: "Mapnesia client archive",
    exportMeta: { filenameSlug: "mapnesia-client-archive" }
  });

  assert.equal(result.report.status, "not-needed");
  assert.equal(result.project.title, "Mapnesia client archive");
  assert.equal(result.project.exportMeta.filenameSlug, "mapnesia-client-archive");
  assert.deepEqual(result.report.migratedFields, []);
  assert.deepEqual(result.report.droppedEntries, []);
});

test("repeat execution is idempotent", () => {
  const first = migration.migrateProject({
    schemaVersion: "1.0",
    title: "Peta Warna Wilayah Indonesia",
    exportMeta: { filenameSlug: "peta-wilayah-indonesia" }
  });
  const second = migration.migrateProject(first.project);

  assert.equal(first.report.status, "migrated");
  assert.equal(second.report.status, "not-needed");
  assert.deepEqual(second.project, first.project);
});

test("copy preserves dangerous own keys so the project sanitizer can reject them", () => {
  const source = JSON.parse('{"schemaVersion":"1.1","title":"Indonesia region map","exportMeta":{"filenameSlug":"indonesia-region-map","__proto__":{"nested":true}},"__proto__":{"polluted":true}}');
  const result = migration.migrateProject(source);

  assert.equal(Object.prototype.hasOwnProperty.call(result.project, "__proto__"), true);
  assert.equal(Object.prototype.hasOwnProperty.call(result.project.exportMeta, "__proto__"), true);
  assert.equal({}.polluted, undefined);
});
