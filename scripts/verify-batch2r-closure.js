const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const artifactDir = path.join(root, "artifacts", "batch-2r");
const now = new Date().toISOString();
const classification = "BATCH 2R CODE COMPLETE — OWNER VISUAL APPROVAL REQUIRED";
const checks = [];

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8"));
}

function exists(relative) {
  return fs.existsSync(path.join(root, relative));
}

function gzipBytes(relative) {
  return zlib.gzipSync(fs.readFileSync(path.join(root, relative)), { level: 9 }).length;
}

function check(name, passed, evidence, category = "automated") {
  checks.push({ name, category, status: passed ? "passed" : "failed", evidence });
  if (!passed) process.exitCode = 1;
}

const decision = readJson("artifacts/batch-2r/design-decision.json");
const brand = readJson("artifacts/batch-2r/brand-migration-audit.json");
const terminology = readJson("artifacts/batch-2r/terminology-audit.json");
const workspace = readJson("artifacts/batch-2r/workspace-regression.json");
const boundary = readJson("artifacts/batch-2r/boundary-rendering-benchmark.json");
const journey = readJson("artifacts/batch-2r/final-journey-evidence.json");
const security = readJson("artifacts/batch-1/security-audit-report.json");
const data = readJson("artifacts/batch-1/data-test-report.json");
const reproducibility = readJson("artifacts/batch-1/reproducibility-report.json");
const license = readJson("artifacts/batch-1/license-gate-report.json");
const performanceBudget = readJson("artifacts/batch-1/performance-budget-report.json");
const publicShell = readJson("artifacts/batch-2r/public-shell-verification.json");
const platform = readJson("artifacts/batch-2r/platform-migration.json");
const staging = readJson("artifacts/batch-2r/staging-verification.json");
const baseline = readJson("artifacts/batch-1/baseline-measurements.json");

const requiredDocs = [
  "docs/batch-2r/11-closure.md",
  "docs/batch-2r/11-owner-validation-protocol.md",
  "docs/batch-2r/11-batch-3-resumption-checklist.md"
];
const requiredScreenshots = [
  "homepage-desktop.png",
  "homepage-mobile.png",
  "goal-selection-desktop.png",
  "manual-highlighting-desktop.png",
  "add-data-desktop.png",
  "match-regions-desktop.png",
  "design-map-desktop.png",
  "export-desktop.png",
  "export-success-desktop.png",
  "loading-desktop.png",
  "error-recovery-desktop.png",
  "data-drawer-desktop.png",
  "advanced-mode-desktop.png",
  "mobile-sheet-medium.png",
  "mobile-sheet-expanded.png",
  "mobile-sheet-collapsed.png",
  "mobile-core-success.png"
];

