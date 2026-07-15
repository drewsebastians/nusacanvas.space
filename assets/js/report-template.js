(function () {
  const brand = window.ProductBrand;
  if (!brand) throw new Error("Product brand configuration is required.");
  const boundaryProvider = window.NusaCanvasBoundaryProvider && window.NusaCanvasBoundaryProvider.current;
  if (!boundaryProvider || typeof boundaryProvider.getManifest !== "function") throw new Error("Boundary provider metadata is required before the issue report template.");
  const APP_VERSION = brand.app.version;
  const BOUNDARY_MANIFEST = boundaryProvider.getManifest();
  const BOUNDARY_VERSION = boundaryProvider.getVersion();
  const REGISTRY_VERSION = BOUNDARY_MANIFEST.canonicalRegistryVersion;

  function value(id) {
    const element = document.getElementById(id);
    return element ? String(element.value || "").trim() : "";
  }

  function buildReport() {
    const lines = [
      `${brand.productName} data issue report`,
      "",
      `App version: ${APP_VERSION}`,
      `Boundary provider: ${BOUNDARY_MANIFEST.providerId}`,
      `Boundary version: ${BOUNDARY_VERSION}`,
      `Registry version: ${REGISTRY_VERSION}`,
      `Issue category: ${value("issueCategory") || "(not provided)"}`,
      `Boundary/legacy region ID: ${value("geometryId") || "(not provided)"}`,
      `Canonical region ID: ${value("canonicalId") || "(not provided)"}`,
      "",
      "Description:",
      value("issueDescription") || "(not provided)",
      "",
      "Privacy note:",
      "This template does not automatically include your CSV contents, project contents, file names, or any other browser data."
    ];
    return lines.join("\n");
  }

  function refresh() {
    const output = document.getElementById("reportOutput");
    if (output) output.textContent = buildReport();
  }

  async function copyReport() {
    const report = buildReport();
    await navigator.clipboard.writeText(report);
    setStatus("The report template was copied to the clipboard.", "copied");
  }

  function downloadReport() {
    const blob = new Blob([buildReport()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = brand.defaults.issueReportFilename;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("The report template was downloaded.", "downloaded");
  }

  function setStatus(message, state) {
    const status = document.getElementById("reportStatus");
    if (!status) return;
    status.textContent = message;
    if (state) status.dataset.state = state;
  }

  document.addEventListener("DOMContentLoaded", () => {
    ["issueCategory", "geometryId", "canonicalId", "issueDescription"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.addEventListener("input", refresh);
    });
    const copyButton = document.getElementById("copyReportBtn");
    const downloadButton = document.getElementById("downloadReportBtn");
    if (copyButton) copyButton.addEventListener("click", () => copyReport().catch(() => setStatus("The clipboard is not available. Nothing changed. Download the report instead.", "copy-failed")));
    if (downloadButton) downloadButton.addEventListener("click", downloadReport);
    refresh();
  });
})();
