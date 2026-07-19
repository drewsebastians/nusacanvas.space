(function () {
  // The product shell lives at the root while the legacy Batch 2 workspace is
  // intentionally served from /workspace/. Keep data and lazy engines rooted
  // at the static app origin without duplicating either asset tree.
  const RUNTIME_BASE = window.location.pathname.startsWith("/workspace/") ? "../" : "./";
  const boundaryProviderApi = window.NusaCanvasBoundaryProvider;
  if (!boundaryProviderApi || typeof boundaryProviderApi.createCurrentBoundaryProvider !== "function") {
    throw new Error("Boundary provider metadata is required before the workspace can start.");
  }
  // The provider is the single owner of local geometry paths, checksums,
  // provenance, and boundary version. Matching continues to use stable IDs.
  const boundaryProvider = boundaryProviderApi.createCurrentBoundaryProvider({ baseUrl: RUNTIME_BASE });
  const BOUNDARY_VERSION = boundaryProvider.getVersion();
  const REGISTRY_VERSION = boundaryProvider.getManifest().canonicalRegistryVersion;
  const brand = window.ProductBrand;
  if (!brand) throw new Error("Product brand configuration is required.");
  const brandMigration = window.ProductBrandMigration;
  if (!brandMigration) throw new Error("Product brand migration is required.");
  const defaultLegend = () => [
    { label: "Above target", color: "#087F73" },
    { label: "Needs attention", color: "#D58A16" },
    { label: "Below target", color: "#2D79B7" }
  ];
  const manualPalettes = {
    nusacanvas: {
      label: "NusaCanvas",
      colors: [["#087F73", "Teal"], ["#2D79B7", "Blue"], ["#194F68", "Deep blue"], ["#D58A16", "Amber"], ["#6E55A5", "Violet"], ["#45A99B", "Sea green"]]
    },
    office: {
      label: "Office classic",
      colors: [["#4472C4", "Office blue"], ["#ED7D31", "Office orange"], ["#A5A5A5", "Office gray"], ["#FFC000", "Office gold"], ["#5B9BD5", "Office light blue"], ["#70AD47", "Office green"]]
    },
    coastal: {
      label: "Coastal calm",
      colors: [["#174A5B", "Deep ocean"], ["#2B7A78", "Lagoon"], ["#4CA6A8", "Aqua"], ["#8BC6C5", "Sea glass"], ["#E1B44B", "Sand"], ["#D97A43", "Coral"]]
    },
    earth: {
      label: "Earth and terrain",
      colors: [["#486B42", "Forest"], ["#7D8C3E", "Olive"], ["#C39B3A", "Ochre"], ["#B8643B", "Terracotta"], ["#7B4D37", "Earth"], ["#D8C59D", "Limestone"]]
    }
  };
  const visualizationPalettes = {
    qualitative: [["safe-default", "Accessible colors"], ["office", "Office classic"], ["coastal", "Coastal calm"], ["earth", "Earth and terrain"]],
    sequential: [["blue", "Blue"], ["teal", "Teal"], ["green", "Green"], ["purple", "Purple"], ["amber", "Amber"]],
    diverging: [["blue-orange", "Blue to orange"], ["teal-rose", "Teal to rose"], ["purple-green", "Purple to green"]]
  };
  const productText = (key, values) => window.ProductContent
    ? window.ProductContent.text(key, values)
    : key;
  const state = {
    title: brand.defaults.projectTitle,
    features: [],
    featureById: new Map(),
    highlights: {},
    manualHighlights: {},
    legend: defaultLegend(),
    legendVisible: true,
    legendPosition: "bottom-right",
    groupNames: {},
    groupMeta: {},
    importCorrections: {},
    exportSettings: {},
    exportMeta: { subtitle: "", source: "", period: "", footnote: "", legendTitle: "Legend", filenameSlug: brand.defaults.exportFilenamePrefix },
    unresolvedHighlights: {},
    migrationReport: null,
    storageMigrationReport: null,
    workflowStage: "input",
    uiMode: "basic",
    importRows: [],
    selectedDataRow: null,
    visualization: null,
    presentationView: false,
    highDetailCollection: null,
    highDetailFeatureById: new Map(),
    undo: []
  };
  let mapApi = null;
  let pendingCsv = null;
  let pendingXlsx = null;
  let pendingImportSignal = null;
  let provinceDetailRequest = null;
  let provinceDetailRequestId = 0;
  let matchingEnginePromise = null;
  let visualizationEnginePromise = null;

  const el = {};
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    brand.apply(document);
    if (window.ProductContent) window.ProductContent.apply(document);
    [
      "projectTitle", "searchInput", "searchResults", "provinceSelect", "regionSelect", "selectedRegion",
      "colorPicker", "colorValue", "manualPalette", "colorPalette", "categoryInput", "valueInput", "applyColorBtn", "removeColorBtn",
      "undoBtn", "resetBtn", "highlightCount", "highlightList", "labelDensity", "presentationView", "showLegend", "legendPosition",
      "groupCount", "groupingList", "legendItems", "addLegendBtn", "importPaste", "csvFile", "xlsxSheet", "importDelimiter",
      "importLocale", "previewCsvBtn", "applyCsvBtn", "cancelImportBtn", "importMapping", "csvPreview",
      "saveProjectBtn", "openProjectBtn", "projectFile", "clearProjectBtn", "recoverLegacyAutosaveBtn", "deleteLegacyAutosaveBtn", "downloadStorageRecoveryBtn", "deleteStorageRecoveryBtn", "downloadUnreadableTargetBtn", "downloadUnreadableLegacyBtn", "autosaveStatus",
      "migrationReportBtn", "dataTruthBadge",
      "exportRatio", "exportExtent", "exportLabels", "transparentBg", "exportHighDetail", "pngSize", "exportSvgBtn", "exportPngBtn", "exportPdfBtn", "exportMappingBtn", "exportSubtitle", "exportSource", "exportPeriod", "exportFootnote", "exportLegendTitle", "exportFilenameSlug",
      "fitIndonesiaBtn", "loadingIndicator", "errorArea", "appShell", "controlPanel", "sidebarToggleBtn", "floatingExportBtn",
      "workflowSteps", "workflowStatus", "basicModeBtn", "advancedModeBtn", "exampleBtn", "advancedImportOptions", "dataTablePanel", "dataTable", "dataTableFilter", "dataTableSort", "dataTableCount", "dataTableEmpty", "dataTableAnnouncement", "mapSelectionStatus",
      "vizMode", "vizClasses", "vizPalette", "vizReverse", "vizCenter", "vizBreaks", "vizNumberFormat", "vizPreviewBtn", "vizApplyBtn", "vizSummary", "vizLegendPreview"
    ].forEach((id) => { el[id] = document.getElementById(id); });
    mapApi = IndonesiaMap.createMap("map", { onSelect: handleFeatureSelected, onDetailViewportRequest: handleDetailViewportRequest });
    setupEvents();
    setupColorPalette();
    setupVisualizationControls();
    renderWorkflow();
    setMode("basic");
    loadData();
  }

  function setupEvents() {
    el.projectTitle.addEventListener("input", () => { state.title = el.projectTitle.value.trim() || brand.defaults.projectTitle; scheduleSave(); });
    ["exportSubtitle", "exportSource", "exportPeriod", "exportFootnote", "exportLegendTitle", "exportFilenameSlug"].forEach((id) => el[id].addEventListener("input", () => { state.exportMeta[id.replace("export", "").replace(/^./, (char) => char.toLowerCase())] = el[id].value.slice(0, id === "exportFilenameSlug" ? 80 : 180); scheduleSave(); }));
    el.basicModeBtn.addEventListener("click", () => setMode("basic"));
    el.advancedModeBtn.addEventListener("click", () => setMode("advanced"));
    el.exampleBtn.addEventListener("click", useExample);
    el.vizPreviewBtn.addEventListener("click", previewVisualization);
    el.vizApplyBtn.addEventListener("click", applyVisualization);
    [el.vizMode, el.vizClasses, el.vizPalette, el.vizReverse, el.vizCenter, el.vizBreaks, el.vizNumberFormat].forEach((input) => input.addEventListener("change", () => { updateVisualizationControlVisibility(); if (pendingVisualization) previewVisualization(); }));
    el.searchInput.addEventListener("input", renderSearch);
    el.provinceSelect.addEventListener("change", handleProvinceChange);
    el.regionSelect.addEventListener("change", () => selectRegion(el.regionSelect.value, true));
    el.colorPicker.addEventListener("input", updateColorValue);
    el.applyColorBtn.addEventListener("click", applySelectedColor);
    el.removeColorBtn.addEventListener("click", removeSelectedColor);
    el.undoBtn.addEventListener("click", undo);
    el.resetBtn.addEventListener("click", resetAll);
    el.labelDensity.addEventListener("change", () => mapApi.setLabelDensity(el.labelDensity.value));
    el.presentationView.addEventListener("change", () => setPresentationView(el.presentationView.checked));
    el.showLegend.addEventListener("change", () => { state.legendVisible = el.showLegend.checked; refreshMapLegend(); scheduleSave(); });
    el.legendPosition.addEventListener("change", () => { state.legendPosition = el.legendPosition.value; refreshMapLegend(); scheduleSave(); });
    el.addLegendBtn.addEventListener("click", () => {
      if (state.legend.length >= ProjectStorage.MAX_LEGEND_ITEMS) return showError(`A project can contain up to ${ProjectStorage.MAX_LEGEND_ITEMS} legend items. Remove one before adding another.`);
      state.legend.push({ label: "New legend item", color: el.colorPicker.value });
      renderLegendEditor();
      refreshMapLegend();
      scheduleSave();
    });
    el.previewCsvBtn.addEventListener("click", previewCsv);
    el.applyCsvBtn.addEventListener("click", applyCsv);
    el.cancelImportBtn.addEventListener("click", cancelImport);
    el.importLocale.addEventListener("change", () => { if (pendingCsv) rerenderImportPreviewFromMapping(); });
    el.importDelimiter.addEventListener("change", () => { if (pendingCsv) previewCsv(); });
    el.xlsxSheet.addEventListener("change", () => { if (pendingXlsx) useSelectedXlsxSheet(); });
    el.saveProjectBtn.addEventListener("click", saveProject);
    el.openProjectBtn.addEventListener("click", () => el.projectFile.click());
    el.projectFile.addEventListener("change", openProject);
    el.migrationReportBtn.addEventListener("click", downloadMigrationReport);
    el.clearProjectBtn.addEventListener("click", clearProject);
    el.recoverLegacyAutosaveBtn.addEventListener("click", recoverLegacyAutosave);
    el.deleteLegacyAutosaveBtn.addEventListener("click", deleteLegacyAutosave);
    el.downloadStorageRecoveryBtn.addEventListener("click", downloadStorageRecovery);
    el.deleteStorageRecoveryBtn.addEventListener("click", deleteStorageRecovery);
    el.downloadUnreadableTargetBtn.addEventListener("click", () => downloadUnreadableBackup(ProjectStorage.STORAGE_KEY));
    el.downloadUnreadableLegacyBtn.addEventListener("click", () => downloadUnreadableBackup(ProjectStorage.LEGACY_STORAGE_KEYS[0]));
    el.exportSvgBtn.addEventListener("click", exportSvg);
    el.exportPngBtn.addEventListener("click", exportPng);
    el.exportPdfBtn.addEventListener("click", exportPdf);
    el.exportMappingBtn.addEventListener("click", exportMapping);
    ["exportRatio", "exportExtent", "exportLabels", "transparentBg", "exportHighDetail", "pngSize"].forEach((id) => el[id].addEventListener("change", saveExportSettings));
    el.sidebarToggleBtn.addEventListener("click", toggleSidebar);
    el.floatingExportBtn.addEventListener("click", exportPng);
    el.fitIndonesiaBtn.addEventListener("click", () => mapApi.fitIndonesia());
    el.dataTableFilter.addEventListener("input", renderDataTable);
    el.dataTableSort.addEventListener("change", renderDataTable);
    el.workflowSteps.addEventListener("click", (event) => {
      const button = event.target.closest("[data-workflow-stage]");
      if (button) setWorkflowStage(button.dataset.workflowStage, true);
    });
    window.addEventListener("resize", () => mapApi.invalidate());
  }

  let pendingVisualization = null;

  function setupVisualizationControls() {
    if (!el.vizPalette) return;
    updateVisualizationControlVisibility();
  }

  function updateVisualizationPaletteOptions(method) {
    const family = method === "categorical" ? "qualitative" : method === "diverging" ? "diverging" : "sequential";
    if (el.vizPalette.dataset.family === family) return;
    const previous = el.vizPalette.value;
    el.vizPalette.innerHTML = visualizationPalettes[family]
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join("");
    if (visualizationPalettes[family].some(([value]) => value === previous)) el.vizPalette.value = previous;
    el.vizPalette.dataset.family = family;
  }

  function updateVisualizationControlVisibility() {
    const method = el.vizMode && el.vizMode.value;
    updateVisualizationPaletteOptions(method);
    const centerLabel = document.querySelector("label[for='vizCenter']");
    const center = el.vizCenter;
    const breaksLabel = document.querySelector("label[for='vizBreaks']");
    const breaks = el.vizBreaks;
    if (centerLabel) centerLabel.hidden = method !== "diverging";
    if (center) center.hidden = method !== "diverging";
    if (breaksLabel) breaksLabel.hidden = method !== "manual";
    if (breaks) breaks.hidden = method !== "manual";
  }

  function buildVisualizationOptions() {
    updateVisualizationControlVisibility();
    const method = el.vizMode.value;
    return {
      method,
      classes: Number(el.vizClasses.value),
      palette: el.vizPalette.value,
      reverse: el.vizReverse.checked,
      center: el.vizCenter.value === "" ? 0 : Number(el.vizCenter.value),
      breaks: el.vizBreaks.value,
      numberFormat: el.vizNumberFormat.value
    };
  }

  async function previewVisualization() {
    if (!state.importRows.length) return showError(productText("ui.errors.addData"));
    try {
      await ensureVisualizationEngine();
      pendingVisualization = VisualizationEngine.classify(state.importRows, buildVisualizationOptions());
      el.vizApplyBtn.disabled = false;
      const coloredCount = Object.keys(pendingVisualization.assignments).length;
      el.vizSummary.dataset.state = "ready";
      el.vizSummary.dataset.coloredCount = String(coloredCount);
      el.vizSummary.dataset.noDataCount = String(pendingVisualization.noData.length);
      el.vizSummary.innerHTML = `<span>${coloredCount} regions will be colored. ${pendingVisualization.noData.length} rows have no usable value.</span>${pendingVisualization.warnings.map((warning) => `<span class="status-line">${escapeHtml(warning)}</span>`).join("")}`;
      el.vizLegendPreview.innerHTML = pendingVisualization.legend.map((item) => `<div class="legend-item"><span class="color-chip" style="background:${escapeAttr(item.color)}"></span><span>${escapeHtml(item.label)}</span></div>`).join("");
    } catch (error) {
      pendingVisualization = null;
      el.vizApplyBtn.disabled = true;
      el.vizSummary.textContent = error.message;
      showError(error.message);
    }
  }

  function ensureVisualizationEngine() {
    if (typeof VisualizationEngine !== "undefined") return Promise.resolve(VisualizationEngine);
    if (visualizationEnginePromise) return visualizationEnginePromise;
    visualizationEnginePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${RUNTIME_BASE}assets/js/visualization-engine.js`;
      script.async = true;
      script.dataset.lazyVisualization = "true";
      script.onload = () => typeof VisualizationEngine !== "undefined" ? resolve(VisualizationEngine) : reject(new Error(productText("ui.errors.visualizationLoad")));
      script.onerror = () => reject(new Error(productText("ui.errors.visualizationLoad")));
      document.head.appendChild(script);
    });
    return visualizationEnginePromise;
  }

  function applyVisualization() {
    if (!pendingVisualization) return previewVisualization();
    pushUndo();
    state.visualization = pendingVisualization;
    // A spreadsheet visualization owns only matched rows with a valid assignment.
    // Manual colors are preserved, while blank/no-data spreadsheet rows return to the base map style.
    state.highlights = Object.assign({}, state.manualHighlights);
    const byId = new Map(state.importRows.map((row) => [row.matchedId, row]));
    Object.entries(pendingVisualization.assignments).forEach(([matchedId, assignment]) => {
      const row = byId.get(matchedId);
      if (!row) return;
      row.color = assignment.color;
      row.classKey = assignment.classKey;
      state.highlights[matchedId] = {
        color: assignment.color,
        category: row.record.category || "",
        value: row.record.numericValue || ""
      };
    });
    updateAfterHighlightChange();
    renderDataTable();
    const coloredCount = Object.keys(pendingVisualization.assignments).length;
    el.vizSummary.dataset.state = "applied";
    el.vizSummary.insertAdjacentHTML("afterbegin", `<span class="status-line">${escapeHtml(productText("ui.status.visualizationApplied", { count: coloredCount }))}</span>`);
    scheduleSave();
  }

  const WORKFLOW = [
    { id: "input", label: productText("ui.workflow.input"), target: "[data-workflow-step='input']" },
    { id: "match", label: productText("ui.workflow.match"), target: "#dataTablePanel" },
    { id: "visualize", label: productText("ui.workflow.visualize"), target: "[data-workflow-step='visualize']" },
    { id: "export", label: productText("ui.workflow.export"), target: "#exportSection" }
  ];

  function renderWorkflow() {
    if (!el.workflowSteps) return;
    const currentIndex = WORKFLOW.findIndex((item) => item.id === state.workflowStage);
    el.workflowSteps.innerHTML = WORKFLOW.map((item, index) => {
      const complete = index < currentIndex || (item.id === "match" && state.importRows.length > 0) || (item.id === "visualize" && Object.keys(state.highlights).length > 0);
      const classes = ["workflow-step", item.id === state.workflowStage ? "active" : "", complete ? "complete" : ""].filter(Boolean).join(" ");
      return `<button type="button" class="${classes}" data-workflow-stage="${item.id}" aria-current="${item.id === state.workflowStage ? "step" : "false"}">${index + 1}. ${item.label}</button>`;
    }).join("");
    const status = state.workflowStage === "input" ? "Paste data or upload a spreadsheet." : state.workflowStage === "match" ? `${state.importRows.length || "No"} rows are ready to review.` : state.workflowStage === "visualize" ? `${Object.keys(state.highlights).length} regions are shown on the map.` : "Your map is ready to export.";
    el.workflowStatus.dataset.stage = ({ input: "add-data", match: "match", visualize: "design", export: "export" })[state.workflowStage];
    el.workflowStatus.textContent = `Step ${Math.max(1, currentIndex + 1)} of 4: ${status}`;
  }

  function setWorkflowStage(stage, focus) {
    const index = WORKFLOW.findIndex((item) => item.id === stage);
    if (index < 0) return;
    if (stage === "match" && !pendingCsv && !state.importRows.length) return showError(productText("ui.errors.addData"));
    if ((stage === "visualize" || stage === "export") && !Object.keys(state.highlights).length) return showError("Add at least one matched row first. Your current map is safe. Match a region, then continue.");
    state.workflowStage = stage;
    renderWorkflow();
    scheduleSave();
    if (focus) {
      const target = document.querySelector(WORKFLOW[index].target);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (stage === "match" && el.dataTablePanel) el.dataTablePanel.hidden = false;
    }
  }

  function setMode(mode, save = true) {
    state.uiMode = mode === "advanced" ? "advanced" : "basic";
    el.appShell.dataset.mode = state.uiMode;
    el.basicModeBtn.classList.toggle("active", state.uiMode === "basic");
    el.advancedModeBtn.classList.toggle("active", state.uiMode === "advanced");
    el.basicModeBtn.setAttribute("aria-pressed", String(state.uiMode === "basic"));
    el.advancedModeBtn.setAttribute("aria-pressed", String(state.uiMode === "advanced"));
    if (el.advancedImportOptions) el.advancedImportOptions.open = state.uiMode === "advanced";
    if (save) scheduleSave();
  }

  async function useExample() {
    el.importPaste.value = "region\tprovince\tvalue\tcategory\nKota Surabaya\tJawa Timur\t125\tHigh example\nKota Denpasar\tBali\t77\tMedium example\n";
    el.csvFile.value = "";
    setWorkflowStage("input", false);
    await previewCsv();
    setWorkflowStage("match", true);
  }

  function toggleSidebar() {
    setSidebarCollapsed(!el.appShell.classList.contains("sidebar-collapsed"));
  }

  function setSidebarCollapsed(collapsed) {
    if (window.innerWidth <= 860 && el.appShell && el.appShell.dataset.workspaceShell === "ready") {
      const states = ["collapsed", "medium", "expanded"];
      const current = el.appShell.dataset.workspaceSheet || "medium";
      el.appShell.dataset.workspaceSheet = states[(states.indexOf(current) + 1) % states.length];
      return;
    }
    el.appShell.classList.toggle("sidebar-collapsed", collapsed);
    el.sidebarToggleBtn.setAttribute("aria-expanded", String(!collapsed));
    el.controlPanel.setAttribute("aria-hidden", String(collapsed));
    el.floatingExportBtn.hidden = !collapsed;
    // Leaflet needs a size refresh after the grid column changes.
    setTimeout(() => mapApi.invalidate(), 220);
  }

  function updateColorValue() {
    const color = el.colorPicker.value.toUpperCase();
    el.colorValue.value = color;
    el.colorPalette.querySelectorAll("[data-color]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.color === color));
    });
  }

  function setupColorPalette() {
    const renderPalette = (selectFirst = false) => {
      const palette = manualPalettes[el.manualPalette.value] || manualPalettes.nusacanvas;
      el.colorPalette.innerHTML = palette.colors.map(([color, name]) =>
        `<button type="button" class="color-swatch" style="--swatch-color:${color}" data-color="${color}" aria-label="${name}" aria-pressed="false"></button>`
      ).join("");
      const current = el.colorPicker.value.toUpperCase();
      if (selectFirst || !palette.colors.some(([color]) => color === current)) {
        el.colorPicker.value = palette.colors[0][0].toLowerCase();
      }
      updateColorValue();
    };
    el.manualPalette.addEventListener("change", () => renderPalette(true));
    el.colorPalette.addEventListener("click", (event) => {
      const button = event.target.closest("[data-color]");
      if (!button) return;
      el.colorPicker.value = button.dataset.color.toLowerCase();
      updateColorValue();
    });
    renderPalette();
  }

  async function loadData() {
    try {
      const collection = await boundaryProvider.getNationalLayer("ADM2", "lite").load();
      state.features = collection.features || [];
      state.featureById = new Map(state.features.map((feature) => [feature.properties.region_id, feature]));
      mapApi.render(collection, { detail: "lite" });
      mapApi.setHighlights(state.highlights);
      mapApi.setLabelDensity(el.labelDensity.value);
      mapApi.setPresentationView(state.presentationView);
      populateFilters();
      renderLegendEditor(false);
      restoreAutosave();
      renderHighlightList();
      renderGroupingEditor();
      refreshMapLegend();
      el.loadingIndicator.dataset.state = "ready";
      el.loadingIndicator.dataset.testid = window.ProductContent ? window.ProductContent.strings.testIdentifiers.appReady : "app-ready";
      el.loadingIndicator.textContent = productText("ui.status.ready", { count: state.features.length });
      el.dataTruthBadge.dataset.boundaryVersion = BOUNDARY_VERSION;
      el.dataTruthBadge.dataset.registryVersion = REGISTRY_VERSION;
      el.dataTruthBadge.textContent = window.ProductContent
        ? window.ProductContent.strings.dataSource.boundaryPlain
        : "Boundary snapshot: 2020; administrative names reviewed: 2025";
    } catch (error) {
      showError(error.message);
      el.loadingIndicator.dataset.state = "error";
      el.loadingIndicator.textContent = productText("ui.errors.mapLoad");
    }
  }

  async function loadHighDetailCollection() {
    if (state.highDetailCollection) return state.highDetailCollection;
    const detailedCollection = await boundaryProvider.getNationalLayer("ADM2", "detailed").load();
    const merged = mergeDetailedGeometry({ type: "FeatureCollection", features: state.features }, detailedCollection);
    if (merged.matched <= 450) throw new Error(`Detailed boundaries were available for only ${merged.matched} of ${state.features.length} regions. Your map is still safe. Try the standard export.`);
    state.highDetailCollection = merged.collection;
    state.highDetailFeatureById = new Map((merged.collection.features || []).map((feature) => [feature.properties.region_id, feature]));
    return state.highDetailCollection;
  }

  async function handleDetailViewportRequest(request) {
    const provinceCodes = Array.from(new Set(request && request.provinceCodes || [])).slice(0, 3);
    const requestId = ++provinceDetailRequestId;
    if (provinceDetailRequest) provinceDetailRequest.abort();
    if (!provinceCodes.length) {
      mapApi.setDetailOverlays([]);
      el.loadingIndicator.dataset.geometryState = "lite";
      el.loadingIndicator.textContent = productText("ui.status.ready", { count: state.features.length });
      return;
    }
    const controller = new AbortController();
    provinceDetailRequest = controller;
    try {
      el.loadingIndicator.dataset.geometryState = "loading-detail";
      el.loadingIndicator.textContent = "Loading detailed local boundaries for this view...";
      const chunks = await Promise.all(provinceCodes.map(async (provinceCode) => {
        const collection = await boundaryProvider.getProvinceLayer(provinceCode, "ADM2", "detailed").load({ signal: controller.signal });
        return Object.assign({ provinceCode }, collection);
      }));
      if (requestId !== provinceDetailRequestId) return;
      mapApi.setDetailOverlays(chunks);
      el.loadingIndicator.dataset.geometryState = "province-overlay";
      el.loadingIndicator.textContent = `Detailed local boundaries are active for ${chunks.length} province${chunks.length === 1 ? "" : "s"}.`;
    } catch (error) {
      if (error && error.name === "AbortError") return;
      el.loadingIndicator.dataset.geometryState = "lite-fallback";
      el.loadingIndicator.textContent = "The map is using the lite boundaries. Your project is still safe.";
      showError(error.message);
      throw error;
    } finally {
      if (requestId === provinceDetailRequestId) provinceDetailRequest = null;
    }
  }

  function setPresentationView(enabled, save = true) {
    state.presentationView = Boolean(enabled);
    el.presentationView.checked = state.presentationView;
    el.appShell.dataset.presentationView = String(state.presentationView);
    mapApi.setPresentationView(state.presentationView);
    if (save) saveExportSettings();
  }

  function mergeDetailedGeometry(baseCollection, detailedCollection) {
    const detailedByKey = new Map();
    (detailedCollection.features || []).forEach((feature) => {
      if (!feature.geometry) return;
      geometryMatchKeys(feature.properties || {}).forEach((key) => {
        if (!detailedByKey.has(key)) detailedByKey.set(key, feature.geometry);
      });
    });
    let matched = 0;
    const features = (baseCollection.features || []).map((feature) => {
      const geometry = geometryMatchKeys(feature.properties || {})
        .map((key) => detailedByKey.get(key))
        .find(Boolean);
      if (!geometry) return feature;
      matched += 1;
      return Object.assign({}, feature, { geometry });
    });
    return {
      collection: matched > 450 ? Object.assign({}, baseCollection, { features }) : baseCollection,
      matched
    };
  }

  function geometryMatchKeys(properties) {
    const keys = [];
    addKey(keys, "region:" + (properties.region_id || properties.id || properties.ID || ""));
    addKey(keys, "shape:" + (properties.geometry_source_id || properties.shapeID || properties.shapeId || properties.shape_id || properties.ShapeID || ""));
    addKey(keys, "code:" + normalizeCode(properties.official_code || properties.official_code_normalized || properties.ADM2_PCODE || properties.ADM2_CODE || properties.kode || properties.KODE || ""));
    const province = properties.province_name || properties.ADM1_EN || properties.ADM1_ID || properties.PROVINSI || properties.Province || properties.province || "";
    const region = properties.region_name || properties.display_name || properties.shapeName || properties.ShapeName || properties.ADM2_EN || properties.ADM2_ID || properties.KAB_KOTA || properties.NAME_2 || properties.name || properties.NAME || "";
    addKey(keys, "name:" + normalizeText(province) + "|" + normalizeText(region));
    addKey(keys, "region-name:" + normalizeText(region));
    return keys;
  }

  function addKey(keys, value) {
    const key = String(value || "").replace(/^shape:gb-/i, "shape:").trim();
    if (!key || key.endsWith(":") || keys.includes(key)) return;
    keys.push(key);
  }

  function normalizeCode(value) {
    const text = String(value || "").trim().toUpperCase().replace(/^ID/, "").replace(/\./g, "");
    if (/^\d{4}$/.test(text)) return text.slice(0, 2) + "." + text.slice(2);
    return String(value || "").trim().toUpperCase();
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\b(KABUPATEN|KAB\.?|KOTA|CITY|REGENCY)\b/g, " ")
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function restoreAutosave() {
    try {
      const adapter = ProjectStorage.createRegionAdapter(state.features);
      const saved = ProjectStorage.loadAutosave(adapter);
      const storageReport = ProjectStorage.getStorageMigrationReport();
      state.storageMigrationReport = storageReport;
      if (saved) {
        applyProject(saved);
        el.autosaveStatus.dataset.state = "opened";
        el.autosaveStatus.textContent = "Saved browser copy restored.";
      }
      updateStorageMigrationUi(storageReport);
    } catch (error) {
      state.storageMigrationReport = {
        status: "failed-runtime",
        unresolvedEntries: [{ kind: "browser-storage", count: 1 }],
        droppedEntries: [],
        backupStatus: "unknown",
        sourceRetained: false
      };
      updateStorageMigrationUi(state.storageMigrationReport);
      showError("The browser backup could not be opened. No saved work was cleared. You can still open a project file.");
    }
  }

  function populateFilters() {
    const provinces = Array.from(new Set(state.features.map((f) => f.properties.province_name).filter(Boolean))).sort();
    el.provinceSelect.innerHTML = `<option value="__all">All provinces</option><option value="__unresolved">Province not linked</option>` + provinces.map((p) => `<option value="${escapeAttr(p)}">${escapeHtml(p)}</option>`).join("");
    renderRegionOptions();
  }

  function renderRegionOptions() {
    const province = el.provinceSelect.value;
    const features = filteredFeatures(province);
    el.regionSelect.innerHTML = `<option value="">Choose a region...</option>` + features.map((feature) => {
      const p = feature.properties;
      const suffix = p.province_name ? ` - ${p.province_name}` : " - province not linked";
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
    const province = p.province_name || "Province not linked";
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
    el.appShell.dataset.workspaceRegionSelected = "true";
    el.selectedRegion.innerHTML = `<strong>${escapeHtml(p.display_name)}</strong><br>${escapeHtml(p.province_name || "Province not linked")}<br><span class="tag">${escapeHtml(p.official_code || "Official code not available")}</span>`;
    el.categoryInput.value = state.highlights[p.region_id]?.category || "";
    el.valueInput.value = state.highlights[p.region_id]?.value || "";
    if (state.highlights[p.region_id]) {
      el.colorPicker.value = state.highlights[p.region_id].color;
      updateColorValue();
    }
    selectDataRowForFeature(p.region_id);
  }

  function selectDataRowForFeature(regionId) {
    const row = state.importRows.find((item) => item.matchedId === regionId);
    if (!row) {
      if (el.mapSelectionStatus) {
        el.mapSelectionStatus.dataset.state = "no-linked-row";
        el.mapSelectionStatus.textContent = "Region selected on the map. No spreadsheet row is linked to it.";
      }
      return;
    }
    state.selectedDataRow = row.rowId;
    renderDataTable();
    if (el.mapSelectionStatus) {
      el.mapSelectionStatus.dataset.state = "selected";
      el.mapSelectionStatus.textContent = `Row ${row.rowNumber} was selected from the map.`;
    }
  }

  function applySelectedColor() {
    const id = mapApi.selectedId;
    if (!id) return showError(productText("ui.errors.chooseRegion"));
    pushUndo();
    state.manualHighlights[id] = {
      color: el.colorPicker.value,
      category: el.categoryInput.value.trim(),
      value: el.valueInput.value.trim()
    };
    state.highlights[id] = state.manualHighlights[id];
    updateAfterHighlightChange();
  }

  function removeSelectedColor() {
    const id = mapApi.selectedId;
    if (!id) return showError(productText("ui.errors.chooseRegion"));
    if (!state.highlights[id]) return;
    pushUndo();
    delete state.highlights[id];
    delete state.manualHighlights[id];
    updateAfterHighlightChange();
  }

  function pushUndo() {
    state.undo.push(JSON.stringify({ highlights: state.highlights, manualHighlights: state.manualHighlights }));
    if (state.undo.length > 30) state.undo.shift();
  }

  function undo() {
    const previous = state.undo.pop();
    if (!previous) return;
    const snapshot = JSON.parse(previous);
    state.highlights = snapshot.highlights || snapshot;
    state.manualHighlights = snapshot.manualHighlights || {};
    updateAfterHighlightChange();
  }

  function resetAll() {
    if (!Object.keys(state.highlights).length) return;
    if (!confirm("Clear every highlight from the map?")) return;
    pushUndo();
    state.highlights = {};
    state.manualHighlights = {};
    updateAfterHighlightChange();
  }

  function updateAfterHighlightChange(save = true) {
    mapApi.setHighlights(state.highlights);
    renderHighlightList();
    renderGroupingEditor();
    renderLegendEditor(false);
    refreshMapLegend();
    if (Object.keys(state.highlights).length && state.workflowStage === "match") state.workflowStage = "visualize";
    renderWorkflow();
    if (save) scheduleSave();
  }

  function renderHighlightList() {
    const ids = Object.keys(state.highlights);
    el.appShell.dataset.workspaceHasHighlights = String(ids.length > 0);
    el.undoBtn.disabled = !state.undo.length;
    el.highlightCount.textContent = ids.length;
    if (!ids.length) {
      el.highlightList.innerHTML = `<p class="status-line">No regions are highlighted.</p>`;
      return;
    }
    el.highlightList.innerHTML = ids.sort((a, b) => displayName(state.featureById.get(a)).localeCompare(displayName(state.featureById.get(b)), "id")).map((id) => {
      const feature = state.featureById.get(id);
      const item = state.highlights[id];
      return `<div class="highlight-item"><span class="color-chip" style="background:${item.color}"></span><button type="button" class="secondary" data-zoom="${escapeAttr(id)}">${escapeHtml(displayName(feature))}</button><button type="button" class="danger" data-remove="${escapeAttr(id)}">Remove</button></div>`;
    }).join("");
    el.highlightList.querySelectorAll("[data-zoom]").forEach((button) => button.addEventListener("click", () => selectRegion(button.dataset.zoom, true)));
    el.highlightList.querySelectorAll("[data-remove]").forEach((button) => button.addEventListener("click", () => {
      pushUndo();
      delete state.highlights[button.dataset.remove];
      delete state.manualHighlights[button.dataset.remove];
      updateAfterHighlightChange();
    }));
  }

  function renderLegendEditor(save = true) {
    el.showLegend.checked = state.legendVisible;
    el.legendPosition.value = state.legendPosition;
    el.legendItems.innerHTML = state.legend.map((item, index) => `
      <div class="legend-item">
        <input type="color" value="${escapeAttr(item.color)}" data-legend-color="${index}" aria-label="Legend color">
        <input type="text" value="${escapeAttr(item.label)}" data-legend-label="${index}" aria-label="Legend name">
        <button type="button" class="secondary" data-legend-up="${index}" aria-label="Move up">↑</button>
        <button type="button" class="danger" data-legend-remove="${index}" aria-label="Remove">×</button>
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
      "#4472C4": "Blue group",
      "#5B9BD5": "Light blue group",
      "#E74C3C": "Red group",
      "#70AD47": "Green group",
      "#FFC000": "Yellow group",
      "#A64D79": "Purple group",
      "#00A388": "Teal group",
      "#7F6000": "Brown group",
      "#087F73": "Teal group",
      "#2D79B7": "Blue group",
      "#194F68": "Deep blue group",
      "#D58A16": "Amber group",
      "#6E55A5": "Violet group",
      "#45A99B": "Sea green group",
      "#B8CBD5": "Light slate group"
    };
    return names[color] || `Color group ${color}`;
  }

  function normalizeColor(color) {
    return String(color || "#087F73").toUpperCase();
  }

  function renderGroupingEditor() {
    // The grouping editor is rebuilt from the current highlights, so removed colors disappear automatically.
    const groups = getColorGroups();
    el.groupCount.textContent = groups.length;
    if (!groups.length) {
      el.groupingList.innerHTML = `<p class="status-line">No color groups yet.</p>`;
      return;
    }
    el.groupingList.innerHTML = groups.map((group) => {
      const names = group.ids.map((id) => displayName(state.featureById.get(id))).sort((a, b) => a.localeCompare(b, "id"));
      const meta = state.groupMeta[group.color] || {};
      return `<div class="grouping-item">
        <span class="color-chip" style="background:${group.color}"></span>
        <div>
          <label for="group-${escapeAttr(group.color.slice(1))}">Group name</label>
          <input id="group-${escapeAttr(group.color.slice(1))}" type="text" value="${escapeAttr(getGroupName(group))}" maxlength="80" data-group-name="${escapeAttr(group.color)}">
          <label for="group-category-${escapeAttr(group.color.slice(1))}">Category</label>
          <input id="group-category-${escapeAttr(group.color.slice(1))}" type="text" value="${escapeAttr(meta.category || "")}" maxlength="80" placeholder="Optional" data-group-category="${escapeAttr(group.color)}">
          <label for="group-value-${escapeAttr(group.color.slice(1))}">Value</label>
          <input id="group-value-${escapeAttr(group.color.slice(1))}" type="text" value="${escapeAttr(meta.value || "")}" maxlength="80" placeholder="Optional" data-group-value="${escapeAttr(group.color)}">
          <div class="grouping-meta">${group.ids.length} regions: ${escapeHtml(names.join(", "))}</div>
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
    if (state.visualization && Array.isArray(state.visualization.legend) && state.visualization.legend.length) return state.visualization.legend;
    // Highlighted colors override the manual legend and use the editable group labels.
    const grouped = getColorGroups().map((group) => {
      return {
        color: group.color,
        label: getGroupLabel(group)
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "id"));
    return grouped;
  }

  function refreshMapLegend() {
    if (!mapApi) return;
    mapApi.setLegend(buildLegendItems(), state.legendVisible, state.legendPosition);
  }

  function buildIndexes() {
    const byCode = new Map();
    const byProvinceName = new Map();
    const byName = new Map();
    state.features.forEach((feature) => {
      const p = feature.properties;
      if (p.official_code) byCode.set(CsvImport.normalizeCode(p.official_code), { id: p.region_id, feature });
      if (p.region_name) {
        const nameKey = CsvImport.normalizeText(p.region_name);
        if (!byName.has(nameKey)) byName.set(nameKey, []);
        byName.get(nameKey).push({ id: p.region_id, feature });
      }
      if (p.province_name && p.region_name) {
        const key = CsvImport.normalizeText(p.province_name) + "|" + CsvImport.normalizeText(p.region_name);
        if (!byProvinceName.has(key)) byProvinceName.set(key, []);
        byProvinceName.get(key).push({ id: p.region_id, feature });
      }
    });
    return {
      byCode,
      byProvinceName,
      byName,
      matchingEngine: typeof MatchingEngine !== "undefined" ? MatchingEngine.buildIndexes(state.features) : null
    };
  }

  async function readImportSource() {
    const file = el.csvFile.files[0];
    const paste = el.importPaste.value.trim();
    if (file) {
      const name = file.name.toLowerCase();
      if (name.endsWith(".xlsx")) {
        return { file, sourceType: "xlsx", sourceLabel: "Local XLSX file" };
      }
      if (!/\.(csv|tsv|txt)$/.test(name) || file.size > 2_500_000) throw new Error("This file cannot be read safely. Your current map is safe. Choose a .csv, .tsv, .txt, or .xlsx file under 2.5 MB.");
      return {
        text: await file.text(),
        sourceType: name.endsWith(".tsv") ? "tsv" : "csv",
        sourceLabel: name.endsWith(".tsv") ? "Local TSV file" : "Local CSV file"
      };
    }
    if (!paste) throw new Error(productText("ui.errors.addData"));
    return { text: el.importPaste.value, sourceType: "paste", sourceLabel: "Pasted data" };
  }

  async function previewCsv() {
    try {
      if (pendingImportSignal) pendingImportSignal.canceled = true;
      pendingImportSignal = { canceled: false };
      el.previewCsvBtn.disabled = true;
      el.previewCsvBtn.textContent = productText("ui.status.reading");
      await ensureMatchingEngine();
      const source = await readImportSource();
      if (source.sourceType === "xlsx") {
        pendingXlsx = await XlsxImport.parseFile(source.file, {
          sheetName: el.xlsxSheet.value || undefined,
          localeOverride: el.importLocale.value,
          signal: pendingImportSignal
        });
        pendingCsv = CsvImport.validateParsed(pendingXlsx.parsed, buildIndexes(), pendingXlsx.parsed.mapping, {
          locale: el.importLocale.value,
          resolutions: state.importCorrections
        });
        renderXlsxSheetChooser();
      } else {
        pendingXlsx = null;
        renderXlsxSheetChooser();
        pendingCsv = CsvImport.validateAndMatch(source.text, buildIndexes(), {
          sourceType: source.sourceType,
          sourceLabel: source.sourceLabel,
          delimiterOverride: el.importDelimiter.value,
          localeOverride: el.importLocale.value,
          resolutions: state.importCorrections
        });
      }
      renderImportMapping();
      renderCsvPreview();
      el.applyCsvBtn.disabled = !pendingCsv.valid.length;
      setWorkflowStage("match", false);
    } catch (error) {
      showError(error.message);
    } finally {
      el.previewCsvBtn.disabled = false;
      el.previewCsvBtn.textContent = productText("ui.actions.previewData");
    }
  }

  function ensureMatchingEngine() {
    if (typeof MatchingEngine !== "undefined") return Promise.resolve(MatchingEngine);
    if (matchingEnginePromise) return matchingEnginePromise;
    matchingEnginePromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${RUNTIME_BASE}assets/js/matching-engine.js`;
      script.async = true;
      script.dataset.lazyMatchingEngine = "true";
      script.onload = () => typeof MatchingEngine !== "undefined" ? resolve(MatchingEngine) : reject(new Error("Region matching could not load. Your current map is safe. Reload the page and try again."));
      script.onerror = () => reject(new Error("Region matching could not load. Your current map is safe. Reload the page and try again."));
      document.head.appendChild(script);
    });
    return matchingEnginePromise;
  }

  function clearPendingWorkspaceState() {
    if (pendingImportSignal) pendingImportSignal.canceled = true;
    pendingImportSignal = null;
    pendingCsv = null;
    pendingXlsx = null;
    pendingVisualization = null;
    el.csvFile.value = "";
    el.importPaste.value = "";
    el.xlsxSheet.innerHTML = "";
    el.xlsxSheet.classList.add("hidden");
    const label = document.querySelector("label[for='xlsxSheet']");
    if (label) label.classList.add("hidden");
    el.importMapping.innerHTML = "";
    el.csvPreview.innerHTML = "";
    el.applyCsvBtn.disabled = true;
    if (el.vizSummary) el.vizSummary.innerHTML = "";
    if (el.vizLegendPreview) el.vizLegendPreview.innerHTML = "";
  }

  function cancelImport() {
    clearPendingWorkspaceState();
    if (!state.importRows.length) setWorkflowStage("input", false);
  }

  function renderXlsxSheetChooser() {
    const label = document.querySelector("label[for='xlsxSheet']");
    if (!pendingXlsx || pendingXlsx.sheets.length <= 1) {
      el.xlsxSheet.innerHTML = "";
      el.xlsxSheet.classList.add("hidden");
      if (label) label.classList.add("hidden");
      return;
    }
    el.xlsxSheet.innerHTML = pendingXlsx.sheets.map((sheet) => {
      const selected = sheet.name === pendingXlsx.selectedSheetName ? " selected" : "";
      return `<option value="${escapeAttr(sheet.name)}"${selected}>${escapeHtml(sheet.name)} (${sheet.rows} rows, ${sheet.columns} columns)</option>`;
    }).join("");
    el.xlsxSheet.classList.remove("hidden");
    if (label) label.classList.remove("hidden");
  }

  function useSelectedXlsxSheet() {
    if (!pendingXlsx) return;
    const selected = pendingXlsx.sheets.find((sheet) => sheet.name === el.xlsxSheet.value);
    if (!selected || selected.name === pendingXlsx.selectedSheetName) return;
    previewCsv();
  }

  function buildMappingFromControls() {
    const roles = {};
    el.importMapping.querySelectorAll("[data-import-role]").forEach((select) => {
      roles[select.dataset.importRole] = select.value || null;
    });
    return {
      contractVersion: "batch2.columnMapping.v1",
      roles,
      ignoredColumns: pendingCsv.headers.filter((header) => !Object.values(roles).includes(header)),
      suggestions: pendingCsv.mapping.suggestions
    };
  }

  function rerenderImportPreviewFromMapping() {
    if (!pendingCsv) return;
    pendingCsv = CsvImport.validateParsed(pendingCsv.parsed, buildIndexes(), buildMappingFromControls(), {
      locale: el.importLocale.value,
      resolutions: state.importCorrections
    });
    renderCsvPreview();
    el.applyCsvBtn.disabled = !pendingCsv.valid.length;
  }

  function renderImportMapping() {
    const roles = [
      ["regionCode", "Official region code"],
      ["regionName", "Region name"],
      ["province", "Province"],
      ["numericValue", "Value"],
      ["category", "Category"],
      ["source", "Source"],
      ["period", "Period"]
    ];
    const options = (selected) => `<option value="">Ignore column</option>` + pendingCsv.headers.map((header) => {
      return `<option value="${escapeAttr(header)}"${header === selected ? " selected" : ""}>${escapeHtml(header)}</option>`;
    }).join("");
    const source = pendingCsv.importedSource;
    const warnings = source.warnings.length ? `<p class="status-line">${escapeHtml(source.warnings.map((item) => item.message).join(" "))}</p>` : "";
    const sheetLine = source.sheetName ? `<span>Worksheet: ${escapeHtml(source.sheetName)}.</span>` : "";
    const xlsxLine = pendingXlsx ? `<span>Spreadsheet ready.</span>` : "";
    el.importMapping.innerHTML = `
      <div class="preview-block">
        <div class="import-summary">
          <span>${escapeHtml(source.sourceLabel)}: ${source.counts.rows} rows, ${source.counts.columns} columns.</span>
          <span>Separator: ${escapeHtml(source.detected.delimiter)}. Number format: ${escapeHtml(el.importLocale.value)}.</span>
          ${sheetLine}
          ${xlsxLine}
        </div>
        ${warnings}
      </div>
      ${roles.map(([role, label]) => `
        <div class="mapping-row">
          <label for="map-${escapeAttr(role)}">${escapeHtml(label)}</label>
          <select id="map-${escapeAttr(role)}" data-import-role="${escapeAttr(role)}">${options(pendingCsv.mapping.roles[role])}</select>
        </div>`).join("")}`;
    el.importMapping.querySelectorAll("[data-import-role]").forEach((select) => select.addEventListener("change", rerenderImportPreviewFromMapping));
  }

  function renderCsvPreview() {
    const rows = pendingCsv.all.slice(0, 30).map((item) => {
      const status = item.errors.length ? item.errors.join("; ") : (item.warnings.length ? item.warnings.join("; ") : "Ready to use");
      const target = item.matched ? displayName(item.matched.feature) : "-";
      const resolution = renderResolutionControls(item);
      return `<tr data-match-status="${escapeAttr(visibleMatchState(item))}"><td>${item.rowNumber}</td><td>${escapeHtml(target)}${resolution}</td><td>${escapeHtml(item.record.numericValue || "")}</td><td>${escapeHtml(item.record.category || "")}</td><td>${escapeHtml(visibleMatchStatus(item.matchStatus))}<br>${escapeHtml(status)}</td></tr>`;
    }).join("");
    const errorButton = pendingCsv.invalid.length ? `<button type="button" class="secondary" id="downloadCsvErrors">Download issue report</button>` : "";
    const unresolved = pendingCsv.all.filter((item) => ["ambiguous", "unmatched", "duplicate-target", "invalid"].includes(item.matchStatus)).length;
    const unmatchedNotice = unresolved
      ? `<p class="status-line" data-testid="unmatched-warning">${escapeHtml(productText("ui.warnings.unmatched", { count: unresolved }))} <button type="button" class="secondary" id="fixUnmatchedRows">${escapeHtml(productText("ui.actions.fixUnmatched"))}</button></p>`
      : "";
    el.csvPreview.dataset.matchStatus = unresolved ? "needs-review" : "ready";
    el.csvPreview.dataset.validCount = String(pendingCsv.valid.length);
    el.csvPreview.dataset.unmatchedCount = String(unresolved);
    el.csvPreview.innerHTML = `${unmatchedNotice}<div class="preview-block"><strong>${pendingCsv.valid.length}</strong> ready, <strong>${pendingCsv.warning.length}</strong> warnings, <strong>${pendingCsv.invalid.length}</strong> need review.${errorButton}<table class="preview-table"><thead><tr><th>Row</th><th>Region</th><th>Value</th><th>Category</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    const button = document.getElementById("downloadCsvErrors");
    if (button) button.addEventListener("click", () => downloadText("import-issues.csv", CsvImport.buildErrorCsv(pendingCsv), "text/csv"));
    const fixButton = document.getElementById("fixUnmatchedRows");
    if (fixButton) fixButton.addEventListener("click", () => {
      const firstControl = el.csvPreview.querySelector("[data-candidate-for], [data-ignore-row]");
      if (firstControl) firstControl.focus();
    });
    el.csvPreview.querySelectorAll("[data-resolve-row]").forEach((button) => button.addEventListener("click", resolveImportRow));
    el.csvPreview.querySelectorAll("[data-ignore-row]").forEach((button) => button.addEventListener("click", ignoreImportRow));
    el.csvPreview.querySelectorAll("[data-reset-row]").forEach((button) => button.addEventListener("click", resetImportRow));
  }

  function visibleMatchStatus(status) {
    if (["exact-code", "exact-name-province", "exact-alias-province", "normalized-name-province"].includes(status)) return "Matched";
    return ({
      "user-resolved": "Matched by you",
      ambiguous: "Choose a match",
      unmatched: "Unmatched",
      "duplicate-target": "Duplicate region",
      invalid: "Check this row",
      ignored: "Ignored"
    })[status] || "Not matched";
  }

  function visibleMatchState(item) {
    if (item.errors.length || ["ambiguous", "duplicate-target", "invalid"].includes(item.matchStatus)) return "needs-review";
    if (item.matchStatus === "unmatched") return "unmatched";
    return item.matched ? "matched" : "needs-review";
  }

  function renderResolutionControls(item) {
    if (!["ambiguous", "unmatched", "duplicate-target", "ignored", "user-resolved"].includes(item.matchStatus)) return "";
    const candidates = (item.candidates || []).map((candidate) => {
      const label = `${candidate.displayName} - ${candidate.province || "province not available"}${candidate.officialCode ? " - " + candidate.officialCode : ""}`;
      return `<option value="${escapeAttr(candidate.id)}">${escapeHtml(label)}</option>`;
    }).join("");
    const select = candidates ? `<select aria-label="Matches for row ${item.rowNumber}" data-candidate-for="${escapeAttr(item.rowId)}"><option value="">Choose a match</option>${candidates}</select><button type="button" class="secondary" data-resolve-row="${escapeAttr(item.rowId)}">Use this match</button>` : "";
    return `<div class="resolution-tools">${select}<button type="button" class="secondary" data-ignore-row="${escapeAttr(item.rowId)}">Ignore row</button><button type="button" class="secondary" data-reset-row="${escapeAttr(item.rowId)}">Clear choice</button></div>`;
  }

  function resolveImportRow(event) {
    const rowId = event.currentTarget.dataset.resolveRow;
    const select = el.csvPreview.querySelector(`[data-candidate-for="${CSS.escape(rowId)}"]`);
    const targetId = select && select.value;
    if (!rowId || !targetId) return showError(productText("ui.errors.useMatch"));
    state.importCorrections[rowId] = {
      action: "resolve",
      targetId,
      registryVersion: MatchingEngine.REGISTRY_VERSION,
      decidedAt: new Date().toISOString()
    };
    rerenderImportPreviewFromMapping();
  }

  function ignoreImportRow(event) {
    const rowId = event.currentTarget.dataset.ignoreRow;
    if (!rowId) return;
    state.importCorrections[rowId] = {
      action: "ignore",
      registryVersion: MatchingEngine.REGISTRY_VERSION,
      decidedAt: new Date().toISOString()
    };
    rerenderImportPreviewFromMapping();
  }

  function resetImportRow(event) {
    const rowId = event.currentTarget.dataset.resetRow;
    if (!rowId) return;
    delete state.importCorrections[rowId];
    rerenderImportPreviewFromMapping();
  }

  function applyCsv() {
    if (!pendingCsv) return;
    pushUndo();
    pendingCsv.valid.forEach((item) => {
      state.highlights[item.matched.id] = {
        color: item.color,
        category: item.record.category,
        value: item.record.numericValue
      };
    });
    state.importRows = pendingCsv.all.map((item) => ({
      rowId: item.rowId,
      rowNumber: item.rowNumber,
      record: Object.assign({}, item.record),
      matchedId: item.matched ? item.matched.id : null,
      matchedName: item.matched ? displayName(item.matched.feature) : "",
      matchStatus: item.matchStatus || "unmatched",
      errors: item.errors.slice(0, 4),
      warnings: item.warnings.slice(0, 4)
    }));
    state.visualization = null;
    pendingVisualization = null;
    el.vizApplyBtn.disabled = true;
    el.dataTablePanel.hidden = false;
    state.selectedDataRow = null;
    el.dataTableFilter.value = "";
    el.dataTableSort.value = "row";
    updateAfterHighlightChange();
    renderDataTable();
    setWorkflowStage("visualize", false);
    el.csvPreview.dataset.matchStatus = "ready";
    el.csvPreview.insertAdjacentHTML("afterbegin", `<p class="status-line" data-testid="import-success">${escapeHtml(productText("ui.status.rowsAdded", { count: pendingCsv.valid.length }))}</p>`);
  }

  function renderDataTable() {
    if (!el.dataTable || !state.importRows.length) {
      if (el.dataTablePanel) el.dataTablePanel.hidden = !state.importRows.length;
      return;
    }
    el.dataTablePanel.hidden = false;
    const query = String(el.dataTableFilter.value || "").trim().toLocaleUpperCase("id-ID");
    const sort = el.dataTableSort.value;
    const rows = state.importRows.filter((item) => {
      if (!query) return true;
      const haystack = [item.record.regionName, item.record.province, item.record.regionCode, item.record.category, item.record.numericValue, item.matchedName].join(" ").toLocaleUpperCase("id-ID");
      return haystack.includes(query);
    }).sort((a, b) => {
      if (sort === "region") return (a.matchedName || a.record.regionName).localeCompare(b.matchedName || b.record.regionName, "id");
      if (sort === "status") return a.matchStatus.localeCompare(b.matchStatus, "id") || a.rowNumber - b.rowNumber;
      if (sort === "value") return Number.parseFloat(a.record.numericValue) - Number.parseFloat(b.record.numericValue) || a.rowNumber - b.rowNumber;
      return a.rowNumber - b.rowNumber;
    });
    const visible = rows.slice(0, 200);
    el.dataTableCount.textContent = `${rows.length}${rows.length > 200 ? "+" : ""}`;
    el.dataTableEmpty.textContent = rows.length > 200 ? productText("ui.warnings.limitedRows", { count: rows.length }) : (rows.length ? "" : "No rows match your search.");
    el.dataTableEmpty.hidden = rows.length > 0 && rows.length <= 200;
    el.dataTable.querySelector("tbody").innerHTML = visible.map((item) => {
      const selected = item.rowId === state.selectedDataRow ? " selected" : "";
      const issue = item.errors.length ? " issue" : (item.matchedId ? " ready" : "");
      const status = item.errors.length ? item.errors[0] : visibleMatchStatus(item.matchStatus);
      const matchState = item.errors.length ? "needs-review" : (item.matchedId ? "matched" : "unmatched");
      return `<tr tabindex="0" class="${selected}${item.matchedId ? "" : " unmatched"}" data-table-row="${escapeAttr(item.rowId)}" data-match-status="${matchState}" aria-selected="${item.rowId === state.selectedDataRow ? "true" : "false"}"><td>${item.rowNumber}</td><td>${escapeHtml(item.record.regionName || item.record.regionCode || "-")}</td><td>${escapeHtml(item.record.province || "-")}</td><td>${escapeHtml(item.matchedName || "Not matched")}</td><td>${escapeHtml(item.record.numericValue || item.record.category || "-")}</td><td><span class="status-chip${issue}">${escapeHtml(status)}</span></td></tr>`;
    }).join("");
    el.dataTable.querySelectorAll("[data-table-row]").forEach((row) => {
      row.addEventListener("click", () => selectDataRow(row.dataset.tableRow));
      row.addEventListener("keydown", (event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectDataRow(row.dataset.tableRow); } });
    });
  }

  function selectDataRow(rowId) {
    const row = state.importRows.find((item) => item.rowId === rowId);
    if (!row) return;
    state.selectedDataRow = rowId;
    if (row.matchedId && state.featureById.has(row.matchedId)) {
      mapApi.zoomTo(row.matchedId);
      el.mapSelectionStatus.dataset.state = "selected";
      el.mapSelectionStatus.textContent = `${row.matchedName} was selected from row ${row.rowNumber}.`;
      el.dataTableAnnouncement.textContent = `Row ${row.rowNumber}: ${row.matchedName} is selected on the map.`;
    } else {
      el.mapSelectionStatus.dataset.state = "unmatched";
      el.mapSelectionStatus.textContent = `Row ${row.rowNumber} has no matched region.`;
      el.dataTableAnnouncement.textContent = `Row ${row.rowNumber} has no matched region. The map did not change.`;
    }
    renderDataTable();
  }

  function saveProject() {
    try {
      ProjectStorage.downloadJson(brand.defaults.projectFilename, ProjectStorage.buildProject(state, ProjectStorage.createRegionAdapter(state.features)));
    } catch (error) {
      showError(error.message || "The project file could not be saved. Your current map is still safe.");
    }
  }

  async function openProject() {
    const file = el.projectFile.files[0];
    if (!file) return;
    if (file.size > ProjectStorage.PROJECT_FILE_MAX_BYTES) return showError("This project file is too large. Your current project has not changed. Choose a project file under 20 MB.");
    try {
      const data = JSON.parse(await file.text());
      const brandResult = brandMigration.migrateProject(data);
      const project = ProjectStorage.attachProjectMigrationReports(
        data,
        ProjectStorage.sanitizeProject(brandResult.project, ProjectStorage.createRegionAdapter(state.features)),
        brandResult.report,
        { storageKeyMigrated: false }
      );
      if (project.migrationReport && project.migrationReport.requiresUserReview) {
        const summary = project.migrationReport.summary;
        const message = `This older project needs review: ${summary.mapped} regions were linked, ${summary.ambiguous} need a choice, ${summary.missing} were not found, and ${summary.unsupported} unsupported project fields or entries need review. Open it and keep an update report?`;
        if (!confirm(message)) return;
      }
      if (!confirm("Open this project file? Your current project and browser backup will be replaced only after the file opens safely.")) return;
      const replacementPreparation = ProjectStorage.prepareCurrentTargetReplacement();
      if (replacementPreparation === false) {
        return showError("The current browser backup could not be preserved safely, so the project was not opened. Download the unreadable backup or remove the occupied recovery copy, then try again.");
      }
      state.storageMigrationReport = ProjectStorage.getStorageMigrationReport();
      updateStorageRecoveryButton(state.storageMigrationReport);
      const browserBackupSaved = applyProject(project, { save: replacementPreparation === true });
      if (replacementPreparation === null) {
        showError("The project file opened in this tab, but browser storage could not be checked, so no browser backup was replaced. Save a project file before closing this tab.");
      } else if (!browserBackupSaved) {
        showError("The project file opened safely, but its browser backup could not be replaced. Save the project file again before closing this tab.");
      }
    } catch (error) {
      showError(error.message);
    } finally {
      el.projectFile.value = "";
    }
  }

  function applyProject(project, options = {}) {
    clearPendingWorkspaceState();
    state.undo = [];
    state.title = project.title;
    state.highlights = project.highlights;
    state.manualHighlights = project.manualHighlights || {};
    state.unresolvedHighlights = project.unresolvedHighlights || {};
    state.migrationReport = project.migrationReport || null;
    state.legend = Array.isArray(project.legend) ? project.legend : defaultLegend();
    state.legendVisible = project.legendVisible;
    state.legendPosition = project.legendPosition;
    state.groupNames = project.groupNames || {};
    state.groupMeta = project.groupMeta || {};
    state.importCorrections = project.importCorrections || {};
    state.workflowStage = project.workflowStage || (Object.keys(state.highlights).length ? "visualize" : "input");
    state.uiMode = project.uiMode || "basic";
    state.importRows = Array.isArray(project.importRows) ? project.importRows : [];
    state.visualization = project.visualization || null;
    state.exportMeta = project.exportMeta || { subtitle: "", source: "", period: "", footnote: "", legendTitle: "Legend", filenameSlug: brand.defaults.exportFilenamePrefix };
    state.selectedDataRow = null;
    mapApi.select(null, false);
    el.projectTitle.value = state.title;
    el.exportSubtitle.value = state.exportMeta.subtitle || "";
    el.exportSource.value = state.exportMeta.source || "";
    el.exportPeriod.value = state.exportMeta.period || "";
    el.exportFootnote.value = state.exportMeta.footnote || "";
    el.exportLegendTitle.value = state.exportMeta.legendTitle || "Legend";
    el.exportFilenameSlug.value = state.exportMeta.filenameSlug || brand.defaults.exportFilenamePrefix;
    state.exportSettings = project.exportSettings || {};
    el.exportRatio.value = state.exportSettings.ratio || "16:9";
    el.exportExtent.value = state.exportSettings.extent || "national";
    el.exportLabels.checked = state.exportSettings.labels !== false;
    el.transparentBg.checked = Boolean(state.exportSettings.transparent);
    el.exportHighDetail.checked = Boolean(state.exportSettings.highDetail);
    state.presentationView = Boolean(state.exportSettings.presentation);
    setPresentationView(state.presentationView, false);
    el.pngSize.value = state.exportSettings.pngSize || "1920x1080";
    setMode(state.uiMode, false);
    updateAfterHighlightChange(false);
    el.dataTablePanel.hidden = !state.importRows.length;
    renderDataTable();
    renderWorkflow();
    renderLegendEditor(false);
    updateMigrationReportUi();
    return options.save ? scheduleSave() : true;
  }

  function clearProject() {
    if (!confirm("Start over and remove the current browser backup? A compatibility copy from before the upgrade may remain available for recovery.")) return;
    const cleared = ProjectStorage.clearAutosave();
    state.storageMigrationReport = ProjectStorage.getStorageMigrationReport();
    if (!cleared) {
      el.autosaveStatus.dataset.state = "unavailable";
      el.autosaveStatus.textContent = "The browser backup could not be removed. Your saved copy is still available.";
      updateStorageRecoveryButton(state.storageMigrationReport);
      return;
    }
    state.title = brand.defaults.projectTitle;
    state.highlights = {};
    state.manualHighlights = {};
    state.unresolvedHighlights = {};
    state.migrationReport = null;
    state.legend = defaultLegend();
    state.legendVisible = true;
    state.legendPosition = "bottom-right";
    state.groupNames = {};
    state.groupMeta = {};
    state.importCorrections = {};
    state.importRows = [];
    state.visualization = null;
    state.presentationView = false;
    state.selectedDataRow = null;
    state.workflowStage = "input";
    state.undo = [];
    state.exportMeta = {
      subtitle: "",
      source: "",
      period: "",
      footnote: "",
      legendTitle: "Legend",
      filenameSlug: brand.defaults.exportFilenamePrefix
    };
    state.exportSettings = {};
    el.projectTitle.value = brand.defaults.projectTitle;
    el.exportSubtitle.value = "";
    el.exportSource.value = "";
    el.exportPeriod.value = "";
    el.exportFootnote.value = "";
    el.exportLegendTitle.value = "Legend";
    el.exportFilenameSlug.value = brand.defaults.exportFilenamePrefix;
    el.exportRatio.value = "16:9";
    el.exportExtent.value = "national";
    el.exportLabels.checked = true;
    el.transparentBg.checked = false;
    el.exportHighDetail.checked = false;
    el.presentationView.checked = false;
    el.pngSize.value = "1920x1080";
    el.showLegend.checked = true;
    el.legendPosition.value = "bottom-right";
    el.searchInput.value = "";
    el.provinceSelect.value = "__all";
    renderRegionOptions();
    el.regionSelect.value = "";
    el.selectedRegion.textContent = "No region selected.";
    el.mapSelectionStatus.textContent = "";
    el.dataTableFilter.value = "";
    el.dataTablePanel.hidden = true;
    clearPendingWorkspaceState();
    mapApi.select(null, false);
    setPresentationView(false, false);
    setMode("basic", false);
    renderLegendEditor(false);
    updateAfterHighlightChange(false);
    el.autosaveStatus.dataset.state = cleared ? "cleared" : "unavailable";
    el.autosaveStatus.textContent = cleared
      ? (state.storageMigrationReport && state.storageMigrationReport.sourceRetained
        ? "Current browser backup removed. A previous compatibility backup is retained for recovery."
        : "Browser backup removed.")
      : "The browser backup could not be removed. Your saved copy is still available.";
    updateStorageRecoveryButton(state.storageMigrationReport);
    updateMigrationReportUi();
  }

  function recoverLegacyAutosave() {
    if (!confirm("Recover the previous browser backup? This will replace the current map only after both the previous copy and a safety copy of the current backup are verified.")) return;
    try {
      const result = ProjectStorage.recoverRetainedAutosave(ProjectStorage.createRegionAdapter(state.features));
      state.storageMigrationReport = result.report;
      if (!result.project) {
        updateStorageMigrationUi(result.report);
        if (result.report && result.report.status === "failed-backup-slot-occupied") {
          return showError("A replaced browser backup is already stored. Download it if needed, then delete the stored recovery copy before recovering another backup.");
        }
        return showError("The previous browser backup could not be recovered. It was left unchanged.");
      }
      applyProject(result.project);
      updateStorageMigrationUi(result.report);
    } catch (error) {
      showError("The previous browser backup could not be recovered. It was left unchanged.");
    }
  }

  function downloadStorageRecovery() {
    if (!ProjectStorage.downloadRetainedTargetBackup()) return showError("No replaced browser backup is available to download.");
    el.autosaveStatus.dataset.state = "downloaded";
    el.autosaveStatus.textContent = "The replaced browser backup was downloaded. It remains stored until you delete it.";
  }

  function downloadUnreadableBackup(key) {
    if (!ProjectStorage.downloadUnreadableBackup(key)) return showError("That unreadable browser backup is no longer available. No other saved copy was changed.");
    el.autosaveStatus.dataset.state = "downloaded";
    el.autosaveStatus.textContent = "The unreadable browser backup was downloaded as raw text. The stored copy remains unchanged.";
  }

  function deleteLegacyAutosave() {
    if (!confirm("Delete the previous compatibility backup permanently? This cannot be undone.")) return;
    const removed = ProjectStorage.clearRetainedLegacyAutosave();
    if (!removed) return showError("The previous compatibility backup could not be deleted. It remains stored on this device.");
    if (state.storageMigrationReport) {
      state.storageMigrationReport.sourceRetained = false;
      state.storageMigrationReport.recoverySourceKey = null;
      if (Array.isArray(state.storageMigrationReport.unreadableBackupKeys)) {
        state.storageMigrationReport.unreadableBackupKeys = state.storageMigrationReport.unreadableBackupKeys.filter((key) => !ProjectStorage.LEGACY_STORAGE_KEYS.includes(key));
        state.storageMigrationReport.unreadableBackupRetained = state.storageMigrationReport.unreadableBackupKeys.length > 0;
      }
      state.storageMigrationReport.backupStatus = state.storageMigrationReport.replacedTargetRetained ? "replaced-target-retained" : "not-required";
    }
    updateStorageRecoveryButton(state.storageMigrationReport);
    el.autosaveStatus.dataset.state = "cleared";
    el.autosaveStatus.textContent = "The previous compatibility backup was deleted.";
  }

  function deleteStorageRecovery() {
    if (!confirm("Delete the replaced browser backup permanently? This cannot be undone.")) return;
    const removed = ProjectStorage.clearRetainedTargetBackup();
    if (!removed) return showError("The replaced browser backup could not be deleted. It remains stored on this device.");
    if (state.storageMigrationReport) {
      state.storageMigrationReport.replacedTargetRetained = false;
      state.storageMigrationReport.replacedTargetBackupKey = null;
      state.storageMigrationReport.backupStatus = state.storageMigrationReport.sourceRetained ? "source-retained" : "not-required";
    }
    updateStorageRecoveryButton(state.storageMigrationReport);
    el.autosaveStatus.dataset.state = "cleared";
    el.autosaveStatus.textContent = "The replaced browser backup was deleted.";
  }

  function scheduleSave() {
    if (!state.features.length) return false;
    const ok = ProjectStorage.autosave(state);
    state.storageMigrationReport = ProjectStorage.getStorageMigrationReport();
    updateStorageRecoveryButton(state.storageMigrationReport);
    el.autosaveStatus.dataset.state = ok ? "saved" : "unavailable";
    el.autosaveStatus.textContent = ok
      ? productText("ui.status.projectSaved")
      : (ProjectStorage.hasUnreadableBackup(ProjectStorage.STORAGE_KEY)
        ? "The current browser backup was not replaced because its unreadable copy could not be preserved. Download it before trying again."
        : (state.storageMigrationReport && state.storageMigrationReport.protectCurrentTargetBeforeWrite
          ? "The saved browser copy was not replaced because a verified safety copy could not be created. It remains unchanged."
          : "A browser backup is not available. Save a project file to keep your work."));
    return ok;
  }

  function updateMigrationReportUi() {
    const report = state.migrationReport;
    if (!report) {
      el.migrationReportBtn.hidden = true;
      return;
    }
    const summary = report.summary || {};
    const unresolvedRegions = (summary.ambiguous || 0) + (summary.missing || 0);
    const unsupportedEntries = summary.unsupported || 0;
    const unresolved = unresolvedRegions + unsupportedEntries;
    el.migrationReportBtn.hidden = false;
    el.autosaveStatus.dataset.state = unresolved ? "migration-review" : "opened";
    el.autosaveStatus.textContent = unresolved
      ? `Project opened. ${unresolvedRegions} region references and ${unsupportedEntries} unsupported project fields or entries need review. An update report is available.`
      : "Project opened and updated without dropping saved regions.";
  }

  function updateStorageRecoveryButton(report) {
    const hasLegacySource = Boolean(report && report.sourceRetained);
    if (el.recoverLegacyAutosaveBtn) el.recoverLegacyAutosaveBtn.hidden = !hasLegacySource;
    if (el.deleteLegacyAutosaveBtn) el.deleteLegacyAutosaveBtn.hidden = !hasLegacySource;
    const hasReplacedTarget = Boolean((report && report.replacedTargetRetained) || ProjectStorage.hasRetainedTargetBackup());
    if (el.downloadStorageRecoveryBtn) el.downloadStorageRecoveryBtn.hidden = !hasReplacedTarget;
    if (el.deleteStorageRecoveryBtn) el.deleteStorageRecoveryBtn.hidden = !hasReplacedTarget;
    if (el.downloadUnreadableTargetBtn) el.downloadUnreadableTargetBtn.hidden = !ProjectStorage.hasUnreadableBackup(ProjectStorage.STORAGE_KEY, report);
    const unreadableLegacyKey = ProjectStorage.LEGACY_STORAGE_KEYS.find((key) => ProjectStorage.hasUnreadableBackup(key, report));
    if (el.downloadUnreadableLegacyBtn) el.downloadUnreadableLegacyBtn.hidden = !unreadableLegacyKey;
  }

  function updateStorageMigrationUi(report) {
    updateStorageRecoveryButton(report);
    if (!report) return;
    const status = String(report.status || "");
    const dropped = Array.isArray(report.droppedEntries) ? report.droppedEntries.length : 0;
    const unresolved = Array.isArray(report.unresolvedEntries) ? report.unresolvedEntries.length : 0;
    if (status.startsWith("failed")) {
      el.autosaveStatus.dataset.state = "migration-error";
      el.autosaveStatus.textContent = report.sourceRetained
        ? "The browser backup could not be moved. The previous copy is still safe and can be recovered."
        : "The browser backup could not be checked. No saved work was cleared; open a project file to continue.";
      return;
    }
    if (["migrated", "recovered-invalid-target", "recovered-retained-source"].includes(status)) {
      el.autosaveStatus.dataset.state = dropped || unresolved ? "migration-review" : "saved";
      el.autosaveStatus.textContent = dropped || unresolved
        ? "The browser backup was moved, but its update report needs review. The previous copy is still safe."
        : "The browser backup was moved safely. The previous copy is retained for recovery.";
      return;
    }
    if (status === "cleared") {
      el.autosaveStatus.dataset.state = "cleared";
    }
  }

  function downloadMigrationReport() {
    if (!state.migrationReport) return;
    ProjectStorage.downloadJson(brand.defaults.migrationReportFilename || "nusacanvas-project-update-report.json", state.migrationReport);
  }

  async function exportSvg() {
    try {
      const payload = await getExportPayload("svg");
      MapExport.exportSvg(payload.features, state, {
        ratio: el.exportRatio.value,
        extent: el.exportExtent.value,
        labels: el.exportLabels.checked,
        transparent: el.transparentBg.checked,
        selectedId: mapApi.selectedId,
        presentationMode: state.presentationView,
        geometryDetail: payload.geometryDetail,
        viewBounds: payload.viewBounds,
        legendFeatures: state.features
      });
    } catch (error) {
      showError("The SVG could not be created. Your map is still safe. Try again or export PNG. " + error.message);
    }
  }

  async function exportPng() {
    el.loadingIndicator.dataset.state = "exporting";
    el.loadingIndicator.textContent = "Creating PNG...";
    try {
      const payload = await getExportPayload("png");
      const pngPlan = MapExport.estimatePngCost({ pngSize: el.pngSize.value });
      if (pngPlan.risky && !confirm(`A ${pngPlan.width} x ${pngPlan.height} PNG may use about ${pngPlan.estimatedMegabytes} MB of memory. Continue?`)) {
        el.loadingIndicator.dataset.state = "ready";
        el.loadingIndicator.textContent = "PNG export canceled. Your map has not changed.";
        return;
      }
      const result = await MapExport.exportPng(payload.features, state, {
        pngSize: el.pngSize.value,
        ratio: el.exportRatio.value,
        extent: el.exportExtent.value,
        labels: el.exportLabels.checked,
        transparent: el.transparentBg.checked,
        selectedId: mapApi.selectedId,
        presentationMode: state.presentationView,
        geometryDetail: payload.geometryDetail,
        viewBounds: payload.viewBounds,
        legendFeatures: state.features
      });
      el.loadingIndicator.dataset.state = "ready";
      el.loadingIndicator.textContent = result.fallbackUsed
        ? `PNG created at ${result.size.width} x ${result.size.height}.`
        : productText("ui.status.pngCreated");
    } catch (error) {
      showError(productText("ui.errors.pngExport"));
      el.loadingIndicator.dataset.state = "ready";
      el.loadingIndicator.textContent = "PNG was not created. Your map has not changed.";
    }
  }

  async function exportPdf() {
    el.loadingIndicator.dataset.state = "exporting";
    el.loadingIndicator.textContent = "Creating PDF...";
    try {
      const payload = await getExportPayload("pdf");
      const result = await MapExport.exportPdf(payload.features, state, {
        ratio: el.exportRatio.value === "a3" ? "a3" : "a4",
        extent: el.exportExtent.value,
        labels: el.exportLabels.checked,
        transparent: false,
        selectedId: mapApi.selectedId,
        presentationMode: state.presentationView,
        geometryDetail: payload.geometryDetail,
        viewBounds: payload.viewBounds,
        legendFeatures: state.features
      });
      el.loadingIndicator.dataset.state = "ready";
      el.loadingIndicator.textContent = productText("ui.status.pdfCreated");
    } catch (error) {
      showError(productText("ui.errors.pdfExport"));
      el.loadingIndicator.dataset.state = "ready";
      el.loadingIndicator.textContent = "PDF was not created. Your map has not changed.";
    }
  }

  function exportMapping() {
    if (!state.importRows.length) return showError("There is no region match table to download. Your map is safe. Add and match data first.");
    MapExport.exportMappingCsv(state.importRows, state);
  }

  function saveExportSettings(save = true) {
    state.exportSettings = {
      ratio: el.exportRatio.value,
      extent: el.exportExtent.value,
      labels: el.exportLabels.checked,
      transparent: el.transparentBg.checked,
      highDetail: el.exportHighDetail.checked,
      presentation: state.presentationView,
      pngSize: el.pngSize.value
    };
    if (save) scheduleSave();
  }

  async function getExportPayload(format) {
    const view = mapApi.getCurrentView();
    let featureById = state.featureById;
    const useDetailed = MapExport.requiresDetailedGeometry(format, {
      highDetail: el.exportHighDetail.checked,
      pngSize: el.pngSize.value
    });
    if (useDetailed) {
      el.loadingIndicator.textContent = "Loading detailed local boundaries for this export...";
      await loadHighDetailCollection();
      featureById = state.highDetailFeatureById;
    }
    const national = el.exportExtent.value === "national";
    const features = national ? Array.from(featureById.values()) : view.visibleIds.map((id) => featureById.get(id) || state.featureById.get(id)).filter(Boolean);
    return {
      // Export follows the user's current zoom and pan position for every export ratio.
      features: features.length ? features : Array.from(featureById.values()),
      viewBounds: national ? null : view.bounds,
      geometryDetail: useDetailed ? "detailed" : "lite"
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
    const raw = String(message || "").trim();
    el.errorArea.dataset.state = "error";
    el.errorArea.dataset.testid = window.ProductContent ? window.ProductContent.strings.testIdentifiers.safeError : "safe-error";
    el.errorArea.textContent = raw || productText("ui.errors.genericSafe");
    setTimeout(() => {
      el.errorArea.textContent = "";
      el.errorArea.dataset.state = "idle";
    }, 7000);
  }

  function escapeHtml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, "&#96;");
  }
})();
