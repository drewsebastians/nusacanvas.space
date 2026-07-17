const fs = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");

const root = path.resolve(__dirname, "..", "..");
const screenshotDir = path.join(root, "artifacts", "batch-2r", "workspace-screenshots");

async function ready(page) {
  await page.goto("/workspace/");
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
}

test("landing routes open the requested workspace instead of showing goal choice again", async ({ page }) => {
  await page.goto("/workspace/?goal=highlight");
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-goal", "manual");

  await page.goto("/workspace/?sample=1");
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-goal", "spreadsheet");
  await expect(page.locator("#workflowStatus")).toHaveAttribute("data-stage", "match");
});

test("manual highlight is a short map-first path with a spreadsheet handoff", async ({ page }) => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await ready(page);
  await page.screenshot({ path: path.join(screenshotDir, "goal-selection-desktop.png"), fullPage: true });
  const manualGoal = page.locator('[data-workspace-goal="manual"]');
  await expect(manualGoal).toHaveCount(1);
  await manualGoal.click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-goal", "manual");
  await expect(page.locator("#searchInput")).toBeVisible();
  await expect(page.locator("#applyColorBtn")).toBeHidden();
  await expect(page.locator("#removeColorBtn")).toBeHidden();
  await expect(page.locator("#undoBtn")).toBeHidden();
  await expect(page.locator("#exportSection")).toBeHidden();
  await expect(page.locator("#map .map-legend")).toBeHidden();
  await expect(page.locator("#spreadsheetWorkflowLink")).toContainText("Map spreadsheet data links rows to regions");

  const regionValue = await page.locator("#regionSelect option").evaluateAll((options) => {
    const option = options.find((item) => item.textContent && item.textContent.includes("Surabaya"));
    return option && option.value;
  });
  await page.locator("#regionSelect").selectOption(regionValue);
  await expect(page.locator("#applyColorBtn")).toBeVisible();
  await expect(page.locator("#manualPalette option")).toHaveCount(4);
  await page.locator("#manualPalette").selectOption("office");
  await expect(page.locator("#colorPalette .color-swatch")).toHaveCount(6);
  await expect(page.locator("#colorPicker")).toHaveValue("#4472c4");
  await page.locator("#manualPalette").selectOption("nusacanvas");
  const amberSwatch = page.locator("#colorPalette").getByRole("button", { name: "Amber", exact: true });
  await amberSwatch.click();
  await expect(page.locator("#colorPicker")).toHaveValue("#d58a16");
  await expect(page.locator("#colorValue")).toHaveText("#D58A16");
  await expect(amberSwatch).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({ path: path.join(screenshotDir, "manual-inspector-desktop.png"), fullPage: true });
  await page.locator("#applyColorBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("1");
  await expect(page.locator("#removeColorBtn")).toBeVisible();
  await expect(page.locator("#undoBtn")).toBeEnabled();
  await expect(page.locator("#exportSection")).toBeVisible();
  await expect(page.locator("#map .map-legend")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, "manual-desktop.png"), fullPage: true });
});

test("spreadsheet journey exposes explicit stages and an openable data drawer", async ({ page }) => {
  await ready(page);
  await page.locator('[data-workspace-goal="spreadsheet"]').click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-goal", "spreadsheet");
  await expect(page.locator("#manualWorkflowLink")).toBeVisible();
  await expect(page.locator("#manualWorkflowLink")).toContainText("Switch to Highlight regions");
  await expect(page.locator("#importPaste")).toBeVisible();
  await expect(page.locator("#applyCsvBtn")).toBeHidden();
  await expect(page.locator("#cancelImportBtn")).toBeHidden();
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-add-data-desktop.png"), fullPage: true });
  await page.locator("#importPaste").fill("kode\tnilai\n35.78\t125\n51.71\t77\n");
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#workflowStatus")).toHaveAttribute("data-stage", "match");
  await expect(page.locator("#applyCsvBtn")).toBeVisible();
  await expect(page.locator("#cancelImportBtn")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-match-desktop.png"), fullPage: true });
  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#workflowStatus")).toHaveAttribute("data-stage", "design");
  await expect(page.locator("#vizPalette option")).toHaveCount(4);
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-drawer", "open");
  await expect(page.locator("#dataTablePanel")).toBeVisible();
  const tableFitsDrawer = await page.locator(".data-table-scroll").evaluate((element) => element.scrollWidth <= element.clientWidth);
  expect(tableFitsDrawer).toBe(true);
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-drawer-desktop.png"), fullPage: true });
  await page.locator("#dataDrawerToggle").click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-drawer", "closed");
  const exportStage = page.locator('[data-workflow-stage="export"]');
  await exportStage.click();
  await expect(page.locator("#exportSection")).toBeVisible();
  const download = page.waitForEvent("download");
  await page.locator("#exportMappingBtn").click();
  await download;
  await expect(page.locator("#workspaceToast")).toContainText("export is being prepared");
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-export-success-desktop.png"), fullPage: true });
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-design-desktop.png"), fullPage: true });
});

test("mobile workspace keeps the map visible and uses predictable sheet states", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await ready(page);
  await page.locator('[data-workspace-goal="spreadsheet"]').click();
  await expect(page.locator("#map")).toBeVisible();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-sheet", "medium");
  await page.locator("#sidebarToggleBtn").click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-sheet", "expanded");
  await expect(page.locator("#sidebarToggleBtn")).toHaveText("Show more map");
  await page.locator("#sidebarToggleBtn").click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-sheet", "collapsed");
  await expect(page.locator("#sidebarToggleBtn")).toHaveText("Open controls");
  await expect(page.locator("#controlPanel")).toHaveCSS("height", "88px");
  const collapsedSheet = await page.locator("#controlPanel").boundingBox();
  expect(collapsedSheet.height).toBeLessThanOrEqual(96);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-mobile-collapsed.png"), fullPage: true });
});

test("workspace captures loading and actionable error states at laptop and narrow widths", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/workspace/");
  await page.screenshot({ path: path.join(screenshotDir, "workspace-loading-laptop.png"), fullPage: true });
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
  await page.setViewportSize({ width: 900, height: 900 });
  await page.locator('[data-workspace-goal="spreadsheet"]').click();
  await page.locator('[data-workflow-stage="visualize"]').click();
  await expect(page.locator("#errorArea")).toContainText("Add at least one matched row first");
  await page.screenshot({ path: path.join(screenshotDir, "workspace-error-narrow.png"), fullPage: true });
});
