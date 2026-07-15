const fs = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");
const { verifyPrototypeIsolation } = require("../../scripts/verify-batch2r-prototype-isolation.js");

const root = path.resolve(__dirname, "../..");
const screenshotRoot = path.join(root, "artifacts", "batch-2r", "prototype-screenshots");
const reviewPath = path.join(root, "artifacts", "batch-2r", "prototype-review.json");
const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");

const options = [
  {
    id: "option-a",
    name: "Guided Rail",
    route: "/design-preview/batch-2r/option-a/",
    primary: ".hero-actions .primary-action",
    sample: ".hero-actions [data-sample]",
    sampleDestination: "[data-panel='add']",
    states: {
      home: { query: "?view=home", selector: ".home-screen", text: "Turn Indonesia data" },
      manual: { query: "?view=manual&flow=manual", selector: "[data-panel='manual']", text: "Choose regions to highlight" },
      add: { query: "?view=add&flow=spreadsheet", selector: "[data-panel='add']", text: "Add your data" },
      match: { query: "?view=match&flow=spreadsheet&drawer=open", selector: "[data-panel='match']", text: "Match region names" },
      design: { query: "?view=design&flow=spreadsheet&inspector=open", selector: "[data-panel='design']", text: "Design your map" },
      export: { query: "?view=export&flow=spreadsheet", selector: "[data-panel='export']", text: "Your map is ready" },
      loading: { query: "?view=loading", selector: "[data-panel='loading']", text: "Reading your spreadsheet" },
      error: { query: "?view=error", selector: "[data-panel='error']", text: "We could not read that file" }
    },
    mobileWorkspace: "?view=match&flow=spreadsheet&drawer=open&sheet=medium",
    mobileWorkspaceBase: "?view=match&flow=spreadsheet",
    mobileAdd: "?view=add&flow=spreadsheet&sheet=medium",
    sheetParam: "sheet",
    sheetAttribute: "data-sheet",
    workspacePrimary: "#continue-design",
    nextFromAdd: "[data-panel='add'] [data-view-target='match']",
    optionsState: "add"
  },
  {
    id: "option-b",
    name: "Canvas Command",
    route: "/design-preview/batch-2r/option-b/",
    primary: "#home-primary",
    sample: "#sample-cta",
    sampleDestination: "[data-pane='spreadsheet:design']",
    states: {
      home: { query: "?view=home", selector: "#home-view", text: "Turn Indonesia data" },
      manual: { query: "?view=workspace&flow=manual&step=select", selector: "[data-pane='manual:select']", text: "Select regions" },
      add: { query: "?view=workspace&flow=spreadsheet&step=add", selector: "[data-pane='spreadsheet:add']", text: "Add your data" },
      match: { query: "?view=workspace&flow=spreadsheet&step=match&drawer=open&drawerTab=issues", selector: "[data-pane='spreadsheet:match']", text: "Match regions" },
      design: { query: "?view=workspace&flow=spreadsheet&step=design", selector: "[data-pane='spreadsheet:design']", text: "Design your map" },
      export: { query: "?view=workspace&flow=spreadsheet&step=export", selector: "[data-pane='spreadsheet:export']", text: "Your map is ready" },
      loading: { query: "?view=workspace&flow=spreadsheet&step=add&demo=loading", selector: "#loading-example", text: "Reading 128 rows" },
      error: { query: "?view=workspace&flow=spreadsheet&step=add&demo=error", selector: "#error-example", text: "We could not read that file" }
    },
    mobileWorkspace: "?view=workspace&flow=spreadsheet&step=match&drawer=open&drawerTab=data&sheet=medium",
    mobileWorkspaceBase: "?view=workspace&flow=spreadsheet&step=match",
    mobileAdd: "?view=workspace&flow=spreadsheet&step=add&sheet=medium",
    sheetParam: "sheet",
    sheetAttribute: "data-sheet",
    workspacePrimary: "#match-next",
    nextFromAdd: "#add-next",
    optionsState: "design"
  },
  {
    id: "option-c",
    name: "Map Studio Sheets",
    route: "/design-preview/batch-2r/option-c/",
    primary: ".hero-actions .button-primary",
    sample: ".hero-actions [data-sample]",
    sampleDestination: "#workspace-view",
    states: {
      home: { query: "?view=home", selector: "#home-view", text: "Turn Indonesia data" },
      manual: { query: "?view=workspace&flow=manual&step=highlight", selector: "[data-workflow-content]", text: "Choose regions" },
      add: { query: "?view=workspace&flow=spreadsheet&step=add", selector: "[data-workflow-content]", text: "Add data" },
      match: { query: "?view=workspace&flow=spreadsheet&step=match&sheet=data", selector: "[data-workflow-content]", text: "Match regions" },
      design: { query: "?view=workspace&flow=spreadsheet&step=design&sheet=inspector", selector: "[data-workflow-content]", text: "Design map" },
      export: { query: "?view=workspace&flow=spreadsheet&step=export", selector: "[data-workflow-content]", text: "Your map is ready" },
      loading: { query: "?view=workspace&flow=spreadsheet&step=add&demo=loading", selector: ".workspace-loading", text: "Reading sample rows" },
      error: { query: "?view=workspace&flow=spreadsheet&step=add&demo=error", selector: ".workspace-error", text: "We could not read" }
    },
    mobileWorkspace: "?view=workspace&flow=spreadsheet&step=match&sheet=data&size=medium",
    mobileWorkspaceBase: "?view=workspace&flow=spreadsheet&step=match",
    mobileAdd: "?view=workspace&flow=spreadsheet&step=add&size=medium",
    sheetParam: "size",
    sheetAttribute: "data-sheet-size",
    workspacePrimary: "[data-next-step='design']",
    nextFromAdd: "[data-next-step='match']",
    optionsState: "add"
  }
];

