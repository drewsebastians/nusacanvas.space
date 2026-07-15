const fs = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");

const root = path.resolve(__dirname, "..", "..");
const screenshotDir = path.join(root, "artifacts", "batch-2r", "workspace-screenshots");

async function ready(page) {
  await page.goto("/workspace/");
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
}

test("manual highlight is a short map-first path with a spreadsheet handoff", async ({ page }) => {
  fs.mkdirSync(screenshotDir, { recursive: true });
  await ready(page);
  await page.screenshot({ path: path.join(screenshotDir, "goal-selection-desktop.png"), fullPage: true });
  const manualGoal = page.locator('[data-workspace-goal="manual"]');
  await expect(manualGoal).toHaveCount(1);
  await manualGoal.click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-goal", "manual");
  await expect(page.locator("#searchInput")).toBeVisible();
  await expect(page.locator("#spreadsheetWorkflowLink")).toContainText("Map spreadsheet data links rows to regions");

  const regionValue = await page.locator("#regionSelect option").evaluateAll((options) => {
    const option = options.find((item) => item.textContent && item.textContent.includes("Surabaya"));
    return option && option.value;
  });
  await page.locator("#regionSelect").selectOption(regionValue);
  await page.screenshot({ path: path.join(screenshotDir, "manual-inspector-desktop.png"), fullPage: true });
  await page.locator("#applyColorBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("1");
  await expect(page.locator("#exportSection")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, "manual-desktop.png"), fullPage: true });
});

test("spreadsheet journey exposes explicit stages and an openable data drawer", async ({ page }) => {
  await ready(page);
  await page.locator('[data-workspace-goal="spreadsheet"]').click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-goal", "spreadsheet");
  await expect(page.locator("#importPaste")).toBeVisible();
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-add-data-desktop.png"), fullPage: true });
  await page.locator("#importPaste").fill("kode\tnilai\n35.78\t125\n51.71\t77\n");
  await page.locator("#previewCsvBtn").click();
  await expect(page.locator("#workflowStatus")).toHaveAttribute("data-stage", "match");
  await page.screenshot({ path: path.join(screenshotDir, "spreadsheet-match-desktop.png"), fullPage: true });
  await page.locator("#applyCsvBtn").click();
  await expect(page.locator("#workflowStatus")).toHaveAttribute("data-stage", "design");
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-drawer", "open");
  await expect(page.locator("#dataTablePanel")).toBeVisible();
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
  await page.locator("#sidebarToggleBtn").click();
  await expect(page.locator("#appShell")).toHaveAttribute("data-workspace-sheet", "collapsed");
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
