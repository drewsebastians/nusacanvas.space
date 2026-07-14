(function () {
  const brand = window.ProductBrand;
  if (!brand || !brand.app || !brand.defaults) throw new Error("Product brand configuration is required before project storage.");
  const STORAGE_KEY = "indonesia-region-map-autosave-v2";
  const LEGACY_STORAGE_KEYS = Object.freeze(["peta-warna-indonesia-autosave-v1"]);
  const STORAGE_MIGRATION_VERSION = "1";
  const STORAGE_MIGRATION_STATE_KEY = "indonesia-region-map-storage-migration-v1";
  const REPLACED_TARGET_BACKUP_KEY = "indonesia-region-map-autosave-recovery-v1";
  const APP_VERSION = brand.app.version;
  const PROJECT_SCHEMA = "1.1";
  const PROJECT_FILE_MAX_BYTES = 20_000_000;
  const MAX_IMPORT_ROWS = 5000;
  const LEGACY_SCHEMAS = new Set(["1.0"]);
  const BOUNDARY_VERSION = "IDN-ADM2-2020-geoboundaries-22746128";
  const REGISTRY_VERSION = "IDN-ADM-REGISTRY-v1-2025-06-23";
  const SOURCE_VERSION = "geoBoundaries-IDN-ADM2-22746128 + Kepmendagri-300.2.2-2138/2025 amended 300.2.2-2430/2025";
  const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);
  const MAX_LEGEND_ITEMS = 200;
  let lastStorageMigrationReport = null;

  function isColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
  }

  function utf8ByteLength(value) {
    const text = String(value);
    let bytes = 0;
    for (let index = 0; index < text.length; index += 1) {
      const code = text.charCodeAt(index);
      if (code < 0x80) bytes += 1;
      else if (code < 0x800) bytes += 2;
      else if (code >= 0xD800 && code <= 0xDBFF && index + 1 < text.length && text.charCodeAt(index + 1) >= 0xDC00 && text.charCodeAt(index + 1) <= 0xDFFF) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    }
    return bytes;
  }

  function assertProjectSize(project) {
    let serialized;
    try {
      // Project downloads use this indented representation, so the same byte
      // contract guarantees that every file we save can pass the open gate.
      serialized = JSON.stringify(project, null, 2);
    } catch (error) {
      throw new Error("This project cannot be saved safely. Your current map has not changed. Remove unsupported project data and try again.");
    }
    if (utf8ByteLength(serialized) > PROJECT_FILE_MAX_BYTES) {
      throw new Error("This project is too large to save and reopen safely. Reduce the imported rows or row messages, then try again.");
    }
    return project;
  }

  function productDefaults() {
    const defaults = brand.defaults;
    return {
      projectTitle: String(defaults.projectTitle),
      exportFilenamePrefix: String(defaults.exportFilenamePrefix)
    };
  }

  function canonicalIdFromFeature(feature, legacyId) {
    const sourceId = feature && feature.properties && feature.properties.geometry_source_id;
    return sourceId ? `idn-adm2-gb-${String(sourceId).toLowerCase()}` : `idn-adm2-legacy-${String(legacyId || "").toLowerCase()}`;
  }

  function createRegionAdapter(features) {
    const byLegacyId = new Map();
    (features || []).forEach((feature) => {
      const props = feature.properties || {};
      const legacyId = props.region_id;
      if (!legacyId) return;
      byLegacyId.set(legacyId, {
        legacyRegionId: legacyId,
        geometryFeatureId: legacyId,
        canonicalRegionId: canonicalIdFromFeature(feature, legacyId),
        status: props.match_status === "ambiguous_name" ? "ambiguous_metadata" : "mapped",
        boundaryVersion: BOUNDARY_VERSION,
        registryVersion: REGISTRY_VERSION
      });
    });
    return {
      has(id) { return byLegacyId.has(id); },
      get(id) { return byLegacyId.get(id); },
      validIds() { return new Set(byLegacyId.keys()); }
    };
  }

  function ensureSafeObject(value, depth = 0) {
    if (depth > 25) throw new Error("This project file has too many nested sections. Your current project has not changed. Choose a valid project file.");
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      if (value.length > 5000) throw new Error("This project file is too large. Your current project has not changed. Choose a smaller project file.");
      value.forEach((item) => ensureSafeObject(item, depth + 1));
      return;
    }
    const keys = Object.keys(value);
    if (keys.length > 5000) throw new Error("This project file is too large. Your current project has not changed. Choose a smaller project file.");
    keys.forEach((key) => {
      if (DANGEROUS_KEYS.has(key)) throw new Error("This project file contains an unsafe structure. Your current project has not changed. Choose a valid project file.");
      ensureSafeObject(value[key], depth + 1);
    });
  }

  function normalizeAdapter(validIdsOrAdapter) {
    if (validIdsOrAdapter && typeof validIdsOrAdapter.get === "function" && typeof validIdsOrAdapter.has === "function") {
      return validIdsOrAdapter;
    }
    const validIds = validIdsOrAdapter instanceof Set ? validIdsOrAdapter : new Set();
    return {
      has(id) { return validIds.has(id); },
      get(id) {
        return validIds.has(id) ? {
          legacyRegionId: id,
          geometryFeatureId: id,
          canonicalRegionId: `idn-adm2-legacy-${String(id).toLowerCase()}`,
          status: "mapped",
          boundaryVersion: BOUNDARY_VERSION,
          registryVersion: REGISTRY_VERSION
        } : null;
      }
    };
  }

  function sanitizeHighlight(item) {
    const color = item && item.color;
    if (!isColor(color)) throw new Error("This project file contains an invalid color. Your current project has not changed. Choose a valid project file or fix the color value.");
    return {
      color,
      category: String((item && item.category) || "").slice(0, 80),
      value: String((item && item.value) || "").slice(0, 80)
    };
  }

  function sanitizeImportRows(rawRows) {
    if (!Array.isArray(rawRows)) return [];
    if (rawRows.length > MAX_IMPORT_ROWS) throw new Error("This project file contains too many spreadsheet rows. Your current project has not changed. Choose a smaller project file.");
    return rawRows.map((row, index) => {
      const record = row && row.record && typeof row.record === "object" ? row.record : {};
      const errors = Array.isArray(row && row.errors) ? row.errors : [];
      const warnings = Array.isArray(row && row.warnings) ? row.warnings : [];
      if (errors.length > 100 || warnings.length > 100) throw new Error("This project file contains too many row messages. Your current project has not changed. Choose a valid project file.");
      return {
        rowId: String((row && row.rowId) || `row-${index + 1}`).slice(0, 120),
        rowNumber: Number.isFinite(Number(row && row.rowNumber)) ? Number(row.rowNumber) : index + 2,
        record: {
          regionCode: String(record.regionCode || "").slice(0, 120),
          province: String(record.province || "").slice(0, 120),
          regionName: String(record.regionName || "").slice(0, 160),
          numericValue: String(record.numericValue || "").slice(0, 120),
          category: String(record.category || "").slice(0, 120),
          source: String(record.source || "").slice(0, 160),
          period: String(record.period || "").slice(0, 80)
        },
        matchedId: row && row.matchedId ? String(row.matchedId).slice(0, 120) : null,
        matchedName: String((row && row.matchedName) || "").slice(0, 180),
        matchStatus: String((row && row.matchStatus) || "unmatched").slice(0, 60),
        errors: errors.map((item) => String(item).slice(0, 180)),
        warnings: warnings.map((item) => String(item).slice(0, 180)),
        color: isColor(row && row.color) ? row.color : "",
        classKey: String((row && row.classKey) || "").slice(0, 80)
      };
    });
  }

  function sanitizeVisualization(raw, migrationReport) {
    if (!raw || typeof raw !== "object") return null;
    const allowed = new Set(["categorical", "equal-interval", "quantile", "manual", "diverging"]);
    if (!allowed.has(String(raw.method))) {
      if (migrationReport) migrationReport.unsupported.push({ kind: "visualization-method", count: 1 });
      return null;
    }
    const rawLegend = Array.isArray(raw.legend) ? raw.legend : [];
    if (rawLegend.length > MAX_LEGEND_ITEMS) throw new Error("This project file contains too many legend items. Your current project has not changed. Choose a smaller project file.");
    const legend = rawLegend.map((item) => {
      if (!item || !isColor(item.color)) throw new Error("This project file contains an invalid legend color. Your current project has not changed. Choose a valid project file.");
      return { label: String(item.label || "Legend").slice(0, 120), color: item.color, key: String(item.key || "").slice(0, 80) };
    });
    const assignments = {};
    const assignmentEntries = Object.entries(raw.assignments || {});
    if (assignmentEntries.length > MAX_IMPORT_ROWS) throw new Error("This project file contains too many map assignments. Your current project has not changed. Choose a smaller project file.");
    assignmentEntries.forEach(([id, item]) => {
      if (!item || !isColor(item.color)) throw new Error("This project file contains an invalid map-assignment color. Your current project has not changed. Choose a valid project file.");
      assignments[String(id).slice(0, 120)] = { classKey: String(item.classKey || "").slice(0, 80), color: item.color };
    });
    const rawWarnings = Array.isArray(raw.warnings) ? raw.warnings : [];
    const rawNoData = Array.isArray(raw.noData) ? raw.noData : [];
    if (rawWarnings.length > 100 || rawNoData.length > MAX_IMPORT_ROWS) throw new Error("This project file contains too many visualization records. Your current project has not changed. Choose a smaller project file.");
    if (raw.options && raw.options.noDataColor && !isColor(raw.options.noDataColor)) throw new Error("This project file contains an invalid no-data color. Your current project has not changed. Choose a valid project file.");
    return {
      version: String(raw.version || "IDN-VIS-v1").slice(0, 40),
      paletteVersion: String(raw.paletteVersion || "IDN-PALETTE-v1").slice(0, 40),
      method: String(raw.method),
      options: raw.options && typeof raw.options === "object" ? { classes: Number(raw.options.classes) || 5, palette: String(raw.options.palette || "").slice(0, 60), reverse: Boolean(raw.options.reverse), center: Number.isFinite(Number(raw.options.center)) ? Number(raw.options.center) : 0, breaks: String(raw.options.breaks || "").slice(0, 200), numberFormat: String(raw.options.numberFormat || "id-ID").slice(0, 30), noDataColor: isColor(raw.options.noDataColor) ? raw.options.noDataColor : "#D9E0E6" } : {},
      assignments,
      legend,
      warnings: rawWarnings.map((item) => String(item).slice(0, 240)),
      noData: rawNoData.map((item) => String(item).slice(0, 120)),
      center: Number.isFinite(Number(raw.center)) ? Number(raw.center) : null
    };
  }

  function sanitizeExportMeta(raw) {
    const value = raw && typeof raw === "object" ? raw : {};
    const fallbackFilename = productDefaults().exportFilenamePrefix;
    return {
      subtitle: String(value.subtitle || "").replace(/[\u0000-\u001F]/g, "").slice(0, 180),
      source: String(value.source || "").replace(/[\u0000-\u001F]/g, "").slice(0, 180),
      period: String(value.period || "").replace(/[\u0000-\u001F]/g, "").slice(0, 80),
      footnote: String(value.footnote || "").replace(/[\u0000-\u001F]/g, "").slice(0, 180),
      legendTitle: String(value.legendTitle || "Legend").replace(/[\u0000-\u001F]/g, "").slice(0, 80),
      filenameSlug: String(value.filenameSlug || fallbackFilename).replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || fallbackFilename
    };
  }

  function sanitizeExportSettings(raw) {
    const value = raw && typeof raw === "object" ? raw : {};
    return {
      ratio: ["16:9", "4:3", "a4", "a3", "1:1", "bounds"].includes(value.ratio) ? value.ratio : "16:9",
      extent: value.extent === "current-view" ? "current-view" : "national",
      labels: value.labels !== false,
      transparent: Boolean(value.transparent),
      highDetail: Boolean(value.highDetail),
      pngSize: ["1920x1080", "2560x1440", "3840x2160"].includes(value.pngSize) ? value.pngSize : "1920x1080"
    };
  }

  function emptyMigrationReport(fromSchema) {
    return {
      createdAt: new Date().toISOString(),
      fromSchemaVersion: String(fromSchema || "unknown"),
      toSchemaVersion: PROJECT_SCHEMA,
      boundaryVersion: BOUNDARY_VERSION,
      registryVersion: REGISTRY_VERSION,
      unchanged: [],
      mapped: [],
      ambiguous: [],
      missing: [],
      unsupported: [],
      summary: {
        unchanged: 0,
        mapped: 0,
        ambiguous: 0,
        missing: 0,
        unsupported: 0,
        silentLoss: false
      }
    };
  }

  function finalizeMigrationReport(report) {
    ["unchanged", "mapped", "ambiguous", "missing", "unsupported"].forEach((key) => {
      report.summary[key] = report[key].length;
    });
    report.summary.silentLoss = false;
    report.requiresUserReview = Boolean(report.missing.length || report.ambiguous.length || report.unsupported.length);
    return report;
  }

  function sanitizeProject(raw, validIdsOrAdapter) {
    if (!raw || typeof raw !== "object") throw new Error("This is not a valid project file. Your current project has not changed. Choose a valid project file.");
    ensureSafeObject(raw);
    assertProjectSize(raw);
    const schemaVersion = String(raw.schemaVersion || "");
    if (schemaVersion !== PROJECT_SCHEMA && !LEGACY_SCHEMAS.has(schemaVersion)) throw new Error("This project file version is not supported. Your current project has not changed. Open a project saved by this version of the app.");
    const adapter = normalizeAdapter(validIdsOrAdapter);
    const highlights = {};
    const unresolvedHighlights = {};
    const regionRefs = {};
    const seen = new Set();
    const entries = Object.entries(raw.highlights || {});
    if (entries.length > 2000) throw new Error("This project file is too large. Your current project has not changed. Choose a smaller project file.");
    const migrationReport = emptyMigrationReport(schemaVersion);
    const supportedProjectFields = new Set([
      "appVersion", "schemaVersion", "boundaryVersion", "registryVersion", "sourceVersion", "title",
      "highlights", "manualHighlights", "regionRefs", "unresolvedHighlights", "legend", "legendVisible",
      "legendPosition", "groupNames", "groupMeta", "importCorrections", "workflowStage", "uiMode",
      "importRows", "visualization", "exportMeta", "exportSettings", "migrationReport",
      "brandMigrationReport", "storageMigrationReport", "savedAt"
    ]);
    Object.keys(raw).forEach((field) => {
      if (!supportedProjectFields.has(field)) migrationReport.unsupported.push({ kind: "unsupported-project-field", field: String(field).slice(0, 120) });
    });
    entries.forEach(([id, item]) => {
      if (seen.has(id)) throw new Error("This project file contains the same region ID more than once. Your current project has not changed. Choose a valid project file.");
      seen.add(id);
      const highlight = sanitizeHighlight(item);
      const ref = adapter.get(id);
      if (!ref) {
        unresolvedHighlights[id] = highlight;
        migrationReport.missing.push({ legacyRegionId: id, reason: "This region ID is not in the current boundary snapshot." });
        return;
      }
      highlights[id] = highlight;
      regionRefs[id] = {
        canonicalRegionId: ref.canonicalRegionId,
        legacyRegionId: ref.legacyRegionId,
        geometryFeatureId: ref.geometryFeatureId,
        migrationStatus: ref.status,
        boundaryVersion: ref.boundaryVersion,
        registryVersion: ref.registryVersion
      };
      if (schemaVersion === PROJECT_SCHEMA && raw.regionRefs && raw.regionRefs[id] && raw.regionRefs[id].canonicalRegionId === ref.canonicalRegionId) {
        migrationReport.unchanged.push({ legacyRegionId: id, canonicalRegionId: ref.canonicalRegionId });
      } else if (ref.status === "ambiguous_metadata") {
        migrationReport.ambiguous.push({ legacyRegionId: id, canonicalRegionId: ref.canonicalRegionId, reason: "The official region data has more than one match. The color stays on the same boundary." });
      } else {
        migrationReport.mapped.push({ legacyRegionId: id, canonicalRegionId: ref.canonicalRegionId });
      }
    });
    const priorUnresolvedEntries = Object.entries(raw.unresolvedHighlights || {});
    if (priorUnresolvedEntries.length > 2000) throw new Error("This project file is too large. Your current project has not changed. Choose a smaller project file.");
    priorUnresolvedEntries.forEach(([id, item]) => {
      if (seen.has(id)) return;
      seen.add(id);
      const highlight = sanitizeHighlight(item);
      const ref = adapter.get(id);
      if (!ref) {
        unresolvedHighlights[id] = highlight;
        migrationReport.missing.push({ legacyRegionId: id, reason: "This saved unresolved region ID is not in the current boundary snapshot." });
        return;
      }
      highlights[id] = highlight;
      regionRefs[id] = {
        canonicalRegionId: ref.canonicalRegionId,
        legacyRegionId: ref.legacyRegionId,
        geometryFeatureId: ref.geometryFeatureId,
        migrationStatus: ref.status,
        boundaryVersion: ref.boundaryVersion,
        registryVersion: ref.registryVersion
      };
      if (ref.status === "ambiguous_metadata") {
        migrationReport.ambiguous.push({ legacyRegionId: id, canonicalRegionId: ref.canonicalRegionId, reason: "A previously unresolved saved region now has ambiguous metadata. The color stays on the same boundary." });
      } else {
        migrationReport.mapped.push({ legacyRegionId: id, canonicalRegionId: ref.canonicalRegionId });
      }
    });
    const manualHighlights = {};
    const manualEntries = Object.entries(raw.manualHighlights || {});
    if (manualEntries.length > 2000) throw new Error("This project file is too large. Your current project has not changed. Choose a smaller project file.");
    manualEntries.forEach(([id, item]) => {
      const highlight = sanitizeHighlight(item);
      if (!adapter.has(id)) {
        if (!unresolvedHighlights[id]) unresolvedHighlights[id] = highlight;
        if (!migrationReport.missing.some((entry) => entry.legacyRegionId === id)) {
          migrationReport.missing.push({ legacyRegionId: id, reason: "This saved manual region ID is not in the current boundary snapshot." });
        }
        return;
      }
      manualHighlights[id] = highlight;
    });
    const rawLegend = Array.isArray(raw.legend) ? raw.legend : [];
    if (rawLegend.length > MAX_LEGEND_ITEMS) throw new Error("This project file contains too many legend items. Your current project has not changed. Choose a smaller project file.");
    const legend = rawLegend.map((item) => {
      if (!item || !isColor(item.color)) throw new Error("This project file contains an invalid legend color. Your current project has not changed. Choose a valid project file.");
      return {
        label: String(item.label || "Legend").slice(0, 80),
        color: item.color
      };
    });
    const groupNames = {};
    const groupNameEntries = Object.entries(raw.groupNames || {});
    if (groupNameEntries.length > 500) throw new Error("This project file contains too many color groups. Your current project has not changed. Choose a smaller project file.");
    groupNameEntries.forEach(([color, label]) => {
      const normalizedColor = String(color || "").toUpperCase();
      if (!isColor(normalizedColor)) throw new Error("This project file contains an invalid color-group key. Your current project has not changed. Choose a valid project file.");
      groupNames[normalizedColor] = String(label || "").slice(0, 80);
    });
    const groupMeta = {};
    const groupMetaEntries = Object.entries(raw.groupMeta || {});
    if (groupMetaEntries.length > 500) throw new Error("This project file contains too many color-group details. Your current project has not changed. Choose a smaller project file.");
    groupMetaEntries.forEach(([color, meta]) => {
      const normalizedColor = String(color || "").toUpperCase();
      if (!isColor(normalizedColor) || !meta || typeof meta !== "object") throw new Error("This project file contains invalid color-group details. Your current project has not changed. Choose a valid project file.");
      groupMeta[normalizedColor] = {
        category: String(meta.category || "").slice(0, 80),
        value: String(meta.value || "").slice(0, 80)
      };
    });
    const importCorrections = {};
    const correctionEntries = Object.entries(raw.importCorrections || {});
    if (correctionEntries.length > 5000) throw new Error("This project file contains too many saved match decisions. Your current project has not changed. Choose a smaller project file.");
    correctionEntries.forEach(([rowId, correction]) => {
      if (!correction || typeof correction !== "object") throw new Error("This project file contains an invalid saved match decision. Your current project has not changed. Choose a valid project file.");
      const action = String(correction.action || "");
      if (!["resolve", "ignore"].includes(action)) throw new Error("This project file contains an invalid saved match action. Your current project has not changed. Choose a valid project file.");
      if (correction.registryVersion && correction.registryVersion !== REGISTRY_VERSION) {
        migrationReport.unsupported.push({ kind: "stale-import-correction", rowId: String(rowId).slice(0, 120) });
        return;
      }
      importCorrections[String(rowId).slice(0, 120)] = {
        action,
        targetId: String(correction.targetId || "").slice(0, 120),
        registryVersion: REGISTRY_VERSION,
        decidedAt: String(correction.decidedAt || "").slice(0, 40)
      };
    });
    return {
      appVersion: APP_VERSION,
      schemaVersion: PROJECT_SCHEMA,
      boundaryVersion: BOUNDARY_VERSION,
      registryVersion: REGISTRY_VERSION,
      sourceVersion: SOURCE_VERSION,
      title: String(raw.title || productDefaults().projectTitle).slice(0, 90),
      highlights,
      manualHighlights,
      regionRefs,
      unresolvedHighlights,
      legend,
      legendVisible: raw.legendVisible !== false,
      legendPosition: String(raw.legendPosition || "bottom-right"),
      groupNames,
      groupMeta,
      importCorrections,
      workflowStage: ["input", "match", "visualize", "export"].includes(raw.workflowStage) ? raw.workflowStage : "input",
      uiMode: raw.uiMode === "advanced" ? "advanced" : "basic",
      importRows: sanitizeImportRows(raw.importRows),
      visualization: sanitizeVisualization(raw.visualization, migrationReport),
      exportMeta: sanitizeExportMeta(raw.exportMeta),
      exportSettings: sanitizeExportSettings(raw.exportSettings),
      migrationReport: finalizeMigrationReport(migrationReport),
      savedAt: raw.savedAt || new Date().toISOString()
    };
  }

  function buildRegionRefs(state, adapter) {
    const refs = {};
    Object.keys(state.highlights || {}).forEach((id) => {
      const ref = adapter && adapter.get(id);
      if (!ref) return;
      refs[id] = {
        canonicalRegionId: ref.canonicalRegionId,
        legacyRegionId: ref.legacyRegionId,
        geometryFeatureId: ref.geometryFeatureId,
        migrationStatus: ref.status,
        boundaryVersion: ref.boundaryVersion,
        registryVersion: ref.registryVersion
      };
    });
    return refs;
  }

  function buildProject(state, adapter) {
    return assertProjectSize({
      appVersion: APP_VERSION,
      schemaVersion: PROJECT_SCHEMA,
      boundaryVersion: BOUNDARY_VERSION,
      registryVersion: REGISTRY_VERSION,
      sourceVersion: SOURCE_VERSION,
      title: String(state.title || productDefaults().projectTitle).slice(0, 90),
      highlights: state.highlights,
      manualHighlights: state.manualHighlights || {},
      regionRefs: buildRegionRefs(state, adapter || createRegionAdapter(state.features || [])),
      unresolvedHighlights: state.unresolvedHighlights || {},
      legend: state.legend,
      legendVisible: state.legendVisible,
      legendPosition: state.legendPosition,
      groupNames: state.groupNames || {},
      groupMeta: state.groupMeta || {},
      importCorrections: state.importCorrections || {},
      workflowStage: ["input", "match", "visualize", "export"].includes(state.workflowStage) ? state.workflowStage : "input",
      uiMode: state.uiMode === "advanced" ? "advanced" : "basic",
      importRows: sanitizeImportRows(state.importRows),
      visualization: sanitizeVisualization(state.visualization),
      exportMeta: sanitizeExportMeta(state.exportMeta),
      exportSettings: sanitizeExportSettings(state.exportSettings),
      migrationReport: state.migrationReport || null,
      savedAt: new Date().toISOString()
    });
  }

  function readStorage(key) {
    try {
      return { ok: true, value: localStorage.getItem(key) };
    } catch (error) {
      return { ok: false, value: null };
    }
  }

  function writeMigrationState(state) {
    try {
      const serialized = JSON.stringify({
        migrationVersion: STORAGE_MIGRATION_VERSION,
        state,
        updatedAt: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_MIGRATION_STATE_KEY, serialized);
      const verification = readStorage(STORAGE_MIGRATION_STATE_KEY);
      return verification.ok && verification.value === serialized;
    } catch (error) {
      return false;
    }
  }

  function readMigrationState() {
    const stored = readStorage(STORAGE_MIGRATION_STATE_KEY);
    if (!stored.ok) return { status: "unreadable", state: null };
    if (stored.value === null) return { status: "absent", state: null };
    try {
      const parsed = JSON.parse(stored.value);
      const validStates = new Set(["cleared", "current", "migrated"]);
      if (parsed && parsed.migrationVersion === STORAGE_MIGRATION_VERSION && validStates.has(parsed.state)) {
        return { status: "valid", state: parsed.state };
      }
      return { status: "invalid", state: null };
    } catch (error) {
      return { status: "invalid", state: null };
    }
  }

  function createStorageMigrationReport(status, sourceKey, overrides = {}) {
    return Object.assign({
      migrationVersion: STORAGE_MIGRATION_VERSION,
      createdAt: new Date().toISOString(),
      status,
      sourceKey: sourceKey || null,
      targetKey: STORAGE_KEY,
      migratedFields: [],
      retainedFields: [],
      unresolvedEntries: [],
      droppedEntries: [],
      backupStatus: sourceKey && sourceKey !== STORAGE_KEY ? "source-retained" : "not-required",
      sourceRetained: Boolean(sourceKey && sourceKey !== STORAGE_KEY),
      recoverySourceKey: null,
      replacedTargetBackupKey: null,
      replacedTargetRetained: false,
      unreadableBackupKeys: [],
      unreadableBackupRetained: false,
      protectCurrentTargetBeforeWrite: false,
      migrationStateRecorded: false
    }, overrides);
  }

  function migrateBrandDefaults(rawProject) {
    const migration = window.ProductBrandMigration;
    if (!migration || typeof migration.migrateProject !== "function") {
      return { project: rawProject, report: null };
    }
    return migration.migrateProject(rawProject);
  }

  function projectFieldReport(raw, project, brandReport, options = {}) {
    const excludedReportFields = new Set(["migrationReport", "brandMigrationReport", "storageMigrationReport"]);
    const migratedFields = new Set(options.storageKeyMigrated === false ? [] : ["storageKey"]);
    const retainedFields = [];
    const rawKeys = Object.keys(raw || {});
    rawKeys.forEach((key) => {
      if (excludedReportFields.has(key)) return;
      if (!Object.prototype.hasOwnProperty.call(project, key)) return;
      if (JSON.stringify(raw[key]) === JSON.stringify(project[key])) retainedFields.push(key);
      else migratedFields.add(key);
    });
    Object.keys(project || {}).forEach((key) => {
      if (excludedReportFields.has(key)) return;
      if (!Object.prototype.hasOwnProperty.call(raw || {}, key)) migratedFields.add(key);
    });
    const unsupportedCount = rawKeys.filter((key) => !excludedReportFields.has(key) && !Object.prototype.hasOwnProperty.call(project, key)).length;
    const summary = project && project.migrationReport && project.migrationReport.summary || {};
    const unresolvedEntries = [];
    const unresolvedRegionCount = Number(summary.missing || 0) + Number(summary.ambiguous || 0);
    if (unresolvedRegionCount) unresolvedEntries.push({ kind: "region-reference", count: unresolvedRegionCount });
    if (brandReport && Array.isArray(brandReport.migratedFields)) {
      brandReport.migratedFields.forEach((field) => migratedFields.add(field));
    }
    const droppedEntries = [];
    if (unsupportedCount) droppedEntries.push({ kind: "unsupported-project-field", count: unsupportedCount });
    const nestedUnsupportedCount = Math.max(0, Number(summary.unsupported || 0) - unsupportedCount);
    if (nestedUnsupportedCount) droppedEntries.push({ kind: "unsupported-project-entry", count: nestedUnsupportedCount });
    return {
      migratedFields: Array.from(migratedFields).sort(),
      retainedFields: Array.from(new Set(retainedFields)).sort(),
      unresolvedEntries,
      droppedEntries
    };
  }

  function attachProjectMigrationReports(raw, project, brandReport, options = {}) {
    if (!project) return project;
    const fieldReport = projectFieldReport(raw, project, brandReport, options);
    const combinedBrandReport = Object.assign({}, brandReport || {}, {
      migratedFields: fieldReport.migratedFields,
      retainedFields: fieldReport.retainedFields,
      unresolvedEntries: fieldReport.unresolvedEntries,
      droppedEntries: fieldReport.droppedEntries
    });
    project.brandMigrationReport = combinedBrandReport;
    if (project.migrationReport) {
      project.migrationReport.brandMigration = combinedBrandReport;
      project.migrationReport.projectFields = fieldReport;
    }
    return project;
  }

  function findLegacySource() {
    let readFailed = false;
    for (const key of LEGACY_STORAGE_KEYS) {
      const candidate = readStorage(key);
      if (!candidate.ok) {
        readFailed = true;
        continue;
      }
      if (candidate.value !== null) return { key, raw: candidate.value, readFailed };
    }
    return { key: null, raw: null, readFailed };
  }

  function retainReplacedTarget(raw) {
    if (raw === null || raw === undefined) return true;
    const existing = readStorage(REPLACED_TARGET_BACKUP_KEY);
    if (!existing.ok) return false;
    // Keep the oldest displaced copy. A different current target must not be
    // replaced until the user downloads or deletes the occupied recovery slot.
    if (existing.value !== null) return existing.value === raw;
    try {
      localStorage.setItem(REPLACED_TARGET_BACKUP_KEY, raw);
    } catch (error) {
      return false;
    }
    const verification = readStorage(REPLACED_TARGET_BACKUP_KEY);
    return verification.ok && verification.value === raw;
  }

  function hasRetainedTargetBackup() {
    const retained = readStorage(REPLACED_TARGET_BACKUP_KEY);
    return Boolean(retained.ok && retained.value !== null);
  }

  function isDownloadableUnreadableKey(key) {
    return key === STORAGE_KEY || LEGACY_STORAGE_KEYS.includes(key);
  }

  function hasUnreadableBackup(key, report = lastStorageMigrationReport) {
    if (!isDownloadableUnreadableKey(key) || !report || !Array.isArray(report.unreadableBackupKeys) || !report.unreadableBackupKeys.includes(key)) return false;
    const retained = readStorage(key);
    return Boolean(retained.ok && retained.value !== null);
  }

  function downloadUnreadableBackup(key) {
    const report = lastStorageMigrationReport;
    if (!hasUnreadableBackup(key, report)) return false;
    const retained = readStorage(key);
    if (!retained.ok || retained.value === null) return false;
    const blob = new Blob([retained.value], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = key === STORAGE_KEY
      ? (brand.defaults.unreadableBrowserBackupFilename || "nusacanvas-unreadable-browser-backup.txt")
      : (brand.defaults.unreadableCompatibilityBackupFilename || "nusacanvas-unreadable-compatibility-backup.txt");
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  }

  function attachStorageMigrationReport(project, report) {
    if (!project) return null;
    project.storageMigrationReport = report;
    if (project.migrationReport) project.migrationReport.storageMigration = report;
    return project;
  }

  function migrateLegacyAutosave(validIdsOrAdapter, options = {}) {
    const targetRead = readStorage(STORAGE_KEY);
    const legacySource = findLegacySource();
    const hasLegacySource = legacySource.raw !== null;
    let targetWasInvalid = false;
    if (targetRead.ok && targetRead.value !== null) {
      try {
        const rawTarget = JSON.parse(targetRead.value);
        const brandResult = migrateBrandDefaults(rawTarget);
        const project = attachProjectMigrationReports(
          rawTarget,
          sanitizeProject(brandResult.project, validIdsOrAdapter),
          brandResult.report,
          { storageKeyMigrated: false }
        );
        if (!options.recoverRetainedSource) {
          const fieldReport = project.migrationReport.projectFields;
          const replacedTargetRetained = hasRetainedTargetBackup();
          const report = createStorageMigrationReport("already-current", STORAGE_KEY, Object.assign({}, fieldReport, {
            backupStatus: hasLegacySource
              ? (replacedTargetRetained ? "source-and-replaced-target-retained" : "source-retained")
              : (replacedTargetRetained ? "replaced-target-retained" : "not-required"),
            sourceRetained: hasLegacySource,
            recoverySourceKey: legacySource.key,
            replacedTargetBackupKey: replacedTargetRetained ? REPLACED_TARGET_BACKUP_KEY : null,
            replacedTargetRetained
          }));
          lastStorageMigrationReport = report;
          return { project: attachStorageMigrationReport(project, report), report };
        }
      } catch (error) {
        targetWasInvalid = true;
      }
    }

    const migrationState = targetRead.ok && targetRead.value === null && !options.recoverRetainedSource
      ? readMigrationState()
      : { status: "not-read", state: null };
    if (targetRead.ok && targetRead.value === null && ["invalid", "unreadable"].includes(migrationState.status) && !options.recoverRetainedSource) {
      const replacedTargetRetained = hasRetainedTargetBackup();
      const report = createStorageMigrationReport("failed-migration-state", legacySource.key, {
        unresolvedEntries: [{ kind: "migration-state-marker", count: 1 }],
        backupStatus: hasLegacySource
          ? (replacedTargetRetained ? "source-and-replaced-target-retained" : "source-retained")
          : (replacedTargetRetained ? "replaced-target-retained" : "not-required"),
        sourceRetained: hasLegacySource,
        recoverySourceKey: legacySource.key,
        replacedTargetBackupKey: replacedTargetRetained ? REPLACED_TARGET_BACKUP_KEY : null,
        replacedTargetRetained
      });
      lastStorageMigrationReport = report;
      return { project: null, report };
    }

    if (targetRead.ok && targetRead.value === null && migrationState.status === "valid" && migrationState.state === "cleared" && !options.recoverRetainedSource) {
      const replacedTargetRetained = hasRetainedTargetBackup();
      const report = createStorageMigrationReport("cleared", legacySource.key, {
        backupStatus: hasLegacySource
          ? (replacedTargetRetained ? "source-and-replaced-target-retained" : "source-retained")
          : (replacedTargetRetained ? "replaced-target-retained" : "not-required"),
        sourceRetained: hasLegacySource,
        recoverySourceKey: legacySource.key,
        replacedTargetBackupKey: replacedTargetRetained ? REPLACED_TARGET_BACKUP_KEY : null,
        replacedTargetRetained,
        migrationStateRecorded: true
      });
      lastStorageMigrationReport = report;
      return { project: null, report };
    }

    if (!hasLegacySource) {
      const status = !targetRead.ok || legacySource.readFailed ? "failed-read" : targetWasInvalid ? "failed-validation" : "not-needed";
      const unresolvedEntries = status.startsWith("failed") ? [{ kind: "browser-storage", count: 1 }] : [];
      const report = createStorageMigrationReport(status, targetWasInvalid ? STORAGE_KEY : null, {
        unresolvedEntries,
        backupStatus: targetWasInvalid ? "invalid-target-retained" : "not-required",
        unreadableBackupKeys: targetWasInvalid ? [STORAGE_KEY] : [],
        unreadableBackupRetained: targetWasInvalid,
        replacedTargetBackupKey: hasRetainedTargetBackup() ? REPLACED_TARGET_BACKUP_KEY : null,
        replacedTargetRetained: hasRetainedTargetBackup()
      });
      lastStorageMigrationReport = report;
      return { project: null, report };
    }

    let rawProject;
    let brandResult;
    let project;
    try {
      rawProject = JSON.parse(legacySource.raw);
      brandResult = migrateBrandDefaults(rawProject);
      project = attachProjectMigrationReports(
        rawProject,
        sanitizeProject(brandResult.project, validIdsOrAdapter),
        brandResult.report
      );
    } catch (error) {
      const report = createStorageMigrationReport("failed-validation", legacySource.key, {
        unresolvedEntries: [{ kind: "legacy-autosave", count: 1 }],
        sourceRetained: true,
        recoverySourceKey: legacySource.key,
        unreadableBackupKeys: targetWasInvalid ? [STORAGE_KEY, legacySource.key] : [legacySource.key],
        unreadableBackupRetained: true
      });
      lastStorageMigrationReport = report;
      return { project: null, report };
    }

    const fieldReport = project.migrationReport.projectFields;
    if (targetWasInvalid && !options.recoverRetainedSource) {
      const report = createStorageMigrationReport("failed-invalid-target", legacySource.key, Object.assign({}, fieldReport, {
        unresolvedEntries: fieldReport.unresolvedEntries.concat([{ kind: "current-target-validation", count: 1 }]),
        backupStatus: "invalid-target-and-source-retained",
        sourceRetained: true,
        recoverySourceKey: legacySource.key,
        unreadableBackupKeys: [STORAGE_KEY],
        unreadableBackupRetained: true
      }));
      lastStorageMigrationReport = report;
      return { project: null, report };
    }
    if (!targetRead.ok) {
      const report = createStorageMigrationReport("failed-read", legacySource.key, Object.assign({}, fieldReport, {
        unresolvedEntries: fieldReport.unresolvedEntries.concat([{ kind: "target-storage", count: 1 }])
      }));
      lastStorageMigrationReport = report;
      return { project: null, report };
    }

    let replacedTargetRetained = false;
    if (options.recoverRetainedSource && targetRead.value !== null) {
      if (!retainReplacedTarget(targetRead.value)) {
        const occupiedRecoverySlot = hasRetainedTargetBackup();
        const report = createStorageMigrationReport(occupiedRecoverySlot ? "failed-backup-slot-occupied" : "failed-backup", legacySource.key, Object.assign({}, fieldReport, {
          unresolvedEntries: fieldReport.unresolvedEntries.concat([{ kind: "replaced-target-backup", count: 1 }]),
          backupStatus: occupiedRecoverySlot ? "replaced-target-retained" : (targetWasInvalid ? "invalid-target-retained" : "target-retained"),
          sourceRetained: true,
          recoverySourceKey: legacySource.key,
          replacedTargetBackupKey: occupiedRecoverySlot ? REPLACED_TARGET_BACKUP_KEY : null,
          replacedTargetRetained: occupiedRecoverySlot
        }));
        lastStorageMigrationReport = report;
        return { project: null, report };
      }
      replacedTargetRetained = true;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (error) {
      const report = createStorageMigrationReport("failed-write", legacySource.key, Object.assign({}, fieldReport, {
        unresolvedEntries: fieldReport.unresolvedEntries.concat([{ kind: "target-storage", count: 1 }]),
        backupStatus: replacedTargetRetained ? "source-and-replaced-target-retained" : "source-retained",
        replacedTargetBackupKey: replacedTargetRetained ? REPLACED_TARGET_BACKUP_KEY : null,
        replacedTargetRetained
      }));
      lastStorageMigrationReport = report;
      return { project: null, report };
    }

    const verification = readStorage(STORAGE_KEY);
    try {
      if (!verification.ok || verification.value === null) throw new Error("verification unavailable");
      sanitizeProject(JSON.parse(verification.value), validIdsOrAdapter);
    } catch (error) {
      const report = createStorageMigrationReport("failed-verification", legacySource.key, Object.assign({}, fieldReport, {
        unresolvedEntries: fieldReport.unresolvedEntries.concat([{ kind: "target-storage", count: 1 }]),
        backupStatus: replacedTargetRetained ? "source-and-replaced-target-retained" : "source-retained",
        replacedTargetBackupKey: replacedTargetRetained ? REPLACED_TARGET_BACKUP_KEY : null,
        replacedTargetRetained
      }));
      lastStorageMigrationReport = report;
      return { project: null, report };
    }

    const successStatus = targetWasInvalid
      ? "recovered-invalid-target"
      : options.recoverRetainedSource ? "recovered-retained-source" : "migrated";
    const report = createStorageMigrationReport(successStatus, legacySource.key, Object.assign({}, fieldReport, {
      backupStatus: replacedTargetRetained ? "source-and-replaced-target-retained" : "source-retained",
      sourceRetained: true,
      recoverySourceKey: legacySource.key,
      replacedTargetBackupKey: replacedTargetRetained ? REPLACED_TARGET_BACKUP_KEY : null,
      replacedTargetRetained
    }));
    report.migrationStateRecorded = writeMigrationState("migrated");
    lastStorageMigrationReport = report;
    return { project: attachStorageMigrationReport(project, report), report };
  }

  function getStorageMigrationReport() {
    return lastStorageMigrationReport;
  }

  function recoverRetainedAutosave(validIdsOrAdapter) {
    return migrateLegacyAutosave(validIdsOrAdapter, { recoverRetainedSource: true });
  }

  function downloadRetainedTargetBackup() {
    const retained = readStorage(REPLACED_TARGET_BACKUP_KEY);
    if (!retained.ok || retained.value === null) return false;
    const blob = new Blob([retained.value], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = brand.defaults.browserRecoveryFilename;
    link.click();
    URL.revokeObjectURL(link.href);
    return true;
  }

  function clearRetainedTargetBackup() {
    try {
      localStorage.removeItem(REPLACED_TARGET_BACKUP_KEY);
    } catch (error) {
      return false;
    }
    const verification = readStorage(REPLACED_TARGET_BACKUP_KEY);
    return verification.ok && verification.value === null;
  }

  function clearRetainedLegacyAutosave() {
    try {
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      return false;
    }
    const verification = findLegacySource();
    return !verification.readFailed && verification.raw === null;
  }

  function protectUnreadableCurrentTarget(targetRead) {
    if (!targetRead || !targetRead.ok) return { ok: false, retained: false };
    const report = lastStorageMigrationReport;
    const flaggedUnreadable = Boolean(report && Array.isArray(report.unreadableBackupKeys) && report.unreadableBackupKeys.includes(STORAGE_KEY));
    const uncertainAfterReadFailure = Boolean(report && report.status === "failed-read" && targetRead.value !== null);
    const deferredValidTarget = Boolean(report && report.protectCurrentTargetBeforeWrite && targetRead.value !== null);
    if ((!flaggedUnreadable && !uncertainAfterReadFailure && !deferredValidTarget) || targetRead.value === null) return { ok: true, retained: false };
    if (!retainReplacedTarget(targetRead.value)) return { ok: false, retained: false };
    if (report) {
      report.replacedTargetBackupKey = REPLACED_TARGET_BACKUP_KEY;
      report.replacedTargetRetained = true;
      report.backupStatus = report.sourceRetained ? "source-and-replaced-target-retained" : "replaced-target-retained";
    }
    return { ok: true, retained: true };
  }

  function finishUnreadableCurrentTargetReplacement() {
    const report = lastStorageMigrationReport;
    if (!report) return;
    if (Array.isArray(report.unreadableBackupKeys)) {
      report.unreadableBackupKeys = report.unreadableBackupKeys.filter((key) => key !== STORAGE_KEY);
      report.unreadableBackupRetained = report.unreadableBackupKeys.length > 0;
    }
    report.protectCurrentTargetBeforeWrite = false;
  }

  function deferCurrentAutosaveReplacement() {
    const current = readStorage(STORAGE_KEY);
    if (!current.ok || current.value === null || !lastStorageMigrationReport) return false;
    lastStorageMigrationReport.protectCurrentTargetBeforeWrite = true;
    return true;
  }

  function prepareCurrentTargetReplacement() {
    const current = readStorage(STORAGE_KEY);
    if (!current.ok) return null;
    return protectUnreadableCurrentTarget(current).ok;
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function autosave(state) {
    try {
      const project = buildProject(state, createRegionAdapter(state.features || []));
      const serialized = JSON.stringify(project);
      const current = readStorage(STORAGE_KEY);
      const protection = protectUnreadableCurrentTarget(current);
      if (!protection.ok) return false;
      localStorage.setItem(STORAGE_KEY, serialized);
      const verification = readStorage(STORAGE_KEY);
      if (!verification.ok || verification.value !== serialized) return false;
      if (protection.retained) finishUnreadableCurrentTargetReplacement();
      writeMigrationState("current");
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadAutosave(validIdsOrAdapter) {
    return migrateLegacyAutosave(validIdsOrAdapter).project;
  }

  function clearAutosave() {
    const legacySource = findLegacySource();
    const hasLegacySource = legacySource.raw !== null;
    const current = readStorage(STORAGE_KEY);
    const protection = protectUnreadableCurrentTarget(current);
    if (!protection.ok) return false;
    if (!writeMigrationState("cleared")) return false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      writeMigrationState("current");
      return false;
    }
    const targetVerification = readStorage(STORAGE_KEY);
    if (!targetVerification.ok || targetVerification.value !== null) return false;
    if (protection.retained) finishUnreadableCurrentTargetReplacement();
    const replacedTargetRetained = hasRetainedTargetBackup();
    lastStorageMigrationReport = createStorageMigrationReport("cleared", legacySource.key, {
      backupStatus: hasLegacySource
        ? (replacedTargetRetained ? "source-and-replaced-target-retained" : "source-retained")
        : (replacedTargetRetained ? "replaced-target-retained" : "not-required"),
      sourceRetained: hasLegacySource,
      recoverySourceKey: legacySource.key,
      replacedTargetBackupKey: replacedTargetRetained ? REPLACED_TARGET_BACKUP_KEY : null,
      replacedTargetRetained,
      migrationStateRecorded: true
    });
    return true;
  }

  window.ProjectStorage = {
    STORAGE_KEY,
    LEGACY_STORAGE_KEYS,
    STORAGE_MIGRATION_VERSION,
    STORAGE_MIGRATION_STATE_KEY,
    REPLACED_TARGET_BACKUP_KEY,
    APP_VERSION,
    PROJECT_SCHEMA,
    PROJECT_FILE_MAX_BYTES,
    MAX_IMPORT_ROWS,
    BOUNDARY_VERSION,
    REGISTRY_VERSION,
    SOURCE_VERSION,
    MAX_LEGEND_ITEMS,
    createRegionAdapter,
    buildProject,
    sanitizeProject,
    attachProjectMigrationReports,
    downloadJson,
    autosave,
    loadAutosave,
    clearAutosave,
    migrateLegacyAutosave,
    recoverRetainedAutosave,
    prepareCurrentTargetReplacement,
    deferCurrentAutosaveReplacement,
    getStorageMigrationReport,
    hasRetainedTargetBackup,
    hasUnreadableBackup,
    downloadUnreadableBackup,
    downloadRetainedTargetBackup,
    clearRetainedTargetBackup,
    clearRetainedLegacyAutosave,
    isColor
  };
})();

