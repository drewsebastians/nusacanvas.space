(function guidedRailPrototype() {
  "use strict";

  const allowedViews = new Set(["home", "manual", "add", "match", "design", "export", "loading", "error"]);
  const allowedSheets = new Set(["collapsed", "medium", "expanded"]);
  const allowedFlows = new Set(["manual", "spreadsheet"]);
  const body = document.body;
  const futureDialog = document.querySelector("#future-dialog");
  const unsavedDialog = document.querySelector("#unsaved-dialog");
  const inspector = document.querySelector("#map-inspector");
  const toast = document.querySelector(".toast");
  const nav = document.querySelector("#public-navigation");
  const menuButton = document.querySelector(".menu-button");
  let currentView = "home";
  let dirty = false;
  let pendingNavigation = null;
  let lastDrawerTrigger = document.querySelector("[data-drawer-trigger]");
  let toastTimer;

  function readUrlState() {
    const params = new URLSearchParams(window.location.search);
    const view = allowedViews.has(params.get("view")) ? params.get("view") : "home";
    const requestedFlow = allowedFlows.has(params.get("flow")) ? params.get("flow") : "spreadsheet";
    const flow = view === "manual" ? "manual" : requestedFlow;
    const sheet = allowedSheets.has(params.get("sheet")) ? params.get("sheet") : "medium";
    const drawer = params.get("drawer") === "open" ? "open" : "closed";
    const inspectorOpen = params.get("inspector") === "open";
    return { view, flow, sheet, drawer, inspectorOpen };
  }

  function makeUrl(view, overrides) {
    const url = new URL(window.location.href);
    const settings = Object.assign({
      sheet: body.dataset.sheet,
      drawer: body.dataset.drawer,
      inspector: inspector && !inspector.hidden ? "open" : "closed",
      flow: body.dataset.flow
    }, overrides || {});
    url.searchParams.set("view", view);
    if (view === "home") {
      url.searchParams.delete("sheet");
      url.searchParams.delete("drawer");
      url.searchParams.delete("inspector");
      url.searchParams.delete("flow");
    } else {
      url.searchParams.set("flow", allowedFlows.has(settings.flow) ? settings.flow : "spreadsheet");
      url.searchParams.set("sheet", allowedSheets.has(settings.sheet) ? settings.sheet : "medium");
      if (settings.drawer === "open") url.searchParams.set("drawer", "open");
      else url.searchParams.delete("drawer");
      if (settings.inspector === "open" && view === "design") url.searchParams.set("inspector", "open");
      else url.searchParams.delete("inspector");
    }
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function updateDocumentTitle(view) {
    const titles = {
      home: "NusaCanvas — Guided Rail prototype",
      manual: "Highlight regions — NusaCanvas prototype",
      add: "Add data — NusaCanvas prototype",
      match: "Match regions — NusaCanvas prototype",
      design: "Design map — NusaCanvas prototype",
      export: "Export — NusaCanvas prototype",
      loading: "Loading example — NusaCanvas prototype",
      error: "Error example — NusaCanvas prototype"
    };
    document.title = titles[view];
  }

  function renderView(view, options) {
    const settings = Object.assign({ focus: true, urlMode: "push", state: null }, options || {});
    const nextView = allowedViews.has(view) ? view : "home";
    const state = Object.assign({}, settings.state || readUrlState());
    if (allowedFlows.has(settings.flow)) state.flow = settings.flow;
    if (nextView === "manual") state.flow = "manual";
    if (["add", "match", "loading", "error"].includes(nextView)) state.flow = "spreadsheet";
    currentView = nextView;
    body.dataset.view = nextView;
    body.dataset.screen = nextView === "home" ? "home" : "workspace";
    body.dataset.flow = allowedFlows.has(state.flow) ? state.flow : "spreadsheet";
    body.dataset.sheet = allowedSheets.has(state.sheet) ? state.sheet : "medium";
    body.dataset.drawer = state.drawer === "open" ? "open" : "closed";
    updateDocumentTitle(nextView);

    if (inspector) {
      inspector.hidden = !(state.inspectorOpen && nextView === "design");
      const trigger = document.querySelector(".inspector-trigger");
      if (trigger) trigger.setAttribute("aria-expanded", String(!inspector.hidden));
    }

    document.querySelectorAll("[data-drawer-toggle]").forEach((control) => {
      control.setAttribute("aria-expanded", String(body.dataset.drawer === "open"));
    });
    document.querySelectorAll("[data-current-task]").forEach((task) => task.removeAttribute("aria-current"));
    document.querySelector(`[data-current-task="${nextView}"]`)?.setAttribute("aria-current", "step");
    document.querySelectorAll("[data-step] button").forEach((step) => step.removeAttribute("aria-current"));
    document.querySelector(`[data-step="${nextView}"] button`)?.setAttribute("aria-current", "step");

    if (settings.urlMode === "replace") {
      history.replaceState({ view: nextView }, "", makeUrl(nextView));
    } else if (settings.urlMode === "push") {
      history.pushState({ view: nextView }, "", makeUrl(nextView));
    }

    closeMobileMenu();
    if (settings.focus) {
      const heading = nextView === "home"
        ? document.querySelector("#hero-title")
        : document.querySelector(`[data-panel="${nextView}"] h1`);
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        window.requestAnimationFrame(() => heading.focus({ preventScroll: true }));
      }
    }
  }

  function requestView(view, options) {
    const settings = options || {};
    if (view === "home" && dirty && !settings.force) {
      pendingNavigation = { view: "home", options: settings };
      if (unsavedDialog && !unsavedDialog.open) unsavedDialog.showModal();
      return;
    }
    renderView(view, settings);
    if (settings.sample) showToast("Sample rows are ready. They remain on this device.");
  }

  function markChanged(message) {
    dirty = true;
    setSaveStatus("Unsaved prototype changes", "true", "!");
    if (message) showToast(message);
  }

  function setSaveStatus(message, unsaved, icon) {
    const saveState = document.querySelector("[data-save-status]");
    if (!saveState) return;
    saveState.dataset.unsaved = unsaved;
    saveState.innerHTML = `<span aria-hidden="true">${icon}</span> ${message}`;
  }

  function showToast(message) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
  }

  function closeMobileMenu() {
    if (!nav || !menuButton) return;
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }

  function updateUrlInPlace(overrides) {
    history.replaceState({ view: currentView }, "", makeUrl(currentView, overrides));
  }

  function setDrawer(open, options) {
    const settings = Object.assign({ focusHeading: false, restoreFocus: false, updateUrl: true }, options || {});
    body.dataset.drawer = open ? "open" : "closed";
    document.querySelectorAll("[data-drawer-toggle]").forEach((control) => {
      control.setAttribute("aria-expanded", String(open));
    });
    if (settings.updateUrl) updateUrlInPlace({ drawer: body.dataset.drawer });
    if (open && settings.focusHeading) {
      const drawerHeading = document.querySelector("#data-drawer .drawer-heading strong");
      if (drawerHeading) {
        drawerHeading.setAttribute("tabindex", "-1");
        window.requestAnimationFrame(() => drawerHeading.focus());
      }
    }
    if (!open && settings.restoreFocus && lastDrawerTrigger) {
      window.requestAnimationFrame(() => lastDrawerTrigger.focus());
    }
  }

  document.addEventListener("click", (event) => {
    const viewControl = event.target.closest("[data-view-target], [data-view-link]");
    if (viewControl) {
      event.preventDefault();
      const target = viewControl.dataset.viewTarget || viewControl.dataset.viewLink;
      const flow = viewControl.dataset.flowTarget
        || (target === "manual" ? "manual" : null)
        || (["add", "match"].includes(target) ? "spreadsheet" : body.dataset.flow);
      if (futureDialog && futureDialog.open) futureDialog.close();
      requestView(target, { sample: viewControl.dataset.sample === "true", flow });
      return;
    }

    const futureControl = event.target.closest("[data-future]");
    if (futureControl && futureDialog) {
      const isCoverage = futureControl.dataset.future === "coverage";
      document.querySelector("#future-title").textContent = isCoverage
        ? "Coverage analysis is planned, not available yet."
        : "Sales territories are planned, not available yet.";
      document.querySelector("#future-description").textContent = isCoverage
        ? "This prototype shows how a future coverage workflow could be discovered. It does not run coverage analysis."
        : "This prototype shows where the future workflow could be discovered. It does not run a territory engine.";
      futureDialog.showModal();
      return;
    }

    if (event.target.closest(".dialog-close")) {
      event.target.closest("dialog").close();
      return;
    }

    const sheetControl = event.target.closest("[data-sheet-target]");
    if (sheetControl) {
      body.dataset.sheet = sheetControl.dataset.sheetTarget;
      updateUrlInPlace({ sheet: body.dataset.sheet });
      const focusTarget = body.dataset.sheet === "collapsed"
        ? document.querySelector("#map-title")
        : document.querySelector(`[data-current-task="${currentView}"] h1`);
      if (focusTarget) {
        focusTarget.setAttribute("tabindex", "-1");
        window.requestAnimationFrame(() => focusTarget.focus({ preventScroll: true }));
      }
      return;
    }

    const drawerControl = event.target.closest("[data-drawer-toggle]");
    if (drawerControl) {
      const opening = body.dataset.drawer !== "open";
      if (drawerControl.matches("[data-drawer-trigger]")) lastDrawerTrigger = drawerControl;
      setDrawer(opening, { focusHeading: opening, restoreFocus: !opening });
      return;
    }

    const columnEdit = event.target.closest("[data-column-edit]");
    if (columnEdit) {
      const editor = document.querySelector("#column-mapping-editor");
      editor.hidden = !editor.hidden;
      columnEdit.setAttribute("aria-expanded", String(!editor.hidden));
      columnEdit.textContent = editor.hidden ? "Change" : "Done";
      if (!editor.hidden) editor.querySelector("select")?.focus();
      return;
    }

    const suggestion = event.target.closest("[data-match-suggestion]");
    if (suggestion) {
      const row = suggestion.closest("[data-match-row]");
      const select = row.querySelector("[data-match-select]");
      select.value = suggestion.dataset.matchSuggestion;
      resolveMatchRow(row);
      return;
    }

    const inspectorTrigger = event.target.closest(".inspector-trigger");
    if (inspectorTrigger && inspector) {
      inspector.hidden = !inspector.hidden;
      inspectorTrigger.setAttribute("aria-expanded", String(!inspector.hidden));
      updateUrlInPlace({ inspector: inspector.hidden ? "closed" : "open" });
      if (!inspector.hidden) inspector.querySelector("h3").focus?.();
      return;
    }

    if (event.target.closest(".inspector-close") && inspector) {
      inspector.hidden = true;
      document.querySelector(".inspector-trigger")?.setAttribute("aria-expanded", "false");
      updateUrlInPlace({ inspector: "closed" });
      document.querySelector(".inspector-trigger")?.focus();
      return;
    }

    const regionRow = event.target.closest("[data-map-target]");
    if (regionRow) {
      const mapRegion = document.querySelector(`[data-map-region="${CSS.escape(regionRow.dataset.mapTarget)}"]`);
      if (mapRegion) {
        selectMapRegion(mapRegion);
        setDrawer(false, { restoreFocus: false });
        window.requestAnimationFrame(() => mapRegion.focus());
        showToast(`${regionRow.dataset.mapTarget} selected on the map.`);
      }
      return;
    }

    const mapRegion = event.target.closest("[data-map-region]");
    if (mapRegion) {
      const name = selectMapRegion(mapRegion);
      const linkedRow = document.querySelector(`[data-table-region="${CSS.escape(name)}"]`);
      if (currentView === "design" && inspector) {
        inspector.hidden = false;
        document.querySelector(".inspector-trigger")?.setAttribute("aria-expanded", "true");
      }
      if (linkedRow) {
        lastDrawerTrigger = document.querySelector("[data-drawer-trigger]");
        setDrawer(true, { focusHeading: false });
        window.requestAnimationFrame(() => linkedRow.querySelector("[data-region-row]")?.focus());
        showToast(`${name} selected. Its linked data row is open.`);
      } else {
        updateUrlInPlace({ inspector: inspector && !inspector.hidden ? "open" : "closed" });
        showToast(`${name} selected. It is outside the four-row sample table.`);
      }
      return;
    }

    const previewMenuButton = event.target.closest(".preview-menu-button");
    if (previewMenuButton) {
      const menu = document.querySelector(".preview-state-menu");
      menu.hidden = !menu.hidden;
      previewMenuButton.setAttribute("aria-expanded", String(!menu.hidden));
      return;
    }

    if (event.target.closest("[data-download]")) {
      createSyntheticDownload();
      return;
    }
  });

  function selectMapRegion(mapRegion) {
    document.querySelectorAll("[data-map-region]").forEach((path) => {
      path.classList.remove("selected-region");
      path.setAttribute("aria-pressed", "false");
    });
    mapRegion.classList.add("selected-region");
    mapRegion.setAttribute("aria-pressed", "true");
    const name = mapRegion.dataset.mapRegion;
    const inspectorName = document.querySelector("#map-inspector h3");
    if (inspectorName) inspectorName.textContent = name;
    document.querySelectorAll("tbody tr").forEach((row) => row.removeAttribute("aria-current"));
    document.querySelector(`[data-table-region="${CSS.escape(name)}"]`)?.setAttribute("aria-current", "true");
    return name;
  }

  document.querySelectorAll("[data-input-tab]").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.inputTab;
      document.querySelectorAll("[data-input-tab]").forEach((item) => item.setAttribute("aria-selected", String(item === tab)));
      document.querySelectorAll("[data-input-panel]").forEach((panel) => { panel.hidden = panel.dataset.inputPanel !== name; });
      document.querySelector(`[data-input-panel="${name}"]`)?.querySelector("textarea, label")?.focus();
    });
  });

  document.querySelectorAll("[data-match-select]").forEach((select) => {
    select.addEventListener("change", () => resolveMatchRow(select.closest("[data-match-row]")));
  });

  function resolveMatchRow(row) {
    const select = row.querySelector("[data-match-select]");
    const resolved = Boolean(select.value);
    row.classList.toggle("resolved", resolved);
    const suggestion = row.querySelector("[data-match-suggestion]");
    suggestion.textContent = resolved ? `Matched to ${select.options[select.selectedIndex].text}` : suggestion.textContent;
    suggestion.disabled = resolved;
    const unresolved = [...document.querySelectorAll("[data-match-select]")].filter((item) => !item.value).length;
    const counter = document.querySelector("#unmatched-count");
    if (counter) counter.textContent = String(unresolved);
    const continueButton = document.querySelector("#continue-design");
    if (continueButton) continueButton.disabled = unresolved !== 0;
    markChanged(unresolved === 0 ? "All rows matched. The design step is ready." : `${unresolved} row${unresolved === 1 ? "" : "s"} still need a match.`);
  }

  document.querySelectorAll("[data-region]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const count = document.querySelectorAll("[data-region]:checked").length;
      document.querySelector("#selection-count").textContent = `${count} region${count === 1 ? "" : "s"}`;
      markChanged(`${checkbox.dataset.region} ${checkbox.checked ? "added to" : "removed from"} the map.`);
    });
  });

  document.querySelectorAll("input[type='radio'], input[type='range'], input[type='color'], select:not([data-match-select]), textarea").forEach((control) => {
    control.addEventListener("change", () => markChanged());
  });

  const boundaryRange = document.querySelector("#boundary-weight");
  if (boundaryRange) {
    boundaryRange.addEventListener("input", () => {
      const output = boundaryRange.parentElement.querySelector("output");
      if (output) output.textContent = `${boundaryRange.value} px`;
    });
  }

  const fileInput = document.querySelector("#spreadsheet-file");
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (!fileInput.files.length) return;
      markChanged();
      renderView("loading", { urlMode: "push", flow: "spreadsheet" });
      window.setTimeout(() => showToast("Loading is paused in this prototype. Use the state menu to continue."), 500);
    });
  }

  if (menuButton) {
    menuButton.addEventListener("click", () => {
      const open = !nav.classList.contains("open");
      nav.classList.toggle("open", open);
      menuButton.setAttribute("aria-expanded", String(open));
    });
  }

  if (unsavedDialog) {
    unsavedDialog.querySelector("[data-stay]").addEventListener("click", () => {
      pendingNavigation = null;
      unsavedDialog.close();
    });
    unsavedDialog.querySelector("[data-leave]").addEventListener("click", () => {
      const pending = pendingNavigation;
      pendingNavigation = null;
      dirty = false;
      setSaveStatus("Prototype · no changes", "", "•");
      unsavedDialog.close();
      if (pending) renderView(pending.view, Object.assign({}, pending.options, { force: true }));
    });
  }

  window.addEventListener("popstate", () => {
    const state = readUrlState();
    if (state.view === "home" && dirty) {
      history.pushState({ view: currentView }, "", makeUrl(currentView));
      pendingNavigation = { view: "home", options: { urlMode: "replace", state } };
      if (unsavedDialog && !unsavedDialog.open) unsavedDialog.showModal();
      return;
    }
    renderView(state.view, { urlMode: "none", state, focus: true });
  });

  window.addEventListener("beforeunload", (event) => {
    if (!dirty || currentView === "home") return;
    event.preventDefault();
    event.returnValue = "";
  });

  function createSyntheticDownload() {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900"><rect width="1600" height="900" fill="#eef4f5"/><text x="90" y="110" fill="#102a43" font-family="Arial,sans-serif" font-size="48" font-weight="700">Quarterly coverage</text><text x="90" y="160" fill="#627d98" font-family="Arial,sans-serif" font-size="24">Synthetic NusaCanvas prototype export</text><g transform="translate(180 220) scale(1.4)" stroke="#fff" stroke-width="5"><path fill="#2d79b7" d="M58 143l28-29 41-8 44 20 38 29 30 43-12 27-47-8-33-30-48-11-32-16z"/><path fill="#087f73" d="M241 197l62 3 50 9 65-2 55 10-9 15-58 3-47-6-52 6-61-12z"/><path fill="#45a99b" d="M311 105l37-18 43 12 15 29-24 18 8 33-37-8-20-27-28 14-16-22z"/><path fill="#d58a16" d="M421 109l25-26 19 12 16-14 24 19-9 24 26 12-15 28-27-10-16 17-26-18 14-20z"/><path fill="#b8cbd5" d="M526 171l47-23 78 10 42 26-18 34-49 1-31-20-55 7-29-16z"/></g><text x="90" y="840" fill="#627d98" font-family="Arial,sans-serif" font-size="20">Prototype fixture · not for geographic reference</text></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nusacanvas-guided-rail-prototype.svg";
    anchor.click();
    URL.revokeObjectURL(url);
    dirty = false;
    setSaveStatus("Exported · no pending changes", "false", "✓");
    showToast("Synthetic prototype preview downloaded.");
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && body.dataset.drawer === "open" && !(unsavedDialog?.open || futureDialog?.open)) {
      event.preventDefault();
      setDrawer(false, { restoreFocus: true });
    }
  });

  document.querySelectorAll("[data-map-region]").forEach((path) => {
    path.setAttribute("aria-pressed", String(path.classList.contains("selected-region")));
    path.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        path.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
  });

  const initial = readUrlState();
  renderView(initial.view, { focus: false, urlMode: "replace", state: initial });
})();
