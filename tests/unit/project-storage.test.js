const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const defaultProductBrand = require(path.resolve(__dirname, "..", "..", "assets", "js", "brand-config.js"));
globalThis.ProductBrand = defaultProductBrand;
const defaultBrandMigration = require(path.resolve(__dirname, "..", "..", "assets", "js", "brand-migration.js"));
delete globalThis.ProductBrand;

function loadProjectStorage(localStorageOverrides = {}, productBrand = defaultProductBrand) {
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
    window: { ProductBrand: productBrand, ProductBrandMigration: defaultBrandMigration }
  };
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
  return sandbox.window.ProjectStorage;
}

function fixture(name) {
  return JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "fixtures", "brand-migration", name), "utf8"));
}

function memoryStorage(initial = {}, options = {}) {
  const values = new Map(Object.entries(initial));
  const writeCounts = new Map();
  let remainingTargetWriteFailures = Number(options.failTargetWrites || 0);
  let remainingMigrationStateWriteFailures = Number(options.failMigrationStateWrites || 0);
  let remainingMigrationStateReadFailures = Number(options.failMigrationStateReads || 0);
  let remainingTargetReadFailures = Number(options.failTargetReads || 0);
  let remainingRecoveryWriteFailures = Number(options.failRecoveryWrites || 0);
  return {
    getItem(key) {
      if (key === "indonesia-region-map-storage-migration-v1" && remainingMigrationStateReadFailures > 0) {
        remainingMigrationStateReadFailures -= 1;
        throw new Error("simulated migration marker read failure");
      }
      if (key === "indonesia-region-map-autosave-v2" && remainingTargetReadFailures > 0) {
        remainingTargetReadFailures -= 1;
        throw new Error("simulated target read failure");
      }
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      writeCounts.set(key, (writeCounts.get(key) || 0) + 1);
      if (key === "indonesia-region-map-autosave-v2" && remainingTargetWriteFailures > 0) {
        remainingTargetWriteFailures -= 1;
        throw new Error("simulated quota failure");
      }
      if (key === "indonesia-region-map-storage-migration-v1" && remainingMigrationStateWriteFailures > 0) {
        remainingMigrationStateWriteFailures -= 1;
        throw new Error("simulated migration marker failure");
      }
      if (key === "indonesia-region-map-autosave-recovery-v1" && remainingRecoveryWriteFailures > 0) {
        remainingRecoveryWriteFailures -= 1;
        throw new Error("simulated recovery backup failure");
      }
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    value(key) {
      return values.get(key);
    },
    writes(key) {
      return writeCounts.get(key) || 0;
    }
  };
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

function autosaveState(storage) {
  const features = [sampleFeature()];
  return {
    title: "Synthetic safe state",
    features,
    highlights: { "known-id": { color: "#4472C4", category: "Safe", value: "1" } },
    manualHighlights: {},
    unresolvedHighlights: {},
    legend: [],
    legendVisible: true,
    legendPosition: "bottom-right",
    groupNames: {},
    groupMeta: {},
    importCorrections: {},
    workflowStage: "visualize",
    uiMode: "basic",
    importRows: [],
    visualization: null,
    exportMeta: {},
    exportSettings: {},
    migrationReport: null,
    storage
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

test("saved unresolved and manual highlights survive another project migration", () => {
  const storage = loadProjectStorage();
  const adapter = storage.createRegionAdapter([sampleFeature()]);
  const project = storage.sanitizeProject({
    schemaVersion: "1.1",
    highlights: { "known-id": { color: "#4472C4" } },
    unresolvedHighlights: { "retired-id": { color: "#E74C3C", category: "Review" } },
    manualHighlights: { "manual-retired-id": { color: "#FFC000", category: "Manual review" } },
    regionRefs: {
      "known-id": { canonicalRegionId: "idn-adm2-gb-22746128btest" }
    }
  }, adapter);

  assert.equal(project.highlights["known-id"].color, "#4472C4");
  assert.equal(project.unresolvedHighlights["retired-id"].color, "#E74C3C");
  assert.equal(project.unresolvedHighlights["manual-retired-id"].color, "#FFC000");
  assert.equal(project.migrationReport.summary.missing, 2);
  assert.equal(project.migrationReport.summary.silentLoss, false);
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

test("project defaults use central brand configuration", () => {
  const branded = loadProjectStorage({}, {
    app: { version: "1.0.0" },
    defaults: {
      projectTitle: "NusaCanvas Indonesia region map",
      exportFilenamePrefix: "nusacanvas-indonesia-map"
    }
  });
  const brandedProject = branded.sanitizeProject({ schemaVersion: "1.1", highlights: {}, exportMeta: {} }, new Set());
  assert.equal(brandedProject.title, "NusaCanvas Indonesia region map");
  assert.equal(brandedProject.exportMeta.filenameSlug, "nusacanvas-indonesia-map");

  const defaults = loadProjectStorage();
  const defaultProject = defaults.sanitizeProject({ schemaVersion: "1.1", highlights: {}, exportMeta: {} }, new Set());
  assert.equal(defaultProject.title, defaultProductBrand.defaults.projectTitle);
  assert.equal(defaultProject.exportMeta.filenameSlug, defaultProductBrand.defaults.exportFilenamePrefix);
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
  assert.equal(project.migrationReport.summary.unsupported, 1);
  assert.equal(project.migrationReport.requiresUserReview, true);
});

test("project round-trip preserves more than twenty valid legend items without silent truncation", () => {
  const storage = loadProjectStorage();
  const legend = Array.from({ length: 25 }, (_, index) => ({ label: `Group ${index + 1}`, color: "#4472C4" }));
  const project = storage.sanitizeProject({ schemaVersion: "1.1", highlights: {}, legend }, new Set());

  assert.equal(project.legend.length, 25);
  assert.equal(project.legend[24].label, "Group 25");
  assert.equal(project.migrationReport.summary.silentLoss, false);
});

test("project rejects legend collections above the documented safe limit instead of truncating", () => {
  const storage = loadProjectStorage();
  const legend = Array.from({ length: storage.MAX_LEGEND_ITEMS + 1 }, () => ({ label: "Group", color: "#4472C4" }));
  assert.throws(() => storage.sanitizeProject({ schemaVersion: "1.1", highlights: {}, legend }, new Set()), /too many legend items/i);
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

test("legacy browser autosave migrates to the neutral key only after validation", () => {
  const legacy = fixture("old-autosave-v1.json");
  const browserStorage = memoryStorage({
    "peta-warna-indonesia-autosave-v1": JSON.stringify(legacy)
  });
  const storage = loadProjectStorage(browserStorage);
  const result = storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()]));

  assert.equal(storage.STORAGE_KEY, "indonesia-region-map-autosave-v2");
  assert.equal(result.report.status, "migrated");
  assert.equal(result.report.sourceKey, "peta-warna-indonesia-autosave-v1");
  assert.equal(result.report.targetKey, storage.STORAGE_KEY);
  assert.equal(result.report.backupStatus, "source-retained");
  assert.equal(result.report.sourceRetained, true);
  assert.ok(result.report.migratedFields.includes("storageKey"));
  assert.deepEqual(Array.from(result.report.droppedEntries), []);
  assert.ok(result.report.retainedFields.includes("boundaryVersion"));
  assert.equal(result.project.boundaryVersion, storage.BOUNDARY_VERSION);
  assert.equal(result.project.regionRefs["known-id"].canonicalRegionId, "idn-adm2-gb-22746128btest");
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), JSON.stringify(legacy));
  assert.equal(JSON.parse(browserStorage.value(storage.STORAGE_KEY)).title, "Quarterly coverage map");
});

test("browser autosave migration is idempotent and does not rewrite a valid target", () => {
  const legacyRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({ "peta-warna-indonesia-autosave-v1": legacyRaw });
  const storage = loadProjectStorage(browserStorage);
  const adapter = storage.createRegionAdapter([sampleFeature()]);

  const first = storage.migrateLegacyAutosave(adapter);
  const targetAfterFirstRun = browserStorage.value(storage.STORAGE_KEY);
  const targetWritesAfterFirstRun = browserStorage.writes(storage.STORAGE_KEY);
  const second = storage.migrateLegacyAutosave(adapter);

  assert.equal(first.report.status, "migrated");
  assert.equal(second.report.status, "already-current");
  assert.equal(second.report.sourceRetained, true);
  assert.equal(second.report.recoverySourceKey, "peta-warna-indonesia-autosave-v1");
  assert.deepEqual(Array.from(second.report.droppedEntries), []);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), targetAfterFirstRun);
  assert.equal(browserStorage.writes(storage.STORAGE_KEY), targetWritesAfterFirstRun);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), legacyRaw);
});

