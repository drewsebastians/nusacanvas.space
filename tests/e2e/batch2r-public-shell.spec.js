const fs = require("node:fs");
const { expect, test } = require("@playwright/test");

const axeSource = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const forbiddenRuntime = /leaflet|xlsx|read-excel|\.geojson|assets\/js\/(?:app|map|export|csv-import)\.js/i;
const navigation = ["Highlight regions", "Map spreadsheet", "Guides", "Region data", "About", "Open workspace"];

async function assertAxe(page) {
  await page.evaluate((source) => Function(source)(), axeSource);
  const results = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "best-practice"] } }));
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact))).toEqual([]);
}

async function assertNoOverflow(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test("landing page matches the approved public structure and stays lightweight", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => requests.push(new URL(request.url())));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.locator("h1")).toHaveText("Highlight regions and cities clearly.");
  await expect(page).toHaveTitle("NusaCanvas — Create clear Indonesia maps");
  await expect(page.locator("link[rel='canonical']")).toHaveAttribute("href", "https://nusacanvas.space/");
  await expect(page.locator("#public-navigation > a")).toHaveText(navigation);
  await expect(page.locator("[data-carousel-slide]")).toHaveCount(4);
  await expect(page.locator("[data-carousel-dot]")).toHaveCount(4);
  await expect(page.getByRole("button", { name: /previous|next/i })).toHaveCount(0);
  await expect(page.getByText("1 of 4", { exact: true })).toHaveCount(0);
  expect(await page.locator("[data-carousel-slide]").evaluateAll((slides) => slides.map((slide) => slide.getAttribute("aria-label")))).toEqual([null, null, null, null]);
  await expect(page.locator("#hero-slide-1")).toBeVisible();
  await expect(page.locator("#hero-slide-2")).toBeHidden();
  await expect(page.locator("#hero-slide-1 img")).toHaveJSProperty("complete", true);
  await expect(page.locator(".goal-card")).toHaveCount(4);
  await expect(page.locator(".goal-card-upcoming")).toHaveCount(2);
  await expect(page.locator(".goal-card-upcoming")).toContainText([/not available yet/i, /not available yet/i]);
  await expect(page.getByText("How spreadsheet mapping works", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Useful starting points", { exact: true })).toHaveCount(0);
  await expect(page.locator(".section-heading-public h2 + .section-summary")).toHaveText("Begin with a simple task. You can refine the details after your map is taking shape.");
  expect(await page.locator("main > section").evaluateAll((sections) => sections.map((section) => section.className))).toEqual([
    "hero-carousel site-inner", "trust-strip", "site-inner section-block choose-section", "site-inner section-block final-cta final-cta-dark"
  ]);
  expect(requests.some(({ pathname }) => forbiddenRuntime.test(pathname))).toBe(false);
  expect(requests.every(({ origin }) => origin === new URL(page.url()).origin)).toBe(true);
  expect(requests.map(({ pathname }) => pathname)).toContain("/assets/images/public/hero-highlight-regions.svg");
  expect(requests.map(({ pathname }) => pathname)).not.toContain("/assets/images/public/hero-map-spreadsheet.svg");
  expect(requests.map(({ pathname }) => pathname)).not.toContain("/assets/images/public/hero-sales-territories.svg");
  expect(requests.map(({ pathname }) => pathname)).not.toContain("/assets/images/public/hero-coverage-analysis.svg");
  await assertNoOverflow(page);
  await assertAxe(page);
});

