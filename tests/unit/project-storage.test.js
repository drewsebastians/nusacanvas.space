const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadProjectStorage(localStorageOverrides = {}) {
  const file = path.resolve(__dirname, "..", "..", "assets", "js", "project-storage.js");
  const sandbox = {
    Blob: function Blob() {},
    Date,
    JSON,
    Map,
    Set,
    String,
    URL: { createObjectURL: () => "blob:test", revokeObjectURL: () => {} },
    document: { createElement: () => ({ click() {} }) },
    localStorage: {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {},
      ...localStorageOverrides
    },
    window: {}
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox.window.ProjectStorage;
}

function sampleFeature(id = "known-id", matchStatus = "matched_unique_name") {
  return {
    properties: {
      region_id: id,
      geometry_source_id: "22746128BTEST",
      match_status: matchStatus
    }
  };
}

test("sanitizeProject migrates legacy highlights without silently dropping unknown IDs", () => {
  const storage = loadProjectStorage();
  const adapter = storage.createRegionAdapter([sampleFeature()]);
  const project = storage.sanitizeProject({
    schemaVersion: "1.0",
    title: "A".repeat(120),
    highlights: {
      "known-id": { color: "#4472C4", category: "Category", value: "Value" },
      "unknown-id": { color: "#E74C3C" }
    },
    legend: [{ label: "Good", color: "#70AD47" }],
    groupNames: { "#4472c4": "Blue group" },
    groupMeta: { "#4472c4": { category: "Meta", value: "100" } }
  }, adapter);

  assert.equal(project.schemaVersion, "1.1");
  assert.equal(project.registryVersion, storage.REGISTRY_VERSION);
  assert.equal(project.title.length, 90);
  assert.deepEqual(Object.keys(project.highlights), ["known-id"]);
  assert.deepEqual(Object.keys(project.unresolvedHighlights), ["unknown-id"]);
  assert.equal(project.regionRefs["known-id"].canonicalRegionId, "idn-adm2-gb-22746128btest");
  assert.equal(project.migrationReport.summary.mapped, 1);
  assert.equal(project.migrationReport.summary.missing, 1);
  assert.equal(project.migrationReport.summary.silentLoss, false);
  assert.equal(project.groupNames["#4472C4"], "Blue group");
  assert.equal(project.groupMeta["#4472C4"].value, "100");
});

test("sanitizeProject keeps ambiguous geometry highlights but marks them for review", () => {
  const storage = loadProjectStorage();
  const adapter = storage.createRegionAdapter([sampleFeature("ambiguous-id", "ambiguous_name")]);
  const project = storage.sanitizeProject({
    schemaVersion: "1.0",
    highlights: {
      "ambiguous-id": { color: "#4472C4" }
    }
  }, adapter);

  assert.equal(project.highlights["ambiguous-id"].color, "#4472C4");
  assert.equal(project.regionRefs["ambiguous-id"].migrationStatus, "ambiguous_metadata");
  assert.equal(project.migrationReport.summary.ambiguous, 1);
  assert.equal(project.migrationReport.requiresUserReview, true);
});

test("buildProject stores schema, boundary, registry, and canonical region references", () => {
  const storage = loadProjectStorage();
  const features = [sampleFeature()];
  const project = storage.buildProject({
    title: "Project",
    features,
    highlights: { "known-id": { color: "#4472C4" } },
    legend: [],
    legendVisible: true,
    legendPosition: "bottom-right",
    groupNames: {},
    groupMeta: {},
    importCorrections: {
      row_1: { action: "resolve", targetId: "known-id", registryVersion: storage.REGISTRY_VERSION, decidedAt: "2026-07-13T00:00:00.000Z" }
    },
    workflowStage: "visualize",
    uiMode: "advanced",
    importRows: [{ rowId: "row-1", rowNumber: 2, record: { regionName: "Surabaya", province: "Jawa Timur" }, matchedId: "known-id", matchedName: "Surabaya - Jawa Timur", matchStatus: "exact-code", errors: [], warnings: [] }],
    visualization: { version: "IDN-VIS-v1", paletteVersion: "IDN-PALETTE-v1", method: "equal-interval", assignments: { "known-id": { classKey: "0", color: "#4472C4" } }, legend: [{ label: "0–10", color: "#4472C4", key: "0" }] },
    exportMeta: { subtitle: "Sub", source: "Source", period: "2025", footnote: "Foot", legendTitle: "Legend", filenameSlug: "safe-file" },
    exportSettings: { ratio: "a3", extent: "current-view", labels: false, transparent: true, highDetail: true, pngSize: "2560x1440" },
    manualHighlights: { "known-id": { color: "#70AD47", category: "Manual", value: "Override" } }
  }, storage.createRegionAdapter(features));

  assert.equal(project.schemaVersion, "1.1");
  assert.equal(project.boundaryVersion, "IDN-ADM2-2020-geoboundaries-22746128");
  assert.equal(project.registryVersion, "IDN-ADM-REGISTRY-v1-2025-06-23");
  assert.equal(project.regionRefs["known-id"].legacyRegionId, "known-id");
  assert.equal(project.importCorrections.row_1.targetId, "known-id");
  assert.equal(project.workflowStage, "visualize");
  assert.equal(project.uiMode, "advanced");
  assert.equal(project.importRows[0].matchedId, "known-id");
  assert.equal(project.visualization.method, "equal-interval");
  assert.equal(project.exportMeta.filenameSlug, "safe-file");
  assert.equal(project.manualHighlights["known-id"].color, "#70AD47");
  assert.equal(project.exportSettings.ratio, "a3");
  assert.equal(project.exportSettings.pngSize, "2560x1440");
});

test("sanitizeProject keeps valid manual highlights and rejects unsafe export preferences", () => {
  const storage = loadProjectStorage();
  const adapter = storage.createRegionAdapter([sampleFeature()]);
  const project = storage.sanitizeProject({
    schemaVersion: "1.1",
    highlights: {},
    manualHighlights: { "known-id": { color: "#ED7D31", category: "Pilihan manual" } },
    exportSettings: { ratio: "not-a-ratio", extent: "outside", labels: "yes", transparent: true, highDetail: true, pngSize: "huge" }
  }, adapter);

  assert.equal(project.manualHighlights["known-id"].color, "#ED7D31");
  assert.deepEqual(JSON.parse(JSON.stringify(project.exportSettings)), { ratio: "16:9", extent: "national", labels: true, transparent: true, highDetail: true, pngSize: "1920x1080" });
});

test("sanitizeProject keeps only registry-current import corrections", () => {
  const storage = loadProjectStorage();
  const project = storage.sanitizeProject({
    schemaVersion: "1.1",
    highlights: {},
    importCorrections: {
      current: { action: "ignore", registryVersion: storage.REGISTRY_VERSION, decidedAt: "2026-07-13T00:00:00.000Z" },
      stale: { action: "resolve", targetId: "known-id", registryVersion: "old" }
    }
  }, storage.createRegionAdapter([sampleFeature()]));

  assert.deepEqual(Object.keys(project.importCorrections), ["current"]);
  assert.equal(project.importCorrections.current.action, "ignore");
});

test("loadAutosave migrates legacy autosave through the same safe path", () => {
  const raw = JSON.stringify({
    schemaVersion: "1.0",
    highlights: {
      "known-id": { color: "#70AD47" }
    }
  });
  const storage = loadProjectStorage({ getItem: () => raw });
  const adapter = storage.createRegionAdapter([sampleFeature()]);
  const project = storage.loadAutosave(adapter);

  assert.equal(project.schemaVersion, "1.1");
  assert.equal(project.highlights["known-id"].color, "#70AD47");
  assert.equal(project.migrationReport.summary.mapped, 1);
});

test("sanitizeProject rejects unsupported schema versions", () => {
  const storage = loadProjectStorage();
  assert.throws(() => storage.sanitizeProject({ schemaVersion: "9.9", highlights: {} }, new Set()), /Versi file proyek/);
});

test("sanitizeProject rejects invalid colors in valid region highlights", () => {
  const storage = loadProjectStorage();
  assert.throws(() => storage.sanitizeProject({
    schemaVersion: "1.0",
    highlights: { "known-id": { color: "javascript:alert(1)" } }
  }, new Set(["known-id"])), /warna tidak valid/);
});

test("sanitizeProject rejects oversized highlight payloads", () => {
  const storage = loadProjectStorage();
  const highlights = {};
  for (let index = 0; index < 2001; index += 1) {
    highlights[`id-${index}`] = { color: "#4472C4" };
  }
  assert.throws(() => storage.sanitizeProject({ schemaVersion: "1.0", highlights }, new Set()), /terlalu besar/);
});

test("sanitizeProject rejects prototype-pollution structures", () => {
  const storage = loadProjectStorage();
  const polluted = JSON.parse('{"schemaVersion":"1.0","highlights":{},"__proto__":{"polluted":true}}');
  assert.throws(() => storage.sanitizeProject(polluted, new Set()), /tidak aman/);
});

test("isColor only accepts six-digit hex colors", () => {
  const storage = loadProjectStorage();
  assert.equal(storage.isColor("#abcdef"), true);
  assert.equal(storage.isColor("#ABCDEF"), true);
  assert.equal(storage.isColor("#abcd"), false);
  assert.equal(storage.isColor("red"), false);
});
