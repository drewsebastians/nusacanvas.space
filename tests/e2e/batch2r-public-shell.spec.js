const fs = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");

const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const artifactDir = path.resolve(__dirname, "..", "..", "artifacts", "batch-2r", "public-shell-screenshots");

async function injectAxe(page) {
  await page.evaluate((source) => Function(source)(), axeSource);
}

test("public homepage is lightweight, accessible, and points to the workspace", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.locator("h1")).toHaveText("Turn Indonesia data into clear, presentation-ready maps.");
  await expect(page.locator(".goal-card")).toHaveCount(4);
  await expect(page.locator(".goal-card").filter({ hasText: "Build sales territories" })).toContainText("Upcoming");
  await expect(page.locator(".goal-card").filter({ hasText: "Analyze coverage" })).toContainText("Upcoming");
  await expect(page.locator(".button:not(.secondary)")).toHaveCount(1);
  await expect(page.locator("text=Useful starting points")).toBeVisible();
  const sectionOrder = await page.locator("main > section").evaluateAll((sections) => sections.map((section) => section.id || section.className));
  expect(sectionOrder.indexOf("trust-strip")).toBeLessThan(sectionOrder.indexOf("create"));
  expect(sectionOrder.indexOf("examples")).toBeLessThan(sectionOrder.indexOf("templates"));
  await expect(page.locator("meta[name='robots']")).toHaveCount(0);
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", "https://nusacanvas.space/");
  await expect(page.locator("script[src]")).toHaveCount(1);
  expect(requests.some((url) => /leaflet|xlsx|read-excel|geojson|map\.js|app\.js/i.test(url))).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

  await injectAxe(page);
  const axe = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] } }));
  expect(axe.violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);

  fs.mkdirSync(artifactDir, { recursive: true });
  await page.screenshot({ path: path.join(artifactDir, "home-desktop.png"), fullPage: true });
  await page.locator("a.button").first().click();
  await expect(page).toHaveURL(/\/workspace\/$/);
  await expect(page.locator("#loadingIndicator")).toHaveAttribute("data-state", "ready", { timeout: 60000 });
});

test("public mobile navigation is keyboard-safe and has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto("/");
  const toggle = page.locator(".nav-toggle");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#public-navigation")).toHaveAttribute("data-open", "");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: path.join(artifactDir, "home-mobile.png"), fullPage: true });
});