test("carousel autoplays at seven seconds and direct controls pause it", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.clock.fastForward(6900);
  await expect(page.locator("#hero-slide-1")).toBeVisible();
  await page.clock.fastForward(200);
  await expect(page.locator("#hero-slide-2")).toBeVisible();
  await page.locator("[data-carousel-dot]").nth(3).click();
  await expect(page.locator("#hero-slide-4")).toBeVisible();
  await expect(page.locator("[data-carousel-toggle]")).toHaveAttribute("aria-pressed", "true");
  await page.clock.fastForward(8000);
  await expect(page.locator("#hero-slide-4")).toBeVisible();
  await page.locator("[data-carousel-dot]").nth(3).press("Home");
  await expect(page.locator("#hero-slide-1")).toBeVisible();
  await page.locator("[data-carousel-dot]").first().press("End");
  await expect(page.locator("#hero-slide-4")).toBeVisible();
  await page.locator("[data-carousel-dot]").nth(3).press("ArrowLeft");
  await expect(page.locator("#hero-slide-3")).toBeVisible();
});

test("carousel pauses on hover and under reduced motion", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.locator(".hero-carousel").hover();
  await page.clock.fastForward(8000);
  await expect(page.locator("#hero-slide-1")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(1, 1);
  await page.clock.fastForward(8000);
  await expect(page.locator("#hero-slide-1")).toBeVisible();
});

test("available feature pages keep approved section order, links, and accessibility", async ({ page }) => {
  const cases = [
    ["/highlight-regions/", "Why use this feature?", ["Why use this feature?", "What you can customize", "Common use cases", "How it works", "Useful starting points", "Ready to highlight your regions?"]],
    ["/excel-to-map/", "From spreadsheet to map in four steps", ["From spreadsheet to map in four steps", "Why it works for your workflow", "Best practices", "Useful starting points", "Ready to map your data?"]]
  ];
  for (const [url, firstSection, headings] of cases) {
    const requests = [];
    page.removeAllListeners("request");
    page.on("request", (request) => requests.push(request.url()));
    const response = await page.goto(url, { waitUntil: "networkidle" });
    expect(response.status()).toBe(200);
    await expect(page.locator(".breadcrumb")).toBeVisible();
    await expect(page.locator(".feature-badge")).toHaveText("Feature");
    await expect(page.locator(".feature-section").first().getByRole("heading", { name: firstSection })).toBeVisible();
    await expect(page.locator(".feature-section h2")).toHaveText(headings);
    expect(requests.some((request) => forbiddenRuntime.test(request))).toBe(false);
    await assertNoOverflow(page);
    await assertAxe(page);
  }
  await expect(page.getByText("CSV, TSV, or XLSX")).toBeVisible();
  await expect(page.locator('a[href="../workspace/?goal=spreadsheet"]')).toHaveCount(2);
});

test("feature pages have no mobile overflow", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 851 });
  for (const url of ["/highlight-regions/", "/excel-to-map/"]) {
    await page.goto(url);
    await assertNoOverflow(page);
  }
});

test("upcoming feature pages are truthful and link only to available feature pages", async ({ page }) => {
  for (const url of ["/sales-territories/", "/coverage-analysis/"]) {
    const response = await page.goto(url);
    expect(response.status()).toBe(200);
    await expect(page.getByText("Coming soon", { exact: true })).toBeVisible();
    await expect(page.getByText(/This feature is not available yet/)).toBeVisible();
    await expect(page.locator("main a[href*='workspace']")).toHaveCount(0);
    await expect(page.locator("main a[href='../highlight-regions/']")).toHaveCount(1);
    await expect(page.locator("main a[href='../excel-to-map/']")).toHaveCount(1);
  }
});

test("all crawlable pages use the same public navigation", async ({ page }) => {
  const routes = ["/", "/highlight-regions/", "/excel-to-map/", "/sales-territories/", "/coverage-analysis/", "/guides/", "/guides/contoh-peta-nilai-kota/", "/about/", "/contact/", "/privacy/", "/terms/", "/sources-licenses/", "/data-methodology/", "/limitations/", "/changelog/"];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator("#public-navigation > a")).toHaveText(navigation);
  }
});

test("public mobile navigation is keyboard-safe and has no horizontal overflow", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 851 });
  await page.goto("/");
  const toggle = page.locator(".nav-toggle");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#public-navigation")).toHaveAttribute("data-open", "");
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await assertNoOverflow(page);
});
