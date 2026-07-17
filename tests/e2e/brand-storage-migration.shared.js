const fs = require("node:fs");
const { expect, test } = require("@playwright/test");
const brand = require("../../assets/js/brand-config.js");

const LEGACY_KEY = "peta-warna-indonesia-autosave-v1";
const TARGET_KEY = "indonesia-region-map-autosave-v2";
const MIGRATION_STATE_KEY = "indonesia-region-map-storage-migration-v1";
const TEST_REGION_ID = "gb-22746128B68603538827891";

function syntheticLegacyAutosave() {
  return {
    appVersion: "0.8.0",
    schemaVersion: "1.0",
    boundaryVersion: "IDN-ADM2-2020-geoboundaries-22746128",
    title: "Peta Sorotan Wilayah Indonesia",
    highlights: {
      [TEST_REGION_ID]: {
        color: "#4472C4",
        category: "Synthetic coverage",
        value: "80"
      }
    },
    legend: [{ label: "Synthetic coverage", color: "#4472C4" }],
    legendVisible: true,
    legendPosition: "bottom-right",
    groupNames: {},
    groupMeta: {},
    workflowStage: "visualize",
    uiMode: "basic",
    exportMeta: {
      subtitle: "Synthetic migration test",
      source: "Automated fixture",
      period: "2026",
      footnote: "",
      legendTitle: "Coverage",
      filenameSlug: "peta-warna-indonesia"
    },
    exportSettings: {
      ratio: "16:9",
      extent: "national",
      labels: true,
      transparent: false,
      highDetail: false,
      pngSize: "1920x1080"
    },
    savedAt: "2026-07-01T00:00:00.000Z"
  };
}

async function seedLegacyAutosave(page, raw, options = {}) {
  await page.addInitScript(({ legacyKey, targetKey, migrationStateKey, serialized, targetRaw, failTargetWrites }) => {
    if (sessionStorage.getItem("__nusacanvasMigrationFixtureInstalled") === "yes") return;
    localStorage.removeItem(targetKey);
    localStorage.removeItem(migrationStateKey);
    if (serialized === null) localStorage.removeItem(legacyKey);
    else localStorage.setItem(legacyKey, serialized);
    if (targetRaw != null) localStorage.setItem(targetKey, targetRaw);
    sessionStorage.setItem("__nusacanvasMigrationFixtureInstalled", "yes");
    if (!failTargetWrites) return;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(key, value) {
      if (key === targetKey) throw new DOMException("Synthetic quota failure", "QuotaExceededError");
      return originalSetItem.call(this, key, value);
    };
  }, {
    legacyKey: LEGACY_KEY,
    targetKey: TARGET_KEY,
    migrationStateKey: MIGRATION_STATE_KEY,
    serialized: options.omitLegacy ? null : raw,
    targetRaw: options.targetRaw == null ? null : String(options.targetRaw),
    failTargetWrites: Boolean(options.failTargetWrites)
  });
}

async function waitForAppReady(page) {
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
}