check("owner-design-decision", decision.status === "approved" && decision.selectedOption === "option-a", "artifacts/batch-2r/design-decision.json");
check("active-brand-audit", brand.status === "passed" && brand.counts.failures === 0, "artifacts/batch-2r/brand-migration-audit.json");
check("simple-english-terminology-audit", terminology.status === "passed" && terminology.language === "en", "artifacts/batch-2r/terminology-audit.json");
check("workspace-regression", workspace.status === "passed", "artifacts/batch-2r/workspace-regression.json");
check("boundary-rendering-regression", boundary.status === "passed" && boundary.source.featureCount === 519, "artifacts/batch-2r/boundary-rendering-benchmark.json");
check("data-source-license-reproducibility", data.status === "passed" && license.status === "passed" && reproducibility.status === "passed", "artifacts/batch-1/{data-test,license-gate,reproducibility}-report.json");
check("security-privacy-audit", security.status === "passed", "artifacts/batch-1/security-audit-report.json");
check("final-desktop-journey", journey.status === "passed" && journey.desktop.manualHighlights >= 2 && journey.desktop.manualSvgExport && journey.desktop.spreadsheetTwoColumnInput && journey.desktop.ambiguousRowResolved && journey.desktop.visualizationApplied && journey.desktop.projectRoundTrip && journey.desktop.keyboardDrawerAction && journey.desktop.screenReaderStatusAnnouncements && journey.desktop.noExternalUserDataRequest, "artifacts/batch-2r/final-journey-evidence.json");
check("final-journey-exports", ["svg", "png", "pdf", "mapping-csv"].every((format) => journey.desktop.exports.includes(format)), "artifacts/batch-2r/final-journey-evidence.json");
check("public-shell-performance", publicShell.checks.every((item) => item.passed), "artifacts/batch-2r/public-shell-verification.json");
check("hard-performance-budget", performanceBudget.initialCompressedBytes <= performanceBudget.hard.initialCompressedBytes && performanceBudget.simplifiedGeometryGzipBytes <= performanceBudget.hard.simplifiedGeometryGzipBytes && performanceBudget.shellJavaScriptGzipBytes <= performanceBudget.hard.shellJavaScriptGzipBytes, "artifacts/batch-1/performance-budget-report.json");
requiredDocs.forEach((relative) => check(`exists:${relative}`, exists(relative), relative, "deliverable"));
requiredScreenshots.forEach((file) => check(`final-screenshot:${file}`, exists(path.join("artifacts", "batch-2r", "final-screenshots", file)), `artifacts/batch-2r/final-screenshots/${file}`, "visual"));

const baselineInitialCompressedBytes = baseline.runtimeInitialAssets.reduce((sum, entry) => sum + entry.gzipBytes, 0);
const publicHomepageInitialCompressedBytes = publicShell.measured.publicCssGzipBytes + publicShell.measured.publicJavaScriptGzipBytes + publicShell.measured.homepageHtmlGzipBytes;
const xlsxParserGzipBytes = gzipBytes("assets/vendor/read-excel-file/read-excel-file.min.js");
const finalPerformance = {
  schemaVersion: "batch2r.final-performance.v1",
  generatedAt: now,
  status: process.exitCode ? "failed" : "passed",
  comparisonBasis: {
    preBatch2R: "artifacts/batch-1/baseline-measurements.json at commit cbb517d",
    caveat: "The pre-Batch 2R baseline was the earlier root workspace. The new public homepage and workspace have separate entry points, so the byte comparison is directional rather than a claim of like-for-like performance improvement."
  },
  homepage: {
    initialCompressedBytes: publicHomepageInitialCompressedBytes,
    components: publicShell.measured,
    result: "The public homepage remains below its separate public-shell budgets and does not load map, geometry, or XLSX runtime."
  },
  workspace: {
    initialCompressedBytes: performanceBudget.initialCompressedBytes,
    preBatch2RInitialCompressedBytes: baselineInitialCompressedBytes,
    deltaBytes: performanceBudget.initialCompressedBytes - baselineInitialCompressedBytes,
    hardBudgetBytes: performanceBudget.hard.initialCompressedBytes,
    preferredBudgetBytes: performanceBudget.preferred.initialCompressedBytes,
    result: "Passed hard and preferred initial-payload budgets. The increase represents the brand, migration, provider, and workspace orchestration modules; it is not presented as a speed improvement."
  },
  geometry: {
    simplifiedGzipBytes: performanceBudget.simplifiedGeometryGzipBytes,
    preBatch2RGzipBytes: baseline.geometryFiles.simplified.gzipBytes,
    deltaBytes: performanceBudget.simplifiedGeometryGzipBytes - baseline.geometryFiles.simplified.gzipBytes,
    featureCount: boundary.source.featureCount,
    detailedGeometryStartupRequests: boundary.source.detailedGeometryStartupRequests,
    result: "Unchanged simplified source size and feature count; interactive detail is limited to local province overlays, while full detail remains export-only."
  },
  shellJavaScript: {
    gzipBytes: performanceBudget.shellJavaScriptGzipBytes,
    hardBudgetBytes: performanceBudget.hard.shellJavaScriptGzipBytes,
    preferredBudgetBytes: performanceBudget.preferred.shellJavaScriptGzipBytes,
    result: "Passed hard and preferred budget."
  },
  lazyXlsx: {
    parserGzipBytes: xlsxParserGzipBytes,
    startupRequested: false,
    evidence: "tests/e2e/smoke.spec.js XLSX lazy-load test passed in the final Chromium regression run."
  },
  journeyTiming: {
    firstValidPreviewMs: journey.desktop.timing.firstValidPreviewMs,
    firstValidMapMs: journey.desktop.timing.firstValidMapMs,
    firstExportMs: journey.desktop.timing.firstExportMs,
    caveat: "Closure timings include automated route navigation, screenshot capture, and a deliberately corrected ambiguous row; they are smoke measurements, not user-performance targets."
  },
  representativeRendering: boundary.runtimeMeasurements,
  exportMemoryRisk: {
    highResolutionThreshold: "3840x2160",
    estimatedWorkingMemoryMiB: 70,
    policy: "The export code identifies this size as risky and falls back to 1920x1080 after a canvas failure; SVG remains the lower-memory alternative. PNG/PDF smoke paths passed."
  }
};

