(function () {
  const APP_VERSION = "1.0.0";
  const BOUNDARY_VERSION = "IDN-ADM2-2020-geoboundaries-22746128";
  const REGISTRY_VERSION = "IDN-ADM-REGISTRY-v1-2025-06-23";

  function value(id) {
    const element = document.getElementById(id);
    return element ? String(element.value || "").trim() : "";
  }

  function buildReport() {
    const lines = [
      "Laporan kesalahan data Mapnesia",
      "",
      `App version: ${APP_VERSION}`,
      `Boundary version: ${BOUNDARY_VERSION}`,
      `Registry version: ${REGISTRY_VERSION}`,
      `Kategori isu: ${value("issueCategory") || "(belum diisi)"}`,
      `Geometry/legacy region ID: ${value("geometryId") || "(belum diisi)"}`,
      `Canonical region ID: ${value("canonicalId") || "(belum diisi)"}`,
      "",
      "Deskripsi:",
      value("issueDescription") || "(belum diisi)",
      "",
      "Catatan privasi:",
      "Template ini tidak otomatis menyertakan isi CSV, isi proyek, nama file, atau data lain dari browser."
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
    setStatus("Template laporan disalin ke clipboard.");
  }

  function downloadReport() {
    const blob = new Blob([buildReport()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "laporan-kesalahan-data-mapnesia.txt";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("Template laporan diunduh.");
  }

  function setStatus(message) {
    const status = document.getElementById("reportStatus");
    if (status) status.textContent = message;
  }

  document.addEventListener("DOMContentLoaded", () => {
    ["issueCategory", "geometryId", "canonicalId", "issueDescription"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.addEventListener("input", refresh);
    });
    const copyButton = document.getElementById("copyReportBtn");
    const downloadButton = document.getElementById("downloadReportBtn");
    if (copyButton) copyButton.addEventListener("click", () => copyReport().catch(() => setStatus("Clipboard tidak tersedia. Gunakan unduh laporan.")));
    if (downloadButton) downloadButton.addEventListener("click", downloadReport);
    refresh();
  });
})();
