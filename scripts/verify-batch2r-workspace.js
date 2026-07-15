const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const mustExist = [
  "workspace/index.html",
  "assets/js/workspace-shell.js",
  "assets/css/app.css",
  "tests/e2e/batch2r-workspace.spec.js",
  "docs/batch-2r/06-workspace-architecture.md",
  "docs/batch-2r/06-workflow-state-contract.md"
];
const screenshots = path.join(root, "artifacts", "batch-2r", "workspace-screenshots");
const decision = JSON.parse(fs.readFileSync(path.join(root, "artifacts", "batch-2r", "design-decision.json"), "utf8"));
const shell = fs.readFileSync(path.join(root, "assets", "js", "workspace-shell.js"), "utf8");
const css = fs.readFileSync(path.join(root, "assets", "css", "app.css"), "utf8");
const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed, detail });
  if (!passed) process.exitCode = 1;
}

mustExist.forEach((relative) => check(`exists:${relative}`, fs.existsSync(path.join(root, relative)), "Required Prompt 6 deliverable exists."));
check("approved-design-decision", decision.status === "approved" && decision.selectedOption === "option-a", "Option A desktop direction remains the approved baseline.");
check("workspace-goal-orchestration", /setGoal\(|workspaceGoalChoice|workspaceGoal/.test(shell), "Goal entry and explicit temporary workspace state are present.");
check("mobile-sheet-contract", /cycleMobileSheet|workspaceSheet/.test(shell) && /data-workspace-sheet/.test(css), "Collapsed, medium, and expanded mobile sheet states are present.");
check("drawer-contract", /setDrawer|dataDrawerToggle/.test(shell) && /data-workspace-drawer/.test(css), "The data/issues drawer has an explicit state and accessible toggle.");
check("no-batch-3-runtime", !/sales territory runtime|coverage runtime/i.test(shell), "Future Batch 3 workflows are not implemented in workspace runtime.");

const screenshotFiles = fs.existsSync(screenshots) ? fs.readdirSync(screenshots).filter((file) => file.endsWith(".png")) : [];
check("visual-regression-screenshots", screenshotFiles.length >= 10, `${screenshotFiles.length} current workspace screenshots captured.`);

const report = {
  schemaVersion: "batch2r.workspace-regression.v1",
  generatedAt: new Date().toISOString(),
  status: process.exitCode ? "failed" : "passed",
  decision: { selectedOption: decision.selectedOption, desktop: decision.approvedDesktopPattern, mobile: decision.approvedMobilePattern },
  screenshotFiles: screenshotFiles.sort(),
  checks
};
fs.mkdirSync(path.join(root, "artifacts", "batch-2r"), { recursive: true });
fs.writeFileSync(path.join(root, "artifacts", "batch-2r", "workspace-regression.json"), `${JSON.stringify(report, null, 2)}\n`);
if (process.exitCode) console.error("Batch 2R workspace verification failed.");
else console.log(`Batch 2R workspace verification passed with ${screenshotFiles.length} screenshots.`);
