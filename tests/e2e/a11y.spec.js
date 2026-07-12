const fs = require("node:fs");
const path = require("node:path");
const { expect, test } = require("@playwright/test");

const artifactDir = path.resolve(__dirname, "..", "..", "artifacts", "batch-1");
const axePath = require.resolve("axe-core/axe.min.js");
const axeSource = fs.readFileSync(axePath, "utf8");

async function injectAxe(page) {
  await page.evaluate((source) => {
    Function(source)();
  }, axeSource);
}

test("home page has no serious or critical automated accessibility violations", async ({ page }) => {
  fs.mkdirSync(artifactDir, { recursive: true });
  await page.goto("/");
  await expect(page.locator("#loadingIndicator")).toContainText(/wilayah dimuat/i, { timeout: 60000 });
  await injectAxe(page);
  const results = await page.evaluate(async () => {
    return window.axe.run(document, {
      resultTypes: ["violations"],
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] }
    });
  });
  fs.writeFileSync(path.join(artifactDir, "a11y-axe-results.json"), `${JSON.stringify(results, null, 2)}\n`);
  const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
  expect(blocking).toEqual([]);
});

test("trust pages have no serious or critical automated accessibility violations", async ({ page }) => {
  fs.mkdirSync(artifactDir, { recursive: true });
  const pages = ["/about/", "/contact/", "/privacy/", "/terms/", "/sources-licenses/", "/data-methodology/", "/limitations/", "/changelog/", "/guides/mengapa-jumlah-wilayah-peta-berbeda/"];
  const reports = [];
  for (const url of pages) {
    await page.goto(url);
    await injectAxe(page);
    const results = await page.evaluate(async () => {
      return window.axe.run(document, {
        resultTypes: ["violations"],
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] }
      });
    });
    reports.push({ url, violations: results.violations });
    const blocking = results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact));
    expect(blocking).toEqual([]);
  }
  fs.writeFileSync(path.join(artifactDir, "a11y-trust-axe-results.json"), `${JSON.stringify(reports, null, 2)}\n`);
});