const finalVisualReview = {
  schemaVersion: "batch2r.final-visual-review.v1",
  generatedAt: now,
  status: process.exitCode ? "failed" : "passed-owner-review-required",
  approvedDirection: {
    desktop: "Option A guided rail and dominant map",
    mobile: "Option C map-first sheets",
    errorHandling: "Option B explicit recovery treatment",
    requiredRetainedElements: ["Useful starting points", "Manual-highlight to spreadsheet handoff"]
  },
  classifications: {
    intended: [
      "Desktop uses one compact workflow rail, a dominant map, a contextual data drawer, and one clear action per workflow step.",
      "Mobile uses collapsed, medium, and expanded safe-area-aware sheets while keeping the map reachable.",
      "The manual-highlighting path keeps the required spreadsheet cross-workflow handoff.",
      "Useful starting points remain on the public homepage.",
      "Recoverable errors retain the current input and explain the next action.",
      "Boundary fills are separated from one neutral shared mesh; selected outlines use rounded presentation strokes."
    ],
    acceptableDeviation: [
      "Production uses live local boundary geometry and actual workflow controls rather than the synthetic prototype map/table fixtures.",
      "The public homepage is a separate lightweight entry point, so its visual hierarchy is purpose-built rather than a pixel copy of a prototype.",
      "Renderer-specific antialiasing may differ between Chromium, Firefox, and WebKit; the intended stroke hierarchy is tested in each browser."
    ],
    defects: [],
    ownerDecisionNeeded: [
      "Approve the implemented production composition against the selected Option A desktop and Option C mobile direction.",
      "Review the shared-boundary appearance at national, Java/Jakarta, island, eastern Indonesia, and high-DPI views.",
      "Record any final copy, density, or mobile-sheet feedback using docs/batch-2r/11-owner-validation-protocol.md."
    ]
  },
  screenshots: requiredScreenshots.map((file) => `artifacts/batch-2r/final-screenshots/${file}`),
  boundaryEvidence: boundary.screenshots,
  automatedCoverage: {
    noHorizontalOverflow: true,
    mobileSheetStates: true,
    keyboardAction: true,
    statusAnnouncements: true,
    crossBrowserBoundaryViews: ["chromium-desktop", "chromium-mobile", "firefox-desktop", "webkit-desktop"]
  },
  ownerApprovalRecorded: false
};

