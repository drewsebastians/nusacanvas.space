const fs = require("node:fs");
const { defineConfig, devices } = require("@playwright/test");

function localChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  }
  if (process.platform !== "win32") return undefined;
  return [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ].find((candidate) => fs.existsSync(candidate));
}

const executablePath = localChromiumExecutable();
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4174";
const useLocalServer = !process.env.PLAYWRIGHT_BASE_URL;

module.exports = defineConfig({
  testDir: "tests/e2e",
  testMatch: "batch2r-prototypes.spec.js",
  timeout: 300000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  outputDir: "test-results/batch2r-prototypes",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  webServer: useLocalServer ? {
    command: `"${process.execPath}" scripts/serve-static.js . 4174`,
    url: "http://127.0.0.1:4174/design-preview/batch-2r/option-a/",
    reuseExistingServer: false,
    timeout: 120000
  } : undefined,
  projects: [
    {
      name: "prototype-chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {}
      }
    }
  ]
});
