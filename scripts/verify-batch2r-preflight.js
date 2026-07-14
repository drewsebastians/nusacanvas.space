const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const required = [
  "docs/batch-2r/00-preflight-and-experience-contract.md",
  "docs/batch-2r/01-current-experience-audit.md",
  "docs/batch-2r/01-current-journeys.md",
  "docs/batch-2r/01-architecture-contract.md",
  "artifacts/batch-2r/preflight.json",
  "artifacts/batch-2r/current-experience-inventory.json",
  "artifacts/batch-2r/current-string-inventory.json",
  "artifacts/batch-2r/baseline/manifest.json"
];
const missing = required.filter((relative) => !fs.existsSync(path.join(root, relative)));
if (missing.length) {
  console.error(`Batch 2R preflight evidence missing: ${missing.join(", ")}`);
  process.exit(1);
}
const preflight = JSON.parse(fs.readFileSync(path.join(root, "artifacts/batch-2r/preflight.json"), "utf8"));
if (preflight.status !== "pass") {
  console.error(`Batch 2R preflight status is ${preflight.status}, expected pass.`);
  process.exit(1);
}
const inventory = JSON.parse(fs.readFileSync(path.join(root, "artifacts/batch-2r/current-experience-inventory.json"), "utf8"));
const strings = JSON.parse(fs.readFileSync(path.join(root, "artifacts/batch-2r/current-string-inventory.json"), "utf8"));
if (inventory.journeys.length < 15 || strings.routes.length < 10) {
  console.error("Batch 2R inventory is incomplete.");
  process.exit(1);
}
console.log(`Batch 2R preflight evidence passed: ${inventory.journeys.length} journeys, ${strings.routes.length} routes.`);
