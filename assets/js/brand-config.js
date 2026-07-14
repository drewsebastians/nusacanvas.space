(function (root, factory) {
  const config = factory();
  if (typeof module === "object" && module.exports) module.exports = config;
  if (root) root.ProductBrand = config;
})(typeof window !== "undefined" ? window : globalThis, function () {
  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  const config = {
    schemaVersion: "batch2r.brand.v1",
    productName: "NusaCanvas",
    positioning: "Create clear Indonesia regency and city maps from spreadsheet data.",
    futureCanonicalOrigin: "https://nusacanvas.space",
    currentStagingOrigin: "https://mapnesia.andrew-sebastian91.workers.dev",
    prompt10Targets: {
      repository: "drewsebastians/nusacanvas.space",
      stagingOrigin: "https://nusacanvas-space.andrew-sebastian91.workers.dev"
    },
    support: {
      contactPath: "/contact/",
      issueReportPath: "/contact/#laporkan-data",
      publicEmail: null
    },
    defaults: {
      projectTitle: "NusaCanvas Indonesia region map",
      exportFilenamePrefix: "nusacanvas-indonesia-map",
      projectFilename: "nusacanvas-indonesia-map-project.json",
      migrationReportFilename: "nusacanvas-project-update-report.json",
      browserRecoveryFilename: "nusacanvas-browser-backup-recovery.txt",
      unreadableBrowserBackupFilename: "nusacanvas-unreadable-browser-backup.txt",
      unreadableCompatibilityBackupFilename: "nusacanvas-unreadable-compatibility-backup.txt",
      issueReportFilename: "nusacanvas-data-issue-report.txt"
    },
    app: {
      id: "indonesia-region-map",
      version: "1.0.0",
      language: "en",
      title: "NusaCanvas — Create an Indonesia region map",
      description: "NusaCanvas turns spreadsheet data into clear Indonesia regency and city maps in your browser."
    },
    remoteOperationsDeferredToPrompt: 10
  };

  config.apply = function apply(rootNode) {
    if (!rootNode || !rootNode.querySelectorAll) return;
    rootNode.querySelectorAll("[data-brand-product]").forEach((element) => { element.textContent = config.productName; });
    rootNode.querySelectorAll("[data-brand-positioning]").forEach((element) => { element.textContent = config.positioning; });
    rootNode.querySelectorAll("[data-brand-title]").forEach((element) => { element.textContent = config.app.title; });
    rootNode.querySelectorAll("[data-brand-description]").forEach((element) => { element.setAttribute("content", config.app.description); });
  };

  return deepFreeze(config);
});