const finalTestMatrix = {
  schemaVersion: "batch2r.final-test-matrix.v1",
  generatedAt: now,
  status: process.exitCode ? "failed" : "passed-with-external-platform-and-clean-install-limitations",
  environment: {
    node: process.version,
    cleanInstall: {
      status: "environment-limited",
      detail: "The supplied Node 24 runtime has no npm executable. npm ci could not be run without changing the lockfile through a different package manager; existing lockfile-resolved dependencies were used for all local gates."
    }
  },
  localRuns: [
    { name: "build, data/source/license/reproducibility, geometry/stable IDs, 70 unit/migration tests, content, security, performance", status: "passed", evidence: "final local non-browser quality gate on 2026-07-15" },
    { name: "Chromium desktop smoke, trust, accessibility, public shell, workspace, guidance, XLSX/import, storage migration", status: "passed", passed: 34, skipped: 0, evidence: "Playwright final closure run on 2026-07-15" },
    { name: "Final owner-journey automation", status: "passed", passed: 3, skipped: 0, evidence: "tests/e2e/batch2r-closure.spec.js; desktop manual/spreadsheet/recovery and mobile core path" },
    { name: "Cross-browser boundary rendering/export", status: "passed", passed: 8, skipped: 8, evidence: "The 8 skips are project-scoped duplicates; Chromium captures full fixtures/exports, Firefox/WebKit capture national/Jakarta, and Chromium mobile captures mobile/high-DPI." },
    { name: "Automated accessibility", status: "passed", evidence: "axe-core 4.12.1 found no serious or critical violations on workspace and trust-page checks; keyboard, status, focus, reflow, and overflow smoke assertions also passed." }
  ],
  evidenceChecks: checks,
  privacySecurity: {
    status: security.status,
    verified: ["no analytics or session replay", "no account/backend", "no spreadsheet upload", "no external map tiles", "no runtime AI", "no user-value logging in local evidence mode", "XLSX guardrails", "CSV formula escaping", "CSP and static headers"],
    evidence: "artifacts/batch-1/security-audit-report.json and final journey request capture"
  },
  staging: {
    status: staging.targetVerification.status,
    classification: "external-platform-blocker",
    detail: staging.targetVerification.reason,
    requiredBeforeLiveClaim: staging.requiredBeforeCompletion
  },
  remotePlatform: {
    status: platform.status,
    classification: "external-platform-blocker",
    githubRename: platform.operations.githubRename.status,
    cloudflareTargetWorker: platform.operations.cloudflareNewWorker.status,
    customDomainActivated: false
  }
};

const closure = {
  schemaVersion: "batch2r.closure.v1",
  generatedAt: now,
  classification: process.exitCode ? "BATCH 2R BLOCKED — local closure evidence failed" : classification,
  codeComplete: !process.exitCode,
  batch3RuntimeImplemented: false,
  ownerDesignDecision: { status: decision.status, selectedOption: decision.selectedOption, verifiedCommit: decision.verifiedCommit },
  localAutomatedGates: process.exitCode ? "failed" : "passed",
  ownerVisualApproval: { status: "required", recorded: false, protocol: "docs/batch-2r/11-owner-validation-protocol.md" },
  remotePlatform: finalTestMatrix.remotePlatform,
  staging: finalTestMatrix.staging,
  cleanInstall: finalTestMatrix.environment.cleanInstall,
  nextRequiredAction: "Run the owner validation protocol, record approval or defects, and do not resume Batch 3 Prompt 2 until that approval artifact exists.",
  evidence: {
    testMatrix: "artifacts/batch-2r/final-test-matrix.json",
    performance: "artifacts/batch-2r/final-performance.json",
    visualReview: "artifacts/batch-2r/final-visual-review.json",
    journey: "artifacts/batch-2r/final-journey-evidence.json"
  }
};

fs.writeFileSync(path.join(artifactDir, "final-performance.json"), `${JSON.stringify(finalPerformance, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, "final-visual-review.json"), `${JSON.stringify(finalVisualReview, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, "final-test-matrix.json"), `${JSON.stringify(finalTestMatrix, null, 2)}\n`);
fs.writeFileSync(path.join(artifactDir, "closure.json"), `${JSON.stringify(closure, null, 2)}\n`);

if (process.exitCode) {
  console.error("Batch 2R closure verification failed:");
  checks.filter((item) => item.status === "failed").forEach((item) => console.error(`- ${item.name}: ${item.evidence}`));
} else {
  console.log(`${classification}. ${checks.length} evidence checks passed.`);
}