test("declining a valid current autosave defers replacement until a verified safety copy exists", () => {
  const currentRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({ "indonesia-region-map-autosave-v2": currentRaw });
  const storage = loadProjectStorage(browserStorage);

  assert.equal(storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()])).report.status, "already-current");
  assert.equal(storage.deferCurrentAutosaveReplacement(), true);
  assert.equal(storage.getStorageMigrationReport().protectCurrentTargetBeforeWrite, true);
  assert.equal(storage.autosave(autosaveState(storage)), true);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), currentRaw);
  assert.equal(storage.getStorageMigrationReport().protectCurrentTargetBeforeWrite, false);
  assert.equal(JSON.parse(browserStorage.value(storage.STORAGE_KEY)).title, "Synthetic safe state");
});

test("a different occupied recovery slot blocks replacement of a declined valid autosave", () => {
  const currentRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const occupiedRaw = "older-replaced-copy";
  const browserStorage = memoryStorage({
    "indonesia-region-map-autosave-v2": currentRaw,
    "indonesia-region-map-autosave-recovery-v1": occupiedRaw
  });
  const storage = loadProjectStorage(browserStorage);

  storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()]));
  assert.equal(storage.deferCurrentAutosaveReplacement(), true);
  assert.equal(storage.autosave(autosaveState(storage)), false);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), currentRaw);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), occupiedRaw);
  assert.equal(storage.getStorageMigrationReport().protectCurrentTargetBeforeWrite, true);
});

