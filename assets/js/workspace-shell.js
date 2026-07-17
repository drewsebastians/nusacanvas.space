(function () {
  "use strict";

  const STEP_LABELS = {
    "add-data": "Add data",
    match: "Match regions",
    design: "Design map",
    export: "Export"
  };

  function onReady(callback) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", callback, { once: true });
    else callback();
  }

  onReady(() => {
    const shell = document.getElementById("appShell");
    const mapArea = document.querySelector(".map-area");
    const panel = document.getElementById("controlPanel");
    const workflowStatus = document.getElementById("workflowStatus");
    const tablePanel = document.getElementById("dataTablePanel");
    const projectTitle = document.getElementById("projectTitle");
    const autosaveStatus = document.getElementById("autosaveStatus");
    const advanced = document.getElementById("advancedModeBtn");
    const basic = document.getElementById("basicModeBtn");
    if (!shell || !mapArea || !panel || !workflowStatus) return;

    shell.dataset.workspaceShell = "ready";
    shell.dataset.workspaceGoal = "choose";
    shell.dataset.workspaceSheet = "medium";
    shell.dataset.workspaceDrawer = "closed";

    shell.insertAdjacentHTML("afterbegin", `
      <header class="workspace-topbar" aria-label="Workspace header">
        <a class="workspace-brand" href="../" aria-label="NusaCanvas home">
          <span class="workspace-brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>NusaCanvas</span>
        </a>
        <a class="workspace-home" href="../">Back to home</a>
        <div class="workspace-project-status">
          <span id="workspaceProjectName">Untitled map</span>
          <span id="workspaceSaveState" aria-live="polite">Not saved yet</span>
        </div>
        <div class="workspace-topbar-actions">
          <a class="workspace-help" href="../guides/">Help</a>
          <button id="workspaceChangeGoal" class="secondary workspace-icon-action" type="button" hidden>Change goal</button>
          <button id="workspaceProjectToggle" class="secondary workspace-icon-action" type="button" aria-controls="workspaceProjectPanel" aria-expanded="false">Project</button>
          <button id="dataDrawerToggle" class="secondary workspace-icon-action" type="button" aria-controls="dataTablePanel" aria-expanded="false">Data &amp; issues</button>
        </div>
      </header>
      <section id="workspaceGoalChoice" class="workspace-goal-choice" aria-labelledby="workspaceGoalTitle">
        <div>
          <p class="workspace-eyebrow">Create a map</p>
          <h2 id="workspaceGoalTitle" tabindex="-1">What would you like to do?</h2>
          <p>Choose a simple starting point. You can safely change direction before exporting.</p>
        </div>
        <div class="workspace-goal-actions">
          <button type="button" class="workspace-goal-card" data-workspace-goal="manual">
            <span class="workspace-goal-icon" aria-hidden="true">01</span>
            <span class="workspace-goal-copy"><strong>Highlight regions</strong><small>Choose places and give them clear colors.</small></span>
            <span class="workspace-goal-arrow" aria-hidden="true">&rarr;</span>
          </button>
          <button type="button" class="workspace-goal-card" data-workspace-goal="spreadsheet">
            <span class="workspace-goal-icon" aria-hidden="true">02</span>
            <span class="workspace-goal-copy"><strong>Map spreadsheet data</strong><small>Paste or upload a table and match its regions.</small></span>
            <span class="workspace-goal-arrow" aria-hidden="true">&rarr;</span>
          </button>
          <button type="button" class="workspace-sample-action" data-workspace-goal="sample">Try a ready-made sample <span aria-hidden="true">&rarr;</span></button>
        </div>
      </section>
      <section id="workspaceProjectPanel" class="workspace-project-panel" hidden aria-label="Safe project actions">
        <p><strong>Project safety</strong></p>
        <p>Changes are saved in this browser. Opening a project can replace current work; Start over affects the whole project.</p>
        <div class="workspace-project-actions">
          <button id="workspaceSaveProject" class="secondary" type="button">Save project</button>
          <button id="workspaceOpenProject" class="secondary" type="button">Open project</button>
          <button id="workspaceStartOver" class="danger" type="button">Start over</button>
        </div>
        <button id="workspaceProjectClose" class="secondary" type="button">Close project actions</button>
      </section>
      <div id="workspaceToast" class="workspace-toast" role="status" aria-live="polite" hidden></div>
      <aside id="workspaceRecovery" class="workspace-recovery" role="status" aria-live="polite" hidden>
        <strong>That needs attention</strong>
        <p id="workspaceRecoveryCopy"></p>
        <button id="workspaceRecoveryAction" class="secondary" type="button">Review current step</button>
      </aside>
      <section id="workspaceSuccess" class="workspace-success" aria-labelledby="workspaceSuccessTitle" hidden>
        <p class="workspace-eyebrow">Export ready</p>
        <h2 id="workspaceSuccessTitle">Your export has started.</h2>
        <p id="workspaceSuccessCopy">Your file stays on this device.</p>
        <div class="workspace-success-actions">
          <button id="workspaceSuccessSave" type="button">Save project</button>
          <button id="workspaceSuccessAnother" class="secondary" type="button">Export another format</button>
        </div>
        <div class="workspace-next-feature">
          <p id="workspaceRecommendation"></p>
          <button id="workspaceRecommendationAction" class="tertiary" type="button"></button>
        </div>
        <a id="workspaceSuccessGuide" href="../guides/ekspor-peta-ke-powerpoint/">Read the export guide</a>
        <button id="workspaceSuccessDismiss" class="tertiary" type="button">Dismiss</button>
      </section>
      <div id="workspaceLiveStatus" class="sr-only" aria-live="polite"></div>
    `);

    const byId = (id) => document.getElementById(id);
    const projectName = byId("workspaceProjectName");
    const saveState = byId("workspaceSaveState");
    const goalChoice = byId("workspaceGoalChoice");
    const projectPanel = byId("workspaceProjectPanel");
    const projectToggle = byId("workspaceProjectToggle");
    const changeGoal = byId("workspaceChangeGoal");
    const projectClose = byId("workspaceProjectClose");
    const drawerToggle = byId("dataDrawerToggle");
    const sheetToggle = byId("sidebarToggleBtn");
    const liveStatus = byId("workspaceLiveStatus");
    const toast = byId("workspaceToast");
    const recovery = byId("workspaceRecovery");
    const recoveryCopy = byId("workspaceRecoveryCopy");
    const recoveryAction = byId("workspaceRecoveryAction");
    const success = byId("workspaceSuccess");
    const successCopy = byId("workspaceSuccessCopy");
    const recommendation = byId("workspaceRecommendation");
    const recommendationAction = byId("workspaceRecommendationAction");
    const evidenceEnabled = new URLSearchParams(window.location.search).get("evidence") === "1";
    const evidence = evidenceEnabled ? { schemaVersion: "batch2r.local-evidence.v1", events: [] } : null;
    let toastTimer = null;
    let lastStage = null;

    // The data engines own the existing form controls. Put those controls in
    // one explicit rail scroller instead of letting every legacy section form
    // one long mobile sheet. This is presentation-only: IDs and form ownership
    // remain unchanged for import, matching, map, export, and project logic.
    const railScroll = document.createElement("div");
    railScroll.id = "workspaceRailScroll";
    railScroll.className = "workspace-rail-scroll";
    const legacyHeader = panel.querySelector(".app-header");
    if (legacyHeader) {
      legacyHeader.hidden = true;
      railScroll.append(legacyHeader);
    }
    panel.querySelectorAll(".panel-section").forEach((section) => railScroll.append(section));
    panel.append(railScroll);
    panel.prepend(goalChoice);

    const workflowTitle = panel.querySelector(".workflow-intro h2");
    const workflowNotice = panel.querySelector(".workflow-intro .notice");
    if (workflowTitle) workflowTitle.tabIndex = -1;

    function displayProjectName() {
      const title = projectTitle.value.trim();
      return title === "NusaCanvas Indonesia region map" ? "Untitled map" : (title || "Untitled map");
    }

    function updateWorkflowCopy() {
      if (!workflowTitle || !workflowNotice) return;
      if (shell.dataset.workspaceGoal === "manual") {
        workflowTitle.textContent = "Choose regions to highlight";
        workflowNotice.textContent = "Search or choose a region. Your changes appear on the map right away.";
        return;
      }
      const stage = presentationStage(currentStage());
      const copy = {
        "add-data": ["Add your data", "Paste a table or upload a spreadsheet. Your data stays on this device."],
        match: ["Match region names", "Review rows that need attention. Your original data will not be changed."],
        design: ["Design your map", "Choose how values look, then review the map."],
        export: ["Your map is ready", "Export a clear image for a report, slide, or document."]
      }[stage] || ["Create a map", "Add data, match regions, design the map, then export it."];
      workflowTitle.textContent = copy[0];
      workflowNotice.textContent = copy[1];
    }

    function decorateWorkflowSteps() {
      [...workflowStatus.parentElement.querySelectorAll("#workflowSteps .workflow-step")].forEach((button, index) => {
        button.dataset.stepNumber = String(index + 1);
        button.dataset.stepLabel = button.textContent.replace(/^\s*\d+\.\s*/, "").trim();
      });
    }

    if (evidenceEnabled) window.NusaCanvasEvidence = evidence;

    function currentStage() {
      return workflowStatus.dataset.stage || "add-data";
    }

    function presentationStage(rawStage) {
      return ({ input: "add-data", visualize: "design" })[rawStage] || rawStage;
    }

    function announce(message) {
      liveStatus.textContent = "";
      requestAnimationFrame(() => { liveStatus.textContent = message; });
    }

    function recordEvidence(step) {
      if (!evidence) return;
      evidence.events.push({ step, at: Date.now() });
    }

    function showToast(message) {
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.hidden = false;
      toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
    }

    function showRecovery(message) {
      const safeMessage = String(message || "Something needs attention. Your current map is still safe.").trim();
      recoveryCopy.textContent = `${safeMessage} Review the current step before continuing; your existing work has not been cleared.`;
      recovery.hidden = false;
      success.hidden = true;
      recordEvidence("recoverable-error");
    }

    function showExportSuccess(format) {
      const goal = shell.dataset.workspaceGoal;
      successCopy.textContent = `${format} export started. Your file stays on this device.`;
      if (goal === "manual") {
        recommendation.textContent = "Have a region list? Create your next map from a spreadsheet.";
        recommendationAction.textContent = "Switch to spreadsheet workflow";
        recommendationAction.dataset.next = "spreadsheet";
      } else {
        recommendation.textContent = "Need to group these regions? Build sales territories is coming soon.";
        recommendationAction.textContent = "Sales territories — upcoming";
        recommendationAction.dataset.next = "upcoming";
      }
      recovery.hidden = true;
      success.hidden = false;
      recordEvidence(`export-success:${format.toLowerCase()}`);
    }

    function setGoal(goal, { focus = true } = {}) {
      const normalized = goal === "sample" ? "spreadsheet" : goal;
      shell.dataset.workspaceGoal = normalized;
      goalChoice.hidden = true;
      changeGoal.hidden = false;
      panel.setAttribute("aria-label", normalized === "manual" ? "Highlight regions controls" : "Spreadsheet map workflow controls");
      if (goal === "sample") byId("exampleBtn").click();
      if (normalized === "manual") {
        shell.dataset.workspaceStage = "manual";
        updateWorkflowCopy();
        announce("Manual highlighting selected. Search for a region, choose a color, then export.");
      } else {
        syncStage();
        announce(goal === "sample" ? "Sample spreadsheet added. Review the matches to continue." : "Spreadsheet workflow selected. Add data to begin.");
      }
      if (focus) (normalized === "manual" ? workflowTitle : byId("importPaste"))?.focus();
      if (window.matchMedia("(max-width: 860px)").matches) shell.dataset.workspaceSheet = "medium";
      recordEvidence(`goal:${normalized}`);
      history.replaceState({ workspaceGoal: normalized }, "", window.location.pathname + window.location.search);
    }

    function chooseGoal({ focus = true } = {}) {
      shell.dataset.workspaceGoal = "choose";
      shell.dataset.workspaceStage = "choose";
      goalChoice.hidden = false;
      changeGoal.hidden = true;
      projectPanel.hidden = true;
      projectToggle.setAttribute("aria-expanded", "false");
      if (window.matchMedia("(max-width: 860px)").matches) shell.dataset.workspaceSheet = "medium";
      announce("Choose how you want to start your map.");
      if (focus) byId("workspaceGoalTitle")?.focus();
    }

    function syncStage() {
      const stage = presentationStage(currentStage());
      if (stage !== lastStage) railScroll.scrollTop = 0;
      lastStage = stage;
      if (shell.dataset.workspaceGoal !== "manual" && shell.dataset.workspaceGoal !== "choose") shell.dataset.workspaceStage = stage;
      updateWorkflowCopy();
      decorateWorkflowSteps();
      const label = STEP_LABELS[stage] || "Create map";
      announce(`${label} is the current workflow step.`);
      recordEvidence(`stage:${stage}`);
    }

    function setDrawer(open, { focus = false } = {}) {
      shell.dataset.workspaceDrawer = open ? "open" : "closed";
      drawerToggle.setAttribute("aria-expanded", String(open));
      drawerToggle.textContent = open ? "Close data & issues" : "Data & issues";
      if (open && tablePanel) tablePanel.hidden = false;
      if (open && focus) byId("dataTableFilter")?.focus();
      if (!open && focus) drawerToggle.focus();
    }

    function cycleMobileSheet() {
      const order = ["collapsed", "medium", "expanded"];
      const next = order[(order.indexOf(shell.dataset.workspaceSheet) + 1) % order.length];
      shell.dataset.workspaceSheet = next;
      announce(`Controls sheet ${next}.`);
    }

    function syncSheetControl() {
      if (!sheetToggle) return;
      const state = shell.dataset.workspaceSheet || "medium";
      const label = state === "collapsed" ? "Open controls" : state === "medium" ? "Expand controls" : "Show more map";
      sheetToggle.textContent = label;
      sheetToggle.setAttribute("aria-label", `${label}. Current controls sheet is ${state}.`);
      sheetToggle.setAttribute("aria-expanded", String(state !== "collapsed"));
    }

    function syncProjectTitle() {
      const title = displayProjectName();
      projectName.textContent = title;
    }

    function syncSaveState() {
      const state = autosaveStatus?.dataset.state || "inactive";
      const copy = state === "saved" || state === "opened" ? "Saved in this browser"
        : state === "migration-review" ? "Saved - review project update"
          : state === "migration-error" ? "Backup needs attention"
            : "Not saved yet";
      saveState.textContent = copy;
      saveState.dataset.state = state;
    }

    // Give legacy sections stable presentation contracts without changing their
    // internal controls or the domain engines that own them.
    panel.querySelectorAll(".panel-section").forEach((section) => {
      if (section.querySelector("#importPaste")) section.dataset.workspacePanel = "input";
      else if (section.querySelector("#vizMode")) section.dataset.workspacePanel = "design";
      else if (section.querySelector("#exportSvgBtn")) section.dataset.workspacePanel = "export";
      else if (section.querySelector("#searchInput")) section.dataset.workspacePanel = "manual-search";
      else if (section.querySelector("#applyColorBtn")) section.dataset.workspacePanel = "manual-style";
      else if (section.querySelector("#highlightList")) section.dataset.workspacePanel = "manual-summary";
      else if (section.querySelector("#groupingList") || section.querySelector("#legendItems")) section.dataset.workspacePanel = "manual-advanced";
      else if (section.querySelector("#projectTitle") || section.querySelector("#saveProjectBtn")) section.dataset.workspacePanel = "project";
      else if (section.querySelector("#workflowSteps")) section.dataset.workspacePanel = "workflow";
      else section.dataset.workspacePanel = "support";
    });

    const manualAction = byId("applyColorBtn")?.closest(".panel-section");
    if (manualAction && !byId("spreadsheetWorkflowLink")) {
      manualAction.insertAdjacentHTML("beforeend", `
        <aside class="workspace-crosslink" id="spreadsheetWorkflowLink">
          <p>Have a value for each region? Map spreadsheet data links rows to regions and builds the legend for you.</p>
          <button type="button" class="tertiary" id="switchToSpreadsheetBtn">Switch to spreadsheet workflow <span aria-hidden="true">&rarr;</span></button>
        </aside>
      `);
      byId("switchToSpreadsheetBtn").addEventListener("click", () => setGoal("spreadsheet"));
    }

    const workflowPanel = byId("workflowSteps")?.closest(".panel-section");
    if (workflowPanel && !byId("manualWorkflowLink")) {
      workflowPanel.insertAdjacentHTML("beforeend", `
        <aside class="workspace-crosslink workspace-crosslink-compact" id="manualWorkflowLink">
          <p>Only need to color a few places?</p>
          <button type="button" class="tertiary" id="switchToManualBtn">Switch to Highlight regions <span aria-hidden="true">&rarr;</span></button>
        </aside>
      `);
      byId("switchToManualBtn").addEventListener("click", () => setGoal("manual"));
    }

    goalChoice.querySelectorAll("[data-workspace-goal]").forEach((button) => {
      button.addEventListener("click", () => setGoal(button.dataset.workspaceGoal));
    });
    changeGoal.addEventListener("click", () => chooseGoal());
    drawerToggle.addEventListener("click", () => setDrawer(shell.dataset.workspaceDrawer !== "open", { focus: true }));
    projectToggle.addEventListener("click", () => {
      const open = projectPanel.hidden;
      projectPanel.hidden = !open;
      projectToggle.setAttribute("aria-expanded", String(open));
      if (open) projectClose.focus();
      else projectToggle.focus();
    });
    projectClose.addEventListener("click", () => {
      projectPanel.hidden = true;
      projectToggle.setAttribute("aria-expanded", "false");
      projectToggle.focus();
    });
    byId("workspaceSaveProject").addEventListener("click", () => byId("saveProjectBtn").click());
    byId("workspaceOpenProject").addEventListener("click", () => byId("openProjectBtn").click());
    byId("workspaceStartOver").addEventListener("click", () => byId("clearProjectBtn").click());
    recoveryAction.addEventListener("click", () => {
      recovery.hidden = true;
      const target = shell.dataset.workspaceGoal === "manual" ? byId("searchInput") : byId("importPaste");
      target?.focus();
    });
    byId("workspaceSuccessSave").addEventListener("click", () => byId("saveProjectBtn").click());
    byId("workspaceSuccessAnother").addEventListener("click", () => byId("exportSvgBtn").focus());
    byId("workspaceSuccessDismiss").addEventListener("click", () => { success.hidden = true; });
    recommendationAction.addEventListener("click", () => {
      if (recommendationAction.dataset.next === "spreadsheet") setGoal("spreadsheet");
      else announce("Sales territories is upcoming. Your current project has not changed.");
    });
    const exportFormats = {
      exportSvgBtn: "SVG",
      exportPngBtn: "PNG",
      exportPdfBtn: "PDF",
      exportMappingBtn: "region match table"
    };
    Object.entries(exportFormats).forEach(([id, format]) => {
      byId(id)?.addEventListener("click", () => {
        showToast("Your export is being prepared. It stays on this device.");
        setTimeout(() => {
          if (!byId("errorArea").textContent.trim()) showExportSuccess(format);
        }, 350);
      });
    });
    projectTitle.addEventListener("input", syncProjectTitle);
    autosaveStatus && new MutationObserver(syncSaveState).observe(autosaveStatus, { attributes: true, childList: true, subtree: true });
    new MutationObserver(syncStage).observe(workflowStatus, { attributes: true, attributeFilter: ["data-stage"] });
    new MutationObserver(syncSheetControl).observe(shell, { attributes: true, attributeFilter: ["data-workspace-sheet"] });
    new MutationObserver(decorateWorkflowSteps).observe(byId("workflowSteps"), { childList: true, subtree: true });
    tablePanel && new MutationObserver(() => {
      if (!tablePanel.hidden && shell.dataset.workspaceGoal === "spreadsheet") setDrawer(true);
    }).observe(tablePanel, { attributes: true, attributeFilter: ["hidden"] });
    new MutationObserver(() => {
      const message = byId("errorArea").textContent;
      if (message.trim()) showRecovery(message);
    }).observe(byId("errorArea"), { childList: true, subtree: true });

    shell.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !projectPanel.hidden) {
        projectPanel.hidden = true;
        projectToggle.setAttribute("aria-expanded", "false");
        projectToggle.focus();
      }
    });
    syncProjectTitle();
    syncSaveState();
    syncStage();
    syncSheetControl();

    const route = new URLSearchParams(window.location.search);
    const requestedGoal = route.get("sample") === "1" ? "sample"
      : route.get("goal") === "highlight" ? "manual"
        : ["manual", "spreadsheet"].includes(route.get("goal")) ? route.get("goal")
          : null;
    if (requestedGoal) {
      const loading = byId("loadingIndicator");
      const openRequestedGoal = () => setGoal(requestedGoal, { focus: false });
      if (loading?.dataset.state === "ready") openRequestedGoal();
      else if (loading) {
        const readyObserver = new MutationObserver(() => {
          if (loading.dataset.state !== "ready") return;
          readyObserver.disconnect();
          openRequestedGoal();
        });
        readyObserver.observe(loading, { attributes: true, attributeFilter: ["data-state"] });
      }
    }
    window.NusaCanvasWorkspace = Object.freeze({ setGoal, chooseGoal, setDrawer, cycleMobileSheet, currentStage });
  });
}());
