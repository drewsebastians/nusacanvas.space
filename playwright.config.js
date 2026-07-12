const fs = require("node:fs");
const path = require("node:path");
const { defineConfig, devices } = require("@playwright/test");

function localChromiumExecutable() {
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) return process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  if (process.platform !== "win32") return undefined;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
  ];
  return candidates.find((candidate) => fs.existsSync(candidate));
}

const executablePath = localChromiumExecutable();
const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:4173";
const useLocalServer = !process.env.PLAYWRIGHT_BASE_URL;

module.exports = defineConfig({
  testDir: ".",
  timeout: 120000,
  expect: { timeout: 30000 },
  fullyParallel: false,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off"
  },
  webServer: useLocalServer ? {
    command: "node scripts/serve-dist-for-tests.js 4173",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: false,
    timeout: 120000
  } : undefined,
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: executablePath ? { executablePath } : {}
      }
    },
    {
      name: "firefox-desktop",
      use: {
        ...devices["Desktop Firefox"]
      }
    },
    {
      name: "webkit-desktop",
      use: {
        ...devices["Desktop Safari"]
      }
    },
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
        launchOptions: executablePath ? { executablePath } : {}
      }
    }
  ]
});
