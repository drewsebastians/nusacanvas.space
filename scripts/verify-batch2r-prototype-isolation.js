const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const previewRoot = path.join(root, "design-preview", "batch-2r");
const artifactDir = path.join(root, "artifacts", "batch-2r");
const optionIds = ["option-a", "option-b", "option-c"];

function relative(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function verifyPrototypeIsolation() {
  const checks = [];
  const errors = [];
  const check = (id, condition, details) => {
    checks.push({ id, status: condition ? "pass" : "fail", details });
    if (!condition) errors.push(`${id}: ${details}`);
  };

  for (const optionId of optionIds) {
    const optionDir = path.join(previewRoot, optionId);
    const indexPath = path.join(optionDir, "index.html");
    check(`${optionId}-route`, fs.existsSync(indexPath), `${relative(indexPath)} exists`);
    check(`${optionId}-styles`, fs.existsSync(path.join(optionDir, "option.css")), `${optionId}/option.css exists`);
    check(`${optionId}-behavior`, fs.existsSync(path.join(optionDir, "option.js")), `${optionId}/option.js exists`);
    if (!fs.existsSync(indexPath)) continue;
    const html = fs.readFileSync(indexPath, "utf8");
    check(`${optionId}-language`, /<html\s+[^>]*lang=["']en["']/i.test(html), "root document declares simple English");
    check(`${optionId}-noindex`, /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html), "robots metadata contains noindex");
    check(`${optionId}-no-remote-assets`, !/(?:src|href)=["']https?:\/\//i.test(html), "HTML loads no remote script, style, image, or font");
  }

  const reviewIndex = path.join(previewRoot, "index.html");
  check("review-index-route", fs.existsSync(reviewIndex), `${relative(reviewIndex)} exists`);
  if (fs.existsSync(reviewIndex)) {
    const reviewHtml = fs.readFileSync(reviewIndex, "utf8");
    check("review-index-noindex", /<meta\s+[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(reviewHtml), "review index robots metadata contains noindex");
  }

  const productionSurfaces = [
    "index.html",
    "robots.txt",
    "_headers",
    "wrangler.jsonc",
    "scripts/build.js"
  ];
  for (const productionPath of productionSurfaces) {
    const content = read(productionPath);
    check(
      `production-reference-${productionPath.replace(/[^a-z0-9]+/gi, "-")}`,
      !content.includes("design-preview/batch-2r"),
      `${productionPath} does not reference a prototype route`
    );
  }

  const sitemapCandidates = ["sitemap.xml", "sitemap.txt"]
    .map((candidate) => path.join(root, candidate))
    .filter((candidate) => fs.existsSync(candidate));
  check(
    "sitemap-exclusion",
    sitemapCandidates.every((candidate) => !fs.readFileSync(candidate, "utf8").includes("design-preview")),
    sitemapCandidates.length ? "existing sitemap files exclude design-preview" : "no sitemap is present, so prototype routes cannot be listed"
  );

  let buildError = null;
  try {
    const buildModule = require.resolve(path.join(root, "scripts", "build.js"));
    delete require.cache[buildModule];
    require(buildModule);
  } catch (error) {
    buildError = error;
  }
  check("production-build", !buildError, buildError ? buildError.message : "normal allowlisted build completed in-process");
  check(
    "production-payload-exclusion",
    !fs.existsSync(path.join(root, "dist", "design-preview")),
    "dist/design-preview does not exist after the normal production build"
  );

  const result = {
    schemaVersion: "batch2r.prototype-isolation.v1",
    status: errors.length ? "fail" : "pass",
    checkedAt: new Date().toISOString(),
    routes: optionIds.map((optionId) => `/design-preview/batch-2r/${optionId}/`),
    checks,
    errors
  };

  fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(path.join(artifactDir, "prototype-isolation.json"), `${JSON.stringify(result, null, 2)}\n`);
  return result;
}

if (require.main === module) {
  const result = verifyPrototypeIsolation();
  if (result.status !== "pass") {
    console.error(`Prototype isolation failed:\n- ${result.errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log(`Prototype isolation passed (${result.checks.length} checks).`);
}

module.exports = { verifyPrototypeIsolation };
