const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");

function commandExists(command) {
  const result = spawnSync(command, ["--version"], { cwd: ROOT, encoding: "utf8", shell: process.platform === "win32" });
  return result.status === 0;
}

function pythonCommand() {
  if (process.env.PYTHON) return process.env.PYTHON;
  const codexPython = path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "python", "python.exe");
  if (process.platform === "win32" && fs.existsSync(codexPython)) return codexPython;
  if (commandExists("python3")) return "python3";
  return "python";
}

function playwrightCli() {
  return path.join(ROOT, "node_modules", "@playwright", "test", "cli.js");
}

function run(label, command, args, options = {}) {
  console.log(`\n> ${label}`);
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: options.shell || false,
    env: { ...process.env, ...options.env }
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

const node = process.execPath;
const python = pythonCommand();
const playwright = playwrightCli();

run("clean build", node, ["scripts/build.js"]);
run("data/license/reproducibility pipeline", node, ["scripts/data-pipeline.js", "test"]);
run("geometry and registry tests", python, ["tests/run_data_tests.py"]);
run("unit and migration tests", node, ["--test", "--test-isolation=none", "tests/unit/project-storage.test.js"]);
run("browser smoke matrix", node, [playwright, "test", "--config=playwright.config.js", "tests/e2e/smoke.spec.js"]);
run("trust page and report template browser checks", node, [playwright, "test", "--config=playwright.config.js", "tests/e2e/trust.spec.js"]);
run("accessibility checks", node, [playwright, "test", "--config=playwright.config.js", "tests/e2e/a11y.spec.js"]);
run("performance budgets", node, ["scripts/check-performance-budgets.js"]);
run("static trust content and header checks", node, ["scripts/check-static-content.js"]);
run("security and forbidden-network checks", node, ["scripts/security-audit.js"]);

console.log("\nBatch 1 local verification passed.");