function screenshotPath(optionId, name) {
  const directory = path.join(screenshotRoot, optionId);
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, `${name}.png`);
}

function toRelative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function withQueryParam(query, key, value) {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  params.set(key, value);
  return `?${params.toString()}`;
}

function parseColor(value) {
  const match = String(value).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
  if (!match) return null;
  return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
}

function luminance(color) {
  const channel = (value) => {
    const normalized = value / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * channel(color.r)) + (0.7152 * channel(color.g)) + (0.0722 * channel(color.b));
}

function contrast(first, second) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

async function loadState(page, option, stateName, queryOverride) {
  const state = option.states[stateName];
  const response = await page.goto(`${option.route}${queryOverride || state.query}`, { waitUntil: "networkidle" });
  expect(response, `${option.id} ${stateName} returned a response`).not.toBeNull();
  expect(response.status(), `${option.id} ${stateName} HTTP status`).toBe(200);
  await expect(page.locator(state.selector), `${option.id} ${stateName} is visible`).toBeVisible();
  await expect(page.locator("body"), `${option.id} ${stateName} copy`).toContainText(state.text);
  return response;
}

async function pageHasNoHorizontalOverflow(page) {
  return page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    pass: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      && document.body.scrollWidth <= document.documentElement.clientWidth + 1
  }));
}

async function runAxe(page) {
  await page.evaluate((source) => Function(source)(), axeSource);
  const results = await page.evaluate(async () => window.axe.run(document, {
    resultTypes: ["violations"],
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] }
  }));
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    helpUrl: violation.helpUrl,
    nodes: violation.nodes.map((node) => ({
      target: node.target,
      html: node.html,
      failureSummary: node.failureSummary
    }))
  }));
}