test("autosave fails closed while the current key remains unreadable", () => {
  const currentRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({ "indonesia-region-map-autosave-v2": currentRaw }, { failTargetReads: 2 });
  const storage = loadProjectStorage(browserStorage);

  assert.equal(storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()])).report.status, "failed-read");
  assert.equal(storage.autosave(autosaveState(storage)), false);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), currentRaw);
});

test("clearing the current autosave does not resurrect legacy data and retained backup can be recovered explicitly", () => {
  const legacyRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({ "peta-warna-indonesia-autosave-v1": legacyRaw });
  const storage = loadProjectStorage(browserStorage);
  const adapter = storage.createRegionAdapter([sampleFeature()]);

  assert.equal(storage.migrateLegacyAutosave(adapter).report.status, "migrated");
  assert.equal(storage.clearAutosave(), true);
  assert.equal(storage.loadAutosave(adapter), null);
  assert.equal(storage.getStorageMigrationReport().status, "cleared");
  assert.equal(storage.getStorageMigrationReport().sourceRetained, true);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), legacyRaw);

  const recovered = storage.recoverRetainedAutosave(adapter);
  assert.equal(recovered.report.status, "recovered-retained-source");
  assert.equal(recovered.project.title, "Quarterly coverage map");
  assert.equal(JSON.parse(browserStorage.value(storage.STORAGE_KEY)).title, "Quarterly coverage map");
  assert.equal(storage.clearRetainedLegacyAutosave(), true);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), undefined);
});

test("clear keeps the current backup when the no-resurrection marker cannot be written", () => {
  const currentRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({
    "indonesia-region-map-autosave-v2": currentRaw
  }, { failMigrationStateWrites: 1 });
  const storage = loadProjectStorage(browserStorage);

  assert.equal(storage.clearAutosave(), false);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), currentRaw);
});

test("a corrupt clear marker fails closed and never resurrects the retained source automatically", () => {
  const legacyRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({
    "peta-warna-indonesia-autosave-v1": legacyRaw,
    "indonesia-region-map-storage-migration-v1": "{corrupt-marker"
  });
  const storage = loadProjectStorage(browserStorage);
  const adapter = storage.createRegionAdapter([sampleFeature()]);

  const blocked = storage.migrateLegacyAutosave(adapter);
  assert.equal(blocked.project, null);
  assert.equal(blocked.report.status, "failed-migration-state");
  assert.equal(blocked.report.sourceRetained, true);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), undefined);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), legacyRaw);
});

