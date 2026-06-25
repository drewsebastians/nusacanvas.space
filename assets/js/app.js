(function () {
  const DATA_URL = "./data/indonesia-adm2-simplified.geojson";
  const DETAILED_GEOMETRY_SOURCES = [
    {
      type: "geojson",
      url: "./data/indonesia-adm2-detailed.geojson"
    },
    {
      type: "api",
      url: "https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM2/"
    }
  ];
  const quickColors = ["#4472C4", "#E74C3C", "#70AD47", "#FFC000", "#5B9BD5", "#A64D79", "#00A388", "#7F6000"];
  const state = {
    title: "Peta Sorotan Wilayah Indonesia",
    features: [],
    featureById: new Map(),
    highlights: {},
    legend: [
      { label: "Di atas target", color: "#70AD47" },
      { label: "Perlu perhatian", color: "#FFC000" },
      { label: "Di bawah target", color: "#E74C3C" }
    ],
    legendVisible: true,
    legendPosition: "bottom-right",
    groupNames: {},
    groupMeta: {},
    exportSettings: {},
    undo: []
  };
  let mapApi = null;
  let pendingCsv = null;

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    [
      "projectTitle", "searchInput", "searchResults", "provinceSelect", "regionSelect", "selectedRegion",
      "colorPicker", "quickColors", "categoryInput", "valueInput", "applyColorBtn", "removeColorBtn",
      "undoBtn", "resetBtn", "highlightCount", "highlightList", "showLegend", "legendPosition",
      "groupCount", "groupingList", "legendItems", "addLegendBtn", "csvFile", "previewCsvBtn", "applyCsvBtn", "csvPreview",
      "saveProjectBtn", "openProjectBtn", "projectFile", "clearProjectBtn", "autosaveStatus",
      "exportRatio", "exportLabels", "transparentBg", "pngSize", "exportSvgBtn", "exportPngBtn",
      "fitIndonesiaBtn", "loadingIndicator", "errorArea", "appShell", "controlPanel", "sidebarToggleBtn", "floatingExportBtn"
    ].forEach((id) => { el[id] = document.getElementById(id); });
    mapApi = IndonesiaMap.createMap("map", { onSelect: handleFeatureSelected });
    setupEvents();
    setupColors();
    loadData();
  }

  function setupEvents() {
    el.projectTitle.addEventListener("input", () => { state.title = el.projectTitle.value.trim() || "Peta Sorotan Wilayah Indonesia"; scheduleSave(); });
    el.searchInput.addEventListener("input", renderSearch);
    el.provinceSelect.addEventListener("change", handleProvinceChange);
    el.regionSelect.addEventListener("change", () => selectRegion(el.regionSelect.value, true));
    el.applyColorBtn.addEventListener("click", applySelectedColor);
    el.removeColorBtn.addEventListener("click", removeSelectedColor);
    el.undoBtn.addEventListener("click", undo);
    el.resetBtn.addEventListener("click", resetAll);
    el.showLegend.addEventListener("change", () => { state.legendVisible = el.showLegend.checked; refreshMapLegend(); scheduleSave(); });
    el.legendPosition.addEventListener("change", () => { state.legendPosition = el.legendPosition.value; refreshMapLegend(); scheduleSave(); });
    el.addLegendBtn.addEventListener("click", () => { state.legend.push({ label: "Legenda baru", color: el.colorPicker.value }); renderLegendEditor(); refreshMapLegend(); scheduleSave(); });
    el.previewCsvBtn.addEventListener("click", previewCsv);
    el.applyCsvBtn.addEventListener("click", applyCsv);
    el.saveProjectBtn.addEventListener("click", saveProject);
    el.openProjectBtn.addEventListener("click", () => el.projectFile.click());
    el.projectFile.addEventListener("change", openProject);
    el.clearProjectBtn.addEventListener("click", clearProject);
    el.exportSvgBtn.addEventListener("click", exportSvg);
    el.exportPngBtn.addEventListener("click", exportPng);
    el.sidebarToggleBtn.addEventListener("click", toggleSidebar);
    el.floatingExportBtn.addEventListener("click", exportPng);
    el.fitIndonesiaBtn.addEventListener("click", () => mapApi.fitIndonesia());
    window.addEventListener("resize", () => mapApi.invalidate());
  }

  function toggleSidebar() {
    setSidebarCollapsed(!el.appShell.classList.contains("sidebar-collapsed"));
  }

  function setSidebarCollapsed(collapsed) {
    el.appShell.classList.toggle("sidebar-collapsed", collapsed);
    el.sidebarToggleBtn.setAttribute("aria-expanded", String(!collapsed));
    el.controlPanel.setAttribute("aria-hidden", String(collapsed));
    el.floatingExportBtn.hidden = !collapsed;
    // Leaflet needs a size refresh after the grid column changes.
    setTimeout(() => mapApi.invalidate(), 220);
  }

  function setupColors() {
    quickColors.forEach((color) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.style.background = color;
      button.title = color;
      button.setAttribute("aria-label", "Pilih warna " + color);
      button.addEventListener("click", () => { el.colorPicker.value = color; });
      el.quickColors.appendChild(button);
    });
  }

  async function loadData() {
    try {
      const response = await fetch(DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("Data peta tidak dapat dimuat.");
      const baseCollection = await response.json();
      const detailedCollection = await loadDetailedGeometry();
      const merged = detailedCollection ? mergeDetailedGeometry(baseCollection, detailedCollection) : { collection: baseCollection, matched: 0 };
      const collection = merged.collection;
      state.features = collection.features || [];
      state.featureById = new Map(state.features.map((feature) => [feature.properties.region_id, feature]));
      mapApi.render(collection);
      mapApi.setHighlights(state.highlights);
      populateFilters();
      renderLegendEditor(false);
      restoreAutosave();
      renderHighlightList();
      renderGroupingEditor();
      refreshMapLegend();
      el.loadingIndicator.textContent = merged.matched > 450
        ? `${state.features.length} wilayah dimuat dengan geometri detail.`
        : `${state.features.length} wilayah dimuat.`;
    } catch (error) {
      showError(error.message);
      el.loadingIndicator.textContent = "Gagal memuat peta.";
    }
  }

  async function loadDetailedGeometry() {
    for (const source of DETAILED_GEOMETRY_SOURCES) {
      try {
        if (source.type === "api") {
          const metadataResponse = await fetch(source.url, { cache: "force-cache" });
          if (!metadataResponse.ok) throw new Error("Metadata geometri detail tidak tersedia.");
          const metadata = await metadataResponse.json();
          const downloadUrl = metadata.gjDownloadURL || metadata.simplifiedGeometryGeoJSON;
          if (!downloadUrl) throw new Error("URL GeoJSON detail tidak ditemukan.");
          return await fetchGeoJson(downloadUrl);
        }
        return await fetchGeoJson(source.url);
      } catch (error) {
        // Try the next public source; the local simplified map remains the final fallback.
      }
    }
    return null;
  }

  async function fetchGeoJson(url) {
    const response = await fetch(url, { cache: "force-cache" });
    if (!response.ok) throw new Error("Geometri detail tidak dapat dimuat.");
    const text = await response.text();
    if (/^version https:\/\/git-lfs.github.com\/spec\/v1/.test(text.trim())) {
      throw new Error("URL mengarah ke Git LFS pointer, bukan GeoJSON asli.");
    }
    const collection = JSON.parse(text);
    if (!collection || collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
      throw new Error("Format geometri detail tidak valid.");
    }
    return collection;
  }

  function mergeDetailedGeometry(baseCollection, detailedCollection) {
    const detailedById = new Map();
    (detailedCollection.features || []).forEach((feature) => {
      const id = geometrySourceId(feature.properties || {});
      if (id && feature.geometry) detailedById.set(id, feature.geometry);
    });
    let matched = 0;
    const features = (baseCollection.features || []).map((feature) => {
      const id = geometrySourceId(feature.properties || {});
      const geometry = detailedById.get(id);
      if (!geometry) return feature;
      matched += 1;
      return Object.assign({}, feature, { geometry });
    });
    return {
      collection: matched > 450 ? Object.assign({}, baseCollection, { features }) : baseCollection,
      matched
    };
  }

  function geometrySourceId(properties) {
    const raw = properties.geometry_source_id || properties.shapeID || properties.shapeId || properties.shape_id || properties.ShapeID || properties.id || "";
    return String(raw).replace(/^gb-/i, "").trim();
  }

  function restoreAutosave() {
    try {
      const validIds = new Set(state.features.map((feature) => feature.properties.region_id));
      const saved = ProjectStorage.loadAutosave(validIds);
      if (saved && confirm("Ada autosave di browser ini. Buka autosave?")) {
        applyProject(saved);
      }
    } catch (error) {
      ProjectStorage.clearAutosave();
    }
  }

  function populateFilters() {
    const provinces = Array.from(new Set(state.features.map((f) => f.properties.province_name).filter(Boolean))).sort();
    el.provinceSelect.innerHTML = `<option value="__all">Semua provinsi</option><option value="__unresolved">Belum terhubung provinsi</option>` + provinces.map((p) => `<option value="${escapeAttr(p)}">${escapeHtml(p)}</option>`).join("");
    renderRegionOptions();
  }

  function renderRegionOptions() {
    const province = el.provinceSelect.value;
    const features = filteredFeatures(province);
    el.regionSelect.innerHTML = `<option value="">Pilih wilayah...</option>` + features.map((feature) => {
      const p = feature.properties;
      const suffix = p.province_name ? ` - ${p.province_name}` : " - belum terhubung provinsi";
      return `<option value="${escapeAttr(p.region_id)}">${escapeHtml(p.display_name + suffix)}</option>`;
    }).join("");
  }

  function filteredFeatures(province) {
    return state.features.filter((feature) => {
      if (province === "__unresolved") return !feature.properties.province_name;
      if (!province || province === "__all") return true;
      return feature.properties.province_name === province;
    }).sort((a, b) => displayName(a).localeCompare(displayName(b), "id"));
  }

  function handleProvinceChange() {
    renderRegionOptions();
    mapApi.fitProvince(el.provinceSelect.value);
  }

  function renderSearch() {
    const query = CsvImport.normalizeText(el.searchInput.value);
    if (!query) {
      el.searchResults.style.display = "none";
      el.searchResults.innerHTML = "";
      return;
    }
    const results = state.features.filter((feature) => {
      const p = feature.properties;
      return CsvImport.normalizeText([p.display_name, p.province_name, p.official_code, p.geometry_source_name].join(" ")).includes(query);
    }).slice(0, 20);
    el.searchResults.innerHTML = results.map((feature) => {
      const p = feature.properties;
      return `<button type="button" data-id="${escapeAttr(p.region_id)}" role="option">${escapeHtml(displayName(feature))}</button>`;
    }).join("");
    el.searchResults.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", () => {
        selectRegion(button.dataset.id, true);
        el.searchResults.style.display = "none";
      });
    });
    el.searchResults.style.display = results.length ? "block" : "none";
  }

  function displayName(feature) {
    const p = feature.properties;
    const province = p.province_name || "Provinsi belum terhubung";
    return `${p.display_name} - ${province}`;
  }

  function selectRegion(id, zoom) {
    if (!id || !state.featureById.has(id)) return;
    mapApi.select(id, false);
    if (zoom) mapApi.zoomTo(id);
    handleFeatureSelected(state.featureById.get(id));
    el.regionSelect.value = id;
  }

  function handleFeatureSelected(feature) {
    const p = feature.properties;
    el.selectedRegion.innerHTML = `<strong>${escapeHtml(p.display_name)}</strong><br>${escapeHtml(p.province_name || "Provinsi belum terhubung")}<br><span class="tag">${escapeHtml(p.official_code || p.match_status)}</span>`;
    el.categoryInput.value = state.highlights[p.region_id]?.category || "";
    el.valueInput.value = state.highlights[p.region_id]?.value || "";
    if (state.highlights[p.region_id]) el.colorPicker.value = state.highlights[p.region_id].color;
  }

  function applySelectedColor() {
    const id = mapApi.selectedId;
    if (!id) return showError("Pilih wilayah terlebih dahulu.");
    pushUndo();
    state.highlights[id] = {
      color: el.colorPicker.value,
      category: el.categoryInput.value.trim(),
      value: el.valueInput.value.trim()
    };
    updateAfterHighlightChange();
  }

  function removeSelectedColor() {
    const id = mapApi.selectedId;
    if (!id) return showError("Pilih wilayah terlebih dahulu.");
    if (!state.highlights[id]) return;
    pushUndo();
    delete state.highlights[id];
    updateAfterHighlightChange();
  }

  function pushUndo() {
    state.undo.push(JSON.stringify(state.highlights));
    if (state.undo.length > 30) state.undo.shift();
  }

  function undo() {
    const previous = state.undo.pop();
    if (!previous) return;
    state.highlights = JSON.parse(previous);
    updateAfterHighlightChange();
  }

  function resetAll() {
    if (!Object.keys(state.highlights).length) return;
    if (!confirm("Hapus semua warna dari peta?")) return;
    pushUndo();
    state.highlights = {};
    updateAfterHighlightChange();
  }

  function updateAfterHighlightChange() {
    mapApi.setHighlights(state.highlights);
    renderHighlightList();
    renderGroupingEditor();
    renderLegendEditor(false);
    refreshMapLegend();
    scheduleSave();
  }

  function renderHighlightList() {
    const ids = Object.keys(state.highlights);
    el.highlightCount.textContent = ids.length;
    if (!ids.length) {
      el.highlightList.innerHTML = `<p class="status-line">Belum ada wilayah disorot.</p>`;
      return;
    }
    el.highlightList.innerHTML = ids.sort((a, b) => displayName(state.featureById.get(a)).localeCompare(displayName(state.featureById.get(b)), "id")).map((id) => {
      const feature = state.featureById.get(id);
      const item = state.highlights[id];
      return `<div class="highlight-item"><span class="color-chip" style="background:${item.color}"></span><button type="button" class="secondary" data-zoom="${escapeAttr(id)}">${escapeHtml(displayName(feature))}</button><button type="button" class="danger" data-remove="${escapeAttr(id)}">Hapus</button></div>`;
    }).join("");
    el.highlightList.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => selectRegion(button.dataset.zoom, true)));
    el.highlightList.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => {
      pushUndo();
      delete state.highlights[button.dataset.remove];
      updateAfterHighlightChange();
    }));
  }

  function renderLegendEditor(save = true) {
    el.showLegend.checked = state.legendVisible;
    el.legendPosition.value = state.legendPosition;
    el.legendItems.innerHTML = state.legend.map((item, index) => `
      <div class="legend-item">
        <input type="color" value="${escapeAttr(item.color)}" data-legend-color="${index}" aria-label="Warna legenda">
        <input type="text" value="${escapeAttr(item.label)}" data-legend-label="${index}" aria-label="Nama legenda">
        <button type="button" class="secondary" data-legend-up="${index}" aria-label="Naik">↑</button>
        <button type="button" class="danger" data-legend-remove="${index}" aria-label="Hapus">×</button>
      </div>`).join("");
    el.legendItems.querySelectorAll("[data-legend-color]").forEach((input) => input.addEventListener("input", () => { state.legend[Number(input.dataset.legendColor)].color = input.value; refreshMapLegend(); scheduleSave(); }));
    el.legendItems.querySelectorAll("[data-legend-label]").forEach((input) => input.addEventListener("input", () => { state.legend[Number(input.dataset.legendLabel)].label = input.value.slice(0, 80); refreshMapLegend(); scheduleSave(); }));
    el.legendItems.querySelectorAll("[data-legend-up]").forEach((button) => button.addEventListener("click", () => {
      const i = Number(button.dataset.legendUp);
      if (i > 0) [state.legend[i - 1], state.legend[i]] = [state.legend[i], state.legend[i - 1]];
      renderLegendEditor();
      refreshMapLegend();
    }));
    el.legendItems.querySelectorAll("[data-legend-remove]").forEach((button) => button.addEventListener("click", () => {
      state.legend.splice(Number(button.dataset.legendRemove), 1);
      renderLegendEditor();
      refreshMapLegend();
    }));
    if (save) scheduleSave();
  }

  function getColorGroups() {
    // Group highlighted regions by exact hex color so the legend can show one row per color.
    const groups = new Map();
    Object.keys(state.highlights).forEach((id) => {
      const item = state.highlights[id];
      const color = normalizeColor(item.color);
      if (!groups.has(color)) groups.set(color, { color, ids: [] });
      groups.get(color).ids.push(id);
    });
    return Array.from(groups.values()).sort((a, b) => getGroupLabel(a).localeCompare(getGroupLabel(b), "id"));
  }

  function getGroupLabel(group) {
    const parts = [(state.groupNames[group.color] || defaultGroupName(group.color)).trim()];
    const meta = state.groupMeta[group.color] || {};
    if (meta.category) parts.push(meta.category);
    if (meta.value) parts.push(meta.value);
    return parts.join(" - ");
  }

  function getGroupName(group) {
    return (state.groupNames[group.color] || defaultGroupName(group.color)).trim();
  }

  function defaultGroupName(color) {
    const names = {
      "#4472C4": "Group Warna Biru",
      "#5B9BD5": "Group Warna Biru Muda",
      "#E74C3C": "Group Warna Merah",
      "#70AD47": "Group Warna Hijau",
      "#FFC000": "Group Warna Kuning",
      "#A64D79": "Group Warna Ungu",
      "#00A388": "Group Warna Toska",
      "#7F6000": "Group Warna Coklat"
    };
    return names[color] || `Group Warna ${color}`;
  }

  function normalizeColor(color) {
    return String(color || "#4472C4").toUpperCase();
  }

  function renderGroupingEditor() {
    // The grouping editor is rebuilt from the current highlights, so removed colors disappear automatically.
    const groups = getColorGroups();
    el.groupCount.textContent = groups.length;
    if (!groups.length) {
      el.groupingList.innerHTML = `<p class="status-line">Belum ada grup warna.</p>`;
      return;
    }
    el.groupingList.innerHTML = groups.map((group) => {
      const names = group.ids.map((id) => displayName(state.featureById.get(id))).sort((a, b) => a.localeCompare(b, "id"));
      const meta = state.groupMeta[group.color] || {};
      return `<div class="grouping-item">
        <span class="color-chip" style="background:${group.color}"></span>
        <div>
          <label for="group-${escapeAttr(group.color.slice(1))}">Nama grup</label>
          <input id="group-${escapeAttr(group.color.slice(1))}" type="text" value="${escapeAttr(getGroupName(group))}" maxlength="80" data-group-name="${escapeAttr(group.color)}">
          <label for="group-category-${escapeAttr(group.color.slice(1))}">Kategori</label>
          <input id="group-category-${escapeAttr(group.color.slice(1))}" type="text" value="${escapeAttr(meta.category || "")}" maxlength="80" placeholder="Opsional" data-group-category="${escapeAttr(group.color)}">
          <label for="group-value-${escapeAttr(group.color.slice(1))}">Nilai</label>
          <input id="group-value-${escapeAttr(group.color.slice(1))}" type="text" value="${escapeAttr(meta.value || "")}" maxlength="80" placeholder="Opsional" data-group-value="${escapeAttr(group.color)}">
          <div class="grouping-meta">${group.ids.length} wilayah: ${escapeHtml(names.join(", "))}</div>
        </div>
      </div>`;
    }).join("");
    el.groupingList.querySelectorAll("[data-group-name]").forEach((input) => {
      input.addEventListener("input", () => {
        const color = normalizeColor(input.dataset.groupName);
        state.groupNames[color] = input.value.trim().slice(0, 80) || defaultGroupName(color);
        refreshMapLegend();
        scheduleSave();
      });
    });
    el.groupingList.querySelectorAll("[data-group-category], [data-group-value]").forEach((input) => {
      input.addEventListener("input", () => {
        const color = normalizeColor(input.dataset.groupCategory || input.dataset.groupValue);
        const meta = state.groupMeta[color] || { category: "", value: "" };
        if (input.dataset.groupCategory) meta.category = input.value.trim().slice(0, 80);
        if (input.dataset.groupValue) meta.value = input.value.trim().slice(0, 80);
        state.groupMeta[color] = meta;
        refreshMapLegend();
        scheduleSave();
      });
    });
  }

  function buildLegendItems() {
    // Highlighted colors override the manual legend and use the editable group labels.
    const grouped = getColorGroups().map((group) => {
      return {
        color: group.color,
        label: getGroupLabel(group)
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "id"));
    return grouped.length ? grouped : state.legend;
  }

  function refreshMapLegend() {
    if (!mapApi) return;
    mapApi.setLegend(buildLegendItems(), state.legendVisible, state.legendPosition);
  }

  function buildIndexes() {
    const byCode = new Map();
    const byProvinceName = new Map();
    state.features.forEach((feature) => {
      const p = feature.properties;
      if (p.official_code) byCode.set(CsvImport.normalizeCode(p.official_code), { id: p.region_id, feature });
      if (p.province_name && p.region_name) {
        const key = CsvImport.normalizeText(p.province_name) + "|" + CsvImport.normalizeText(p.region_name);
        if (!byProvinceName.has(key)) byProvinceName.set(key, []);
        byProvinceName.get(key).push({ id: p.region_id, feature });
      }
    });
    return { byCode, byProvinceName };
  }

  async function previewCsv() {
    const file = el.csvFile.files[0];
    if (!file) return showError("Pilih file CSV terlebih dahulu.");
    if (!file.name.toLowerCase().endsWith(".csv") || file.size > 2_500_000) return showError("Gunakan file .csv dengan ukuran wajar.");
    try {
      const text = await file.text();
      pendingCsv = CsvImport.validateAndMatch(text, buildIndexes());
      renderCsvPreview();
      el.applyCsvBtn.disabled = !pendingCsv.valid.length;
    } catch (error) {
      showError(error.message);
    }
  }

  function renderCsvPreview() {
    const rows = pendingCsv.all.slice(0, 30).map((item) => {
      const status = item.errors.length ? item.errors.join("; ") : "Siap diterapkan";
      const target = item.matched ? displayName(item.matched.feature) : "-";
      return `<tr><td>${item.rowNumber}</td><td>${escapeHtml(target)}</td><td>${escapeHtml(item.record.Color || "")}</td><td>${escapeHtml(status)}</td></tr>`;
    }).join("");
    const errorButton = pendingCsv.invalid.length ? `<button type="button" class="secondary" id="downloadCsvErrors">Unduh laporan error</button>` : "";
    el.csvPreview.innerHTML = `<div class="preview-block"><strong>${pendingCsv.valid.length}</strong> valid, <strong>${pendingCsv.invalid.length}</strong> perlu diperiksa.${errorButton}<table class="preview-table"><thead><tr><th>Baris</th><th>Wilayah</th><th>Warna</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const button = document.getElementById("downloadCsvErrors");
    if (button) button.addEventListener("click", () => downloadText("laporan-error-impor.csv", CsvImport.buildErrorCsv(pendingCsv), "text/csv"));
  }

  function applyCsv() {
    if (!pendingCsv) return;
    pushUndo();
    pendingCsv.valid.forEach((item) => {
      state.highlights[item.matched.id] = {
        color: item.color,
        category: item.record.Category,
        value: item.record.Value
      };
    });
    updateAfterHighlightChange();
    el.csvPreview.insertAdjacentHTML("afterbegin", `<p class="status-line">${pendingCsv.valid.length} baris diterapkan.</p>`);
  }

  function saveProject() {
    ProjectStorage.downloadJson("peta-warna-indonesia-project.json", ProjectStorage.buildProject(state));
  }

  async function openProject() {
    const file = el.projectFile.files[0];
    if (!file) return;
    if (file.size > 1_000_000) return showError("File proyek terlalu besar.");
    try {
      const data = JSON.parse(await file.text());
      const validIds = new Set(state.features.map((feature) => feature.properties.region_id));
      applyProject(ProjectStorage.sanitizeProject(data, validIds));
    } catch (error) {
      showError(error.message);
    } finally {
      el.projectFile.value = "";
    }
  }

  function applyProject(project) {
    state.title = project.title;
    state.highlights = project.highlights;
    state.legend = project.legend.length ? project.legend : state.legend;
    state.legendVisible = project.legendVisible;
    state.legendPosition = project.legendPosition;
    state.groupNames = project.groupNames || {};
    state.groupMeta = project.groupMeta || {};
    el.projectTitle.value = state.title;
    updateAfterHighlightChange();
    renderLegendEditor(false);
    el.autosaveStatus.textContent = "Proyek dibuka di browser ini.";
  }

  function clearProject() {
    if (!confirm("Bersihkan proyek dan autosave di browser ini?")) return;
    pushUndo();
    state.highlights = {};
    state.groupNames = {};
    state.groupMeta = {};
    ProjectStorage.clearAutosave();
    updateAfterHighlightChange();
    el.autosaveStatus.textContent = "Autosave dibersihkan.";
  }

  function scheduleSave() {
    if (!state.features.length) return;
    const ok = ProjectStorage.autosave(state);
    el.autosaveStatus.textContent = ok ? "Autosave tersimpan di browser ini." : "Autosave tidak tersedia.";
  }

  function exportSvg() {
    const payload = getExportPayload();
    MapExport.exportSvg(payload.features, state, {
      ratio: el.exportRatio.value,
      labels: el.exportLabels.checked,
      transparent: el.transparentBg.checked,
      viewBounds: payload.viewBounds,
      legendFeatures: state.features
    });
  }

  async function exportPng() {
    el.loadingIndicator.textContent = "Membuat PNG...";
    try {
      const payload = getExportPayload();
      await MapExport.exportPng(payload.features, state, {
        pngSize: el.pngSize.value,
        ratio: el.exportRatio.value,
        labels: el.exportLabels.checked,
        transparent: el.transparentBg.checked,
        viewBounds: payload.viewBounds,
        legendFeatures: state.features
      });
      el.loadingIndicator.textContent = "PNG selesai dibuat.";
    } catch (error) {
      showError("PNG gagal dibuat: " + error.message);
      el.loadingIndicator.textContent = "Ekspor PNG gagal.";
    }
  }

  function getExportPayload() {
    const view = mapApi.getCurrentView();
    const features = view.visibleIds.map((id) => state.featureById.get(id)).filter(Boolean);
    return {
      // Export follows the user's current zoom and pan position for every export ratio.
      features: features.length ? features : state.features,
      viewBounds: view.bounds
    };
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function showError(message) {
    el.errorArea.textContent = message;
    setTimeout(() => { el.errorArea.textContent = ""; }, 7000);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
