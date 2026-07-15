(() => {
  "use strict";

  const valid = {
    views: new Set(["home", "workspace"]),
    flows: new Set(["manual", "spreadsheet"]),
    spreadsheetSteps: new Set(["add", "match", "design", "export"]),
    sheets: new Set(["none", "data", "inspector"]),
    sizes: new Set(["collapsed", "medium", "expanded"]),
    demos: new Set(["none", "loading", "error"])
  };

  const elements = {
    body: document.body,
    home: document.querySelector("#home-view"),
    workspace: document.querySelector("#workspace-view"),
    workflowContent: document.querySelector("[data-workflow-content]"),
    workflowTitle: document.querySelector("[data-step-title]"),
    flowLabel: document.querySelector("[data-flow-label]"),
    stepLine: document.querySelector("[data-step-line]"),
    dataDrawer: document.querySelector(".data-drawer"),
    inspector: document.querySelector(".inspector-sheet"),
    loading: document.querySelector(".workspace-loading"),
    error: document.querySelector(".workspace-error"),
    toast: document.querySelector("[data-toast-region]"),
    mobileNav: document.querySelector("[data-mobile-nav]"),
    siteNav: document.querySelector("#site-navigation"),
    mobileSheetLabel: document.querySelector("[data-mobile-sheet-label]"),
    sheetSizeLabel: document.querySelector("[data-sheet-size-label]"),
    saveStatus: document.querySelector("[data-save-status]"),
    saveLabel: document.querySelector("[data-save-label]")
  };

  const session = {
    unsaved: false,
    selectedRegions: new Set(["Jawa Barat", "Bali"]),
    resolvedRows: new Set(),
    designStyle: "ranges",
    palette: "violet",
    labels: true,
    activeRegion: null,
    drawerReturn: null,
    inspectorReturn: null,
    toastTimer: null
  };

  let state = readState();

  function oneOf(value, options, fallback) {
    return options.has(value) ? value : fallback;
  }

  function readState() {
    const params = new URLSearchParams(window.location.search);
    const viewFromHash = window.location.hash.startsWith("#workspace") ? "workspace" : null;
    const view = oneOf(params.get("view") || viewFromHash, valid.views, "home");
    const flow = oneOf(params.get("flow"), valid.flows, "spreadsheet");
    const requestedStep = params.get("step");
    const step = flow === "manual" ? "highlight" : oneOf(requestedStep, valid.spreadsheetSteps, "add");

    return {
      view,
      flow,
      step,
      sheet: oneOf(params.get("sheet"), valid.sheets, "none"),
      size: oneOf(params.get("size"), valid.sizes, window.matchMedia("(max-width: 820px)").matches ? "medium" : "medium"),
      demo: oneOf(params.get("demo"), valid.demos, "none")
    };
  }

  function stateUrl(nextState) {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();
    params.set("view", nextState.view);
    if (nextState.view === "workspace") {
      params.set("flow", nextState.flow);
      params.set("step", nextState.step);
      if (nextState.sheet !== "none") params.set("sheet", nextState.sheet);
      if (nextState.size !== "medium") params.set("size", nextState.size);
      if (nextState.demo !== "none") params.set("demo", nextState.demo);
    }
    url.search = params.toString();
    url.hash = nextState.view === "workspace" ? `workspace-${nextState.flow}-${nextState.step}` : "top";
    return `${url.pathname}${url.search}${url.hash}`;
  }

  function navigate(patch, options = {}) {
    const next = { ...state, ...patch };
    next.flow = oneOf(next.flow, valid.flows, "spreadsheet");
    next.step = next.flow === "manual" ? "highlight" : oneOf(next.step, valid.spreadsheetSteps, "add");
    next.sheet = oneOf(next.sheet, valid.sheets, "none");
    next.size = oneOf(next.size, valid.sizes, "medium");
    next.demo = oneOf(next.demo, valid.demos, "none");
    state = next;

    if (options.replace) {
      window.history.replaceState(state, "", stateUrl(state));
    } else {
      window.history.pushState(state, "", stateUrl(state));
    }
    render(options.focusSelector);
  }

  function markChanged(message) {
    session.unsaved = true;
    updateSaveStatus();
    if (message) showToast(message);
  }

  function updateSaveStatus() {
    if (!elements.saveStatus || !elements.saveLabel) return;
    elements.saveStatus.classList.toggle("is-unsaved", session.unsaved);
    elements.saveLabel.textContent = session.unsaved ? "Unsaved prototype changes" : "Saved on this device";
  }

  function showToast(message) {
    window.clearTimeout(session.toastTimer);
    elements.toast.textContent = message;
    elements.toast.hidden = false;
    session.toastTimer = window.setTimeout(() => {
      elements.toast.hidden = true;
    }, 3600);
  }

  function confirmLeave() {
    return !session.unsaved || window.confirm("Leave this sample workspace? Unsaved prototype changes will be discarded.");
  }

  function render(focusSelector) {
    const inWorkspace = state.view === "workspace";
    elements.home.hidden = inWorkspace;
    elements.workspace.hidden = !inWorkspace;
    elements.body.dataset.view = state.view;
    elements.body.dataset.flow = state.flow;
    elements.body.dataset.step = state.step;
    elements.body.dataset.sheetSize = state.size;
    elements.body.dataset.demo = state.demo;
    elements.body.classList.toggle("sheet-collapsed", state.size === "collapsed");

    if (inWorkspace) renderWorkspace();

    if (focusSelector) {
      window.requestAnimationFrame(() => {
        const focusTarget = document.querySelector(focusSelector);
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      });
    }
  }

  function renderWorkspace() {
    document.querySelectorAll("[data-switch-flow]").forEach((button) => {
      if (button.dataset.switchFlow === state.flow) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });

    const isManual = state.flow === "manual";
    elements.flowLabel.textContent = isManual ? "Highlight regions" : "Map spreadsheet data";
    elements.workflowTitle.textContent = stepTitle();
    elements.mobileSheetLabel.textContent = stepTitle();
    elements.sheetSizeLabel.textContent = `${state.size[0].toUpperCase()}${state.size.slice(1)}`;
    elements.stepLine.hidden = isManual;
    elements.workflowContent.innerHTML = isManual ? manualTemplate() : spreadsheetTemplate(state.step);
    renderStepLine();
    updateSaveStatus();

    elements.dataDrawer.hidden = state.sheet !== "data";
    elements.inspector.hidden = state.sheet !== "inspector";
    elements.loading.hidden = state.demo !== "loading";
    elements.error.hidden = state.demo !== "error";
    renderLinkedState();
  }

  function renderLinkedState() {
    document.querySelectorAll("[data-map-region]").forEach((control) => {
      const selected = control.dataset.mapRegion === session.activeRegion;
      control.classList.toggle("is-linked", selected);
      control.setAttribute("aria-pressed", String(selected));
    });
    document.querySelectorAll("[data-region-row]").forEach((row) => {
      const selected = row.dataset.regionRow === session.activeRegion;
      row.classList.toggle("is-linked", selected);
      row.querySelector("[data-link-map]")?.setAttribute("aria-pressed", String(selected));
    });
  }

  function openDataDrawer(trigger, region = null) {
    if (region) session.activeRegion = region;
    const triggerName = trigger?.dataset.drawerTrigger;
    session.drawerReturn = {
      selector: triggerName ? `[data-drawer-trigger='${CSS.escape(triggerName)}']` : "#workflow-title",
      sheet: state.sheet,
      size: state.size,
      demo: state.demo
    };
    const focusSelector = region ? `[data-region-row='${CSS.escape(region)}']` : "#data-drawer-title";
    navigate({ sheet: "data", demo: "none", size: "collapsed" }, { focusSelector });
  }

  function closeDataDrawer() {
    const fallback = { selector: "#workflow-title", sheet: "none", size: "medium", demo: "none" };
    const destination = session.drawerReturn || fallback;
    session.drawerReturn = null;
    navigate({ sheet: destination.sheet, size: destination.size, demo: destination.demo }, { focusSelector: destination.selector });
  }

  function stepTitle() {
    if (state.flow === "manual") return "Choose regions";
    return { add: "Add data", match: "Match regions", design: "Design map", export: "Map ready" }[state.step];
  }

  function renderStepLine() {
    if (state.flow === "manual") return;
    const steps = ["add", "match", "design", "export"];
    const activeIndex = steps.indexOf(state.step);
    elements.stepLine.querySelectorAll("li").forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
      item.classList.toggle("is-complete", index < activeIndex);
      const button = item.querySelector("button");
      if (index === activeIndex) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  }

  function manualTemplate() {
    const regions = [
      ["Jawa Barat", "#5146a5"],
      ["Bali", "#d99a2b"],
      ["Sumatera Utara", "#8073cf"],
      ["Sulawesi Selatan", "#5146a5"]
    ];
    const regionMarkup = regions.map(([name, color]) => `
      <li>
        <label>
          <input type="checkbox" value="${name}" data-region-choice ${session.selectedRegions.has(name) ? "checked" : ""}>
          <span>${name}</span><i style="--map-color:${color}" aria-hidden="true"></i>
        </label>
      </li>`).join("");

    return `
      <div class="step-body" data-state-panel="manual-highlight">
        <p class="step-intro">Search or choose regions, then apply one clear style. You can refine individual colors from the map.</p>
        <label class="field-label" for="region-search">Find a province or city</label>
        <input class="input manual-search" id="region-search" type="search" placeholder="Try Jawa Barat" autocomplete="off" data-region-search>
        <div class="manual-inline"><strong>Suggested regions</strong><span data-selected-count>${session.selectedRegions.size} selected</span></div>
        <ul class="region-list" data-region-list>${regionMarkup}</ul>
        <label class="field-label">Highlight color</label>
        <div class="palette-row" aria-label="Highlight color">
          <button type="button" class="swatch-button" style="--swatch:#5146a5" aria-label="Deep violet" aria-pressed="true" data-manual-swatch></button>
          <button type="button" class="swatch-button" style="--swatch:#187c91" aria-label="Ocean blue" aria-pressed="false" data-manual-swatch></button>
          <button type="button" class="swatch-button" style="--swatch:#d06836" aria-label="Warm orange" aria-pressed="false" data-manual-swatch></button>
        </div>
        <div class="next-suggestion">
          <h2>Have a value for each region?</h2>
          <p>Map spreadsheet data links rows to regions and builds the legend for you.</p>
          <button type="button" data-switch-flow="spreadsheet">Switch to spreadsheet workflow →</button>
        </div>
        <div class="step-actions">
          <button class="button button-primary" type="button" data-apply-manual>Apply to ${session.selectedRegions.size} regions</button>
        </div>
      </div>`;
  }

  function spreadsheetTemplate(step) {
    if (step === "match") return matchTemplate();
    if (step === "design") return designTemplate();
    if (step === "export") return exportTemplate();
    return addTemplate();
  }

  function addTemplate() {
    return `
      <div class="step-body" data-state-panel="spreadsheet-add">
        <p class="step-intro">Use a CSV or paste two columns: one region name and one value. Nothing is uploaded.</p>
        <input class="sr-only" id="prototype-file" type="file" accept=".csv,text/csv,.xlsx" data-prototype-file>
        <label class="drop-zone" for="prototype-file">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4M5 14v5h14v-5"/></svg>
          <strong>Choose a CSV or spreadsheet</strong>
          <span>or drag it here · prototype accepts a synthetic stand-in</span>
        </label>
        <div class="or-rule">or paste data</div>
        <label class="field-label" for="paste-data">Spreadsheet rows</label>
        <textarea class="textarea" id="paste-data" spellcheck="false" data-paste-data>Region,Sales index
Jawa Barat,91
Sumatera Utara,74
Jabar,86
Sulawesi Selatan,69
Kep. Riau,57</textarea>
        <div class="privacy-note">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 10V8a5 5 0 0 1 10 0v2M5 10h14v10H5z"/></svg>
          <span><strong>Processed on this device.</strong> The prototype does not send, store remotely, or analyze your spreadsheet.</span>
        </div>
        <section class="column-confirmation" data-column-confirmation aria-labelledby="detected-columns-title">
          <header>
            <div><span class="setup-mode">Basic</span><h2 id="detected-columns-title">Confirm detected columns</h2></div>
            <span class="detection-status">2 columns detected</span>
          </header>
          <div class="detected-column-grid" data-basic-options>
            <label><span>Region column</span><select class="select" data-column-select="region"><option selected>Region</option><option>Sales index</option></select></label>
            <label><span>Value column</span><select class="select" data-column-select="value"><option>Region</option><option selected>Sales index</option></select></label>
          </div>
          <details class="advanced-options" data-advanced-options>
            <summary>Advanced file options</summary>
            <div>
              <p>Only use these when the first row is not a normal header row.</p>
              <label><span>Header row</span><select class="select" data-column-select="header"><option selected>Row 1</option><option>Row 2</option><option>No header row</option></select></label>
              <label><span>Separator</span><select class="select" data-column-select="separator"><option selected>Detect automatically</option><option>Comma</option><option>Semicolon</option><option>Tab</option></select></label>
            </div>
          </details>
        </section>
        <div class="mini-summary"><div><strong>Quarterly coverage.csv</strong><span>8 rows · Region + Sales index</span></div><button type="button" data-open-data data-drawer-trigger="add-preview">Preview</button></div>
        <div class="step-actions">
          <button class="button button-secondary" type="button" data-demo="error">Preview file error</button>
          <button class="button button-primary" type="button" data-next-step="match">Continue to match</button>
        </div>
      </div>`;
  }

  function matchTemplate() {
    const resolvedJabar = session.resolvedRows.has("Jabar");
    const resolvedRiau = session.resolvedRows.has("Kep. Riau");
    const resolvedCount = Number(resolvedJabar) + Number(resolvedRiau);
    return `
      <div class="step-body" data-state-panel="spreadsheet-match">
        <p class="step-intro">Most rows matched automatically. Confirm the two abbreviations before designing the map.</p>
        <div class="match-progress" aria-label="Region match summary">
          <div><strong>${6 + resolvedCount}</strong><span>Matched</span></div>
          <div class="needs-fix"><strong>${2 - resolvedCount}</strong><span>Need attention</span></div>
          <div><strong>0</strong><span>Ignored</span></div>
        </div>
        <div class="unmatched-heading"><h2>Rows to check</h2><button type="button" data-open-data data-drawer-trigger="match-table">Open full table</button></div>
        <div class="unmatched-list">
          ${matchItem("Jabar", "Jawa Barat", resolvedJabar, 5)}
          ${matchItem("Kep. Riau", "Kepulauan Riau", resolvedRiau, 8)}
        </div>
        <div class="privacy-note">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-3-9 2 2 4-5"/></svg>
          <span>Map and table stay linked. Select a region on the map to inspect its source row.</span>
        </div>
        <div class="step-actions">
          <button class="button button-secondary" type="button" data-open-data data-drawer-trigger="match-actions">View data</button>
          <button class="button button-primary" type="button" data-next-step="design">Continue to design</button>
        </div>
      </div>`;
  }

  function matchItem(source, suggestion, resolved, row) {
    return `
      <section class="match-item ${resolved ? "is-resolved" : ""}" data-match-item="${source}">
        <header><strong>“${source}”</strong><span class="row-label">Row ${row}</span></header>
        <label class="field-label" for="match-${row}">Match to an Indonesia region</label>
        <select class="select" id="match-${row}" data-match-select="${source}">
          <option value="">Choose a region</option>
          <option value="${suggestion}" ${resolved ? "selected" : ""}>${suggestion} — suggested</option>
          <option value="ignore">Do not map this row</option>
        </select>
        <span class="resolved-note">✓ Match confirmed</span>
      </section>`;
  }

  function designTemplate() {
    return `
      <div class="step-body" data-state-panel="spreadsheet-design">
        <p class="step-intro">Choose how values are grouped. Interface colors stay separate from the map’s data palette.</p>
        <label class="field-label">Show values as</label>
        <div class="choice-grid">
          <button class="choice-card" type="button" aria-pressed="${session.designStyle === "ranges"}" data-design-style="ranges"><strong>Color ranges</strong><span>Best for low-to-high values</span></button>
          <button class="choice-card" type="button" aria-pressed="${session.designStyle === "categories"}" data-design-style="categories"><strong>Categories</strong><span>Best for named groups</span></button>
        </div>
        <label class="field-label">Map data palette</label>
        <div class="palette-row" aria-label="Map data palette">
          <button type="button" class="swatch-button" style="--swatch:#5146a5" aria-label="Violet and amber palette" aria-pressed="${session.palette === "violet"}" data-palette="violet"></button>
          <button type="button" class="swatch-button" style="--swatch:#23699b" aria-label="Blue and gold palette" aria-pressed="${session.palette === "blue"}" data-palette="blue"></button>
          <button type="button" class="swatch-button" style="--swatch:#8a4a6d" aria-label="Plum and sand palette" aria-pressed="${session.palette === "plum"}" data-palette="plum"></button>
        </div>
        <label class="field-label" for="legend-title">Legend title</label>
        <input class="input" id="legend-title" value="Sales index" data-project-input>
        <div class="switch-row"><span>Show region labels</span><button class="switch" type="button" role="switch" aria-checked="${session.labels}" data-label-switch><span class="sr-only">Show region labels</span></button></div>
        <div class="switch-row"><span>Show values on hover</span><button class="switch" type="button" role="switch" aria-checked="true" data-generic-switch><span class="sr-only">Show values on hover</span></button></div>
        <div class="step-actions">
          <button class="button button-secondary" type="button" data-open-inspector data-inspector-trigger>Inspect region</button>
          <button class="button button-primary" type="button" data-next-step="export">Review export</button>
        </div>
      </div>`;
  }

  function exportTemplate() {
    return `
      <div class="step-body" data-state-panel="spreadsheet-export-success">
        <div class="success-mark"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"/></svg></div>
        <h2 class="success-title">Your map is ready.</h2>
        <p class="success-copy">Eight spreadsheet rows are represented. Two suggested matches are noted in the project summary.</p>
        <dl class="export-summary">
          <div><dt>Format</dt><dd>PNG · 1920 × 1080</dd></div>
          <div><dt>Region detail</dt><dd>Province</dd></div>
          <div><dt>Source note</dt><dd>Included</dd></div>
          <div><dt>Data location</dt><dd>This device only</dd></div>
        </dl>
        <button class="button button-primary full-button" type="button" data-download-prototype>
          <svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19"><path d="M12 4v11M8 11l4 4 4-4M5 19h14"/></svg>
          Download PNG
        </button>
        <div class="next-suggestion">
          <span class="status-pill">Upcoming</span>
          <h2>Next: build sales territories</h2>
          <p>Your matched region set could become a territory plan when this future workflow is released.</p>
          <button type="button" data-upcoming="Build sales territories">View the planned workflow →</button>
        </div>
        <div class="step-actions">
          <button class="button button-secondary full-button" type="button" data-next-step="design">Back to design</button>
        </div>
      </div>`;
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("button, a, summary");
    if (!target) return;

    if (target.matches("[data-open-workspace]")) {
      event.preventDefault();
      navigate({
        view: "workspace",
        flow: target.dataset.flow || "spreadsheet",
        step: target.dataset.step || "add",
        sheet: "none",
        size: window.matchMedia("(max-width: 820px)").matches ? "medium" : "medium",
        demo: "none"
      }, { focusSelector: "#workflow-title" });
      if (target.dataset.sample) showToast("Synthetic sample loaded. No file left this device.");
      return;
    }

    if (target.matches("[data-nav-view='home']")) {
      event.preventDefault();
      if (state.view === "workspace" && !confirmLeave()) return;
      session.unsaved = false;
      navigate({ view: "home", sheet: "none", demo: "none" }, { focusSelector: "#main-content" });
      return;
    }

    if (target.matches("[data-workspace-back]")) {
      if (!confirmLeave()) return;
      session.unsaved = false;
      navigate({ view: "home", sheet: "none", demo: "none" }, { focusSelector: "[data-focus-goals]" });
      return;
    }

    if (target.matches("[data-focus-goals]")) {
      event.preventDefault();
      document.querySelector("#goals").scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => document.querySelector("[data-open-workspace][data-flow='manual']")?.focus(), 350);
      return;
    }

    if (target.matches("[data-switch-flow]")) {
      navigate({ flow: target.dataset.switchFlow, step: target.dataset.switchFlow === "manual" ? "highlight" : "add", sheet: "none", demo: "none" }, { focusSelector: "#workflow-title" });
      return;
    }

    if (target.matches("[data-go-step]")) {
      navigate({ flow: "spreadsheet", step: target.dataset.goStep, sheet: "none", demo: "none" }, { focusSelector: "#workflow-title" });
      return;
    }

    if (target.matches("[data-next-step]")) {
      navigate({ flow: "spreadsheet", step: target.dataset.nextStep, sheet: "none", demo: "none" }, { focusSelector: "#workflow-title" });
      return;
    }

    if (target.matches("[data-map-region]")) {
      openDataDrawer(target, target.dataset.mapRegion);
      showToast(`${target.getAttribute("aria-label").split(",")[0]} linked row opened.`);
      return;
    }

    if (target.matches("[data-link-map]")) {
      const region = target.dataset.linkMap;
      const returnSize = session.drawerReturn?.size || "medium";
      session.activeRegion = region;
      session.drawerReturn = null;
      navigate({ sheet: "none", demo: "none", size: returnSize }, { focusSelector: `[data-map-region='${CSS.escape(region)}']` });
      showToast(`${target.textContent.trim()} selected on the map.`);
      return;
    }

    if (target.matches("[data-open-data]")) {
      openDataDrawer(target, target.dataset.focusRegion || null);
      return;
    }

    if (target.matches("[data-open-inspector]")) {
      session.inspectorReturn = "[data-inspector-trigger]";
      navigate({ sheet: "inspector", demo: "none" }, { focusSelector: "#inspector-title" });
      return;
    }

    if (target.matches("[data-close-overlay]")) {
      if (state.sheet === "data") {
        closeDataDrawer();
      } else {
        const returnSelector = session.inspectorReturn || "#workflow-title";
        session.inspectorReturn = null;
        navigate({ sheet: "none" }, { focusSelector: returnSelector });
      }
      return;
    }

    if (target.matches("[data-fix-row]")) {
      const source = target.dataset.fixRow;
      navigate({ step: "match", sheet: "none", size: "medium" }, { focusSelector: `[data-match-select='${CSS.escape(source)}']` });
      return;
    }

    if (target.matches("[data-demo]")) {
      const demo = target.dataset.demo;
      navigate({ demo, sheet: "none" }, { focusSelector: demo === "error" ? ".workspace-error" : demo === "loading" ? ".workspace-loading" : "#workspace-main" });
      document.querySelector(".state-menu")?.removeAttribute("open");
      return;
    }

    if (target.matches("[data-collapse-sheet]")) {
      const nextSize = state.size === "collapsed" ? "medium" : "collapsed";
      navigate({ size: nextSize, sheet: "none" }, { focusSelector: nextSize === "collapsed" ? "[data-cycle-sheet]" : "#workflow-title" });
      return;
    }

    if (target.matches("[data-cycle-sheet]")) {
      const order = ["collapsed", "medium", "expanded"];
      navigate({ size: order[(order.indexOf(state.size) + 1) % order.length], sheet: "none" }, { focusSelector: "[data-cycle-sheet]" });
      return;
    }

    if (target.matches("[data-upcoming]")) {
      showToast(`${target.dataset.upcoming} is an honest preview of a future workflow; it is not active yet.`);
      return;
    }

    if (target.matches("[data-toast]")) {
      showToast(target.dataset.toast);
      return;
    }

    if (target.matches("[data-mobile-nav]")) {
      const open = target.getAttribute("aria-expanded") !== "true";
      target.setAttribute("aria-expanded", String(open));
      elements.siteNav.classList.toggle("is-open", open);
      return;
    }

    if (target.matches("[data-manual-swatch]")) {
      document.querySelectorAll("[data-manual-swatch]").forEach((item) => item.setAttribute("aria-pressed", String(item === target)));
      markChanged("Highlight color updated on the synthetic map.");
      return;
    }

    if (target.matches("[data-apply-manual]")) {
      markChanged(`${session.selectedRegions.size} regions highlighted. The short manual flow is complete.`);
      return;
    }

    if (target.matches("[data-design-style]")) {
      session.designStyle = target.dataset.designStyle;
      markChanged();
      renderWorkspace();
      target.focus();
      return;
    }

    if (target.matches("[data-palette]")) {
      session.palette = target.dataset.palette;
      markChanged("Map data palette changed. Interface action colors remain unchanged.");
      renderWorkspace();
      document.querySelector(`[data-palette='${session.palette}']`)?.focus();
      return;
    }

    if (target.matches("[data-label-switch]")) {
      session.labels = !session.labels;
      markChanged();
      renderWorkspace();
      document.querySelector("[data-label-switch]")?.focus();
      return;
    }

    if (target.matches("[data-generic-switch]")) {
      const pressed = target.getAttribute("aria-checked") !== "true";
      target.setAttribute("aria-checked", String(pressed));
      markChanged();
      return;
    }

    if (target.matches("[data-download-prototype]")) {
      session.unsaved = false;
      updateSaveStatus();
      showToast("Prototype export prepared. No real file was generated.");
      return;
    }

    if (target.matches("[data-discard]")) {
      if (!window.confirm("Discard the synthetic changes in this prototype?")) return;
      session.unsaved = false;
      session.selectedRegions = new Set(["Jawa Barat", "Bali"]);
      session.resolvedRows.clear();
      session.designStyle = "ranges";
      session.palette = "violet";
      document.querySelector(".state-menu")?.removeAttribute("open");
      navigate({ flow: "spreadsheet", step: "add", sheet: "none", size: "medium", demo: "none" }, { focusSelector: "#workflow-title" });
      showToast("Synthetic sample changes discarded.");
    }
  });

  document.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-region-choice]")) {
      if (target.checked) session.selectedRegions.add(target.value);
      else session.selectedRegions.delete(target.value);
      markChanged();
      const count = document.querySelector("[data-selected-count]");
      const apply = document.querySelector("[data-apply-manual]");
      if (count) count.textContent = `${session.selectedRegions.size} selected`;
      if (apply) apply.textContent = `Apply to ${session.selectedRegions.size} regions`;
      return;
    }

    if (target.matches("[data-match-select]")) {
      const source = target.dataset.matchSelect;
      if (target.value) session.resolvedRows.add(source);
      else session.resolvedRows.delete(source);
      markChanged(`${source} ${target.value ? "matched" : "needs a match"}.`);
      renderWorkspace();
      document.querySelector(`[data-match-select='${CSS.escape(source)}']`)?.focus();
      return;
    }

    if (target.matches("[data-column-select]")) {
      markChanged("Detected spreadsheet columns updated.");
      return;
    }

    if (target.matches("[data-prototype-file]")) {
      markChanged("Synthetic file stand-in selected. Your real file was not read or uploaded.");
      navigate({ demo: "loading" });
      window.setTimeout(() => navigate({ demo: "none" }, { focusSelector: "[data-next-step='match']" }), 850);
    }
  });

  document.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches("[data-region-search]")) {
      const query = target.value.trim().toLocaleLowerCase("id");
      document.querySelectorAll("[data-region-list] li").forEach((item) => {
        item.hidden = query && !item.textContent.toLocaleLowerCase("id").includes(query);
      });
    }
    if (target.matches("[data-paste-data], [data-project-input]")) markChanged();
  });

  window.addEventListener("popstate", () => {
    const previous = state;
    const next = readState();
    if (previous.view === "workspace" && next.view === "home" && !confirmLeave()) {
      window.history.pushState(previous, "", stateUrl(previous));
      return;
    }
    if (next.view === "home") session.unsaved = false;
    state = next;
    render(next.view === "workspace" ? "#workflow-title" : "#main-content");
  });

  window.addEventListener("beforeunload", (event) => {
    if (!session.unsaved) return;
    event.preventDefault();
    event.returnValue = "";
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || state.view !== "workspace") return;
    if (state.sheet === "data") {
      event.preventDefault();
      closeDataDrawer();
    } else if (state.sheet === "inspector") {
      event.preventDefault();
      const returnSelector = session.inspectorReturn || "#workflow-title";
      session.inspectorReturn = null;
      navigate({ sheet: "none" }, { focusSelector: returnSelector });
    } else if (state.demo !== "none") {
      event.preventDefault();
      navigate({ demo: "none" }, { focusSelector: ".state-menu summary" });
    } else if (state.size !== "collapsed") {
      event.preventDefault();
      navigate({ size: "collapsed" }, { focusSelector: "[data-cycle-sheet]" });
    }
  });

  window.addEventListener("resize", () => {
    if (state.view === "workspace" && window.innerWidth > 820 && state.size === "expanded") {
      navigate({ size: "medium" }, { replace: true });
    }
  });

  window.history.replaceState(state, "", stateUrl(state));
  render();
})();