test("an unreadable clear marker fails closed while the retained source remains recoverable", () => {
  const legacyRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({
    "peta-warna-indonesia-autosave-v1": legacyRaw,
    "indonesia-region-map-storage-migration-v1": JSON.stringify({ migrationVersion: "1", state: "cleared" })
  }, { failMigrationStateReads: 1 });
  const storage = loadProjectStorage(browserStorage);

  const blocked = storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()]));
  assert.equal(blocked.project, null);
  assert.equal(blocked.report.status, "failed-migration-state");
  assert.equal(browserStorage.value(storage.STORAGE_KEY), undefined);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), legacyRaw);
});

test("an invalid current target without a legacy source stays downloadable and is copied before autosave", () => {
  const corruptTarget = "{unreadable-current";
  const browserStorage = memoryStorage({ "indonesia-region-map-autosave-v2": corruptTarget });
  const storage = loadProjectStorage(browserStorage);

  const blocked = storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()]));
  assert.equal(blocked.project, null);
  assert.equal(blocked.report.status, "failed-validation");
  assert.equal(storage.hasUnreadableBackup(storage.STORAGE_KEY), true);
  assert.equal(storage.downloadUnreadableBackup(storage.STORAGE_KEY), true);

  assert.equal(storage.autosave(autosaveState(storage)), true);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), corruptTarget);
  assert.equal(storage.hasRetainedTargetBackup(), true);
  assert.equal(storage.hasUnreadableBackup(storage.STORAGE_KEY), false);
  assert.doesNotThrow(() => JSON.parse(browserStorage.value(storage.STORAGE_KEY)));
});

test("a zero-byte invalid target is retained byte-for-byte before replacement", () => {
  const browserStorage = memoryStorage({ "indonesia-region-map-autosave-v2": "" });
  const storage = loadProjectStorage(browserStorage);

  assert.equal(storage.migrateLegacyAutosave(new Set()).report.status, "failed-validation");
  assert.equal(storage.prepareCurrentTargetReplacement(), true);
  assert.equal(storage.hasRetainedTargetBackup(), true);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), "");
  assert.equal(storage.downloadRetainedTargetBackup(), true);
  assert.equal(storage.clearRetainedTargetBackup(), true);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), undefined);
});

test("a corrupt target is preserved until explicit recovery and then kept byte-for-byte", () => {
  const legacyRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const corruptTarget = "{not-json";
  const browserStorage = memoryStorage({
    "indonesia-region-map-autosave-v2": corruptTarget,
    "peta-warna-indonesia-autosave-v1": legacyRaw
  });
  const storage = loadProjectStorage(browserStorage);
  const adapter = storage.createRegionAdapter([sampleFeature()]);
  const blocked = storage.migrateLegacyAutosave(adapter);

  assert.equal(blocked.project, null);
  assert.equal(blocked.report.status, "failed-invalid-target");
  assert.equal(blocked.report.backupStatus, "invalid-target-and-source-retained");
  assert.equal(browserStorage.value(storage.STORAGE_KEY), corruptTarget);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), undefined);

  const recovered = storage.recoverRetainedAutosave(adapter);
  assert.equal(recovered.report.status, "recovered-invalid-target");
  assert.equal(recovered.report.backupStatus, "source-and-replaced-target-retained");
  assert.equal(recovered.report.replacedTargetRetained, true);
  assert.equal(recovered.project.highlights["known-id"].color, "#4472C4");
  assert.doesNotThrow(() => JSON.parse(browserStorage.value(storage.STORAGE_KEY)));
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), corruptTarget);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), legacyRaw);

  const slotOccupied = storage.recoverRetainedAutosave(adapter);
  assert.equal(slotOccupied.project, null);
  assert.equal(slotOccupied.report.status, "failed-backup-slot-occupied");
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), corruptTarget);
  assert.equal(storage.downloadRetainedTargetBackup(), true);
  assert.equal(storage.clearRetainedTargetBackup(), true);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), undefined);
  assert.equal(storage.recoverRetainedAutosave(adapter).report.status, "recovered-retained-source");
});

