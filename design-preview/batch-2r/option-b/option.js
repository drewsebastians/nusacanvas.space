(function canvasCommandPrototype() {
  "use strict";

  const root = document.documentElement;
  const homeView = document.querySelector("#home-view");
  const workspaceView = document.querySelector("#workspace-view");
  const publicHeader = document.querySelector("#public-header");
  const publicFooter = document.querySelector("#public-footer");
  const spreadsheetProcess = document.querySelector("#spreadsheet-process");
  const manualProcess = document.querySelector("#manual-process");
  const drawer = document.querySelector("#data-drawer");
  const drawerScrim = document.querySelector("#drawer-scrim");
  const drawerButton = document.querySelector("#open-data-drawer");
  const loadingExample = document.querySelector("#loading-example");
  const errorExample = document.querySelector("#error-example");
  const savedState = document.querySelector("#saved-state");
  const toast = document.querySelector("#prototype-toast");
  const leaveDialog = document.querySelector("#leave-dialog");
  const workspaceStage = document.querySelector("#workspace");
  const currentTask = document.querySelector("[data-current-task]");
  const mapCanvas = document.querySelector("[data-map-canvas]");
  const allowedSpreadsheetSteps = ["add", "match", "design", "export"];
  const allowedManualSteps = ["select", "style"];
  const allowedSheets = ["collapsed", "medium", "expanded"];
  const allowedDemos = ["none", "loading", "error"];
  let dirty = false;
  let pendingNavigation = null;
  let toastTimer = 0;
  let lastUrl = window.location.href;

  // The visual layers use absolute positioning, so make the runtime DOM order
  // match the intended keyboard order: current task, map, then data drawer.
  if (workspaceStage && currentTask && mapCanvas) {
    workspaceStage.insertBefore(currentTask, mapCanvas);
  }

  function readState() {
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view") === "workspace" ? "workspace" : "home";
    const flow = params.get("flow") === "manual" ? "manual" : "spreadsheet";
    const candidateStep = params.get("step");
    const step = flow === "manual"
      ? (allowedManualSteps.includes(candidateStep) ? candidateStep : "select")
      : (allowedSpreadsheetSteps.includes(candidateStep) ? candidateStep : "add");
    const sheetCandidate = params.get("sheet") || "medium";
    const demoCandidate = params.get("demo") || "none";

    return {
      view,
      flow,
      step,
      sheet: allowedSheets.includes(sheetCandidate) ? sheetCandidate : "medium",
      demo: allowedDemos.includes(demoCandidate) ? demoCandidate : "none",
      drawerOpen: params.get("drawer") === "open",
      drawerTab: params.get("drawerTab") === "issues" ? "issues" : "data",
      focus: params.get("focus") || "",
      sample: params.get("sample") === "1",
      dirty: params.get("dirty") === "1"
    };
  }

  function setHidden(element, hidden) {
    if (element) element.hidden = hidden;
  }

  function updateProcess(state) {
    setHidden(spreadsheetProcess, state.flow !== "spreadsheet");
    setHidden(manualProcess, state.flow !== "manual");

    document.querySelectorAll("[data-process-step]").forEach((item, index) => {
      const currentIndex = allowedSpreadsheetSteps.indexOf(state.step);
      const itemStep = item.dataset.processStep;
      item.classList.toggle("is-current", state.flow === "spreadsheet" && itemStep === state.step);
      item.classList.toggle("is-complete", state.flow === "spreadsheet" && index < currentIndex);
      const link = item.querySelector("a");
      if (link) {
        if (state.flow === "spreadsheet" && itemStep === state.step) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      }
    });

    document.querySelectorAll("[data-manual-step]").forEach((item, index) => {
      const currentIndex = allowedManualSteps.indexOf(state.step);
      const itemStep = item.dataset.manualStep;
      item.classList.toggle("is-current", state.flow === "manual" && itemStep === state.step);
      item.classList.toggle("is-complete", state.flow === "manual" && index < currentIndex);
      const link = item.querySelector("a");
      if (link) {
        if (state.flow === "manual" && itemStep === state.step) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      }
    });
  }

  function updatePanes(state) {
    const activePane = `${state.flow}:${state.step}`;
    document.querySelectorAll("[data-pane]").forEach((pane) => {
      pane.hidden = pane.dataset.pane !== activePane;
    });

    const workflowName = document.querySelector("#workflow-name");
    const mapTitle = document.querySelector("#map-title");
    if (state.flow === "manual") {
      workflowName.textContent = "Highlight regions";
      mapTitle.textContent = state.step === "style" ? "Priority regions — Q3" : "Untitled highlighted map";
    } else {
      workflowName.textContent = "Map spreadsheet data";
      mapTitle.textContent = state.step === "add" ? "Map preview" : "Quarterly coverage";
    }
  }

  function updateDrawer(state) {
    setHidden(drawer, !state.drawerOpen);
    setHidden(drawerScrim, !state.drawerOpen);
    drawerButton.setAttribute("aria-expanded", String(state.drawerOpen));
    document.querySelectorAll("[data-drawer-tab]").forEach((tab) => {
      const selected = tab.dataset.drawerTab === state.drawerTab;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    setHidden(document.querySelector("#data-panel"), state.drawerTab !== "data");
    setHidden(document.querySelector("#issues-panel"), state.drawerTab !== "issues");
  }

  function updateDemo(state) {
    setHidden(loadingExample, state.demo !== "loading");
    setHidden(errorExample, state.demo !== "error");
    const menu = document.querySelector("#workspace-menu");
    if (menu) {
      menu.dataset.demo = state.demo;
      menu.setAttribute("aria-label", state.demo === "none" ? "Show loading example" : state.demo === "loading" ? "Show error example" : "Hide state example");
    }
  }

  function focusRequestedTarget(state) {
    if (!state.focus) return;
    const target = document.querySelector(`[data-focus-target="${CSS.escape(state.focus)}"]`);
    if (!target || target.closest("[hidden]")) return;
    window.setTimeout(() => target.focus({ preventScroll: false }), 80);
  }

  function render(options = {}) {
    const state = readState();
    root.dataset.view = state.view;
    root.dataset.flow = state.flow;
    root.dataset.step = state.step;
    root.dataset.sheet = state.sheet;
    root.dataset.demo = state.demo;
    root.dataset.drawer = state.drawerOpen ? "open" : "closed";
    root.dataset.dirty = dirty || state.dirty ? "true" : "false";
    document.body.dataset.view = state.view;
    document.body.dataset.flow = state.flow;
    document.body.dataset.step = state.step;
    document.body.dataset.sheet = state.sheet;
    document.body.dataset.demo = state.demo;

    const inWorkspace = state.view === "workspace";
    setHidden(homeView, inWorkspace);
    setHidden(workspaceView, !inWorkspace);
    setHidden(publicHeader, inWorkspace);
    setHidden(publicFooter, inWorkspace);
    document.body.classList.toggle("is-workspace", inWorkspace);

    if (inWorkspace) {
      if (state.dirty && !dirty) dirty = true;
      updateProcess(state);
      updatePanes(state);
      updateDrawer(state);
      updateDemo(state);
      updateSavedState();
      document.title = `${state.flow === "manual" ? "Highlight regions" : "Map spreadsheet data"} — Canvas Command prototype`;
    } else {
      document.title = "Canvas Command — NusaCanvas design option B";
      dirty = false;
    }

    if (!options.skipFocus) focusRequestedTarget(state);
    lastUrl = window.location.href;
  }

  function buildUrl(patch) {
    const url = new URL(window.location.href);
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === undefined || value === "") url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    });
    return url;
  }

  function setState(patch, mode = "push", options = {}) {
    const url = buildUrl(patch);
    window.history[mode === "replace" ? "replaceState" : "pushState"]({}, "", url);
    render(options);
  }

  function navigate(url, options = {}) {
    const destination = new URL(url, window.location.href);
    const leavingWorkspace = readState().view === "workspace" && destination.searchParams.get("view") !== "workspace";
    if (dirty && leavingWorkspace && !options.force) {
      pendingNavigation = destination;
      if (typeof leaveDialog.showModal === "function") leaveDialog.showModal();
      else if (window.confirm("Leave this map? Your prototype changes will reset.")) navigate(destination, { force: true });
      return;
    }
    window.history.pushState({}, "", destination);
    render();
  }

  function updateSavedState() {
    if (!savedState) return;
    savedState.classList.toggle("is-unsaved", dirty);
    savedState.lastChild.textContent = dirty ? " Unsaved prototype changes" : " Saved on this device";
    root.dataset.dirty = dirty ? "true" : "false";
  }

  function markDirty(message) {
    dirty = true;
    updateSavedState();
    if (message) showToast(message);
  }

  function markSaved(message) {
    dirty = false;
    updateSavedState();
    if (message) showToast(message);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 4200);
  }

  function openDrawer(tab = "data") {
    setState({ drawer: "open", drawerTab: tab }, "push", { skipFocus: true });
    window.setTimeout(() => document.querySelector("#close-data-drawer")?.focus(), 40);
  }

  function closeDrawer() {
    setState({ drawer: null, drawerTab: null }, "push", { skipFocus: true });
    window.setTimeout(() => drawerButton.focus(), 40);
  }

  function linkRegion(region) {
    document.querySelectorAll("[data-region]").forEach((shape) => shape.classList.toggle("is-linked", shape.dataset.region === region));
    document.querySelectorAll("[data-table-region]").forEach((row) => row.classList.toggle("is-linked", row.dataset.tableRegion === region));
    const selectedShape = document.querySelector(`[data-region="${CSS.escape(region)}"]`);
    const regionName = selectedShape ? selectedShape.getAttribute("aria-label").split(",")[0] : region;
    document.querySelector("#linked-map-status").textContent = `${regionName} is linked to its table row.`;
  }

  document.addEventListener("click", (event) => {
    const route = event.target.closest("[data-route]");
    if (route && route instanceof HTMLAnchorElement) {
      event.preventDefault();
      const menu = route.closest("details");
      if (menu) menu.open = false;
      navigate(route.href);
      return;
    }

    const upcoming = event.target.closest("[data-upcoming]");
    if (upcoming) {
      showToast(`${upcoming.dataset.upcoming} is an upcoming Batch 3 workflow. No runtime is active yet.`);
      return;
    }

    if (event.target.closest("#open-data-drawer")) {
      openDrawer(readState().step === "match" ? "issues" : "data");
      return;
    }
    if (event.target.closest("#close-data-drawer") || event.target.closest("#drawer-scrim")) {
      closeDrawer();
      return;
    }

    const drawerOpener = event.target.closest("[data-open-drawer]");
    if (drawerOpener) {
      openDrawer(drawerOpener.dataset.openDrawer);
      return;
    }
    const drawerTab = event.target.closest("[data-drawer-tab]");
    if (drawerTab) {
      setState({ drawer: "open", drawerTab: drawerTab.dataset.drawerTab }, "replace", { skipFocus: true });
      drawerTab.focus();
      return;
    }

    const jumpMatch = event.target.closest("[data-jump-match]");
    if (jumpMatch) {
      setState({ view: "workspace", flow: "spreadsheet", step: "match", drawer: null, drawerTab: null, sheet: "expanded", focus: "unmatched" });
      return;
    }

    const sheetButton = event.target.closest("[data-sheet]");
    if (sheetButton) {
      setState({ sheet: sheetButton.dataset.sheet }, "replace", { skipFocus: true });
      return;
    }
    if (event.target.closest("#sheet-handle")) {
      const current = readState().sheet;
      const next = current === "collapsed" ? "medium" : current === "medium" ? "expanded" : "collapsed";
      setState({ sheet: next }, "replace", { skipFocus: true });
      return;
    }

    const menuButton = event.target.closest("#workspace-menu");
    if (menuButton) {
      const current = readState().demo;
      const next = current === "none" ? "loading" : current === "loading" ? "error" : "none";
      setState({ demo: next === "none" ? null : next }, "replace", { skipFocus: true });
      return;
    }

    const resolveButton = event.target.closest(".resolve-button");
    if (resolveButton) {
      const card = resolveButton.closest("[data-unmatched]");
      if (card) card.remove();
      const remaining = document.querySelectorAll("[data-unmatched]").length;
      document.querySelector("#review-count").textContent = String(remaining);
      document.querySelector("#issue-count").textContent = String(remaining);
      markDirty(remaining ? `${remaining} row still needs review.` : "All visible rows are matched.");
      return;
    }

    const mapShape = event.target.closest("[data-region]");
    if (mapShape) {
      linkRegion(mapShape.dataset.region);
      return;
    }
    const tableRowButton = event.target.closest(".locate-row");
    if (tableRowButton) {
      const row = tableRowButton.closest("[data-table-region]");
      if (row) linkRegion(row.dataset.tableRegion);
      return;
    }

    if (event.target.closest("[data-clear-selection]")) {
      document.querySelectorAll("[data-region-checkbox]").forEach((checkbox) => { checkbox.checked = false; });
      document.querySelector("#selected-count").textContent = "0";
      markDirty("Selection cleared.");
      return;
    }
    if (event.target.closest("#load-sample")) {
      document.querySelector("#paste-data").value = "Region,Coverage,Owner\nJakarta,91,Ayu\nWest Java,82,Bima\nSouth Sulawesi,64,Citra";
      markDirty("Synthetic sample restored.");
      return;
    }
    if (event.target.closest("#export-download") || event.target.closest("[data-manual-download]")) {
      markSaved("Prototype download simulated. No file or data left this device.");
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-region-checkbox]")) {
      const count = document.querySelectorAll("[data-region-checkbox]:checked").length;
      document.querySelector("#selected-count").textContent = String(count);
      markDirty();
      return;
    }
    if (event.target.matches("input, select, textarea") && !event.target.matches("#spreadsheet-file")) markDirty();
  });

  document.querySelector("#paste-data")?.addEventListener("input", () => markDirty());

  document.querySelector("#boundary-weight")?.addEventListener("input", (event) => {
    const output = document.querySelector('output[for="boundary-weight"]');
    if (output) output.value = `${event.target.value} px`;
    markDirty();
  });

  document.querySelector("#spreadsheet-file")?.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const extensionOk = /\.(csv|xlsx)$/i.test(file.name);
    const sizeOk = file.size <= 10 * 1024 * 1024;
    if (!extensionOk || !sizeOk) {
      setState({ demo: "error" }, "replace", { skipFocus: true });
      errorExample.focus?.();
      return;
    }
    setState({ demo: "loading" }, "replace", { skipFocus: true });
    markDirty();
    window.setTimeout(() => {
      if (readState().demo === "loading") {
        setState({ demo: null }, "replace", { skipFocus: true });
        showToast(`${file.name} is ready in this local prototype.`);
      }
    }, 1200);
  });

  document.querySelectorAll("[data-region]").forEach((shape) => {
    shape.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        linkRegion(shape.dataset.region);
      }
    });
  });

  document.querySelector(".drawer-tabs")?.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextTab = readState().drawerTab === "data" ? "issues" : "data";
    setState({ drawerTab: nextTab }, "replace", { skipFocus: true });
    document.querySelector(`[data-drawer-tab="${nextTab}"]`)?.focus();
  });

  leaveDialog?.addEventListener("close", () => {
    if (leaveDialog.returnValue === "leave" && pendingNavigation) {
      const destination = pendingNavigation;
      pendingNavigation = null;
      dirty = false;
      navigate(destination, { force: true });
    } else {
      pendingNavigation = null;
    }
  });

  window.addEventListener("popstate", () => {
    const destination = window.location.href;
    const leavingWorkspace = readState().view !== "workspace" && dirty;
    if (leavingWorkspace && !window.confirm("Leave this map? Your prototype changes will reset.")) {
      window.history.pushState({}, "", lastUrl);
      render();
      return;
    }
    render();
    lastUrl = destination;
  });

  window.addEventListener("beforeunload", (event) => {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!drawer.hidden) closeDrawer();
    document.querySelectorAll("details[open]").forEach((details) => { details.open = false; });
  });

  render();
})();