test("legacy browser backup moves once, keeps its recovery copy, and can be recovered", async ({ page }) => {
  const serialized = JSON.stringify(syntheticLegacyAutosave());
  await seedLegacyAutosave(page, serialized);
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/workspace/");
  await waitForAppReady(page);

  await expect(page.locator("#projectTitle")).toHaveValue(brand.defaults.projectTitle);
  await expect(page.locator("#exportFilenameSlug")).toHaveValue(brand.defaults.exportFilenamePrefix);
  await expect(page.locator("#highlightCount")).toHaveText("1");
  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "saved");
  await expect(page.locator("#autosaveStatus")).toContainText("moved safely");
  await expect(page.locator("#recoverLegacyAutosaveBtn")).toBeVisible();

  const firstMigration = await page.evaluate(({ legacyKey, targetKey }) => {
    const target = JSON.parse(localStorage.getItem(targetKey));
    return {
      targetRaw: localStorage.getItem(targetKey),
      legacy: localStorage.getItem(legacyKey),
      title: target.title,
      filenameSlug: target.exportMeta.filenameSlug,
      highlightedIds: Object.keys(target.highlights),
      report: window.ProjectStorage.getStorageMigrationReport()
    };
  }, { legacyKey: LEGACY_KEY, targetKey: TARGET_KEY });
  expect(firstMigration.legacy).toBe(serialized);
  expect(firstMigration.title).toBe(brand.defaults.projectTitle);
  expect(firstMigration.filenameSlug).toBe(brand.defaults.exportFilenamePrefix);
  expect(firstMigration.highlightedIds).toEqual([TEST_REGION_ID]);
  expect(firstMigration.report.status).toBe("migrated");
  expect(firstMigration.report.droppedEntries).toEqual([]);
  expect(firstMigration.report.backupStatus).toBe("source-retained");

  await page.reload();
  await waitForAppReady(page);
  const repeatMigration = await page.evaluate(({ legacyKey, targetKey }) => {
    const target = JSON.parse(localStorage.getItem(targetKey));
    return {
      targetRaw: localStorage.getItem(targetKey),
      legacy: localStorage.getItem(legacyKey),
      title: target.title,
      filenameSlug: target.exportMeta.filenameSlug,
      highlightedIds: Object.keys(target.highlights),
      report: window.ProjectStorage.getStorageMigrationReport()
    };
  }, { legacyKey: LEGACY_KEY, targetKey: TARGET_KEY });
  expect(repeatMigration.legacy).toBe(serialized);
  expect(repeatMigration.title).toBe(brand.defaults.projectTitle);
  expect(repeatMigration.filenameSlug).toBe(brand.defaults.exportFilenamePrefix);
  expect(repeatMigration.highlightedIds).toEqual([TEST_REGION_ID]);
  expect(repeatMigration.targetRaw).toBe(firstMigration.targetRaw);
  expect(repeatMigration.report.status).toBe("already-current");
  expect(repeatMigration.report.droppedEntries).toEqual([]);

  await page.locator("#clearProjectBtn").click();
  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "cleared");
  await expect(page.locator("#autosaveStatus")).toContainText("retained for recovery");
  await expect(page.locator("#recoverLegacyAutosaveBtn")).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), TARGET_KEY)).toBeNull();

  await page.locator("#recoverLegacyAutosaveBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("1");
  await expect(page.locator("#projectTitle")).toHaveValue(brand.defaults.projectTitle);
  await expect(page.locator("#autosaveStatus")).toContainText("moved safely");
  expect(await page.evaluate(() => window.ProjectStorage.getStorageMigrationReport().status)).toBe("recovered-retained-source");
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBe(serialized);
});

test("a browser storage write failure stays visible and never clears the previous backup", async ({ page }) => {
  const serialized = JSON.stringify(syntheticLegacyAutosave());
  await seedLegacyAutosave(page, serialized, { failTargetWrites: true });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/workspace/");
  await waitForAppReady(page);

  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "migration-error");
  await expect(page.locator("#autosaveStatus")).toContainText("previous copy is still safe");
  await expect(page.locator("#recoverLegacyAutosaveBtn")).toBeVisible();
  const failedMigration = await page.evaluate(({ legacyKey, targetKey }) => ({
    legacy: localStorage.getItem(legacyKey),
    target: localStorage.getItem(targetKey),
    report: window.ProjectStorage.getStorageMigrationReport()
  }), { legacyKey: LEGACY_KEY, targetKey: TARGET_KEY });
  expect(failedMigration.legacy).toBe(serialized);
  expect(failedMigration.target).toBeNull();
  expect(failedMigration.report.status).toBe("failed-write");
  expect(failedMigration.report.sourceRetained).toBe(true);
  expect(failedMigration.report.droppedEntries).toEqual([]);
});