test("explicit recovery never overwrites a target when its safety backup cannot be written", () => {
  const legacyRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const corruptTarget = "{not-json";
  const browserStorage = memoryStorage({
    "indonesia-region-map-autosave-v2": corruptTarget,
    "peta-warna-indonesia-autosave-v1": legacyRaw
  }, { failRecoveryWrites: 1 });
  const storage = loadProjectStorage(browserStorage);
  const adapter = storage.createRegionAdapter([sampleFeature()]);

  assert.equal(storage.migrateLegacyAutosave(adapter).report.status, "failed-invalid-target");
  const failed = storage.recoverRetainedAutosave(adapter);
  assert.equal(failed.project, null);
  assert.equal(failed.report.status, "failed-backup");
  assert.equal(browserStorage.value(storage.STORAGE_KEY), corruptTarget);
  assert.equal(browserStorage.value(storage.REPLACED_TARGET_BACKUP_KEY), undefined);
});

test("a target write failure keeps work available and a later run can recover", () => {
  const legacyRaw = JSON.stringify(fixture("old-autosave-v1.json"));
  const browserStorage = memoryStorage({ "peta-warna-indonesia-autosave-v1": legacyRaw }, { failTargetWrites: 1 });
  const storage = loadProjectStorage(browserStorage);
  const adapter = storage.createRegionAdapter([sampleFeature()]);

  const failed = storage.migrateLegacyAutosave(adapter);
  assert.equal(failed.report.status, "failed-write");
  assert.equal(failed.report.backupStatus, "source-retained");
  assert.equal(failed.report.droppedEntries.length, 0);
  assert.equal(failed.project, null);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), legacyRaw);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), undefined);
  assert.equal(storage.getStorageMigrationReport().status, "failed-write");

  const recovered = storage.migrateLegacyAutosave(adapter);
  assert.equal(recovered.report.status, "migrated");
  assert.equal(JSON.parse(browserStorage.value(storage.STORAGE_KEY)).title, "Quarterly coverage map");
});

test("an invalid legacy autosave stays untouched and exposes a failure report", () => {
  const invalid = "{not-json";
  const browserStorage = memoryStorage({ "peta-warna-indonesia-autosave-v1": invalid });
  const storage = loadProjectStorage(browserStorage);
  const result = storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()]));

  assert.equal(result.project, null);
  assert.equal(result.report.status, "failed-validation");
  assert.equal(result.report.unresolvedEntries.length, 1);
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), invalid);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), undefined);
  assert.equal(storage.hasUnreadableBackup("peta-warna-indonesia-autosave-v1"), true);
  assert.equal(storage.downloadUnreadableBackup("peta-warna-indonesia-autosave-v1"), true);
});

test("legacy brand migration cannot hide a prototype-pollution key from validation", () => {
  const malicious = '{"schemaVersion":"1.1","title":"Indonesia region map","highlights":{},"exportMeta":{"filenameSlug":"indonesia-region-map"},"__proto__":{"polluted":true}}';
  const browserStorage = memoryStorage({ "peta-warna-indonesia-autosave-v1": malicious });
  const storage = loadProjectStorage(browserStorage);
  const result = storage.migrateLegacyAutosave(storage.createRegionAdapter([sampleFeature()]));

  assert.equal(result.project, null);
  assert.equal(result.report.status, "failed-validation");
  assert.equal(browserStorage.value("peta-warna-indonesia-autosave-v1"), malicious);
  assert.equal(browserStorage.value(storage.STORAGE_KEY), undefined);
  assert.equal({}.polluted, undefined);
});

test("Batch 1 schema project fixture opens with stable IDs and no silent loss", () => {
  const storage = loadProjectStorage();
  const project = storage.sanitizeProject(fixture("old-project-schema-1.0.json"), storage.createRegionAdapter([sampleFeature()]));

  assert.equal(project.schemaVersion, storage.PROJECT_SCHEMA);
  assert.equal(project.boundaryVersion, storage.BOUNDARY_VERSION);
  assert.equal(project.registryVersion, storage.REGISTRY_VERSION);
  assert.equal(project.highlights["known-id"].color, "#70AD47");
  assert.equal(project.regionRefs["known-id"].canonicalRegionId, "idn-adm2-gb-22746128btest");
  assert.equal(project.unresolvedHighlights["retired-id"].color, "#E74C3C");
  assert.equal(project.migrationReport.summary.mapped, 1);
  assert.equal(project.migrationReport.summary.missing, 1);
  assert.equal(project.migrationReport.summary.silentLoss, false);
});

