(function () {
  const STORAGE_KEY = "peta-warna-indonesia-autosave-v1";
  const APP_VERSION = "1.0.0";
  const PROJECT_SCHEMA = "1.1";
  const LEGACY_SCHEMAS = new Set(["1.0"]);
  const BOUNDARY_VERSION = "IDN-ADM2-2020-geoboundaries-22746128";
  const REGISTRY_VERSION = "IDN-ADM-REGISTRY-v1-2025-06-23";
  const SOURCE_VERSION = "geoBoundaries-IDN-ADM2-22746128 + Kepmendagri-300.2.2-2138/2025 amended 300.2.2-2430/2025";
  const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

  function isColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
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
    if (depth > 25) throw new Error("Struktur file proyek terlalu dalam.");
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      if (value.length > 5000) throw new Error("File proyek terlalu besar.");
      value.forEach((item) => ensureSafeObject(item, depth + 1));
      return;
    }
    const keys = Object.keys(value);
    if (keys.length > 5000) throw new Error("File proyek terlalu besar.");
    keys.forEach((key) => {
      if (DANGEROUS_KEYS.has(key)) throw new Error("File proyek mengandung struktur tidak aman.");
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
    if (!isColor(color)) throw new Error("Ada warna tidak valid di file proyek.");
    return {
      color,
      category: String((item && item.category) || "").slice(0, 80),
      value: String((item && item.value) || "").slice(0, 80)
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
    if (!raw || typeof raw !== "object") throw new Error("File proyek tidak valid.");
    ensureSafeObject(raw);
    const schemaVersion = String(raw.schemaVersion || "");
    if (schemaVersion !== PROJECT_SCHEMA && !LEGACY_SCHEMAS.has(schemaVersion)) throw new Error("Versi file proyek belum didukung.");
    const adapter = normalizeAdapter(validIdsOrAdapter);
    const highlights = {};
    const unresolvedHighlights = {};
    const regionRefs = {};
    const seen = new Set();
    const entries = Object.entries(raw.highlights || {});
    if (entries.length > 2000) throw new Error("File proyek terlalu besar.");
    const migrationReport = emptyMigrationReport(schemaVersion);
    entries.forEach(([id, item]) => {
      if (seen.has(id)) throw new Error("Ada ID wilayah ganda di file proyek.");
      seen.add(id);
      const highlight = sanitizeHighlight(item);
      const ref = adapter.get(id);
      if (!ref) {
        unresolvedHighlights[id] = highlight;
        migrationReport.missing.push({ legacyRegionId: id, reason: "ID wilayah tidak ditemukan di snapshot geometri aktif." });
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
        migrationReport.ambiguous.push({ legacyRegionId: id, canonicalRegionId: ref.canonicalRegionId, reason: "Metadata resmi ambigu; warna tetap dipertahankan pada geometri." });
      } else {
        migrationReport.mapped.push({ legacyRegionId: id, canonicalRegionId: ref.canonicalRegionId });
      }
    });
    const legend = Array.isArray(raw.legend) ? raw.legend.filter((item) => item && isColor(item.color)).slice(0, 20).map((item) => ({
      label: String(item.label || "Legenda").slice(0, 80),
      color: item.color
    })) : [];
    const groupNames = {};
    Object.entries(raw.groupNames || {}).slice(0, 200).forEach(([color, label]) => {
      const normalizedColor = String(color || "").toUpperCase();
      if (isColor(normalizedColor)) groupNames[normalizedColor] = String(label || "").slice(0, 80);
    });
    const groupMeta = {};
    Object.entries(raw.groupMeta || {}).slice(0, 200).forEach(([color, meta]) => {
      const normalizedColor = String(color || "").toUpperCase();
      if (!isColor(normalizedColor) || !meta || typeof meta !== "object") return;
      groupMeta[normalizedColor] = {
        category: String(meta.category || "").slice(0, 80),
        value: String(meta.value || "").slice(0, 80)
      };
    });
    return {
      appVersion: APP_VERSION,
      schemaVersion: PROJECT_SCHEMA,
      boundaryVersion: BOUNDARY_VERSION,
      registryVersion: REGISTRY_VERSION,
      sourceVersion: SOURCE_VERSION,
      title: String(raw.title || "Peta Sorotan Wilayah Indonesia").slice(0, 90),
      highlights,
      regionRefs,
      unresolvedHighlights,
      legend,
      legendVisible: raw.legendVisible !== false,
      legendPosition: String(raw.legendPosition || "bottom-right"),
      groupNames,
      groupMeta,
      exportSettings: raw.exportSettings || {},
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
    return {
      appVersion: APP_VERSION,
      schemaVersion: PROJECT_SCHEMA,
      boundaryVersion: BOUNDARY_VERSION,
      registryVersion: REGISTRY_VERSION,
      sourceVersion: SOURCE_VERSION,
      title: state.title,
      highlights: state.highlights,
      regionRefs: buildRegionRefs(state, adapter || createRegionAdapter(state.features || [])),
      unresolvedHighlights: state.unresolvedHighlights || {},
      legend: state.legend,
      legendVisible: state.legendVisible,
      legendPosition: state.legendPosition,
      groupNames: state.groupNames || {},
      groupMeta: state.groupMeta || {},
      exportSettings: state.exportSettings || {},
      migrationReport: state.migrationReport || null,
      savedAt: new Date().toISOString()
    };
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildProject(state, createRegionAdapter(state.features || []))));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadAutosave(validIdsOrAdapter) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeProject(JSON.parse(raw), validIdsOrAdapter);
  }

  function clearAutosave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.ProjectStorage = {
    APP_VERSION,
    PROJECT_SCHEMA,
    BOUNDARY_VERSION,
    REGISTRY_VERSION,
    SOURCE_VERSION,
    createRegionAdapter,
    buildProject,
    sanitizeProject,
    downloadJson,
    autosave,
    loadAutosave,
    clearAutosave,
    isColor
  };
})();

