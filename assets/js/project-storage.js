(function () {
  const STORAGE_KEY = "peta-warna-indonesia-autosave-v1";
  const APP_VERSION = "1.0.0";
  const PROJECT_SCHEMA = "1.0";

  function isColor(value) {
    return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
  }

  function sanitizeProject(raw, validIds) {
    if (!raw || typeof raw !== "object") throw new Error("File proyek tidak valid.");
    if (raw.schemaVersion !== PROJECT_SCHEMA) throw new Error("Versi file proyek belum didukung.");
    const highlights = {};
    const seen = new Set();
    const entries = Object.entries(raw.highlights || {});
    if (entries.length > 2000) throw new Error("File proyek terlalu besar.");
    entries.forEach(([id, item]) => {
      if (!validIds.has(id)) return;
      if (seen.has(id)) throw new Error("Ada ID wilayah ganda di file proyek.");
      seen.add(id);
      const color = item && item.color;
      if (!isColor(color)) throw new Error("Ada warna tidak valid di file proyek.");
      highlights[id] = {
        color,
        category: String((item && item.category) || "").slice(0, 80),
        value: String((item && item.value) || "").slice(0, 80)
      };
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
    return {
      appVersion: APP_VERSION,
      schemaVersion: PROJECT_SCHEMA,
      boundaryVersion: String(raw.boundaryVersion || "IDN-ADM2-2020-CODAB-geoboundaries"),
      title: String(raw.title || "Peta Sorotan Wilayah Indonesia").slice(0, 90),
      highlights,
      legend,
      legendVisible: raw.legendVisible !== false,
      legendPosition: String(raw.legendPosition || "bottom-right"),
      groupNames,
      exportSettings: raw.exportSettings || {},
      savedAt: raw.savedAt || new Date().toISOString()
    };
  }

  function buildProject(state) {
    return {
      appVersion: APP_VERSION,
      schemaVersion: PROJECT_SCHEMA,
      boundaryVersion: "IDN-ADM2-2020-CODAB-geoboundaries",
      title: state.title,
      highlights: state.highlights,
      legend: state.legend,
      legendVisible: state.legendVisible,
      legendPosition: state.legendPosition,
      groupNames: state.groupNames || {},
      exportSettings: state.exportSettings || {},
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(buildProject(state)));
      return true;
    } catch (error) {
      return false;
    }
  }

  function loadAutosave(validIds) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return sanitizeProject(JSON.parse(raw), validIds);
  }

  function clearAutosave() {
    localStorage.removeItem(STORAGE_KEY);
  }

  window.ProjectStorage = {
    APP_VERSION,
    PROJECT_SCHEMA,
    buildProject,
    sanitizeProject,
    downloadJson,
    autosave,
    loadAutosave,
    clearAutosave,
    isColor
  };
})();