test("sanitizeProject rejects unsupported schema versions", () => {
  const storage = loadProjectStorage();
  assert.throws(() => storage.sanitizeProject({ schemaVersion: "9.9", highlights: {} }, new Set()), /project file version is not supported/i);
});

test("project-file migration reports an unsupported top-level field instead of claiming it was retained", () => {
  const storage = loadProjectStorage();
  const raw = {
    schemaVersion: "1.1",
    highlights: {},
    customField: "synthetic value"
  };
  const brandResult = defaultBrandMigration.migrateProject(raw);
  const project = storage.attachProjectMigrationReports(raw, storage.sanitizeProject(brandResult.project, new Set()), brandResult.report, { storageKeyMigrated: false });

  assert.equal(Object.prototype.hasOwnProperty.call(project, "customField"), false);
  assert.equal(project.migrationReport.summary.unsupported, 1);
  assert.equal(project.migrationReport.unsupported[0].field, "customField");
  assert.equal(project.migrationReport.requiresUserReview, true);
  assert.equal(project.migrationReport.summary.silentLoss, false);
  assert.deepEqual(JSON.parse(JSON.stringify(project.brandMigrationReport.droppedEntries)), [{ kind: "unsupported-project-field", count: 1 }]);
  assert.deepEqual(JSON.parse(JSON.stringify(project.migrationReport.projectFields.droppedEntries)), [{ kind: "unsupported-project-field", count: 1 }]);
  assert.deepEqual(Array.from(project.migrationReport.projectFields.unresolvedEntries), []);
  assert.equal(project.brandMigrationReport.retainedFields.includes("customField"), false);
});

test("the 5000-row import contract saves and reopens under the shared project byte limit", () => {
  const storage = loadProjectStorage();
  const state = autosaveState(storage);
  state.importRows = Array.from({ length: storage.MAX_IMPORT_ROWS }, (_, index) => ({
    rowId: `row-${index + 1}`,
    rowNumber: index + 2,
    record: { regionName: `Synthetic region ${index + 1}`, province: "Synthetic province", numericValue: String(index) },
    matchedId: null,
    matchedName: "",
    matchStatus: "unmatched",
    errors: [],
    warnings: ["Synthetic review message"]
  }));

  const project = storage.buildProject(state, storage.createRegionAdapter(state.features));
  const downloadedBytes = Buffer.byteLength(JSON.stringify(project, null, 2), "utf8");
  assert.ok(downloadedBytes <= storage.PROJECT_FILE_MAX_BYTES);
  const reopened = storage.sanitizeProject(JSON.parse(JSON.stringify(project)), storage.createRegionAdapter(state.features));
  assert.equal(reopened.importRows.length, storage.MAX_IMPORT_ROWS);
  assert.equal(reopened.importRows.at(-1).record.regionName, `Synthetic region ${storage.MAX_IMPORT_ROWS}`);
});

test("sanitizeProject rejects invalid colors in valid region highlights", () => {
  const storage = loadProjectStorage();
  assert.throws(() => storage.sanitizeProject({
    schemaVersion: "1.0",
    highlights: { "known-id": { color: "javascript:alert(1)" } }
  }, new Set(["known-id"])), /invalid color/i);
});

test("sanitizeProject rejects oversized highlight payloads", () => {
  const storage = loadProjectStorage();
  const highlights = {};
  for (let index = 0; index < 2001; index += 1) {
    highlights[`id-${index}`] = { color: "#4472C4" };
  }
  assert.throws(() => storage.sanitizeProject({ schemaVersion: "1.0", highlights }, new Set()), /project file is too large/i);
});

test("sanitizeProject rejects prototype-pollution structures", () => {
  const storage = loadProjectStorage();
  const polluted = JSON.parse('{"schemaVersion":"1.0","highlights":{},"__proto__":{"polluted":true}}');
  assert.throws(() => storage.sanitizeProject(polluted, new Set()), /unsafe structure/i);
});

test("isColor only accepts six-digit hex colors", () => {
  const storage = loadProjectStorage();
  assert.equal(storage.isColor("#abcdef"), true);
  assert.equal(storage.isColor("#ABCDEF"), true);
  assert.equal(storage.isColor("#abcd"), false);
  assert.equal(storage.isColor("red"), false);
});