test("an unreadable current backup waits for explicit recovery and exposes download and delete controls", async ({ page }) => {
  const serialized = JSON.stringify(syntheticLegacyAutosave());
  const corruptTarget = "{synthetic-invalid-json";
  await seedLegacyAutosave(page, serialized, { targetRaw: corruptTarget });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/workspace/");
  await waitForAppReady(page);

  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "migration-error");
  expect(await page.evaluate((key) => localStorage.getItem(key), TARGET_KEY)).toBe(corruptTarget);
  expect(await page.evaluate(() => window.ProjectStorage.getStorageMigrationReport().status)).toBe("failed-invalid-target");
  await expect(page.locator("#recoverLegacyAutosaveBtn")).toBeVisible();
  await expect(page.locator("#downloadUnreadableTargetBtn")).toBeVisible();

  await page.locator("#recoverLegacyAutosaveBtn").click();
  await expect(page.locator("#highlightCount")).toHaveText("1");
  expect(await page.evaluate((key) => localStorage.getItem(key), "indonesia-region-map-autosave-recovery-v1")).toBe(corruptTarget);
  await expect(page.locator("#downloadStorageRecoveryBtn")).toBeVisible();
  await expect(page.locator("#deleteStorageRecoveryBtn")).toBeVisible();

  const recoveryDownload = page.waitForEvent("download");
  await page.locator("#downloadStorageRecoveryBtn").click();
  expect((await recoveryDownload).suggestedFilename()).toBe(brand.defaults.browserRecoveryFilename);

  await page.locator("#deleteStorageRecoveryBtn").click();
  await expect(page.locator("#downloadStorageRecoveryBtn")).toBeHidden();
  await page.locator("#deleteLegacyAutosaveBtn").click();
  await expect(page.locator("#recoverLegacyAutosaveBtn")).toBeHidden();
  expect(await page.evaluate((key) => localStorage.getItem(key), LEGACY_KEY)).toBeNull();
});

test("an invalid current backup without a legacy source remains downloadable before any edit and is safety-copied on edit", async ({ page }) => {
  const corruptTarget = "{synthetic-current-without-legacy";
  await seedLegacyAutosave(page, "", { targetRaw: corruptTarget, omitLegacy: true });
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto("/workspace/");
  await waitForAppReady(page);

  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "migration-error");
  await expect(page.locator("#recoverLegacyAutosaveBtn")).toBeHidden();
  await expect(page.locator("#downloadUnreadableTargetBtn")).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), TARGET_KEY)).toBe(corruptTarget);

  const rawDownloadEvent = page.waitForEvent("download");
  await page.locator("#downloadUnreadableTargetBtn").click();
  const rawDownload = await rawDownloadEvent;
  expect(rawDownload.suggestedFilename()).toBe(brand.defaults.unreadableBrowserBackupFilename);
  expect(fs.readFileSync(await rawDownload.path(), "utf8")).toBe(corruptTarget);

  await page.locator("#projectTitle").fill("Safe replacement after raw download");
  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "saved");
  expect(await page.evaluate((key) => localStorage.getItem(key), "indonesia-region-map-autosave-recovery-v1")).toBe(corruptTarget);
  expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), TARGET_KEY)).title).toBe("Safe replacement after raw download");
  await expect(page.locator("#downloadUnreadableTargetBtn")).toBeHidden();
  await expect(page.locator("#downloadStorageRecoveryBtn")).toBeVisible();
});

test("a valid saved copy restores silently without a startup dialog", async ({ page }) => {
  const currentProject = syntheticLegacyAutosave();
  currentProject.title = "Existing current browser project";
  currentProject.exportMeta.filenameSlug = "existing-current-browser-project";
  const currentRaw = JSON.stringify(currentProject);
  await seedLegacyAutosave(page, "", { targetRaw: currentRaw, omitLegacy: true });
  let dialogCount = 0;
  page.on("dialog", (dialog) => { dialogCount += 1; dialog.dismiss(); });

  await page.goto("/workspace/");
  await waitForAppReady(page);

  await expect(page.locator("#projectTitle")).toHaveValue("Existing current browser project");
  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "opened");
  expect(dialogCount).toBe(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), TARGET_KEY)).toBe(currentRaw);

  await page.locator("#projectTitle").fill("Updated restored project");
  await expect(page.locator("#autosaveStatus")).toHaveAttribute("data-state", "saved");
  expect(await page.evaluate((key) => localStorage.getItem(key), "indonesia-region-map-autosave-recovery-v1")).toBeNull();
  expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), TARGET_KEY)).title).toBe("Updated restored project");
  await expect(page.locator("#downloadStorageRecoveryBtn")).toBeHidden();
});