async function colorEvidence(page, selector) {
  return page.locator(selector).evaluate((element) => {
    const rgba = (value) => {
      const match = String(value).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i);
      if (!match) return null;
      return { r: Number(match[1]), g: Number(match[2]), b: Number(match[3]), a: match[4] === undefined ? 1 : Number(match[4]) };
    };
    const opaqueBackground = (start) => {
      let current = start;
      while (current) {
        const background = getComputedStyle(current).backgroundColor;
        const parsed = rgba(background);
        if (parsed && parsed.a >= 0.99) return background;
        current = current.parentElement;
      }
      return "rgb(255, 255, 255)";
    };
    const style = getComputedStyle(element);
    const parentBackground = opaqueBackground(element.parentElement);
    const focusColors = [style.outlineColor, ...style.boxShadow.match(/rgba?\([^)]*\)/g) || []];
    return {
      foreground: style.color,
      background: opaqueBackground(element),
      parentBackground,
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
      outlineStyle: style.outlineStyle,
      boxShadow: style.boxShadow,
      focusColors,
      target: { width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height }
    };
  });
}

async function workspaceDomOrder(page) {
  return page.evaluate(() => {
    const isVisible = (element) => {
      if (!element || element.hidden) return false;
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const task = [...document.querySelectorAll("[data-current-task]")].find(isVisible);
    const map = document.querySelector("[data-map-canvas]");
    const drawer = document.querySelector("[data-drawer-panel]");
    const follows = (first, second) => Boolean(first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING);
    return {
      taskFound: Boolean(task),
      mapFound: Boolean(map),
      drawerFound: Boolean(drawer),
      taskBeforeMap: Boolean(task && map && follows(task, map)),
      mapBeforeDrawer: Boolean(map && drawer && follows(map, drawer))
    };
  });
}

async function drawerIsOpen(page) {
  return page.evaluate(() => {
    const panel = document.querySelector("[data-drawer-panel]");
    if (!panel) return false;
    if (document.body.dataset.drawer) return document.body.dataset.drawer === "open";
    if (document.documentElement.dataset.drawer) return document.documentElement.dataset.drawer === "open";
    const style = getComputedStyle(panel);
    return !panel.hidden && style.display !== "none" && style.visibility !== "hidden";
  });
}

async function assertUnsavedGuard(page, option) {
  if (option.id === "option-a") {
    await loadState(page, option, "manual", `${option.states.manual.query}&sheet=medium`);
    await page.locator("[data-region='Banten']").check();
    await expect(page.locator("[data-save-status]")).toContainText("Unsaved prototype changes");
    await page.locator("[data-panel='manual'] [data-exit-workspace]").click();
    await expect(page.locator("[data-unsaved-dialog]")).toBeVisible();
    await expect(page.locator("[data-unsaved-dialog]")).toContainText("Leave this map?");
    await page.locator("[data-unsaved-dialog] [data-stay]").click();
    await expect(page.locator("[data-unsaved-dialog]")).toBeHidden();
  } else if (option.id === "option-b") {
    await loadState(page, option, "add", option.mobileAdd);
    await page.locator("#paste-data").fill("Region,Coverage,Owner\nJakarta,92,Ayu\nBali,70,Dimas");
    await expect(page.locator("[data-save-status]")).toContainText("Unsaved prototype changes");
    await page.locator("[data-exit-workspace]").click();
    await expect(page.locator("[data-unsaved-dialog]")).toBeVisible();
    await expect(page.locator("[data-unsaved-dialog]")).toContainText("Leave this map?");
    await page.locator("[data-unsaved-dialog] button[value='stay']").click();
    await expect(page.locator("[data-unsaved-dialog]")).toBeHidden();
  } else {
    await loadState(page, option, "add", option.mobileAdd);
    await page.locator("[data-column-select='value']").selectOption({ label: "Region" });
    await expect(page.locator("[data-save-status]")).toContainText("Unsaved prototype changes");
    const dialogPromise = page.waitForEvent("dialog");
    const clickPromise = page.locator("[data-exit-workspace]").click();
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("Unsaved prototype changes");
    await dialog.dismiss();
    await clickPromise;
    await expect(page.locator("#workspace-view")).toBeVisible();
  }
}

test("three isolated options pass responsive, accessibility, keyboard, contrast, and route review", async ({ browser }) => {
  fs.mkdirSync(screenshotRoot, { recursive: true });
  const isolation = verifyPrototypeIsolation();
  expect(isolation.status).toBe("pass");

  const review = {
    schemaVersion: "batch2r.prototype-review.v1",
    status: "pass",
    generatedAt: new Date().toISOString(),
    prerequisiteCommit: "1628498",
    scope: "Isolated coded design prototypes; production workspace and Batch 3 runtime unchanged.",
    routes: options.map((option) => option.route),
    viewports: {
      desktop: { width: 1440, height: 900 },
      mobile: { width: 393, height: 851 },
      reflow: { width: 320, height: 800 }
    },
    isolation,
    options: [],
    advisorRecommendation: {
      option: "option-a",
      status: "recommendation-only",
      rationale: "Guided Rail gives first-time, non-GIS users the clearest next action while preserving a dominant map and collapsing data into a drawer. Owner review is still required."
    },
    ownerDecision: { status: "required", selectedOption: null, approvalArtifactCreated: false }
  };

  for (const option of options) {
    const optionReport = {
      id: option.id,
      name: option.name,
      route: option.route,
      checkedStates: [],
      screenshots: [],
      axe: [],
      overflow: [],
      keyboard: {},
      mobile: {},
      contrast: [],
      consoleErrors: [],
      externalRequests: []
    };

    const desktopContext = await browser.newContext({ viewport: review.viewports.desktop, deviceScaleFactor: 1 });
    const desktopPage = await desktopContext.newPage();
    desktopPage.on("console", (message) => {
      if (message.type() === "error") optionReport.consoleErrors.push(message.text());
    });
    desktopPage.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin !== "http://127.0.0.1:4174") optionReport.externalRequests.push(request.url());
    });

    for (const stateName of Object.keys(option.states)) {
      const response = await loadState(desktopPage, option, stateName);
      if (stateName === "home") {
        expect(response.headers()["x-robots-tag"] || "").toContain("noindex");
        await expect(desktopPage.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/i);
        await expect(desktopPage.locator("body")).toContainText(/Upcoming|planned for Batch 3|Coming later|Planned for a future release/i);
      }
      if (stateName === "add") {
        await expect(desktopPage.locator("body")).toContainText(/stays on your device|only in this browser|not uploaded|locally in this browser/i);
        await expect(desktopPage.locator("[data-column-confirmation]")).toBeVisible();
        await expect(desktopPage.locator("[data-column-confirmation]")).toContainText(/Region/i);
        await expect(desktopPage.locator("[data-column-confirmation]")).toContainText(/Value|Values|Sales|Coverage/i);
      }
      if (stateName === "match") {
        expect(await desktopPage.locator("svg").count()).toBeGreaterThan(0);
        expect(await desktopPage.locator("table").count()).toBeGreaterThan(0);
      }
      if (stateName === "manual") {
        const visibleText = await desktopPage.locator("body").innerText();
        expect(visibleText, `${option.id} manual flow is not the spreadsheet wizard`).not.toMatch(/Step [1-4] of 4/i);
      }
      if (stateName === option.optionsState) {
        await expect(desktopPage.locator("[data-basic-options]")).toBeVisible();
        await expect(desktopPage.locator("[data-advanced-options]")).toBeVisible();
      }

      const overflow = await pageHasNoHorizontalOverflow(desktopPage);
      optionReport.overflow.push({ viewport: "desktop", state: stateName, ...overflow });
      expect(overflow.pass, `${option.id} ${stateName} desktop page overflow`).toBe(true);

      const violations = await runAxe(desktopPage);
      optionReport.axe.push({ viewport: "desktop", state: stateName, violations });
      const blocking = violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
      expect(blocking, `${option.id} ${stateName} serious/critical axe violations`).toEqual([]);
      optionReport.checkedStates.push(stateName);

      if (stateName === "home") {
        const file = screenshotPath(option.id, "home-desktop-1440");
        await desktopPage.screenshot({ path: file, fullPage: true });
        optionReport.screenshots.push({ state: "home", viewport: "desktop", path: toRelative(file) });
      }
      if (stateName === "match") {
        const file = screenshotPath(option.id, "workspace-match-desktop-1440");
        await desktopPage.screenshot({ path: file, fullPage: false });
        optionReport.screenshots.push({ state: "match", viewport: "desktop", path: toRelative(file) });
      }
    }

    await loadState(desktopPage, option, "match", option.mobileWorkspaceBase);
    const order = await workspaceDomOrder(desktopPage);
    expect(order.taskFound && order.mapFound && order.drawerFound, `${option.id} workspace layers exist`).toBe(true);
    expect(order.taskBeforeMap, `${option.id} current task precedes the map in keyboard order`).toBe(true);
    expect(order.mapBeforeDrawer, `${option.id} map precedes the data drawer in keyboard order`).toBe(true);
    optionReport.keyboard.workspaceDomOrder = order;

    const drawerTrigger = desktopPage.locator("[data-drawer-trigger]:visible").first();
    await expect(drawerTrigger).toBeVisible();
    await drawerTrigger.click();
    await expect(desktopPage.locator("[data-drawer-panel]")).toBeVisible();
    expect(await desktopPage.evaluate(() => Boolean(document.activeElement?.closest?.("[data-drawer-panel]")))).toBe(true);
    await desktopPage.keyboard.press("Escape");
    await expect.poll(() => drawerIsOpen(desktopPage)).toBe(false);
    expect(await desktopPage.evaluate(() => document.activeElement?.matches?.("[data-drawer-trigger]"))).toBe(true);
    optionReport.keyboard.drawerEscapeRestoredFocus = true;

    await loadState(desktopPage, option, "match", option.mobileWorkspaceBase);
    const linkedRegion = await desktopPage.evaluate(() => [...document.querySelectorAll("[data-map-region]")]
      .map((element) => element.dataset.mapRegion)
      .find((region) => document.querySelector(`[data-region-row="${CSS.escape(region)}"]`)) || "");
    expect(linkedRegion, `${option.id} map/table fixture has a shared region key`).not.toBe("");
    const mapRegion = desktopPage.locator(`[data-map-region="${linkedRegion}"]`);
    const regionRow = desktopPage.locator(`[data-region-row="${linkedRegion}"]`);
    await mapRegion.focus();
    await desktopPage.keyboard.press("Enter");
    expect(await mapRegion.evaluate((element) => element.getAttribute("aria-pressed") === "true"
      || element.classList.contains("selected-region") || element.classList.contains("is-linked"))).toBe(true);
    expect(await regionRow.evaluate((element) => {
      const row = element.closest("tr") || element;
      return row.getAttribute("aria-current") === "true" || row.classList.contains("is-linked");
    })).toBe(true);
    if (!(await drawerIsOpen(desktopPage))) {
      await desktopPage.locator("[data-drawer-trigger]:visible").first().click();
    }
    await expect.poll(() => drawerIsOpen(desktopPage)).toBe(true);
    const rowAction = regionRow.locator("[data-link-map]");
    const rowTarget = await rowAction.count() ? rowAction : regionRow;
    await rowTarget.focus();
    await desktopPage.keyboard.press("Enter");
    expect(await mapRegion.evaluate((element) => element.getAttribute("aria-pressed") === "true"
      || element.classList.contains("selected-region") || element.classList.contains("is-linked"))).toBe(true);
    optionReport.keyboard.mapTableLinkedBothWays = linkedRegion;

    if (option.id === "option-a") {
      await loadState(desktopPage, option, "manual");
      await desktopPage.locator("[data-panel='manual'] [data-flow-target='manual']").click();
      await expect(desktopPage.locator("body")).toHaveAttribute("data-flow", "manual");
      await expect(desktopPage.locator("[data-panel='design'] .manual-flow-copy")).toBeVisible();
      await expect(desktopPage.locator("[data-panel='design'] .spreadsheet-flow-copy")).toBeHidden();
      await desktopPage.locator("[data-panel='design'] [data-view-target='export']").click();
      await expect(desktopPage.locator("body")).toHaveAttribute("data-flow", "manual");
      await expect(desktopPage.locator("[data-panel='export'] .manual-flow-copy")).toBeVisible();
      await expect(desktopPage.locator(".spreadsheet-steps")).toBeHidden();
      optionReport.keyboard.manualContextPreserved = true;
    }

    await loadState(desktopPage, option, "home");
    await desktopPage.evaluate(() => {
      document.body.setAttribute("tabindex", "-1");
      document.body.focus();
    });
    await desktopPage.keyboard.press("Tab");
    const firstFocus = await desktopPage.evaluate(() => ({
      text: document.activeElement?.textContent?.trim() || "",
      label: document.activeElement?.getAttribute?.("aria-label") || ""
    }));
    expect(`${firstFocus.text} ${firstFocus.label}`).toMatch(/Skip to main content/i);
    await desktopPage.evaluate(() => document.body.removeAttribute("tabindex"));
    optionReport.keyboard.firstTab = firstFocus;

    const primary = desktopPage.locator(option.primary).first();
    await primary.focus();
    await expect(primary).toBeFocused();
    const focusFile = screenshotPath(option.id, "visible-focus-desktop-1440");
    await desktopPage.screenshot({ path: focusFile, fullPage: false });
    optionReport.screenshots.push({ state: "visible-focus", viewport: "desktop", path: toRelative(focusFile) });

    const primaryColors = await colorEvidence(desktopPage, option.primary);
    const foreground = parseColor(primaryColors.foreground);
    const background = parseColor(primaryColors.background);
    const parentBackground = parseColor(primaryColors.parentBackground);
    expect(foreground && background).toBeTruthy();
    const textRatio = contrast(foreground, background);
    const focusRatios = primaryColors.focusColors
      .map(parseColor)
      .filter(Boolean)
      .map((color) => contrast(color, parentBackground));
    const bestFocusRatio = Math.max(...focusRatios);
    optionReport.contrast.push({
      pair: "primary-action-text",
      foreground: primaryColors.foreground,
      background: primaryColors.background,
      ratio: Number(textRatio.toFixed(2)),
      threshold: 4.5,
      status: textRatio >= 4.5 ? "pass" : "fail"
    });
    optionReport.contrast.push({
      pair: "visible-focus-indicator",
      colors: primaryColors.focusColors,
      adjacentBackground: primaryColors.parentBackground,
      bestRatio: Number(bestFocusRatio.toFixed(2)),
      thickness: primaryColors.outlineWidth,
      threshold: 3,
      status: bestFocusRatio >= 3 ? "pass" : "fail"
    });
    expect(textRatio, `${option.id} primary action text contrast`).toBeGreaterThanOrEqual(4.5);
    expect(bestFocusRatio, `${option.id} focus indicator contrast`).toBeGreaterThanOrEqual(3);
    expect(primaryColors.target.height, `${option.id} primary action touch height`).toBeGreaterThanOrEqual(44);

    const sample = desktopPage.locator(option.sample).first();
    await sample.focus();
    await expect(sample).toBeFocused();
    await desktopPage.keyboard.press("Enter");
    await expect(desktopPage.locator(option.sampleDestination)).toBeVisible();
    optionReport.keyboard.sampleActivated = true;
    await desktopContext.close();

    const mobileContext = await browser.newContext({
      viewport: review.viewports.mobile,
      deviceScaleFactor: 1,
      hasTouch: true,
      isMobile: false
    });
    const mobilePage = await mobileContext.newPage();
    await loadState(mobilePage, option, "home");
    let overflow = await pageHasNoHorizontalOverflow(mobilePage);
    optionReport.overflow.push({ viewport: "mobile", state: "home", ...overflow });
    expect(overflow.pass, `${option.id} mobile home overflow`).toBe(true);
    let violations = await runAxe(mobilePage);
    optionReport.axe.push({ viewport: "mobile", state: "home", violations });
    expect(violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);
    let file = screenshotPath(option.id, "home-mobile-393");
    await mobilePage.screenshot({ path: file, fullPage: true });
    optionReport.screenshots.push({ state: "home", viewport: "mobile", path: toRelative(file) });

    const optionCss = fs.readFileSync(path.join(root, "design-preview", "batch-2r", option.id, "option.css"), "utf8");
    expect(optionCss, `${option.id} mobile safe-area CSS`).toContain("safe-area-inset-bottom");
    optionReport.mobile.safeAreaHandling = true;
    optionReport.mobile.sheetStates = [];

    for (const sheetState of ["collapsed", "medium", "expanded"]) {
      const sheetQuery = withQueryParam(option.mobileWorkspaceBase, option.sheetParam, sheetState);
      if (sheetState === "collapsed") {
        const response = await mobilePage.goto(`${option.route}${sheetQuery}`, { waitUntil: "networkidle" });
        expect(response, `${option.id} collapsed mobile state returned a response`).not.toBeNull();
        expect(response.status(), `${option.id} collapsed mobile HTTP status`).toBe(200);
        await expect(mobilePage.locator("body")).toContainText(option.states.match.text);
      } else {
        await loadState(mobilePage, option, "match", sheetQuery);
      }
      await expect(mobilePage.locator("body")).toHaveAttribute(option.sheetAttribute, sheetState);
      overflow = await pageHasNoHorizontalOverflow(mobilePage);
      optionReport.overflow.push({ viewport: "mobile", state: `match-${sheetState}`, ...overflow });
      expect(overflow.pass, `${option.id} mobile ${sheetState} workspace overflow`).toBe(true);
      violations = await runAxe(mobilePage);
      optionReport.axe.push({ viewport: "mobile", state: `match-${sheetState}`, violations });
      expect(violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);

      const mapControl = mobilePage.locator("[data-map-canvas] button[aria-label='Zoom in']");
      let mapControlReachable = false;
      if (sheetState === "expanded") {
        const mapControlState = await mapControl.evaluate((element) => {
          const style = getComputedStyle(element);
          const box = element.getBoundingClientRect();
          const visible = style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
          if (!visible) return { visible: false, usable: false };
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return { visible: true, usable: Boolean(hit && (hit === element || element.contains(hit))) };
        });
        expect(!mapControlState.visible || mapControlState.usable, `${option.id} expanded sheet does not leave a visible-but-covered map control`).toBe(true);
        mapControlReachable = mapControlState.usable;
      } else {
        await expect(mapControl).toBeVisible();
        mapControlReachable = await mapControl.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return Boolean(hit && (hit === element || element.contains(hit)));
        });
        expect(mapControlReachable, `${option.id} map control is not covered in ${sheetState} state`).toBe(true);
      }

      const workspacePrimary = mobilePage.locator(option.workspacePrimary);
      if (sheetState === "collapsed") {
        await expect(workspacePrimary).toBeHidden();
      } else {
        await workspacePrimary.evaluate((element) => element.scrollIntoView({ block: "center", inline: "nearest" }));
        await expect(workspacePrimary).toBeVisible();
        expect(await workspacePrimary.evaluate((element) => {
          const box = element.getBoundingClientRect();
          const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
          return box.top >= 0 && box.bottom <= window.innerHeight + 1 && Boolean(hit && (hit === element || element.contains(hit)));
        }), `${option.id} primary action is reachable in ${sheetState} state`).toBe(true);
      }
      optionReport.mobile.sheetStates.push({
        state: sheetState,
        overflow: overflow.pass,
        mapControlReachable,
        fullStepSheetOwnsViewport: sheetState === "expanded"
      });

      if (sheetState === "medium") {
        await mobilePage.locator("[data-current-task]:visible").evaluate((element) => {
          let scroller = element;
          while (scroller && scroller !== document.body) {
            const overflowY = getComputedStyle(scroller).overflowY;
            if (["auto", "scroll"].includes(overflowY)) break;
            scroller = scroller.parentElement;
          }
          if (scroller) scroller.scrollTop = 0;
        });
        file = screenshotPath(option.id, "workspace-match-mobile-393");
        await mobilePage.screenshot({ path: file, fullPage: false });
        optionReport.screenshots.push({ state: "match-medium", viewport: "mobile", path: toRelative(file) });
      }
    }

    await loadState(mobilePage, option, "match", option.mobileWorkspace);
    await expect(mobilePage.locator("[data-drawer-panel]")).toBeVisible();
    await expect(mobilePage.locator("[data-drawer-panel] table")).toBeVisible();
    overflow = await pageHasNoHorizontalOverflow(mobilePage);
    optionReport.overflow.push({ viewport: "mobile", state: "data-view", ...overflow });
    expect(overflow.pass, `${option.id} dedicated mobile data view overflow`).toBe(true);
    violations = await runAxe(mobilePage);
    optionReport.axe.push({ viewport: "mobile", state: "data-view", violations });
    expect(violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);
    file = screenshotPath(option.id, "workspace-data-mobile-393");
    await mobilePage.screenshot({ path: file, fullPage: false });
    optionReport.screenshots.push({ state: "data-view", viewport: "mobile", path: toRelative(file) });

    await loadState(mobilePage, option, "match", withQueryParam(option.mobileWorkspaceBase, option.sheetParam, "medium"));
    const mobileDrawerTrigger = mobilePage.locator("[data-drawer-trigger]:visible").first();
    await mobileDrawerTrigger.click();
    await expect(mobilePage.locator("[data-drawer-panel]")).toBeVisible();
    expect(await mobilePage.evaluate(() => Boolean(document.activeElement?.closest?.("[data-drawer-panel]")))).toBe(true);
    await mobilePage.keyboard.press("Escape");
    await expect.poll(() => drawerIsOpen(mobilePage)).toBe(false);
    expect(await mobilePage.evaluate(() => document.activeElement?.matches?.("[data-drawer-trigger]"))).toBe(true);
    optionReport.mobile.drawerBackPrecedence = true;

    await loadState(mobilePage, option, "add", option.mobileAdd);
    await mobilePage.locator(option.nextFromAdd).click();
    await expect(mobilePage.locator(option.states.match.selector)).toBeVisible();
    await mobilePage.goBack();
    await expect(mobilePage.locator(option.states.add.selector)).toBeVisible();
    optionReport.mobile.browserBackRestoresPriorStep = true;

    await assertUnsavedGuard(mobilePage, option);
    optionReport.mobile.unsavedGuard = true;
    await mobileContext.close();

    const reflowContext = await browser.newContext({ viewport: review.viewports.reflow, deviceScaleFactor: 1 });
    const reflowPage = await reflowContext.newPage();
    for (const [stateName, query] of [["home", null], ["match", option.mobileWorkspace]]) {
      await loadState(reflowPage, option, stateName, query);
      overflow = await pageHasNoHorizontalOverflow(reflowPage);
      optionReport.overflow.push({ viewport: "reflow-320", state: stateName, ...overflow });
      expect(overflow.pass, `${option.id} ${stateName} 320px reflow`).toBe(true);
    }
    await reflowContext.close();

    expect(optionReport.consoleErrors, `${option.id} console errors`).toEqual([]);
    expect(optionReport.externalRequests, `${option.id} remote requests`).toEqual([]);
    optionReport.status = "pass";
    review.options.push(optionReport);
  }

  review.summary = {
    optionCount: review.options.length,
    stateChecks: review.options.reduce((total, option) => total + option.checkedStates.length, 0),
    axeRuns: review.options.reduce((total, option) => total + option.axe.length, 0),
    screenshots: review.options.reduce((total, option) => total + option.screenshots.length, 0),
    overflowChecks: review.options.reduce((total, option) => total + option.overflow.length, 0),
    seriousOrCriticalAxeViolations: review.options.flatMap((option) => option.axe)
      .flatMap((entry) => entry.violations)
      .filter((violation) => ["serious", "critical"].includes(violation.impact)).length,
    ownerApprovalRecorded: false,
    productionPrototypePayload: false
  };
  fs.mkdirSync(path.dirname(reviewPath), { recursive: true });
  fs.writeFileSync(reviewPath, `${JSON.stringify(review, null, 2)}\n`);
});
