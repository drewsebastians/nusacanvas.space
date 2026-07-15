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

    mapArea.insertAdjacentHTML("afterbegin", `
      <header class="workspace-topbar" aria-label="Workspace header">
        <a class="workspace-brand" href="../" aria-label="NusaCanvas home">NusaCanvas</a>
        <div class="workspace-project-status">
          <span id="workspaceProjectName">Untitled map</span>
          <span id="workspaceSaveState" aria-live="polite">Saved in this browser</span>
        </div>
        <div class="workspace-topbar-actions">
          <a class="workspace-help" href="../guides/">Help</a>
          <button id="workspaceProjectToggle" class="secondary workspace-icon-action" type="button" aria-controls="workspaceProjectPanel" aria-expanded="false">Project</button>
          <button id="dataDrawerToggle" class="secondary workspace-icon-action" type="button" aria-controls="dataTablePanel" aria-expanded="false">Data &amp; issues</button>
        </div>
      </header>
      <section id="workspaceGoalChoice" class="workspace-goal-choice" aria-labelledby="workspaceGoalTitle">
        <div>
          <p class="workspace-eyebrow">Create a map</p>
          <h2 id="workspaceGoalTitle">What would you like to do?</h2>
          <p>Choose a simple starting point. You can safely change direction before exporting.</p>
        </div>
        <div class="workspace-goal-actions">
          <button type="button" data-workspace-goal="manual">Highlight regions</button>
          <button type="button" class="secondary" data-workspace-goal="spreadsheet">Map spreadsheet data</button>
          <button type="button" class="tertiary" data-workspace-goal="sample">Try a sample</button>
        </div>
        <p class="workspace-upcoming">Sales territories and coverage analysis are upcoming. They are not active in this workspace.</p>
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
      <div id="workspaceLiveStatus" class="sr-only" aria-live="polite"></div>
    `);

    const byId = (id) => document.getElementById(id);
    const projectName = byId("workspaceProjectName");
    const saveState = byId("workspaceSaveState");
    const goalChoice = byId("workspaceGoalChoice");
    const projectPanel = byId("workspaceProjectPanel");
    const projectToggle = byId("workspaceProjectToggle");
    const projectClose = byId("workspaceProjectClose");
    const drawerToggle = byId("dataDrawerToggle");
    const liveStatus = byId("workspaceLiveStatus");
    const toast = byId("workspaceToast");
    let toastTimer = null;

    function currentStage() {
      return workflowStatus.dataset.stage || "add-data";
    }

    function announce(message) {
      liveStatus.textContent = "";
      requestAnimationFrame(() => { liveStatus.textContent = message; });
    }

    function showToast(message) {
      clearTimeout(toastTimer);
      toast.textContent = message;
      toast.hidden = false;
      toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
    }

    function setGoal(goal, { focus = true } = {}) {
      const normalized = goal === "sample" ? "spreadsheet" : goal;
      shell.dataset.workspaceGoal = normalized;
      goalChoice.hidden = true;
      panel.setAttribute("aria-label", normalized === "manual" ? "Highlight regions controls" : "Spreadsheet map workflow controls");
      if (goal === "sample") byId("exampleBtn").click();
      if (normalized === "manual") {
        shell.dataset.workspaceStage = "manual";
        announce("Manual highlighting selected. Search for a region, choose a color, then export.");
        if (focus) byId("searchInput").focus();
      } else {
        syncStage();
        announce(goal === "sample" ? "Sample spreadsheet added. Review the matches to continue." : "Spreadsheet workflow selected. Add data to begin.");
        if (focus) byId("importPaste").focus();
      }
      if (window.matchMedia("(max-width: 860px)").matches) shell.dataset.workspaceSheet = "medium";
      history.replaceState({ workspaceGoal: normalized }, "", window.location.pathname + window.location.search);
    }

    function syncStage() {
      const stage = currentStage();
      if (shell.dataset.workspaceGoal !== "manual") shell.dataset.workspaceStage = stage;
      const label = STEP_LABELS[stage] || "Create map";
      announce(`${label} is the current workflow step.`);
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

    function syncProjectTitle() {
      projectName.textContent = projectTitle.value.trim() || "Untitled map";
    }

    function syncSaveState() {
      const state = autosaveStatus?.dataset.state || "inactive";
      const copy = state === "saved" || state === "opened" ? "Saved in this browser"
        : state === "migration-review" ? "Saved — review project update"
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
      else if (section.querySelector("#searchInput") || section.querySelector("#applyColorBtn") || section.querySelector("#highlightList") || section.querySelector("#groupingList") || section.querySelector("#legendItems")) section.dataset.workspacePanel = "manual";
      else if (section.querySelector("#projectTitle") || section.querySelector("#saveProjectBtn")) section.dataset.workspacePanel = "project";
      else if (section.querySelector("#workflowSteps")) section.dataset.workspacePanel = "workflow";
      else section.dataset.workspacePanel = "support";
    });

    const manualAction = byId("applyColorBtn")?.closest(".panel-section");
    if (manualAction && !byId("spreadsheetWorkflowLink")) {
      manualAction.insertAdjacentHTML("beforeend", `
        <aside class="workspace-crosslink" id="spreadsheetWorkflowLink">
          <p>Have a value for each region? Map spreadsheet data links rows to regions and builds the legend for you.</p>
          <button type="button" class="tertiary" id="switchToSpreadsheetBtn">Switch to spreadsheet workflow <span aria-hidden="true">→</span></button>
        </aside>
      `);
      byId("switchToSpreadsheetBtn").addEventListener("click", () => setGoal("spreadsheet"));
    }

    goalChoice.querySelectorAll("[data-workspace-goal]").forEach((button) => {
      button.addEventListener("click", () => setGoal(button.dataset.workspaceGoal));
    });
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
    ["exportSvgBtn", "exportPngBtn", "exportPdfBtn", "exportMappingBtn"].forEach((id) => {
      byId(id)?.addEventListener("click", () => showToast("Your export is being prepared. It stays on this device."));
    });
    projectTitle.addEventListener("input", syncProjectTitle);
    autosaveStatus && new MutationObserver(syncSaveState).observe(autosaveStatus, { attributes: true, childList: true, subtree: true });
    new MutationObserver(syncStage).observe(workflowStatus, { attributes: true, attributeFilter: ["data-stage"] });
    tablePanel && new MutationObserver(() => {
      if (!tablePanel.hidden && shell.dataset.workspaceGoal === "spreadsheet") setDrawer(true);
    }).observe(tablePanel, { attributes: true, attributeFilter: ["hidden"] });

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
    window.NusaCanvasWorkspace = Object.freeze({ setGoal, setDrawer, cycleMobileSheet, currentStage });
  });
}());
