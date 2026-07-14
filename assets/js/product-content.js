(function (root, factory) {
  const brand = typeof module === "object" && module.exports
    ? require("./brand-config.js")
    : root && root.ProductBrand;
  const content = factory(brand);
  if (typeof module === "object" && module.exports) module.exports = content;
  if (root) root.ProductContent = content;
})(typeof window !== "undefined" ? window : globalThis, function (brand) {
  if (!brand) throw new Error("Product brand configuration is required.");
  const strings = Object.freeze({
    ui: {
      actions: {
        trySample: "Try a sample",
        highlightRegion: "Highlight region",
        removeHighlight: "Remove highlight",
        undo: "Undo",
        clearMap: "Clear map",
        startOver: "Start over",
        addLegend: "Add legend item",
        previewData: "Match regions",
        useMatches: "Use these matches",
        fixUnmatched: "Fix unmatched regions",
        cancel: "Cancel",
        previewColors: "Preview colors",
        designMap: "Design map",
        saveProject: "Save project",
        openProject: "Open project",
        exportSvg: "Export SVG",
        exportPng: "Export PNG",
        exportPdf: "Export PDF",
        exportMatches: "Download region match table",
        viewIndonesia: "View all of Indonesia"
      },
      workflow: {
        input: "Add data",
        match: "Match regions",
        visualize: "Design map",
        export: "Export map"
      },
      status: {
        reading: "Reading data...",
        ready: "{count} regions loaded from the 2020 boundary snapshot.",
        rowsAdded: "{count} rows were added to the map.",
        visualizationApplied: "Map design updated. {count} regions were colored.",
        projectSaved: "A backup was saved in this browser.",
        projectOpened: "Project opened in this browser.",
        pngCreated: "PNG created.",
        pdfCreated: "PDF created."
      },
      warnings: {
        unmatched: "{count} regions could not be matched. Your map is still safe. Check the region names or select the correct matches.",
        limitedRows: "Showing 200 of {count} rows to keep the map responsive. Search to find another row."
      },
      errors: {
        chooseRegion: "Choose a region first. Nothing changed. Your current map is safe. Choose a region, then try again.",
        addData: "Add or upload data first. Your current map is safe. Add data, then match the regions.",
        useMatch: "Choose a region match first. Your current map is safe. Select the correct match, then continue.",
        visualizationLoad: "The color tool could not load. Your map is still safe. Reload the page and try again.",
        mapLoad: "The map could not load. Your current work is safe. Reload the page and try again.",
        spreadsheetRead: "We could not read this spreadsheet. Your current map is still safe. Upload a supported .xlsx file without macros, or paste the data instead.",
        projectOpen: "This project file could not be opened safely. Your current project has not changed. Choose a valid project file.",
        pngExport: "The PNG could not be created. Your map is still safe. Try a smaller size or export SVG.",
        pdfExport: "The PDF could not be created. Your map is still safe. Try SVG or PNG instead.",
        genericSafe: "Your current map is safe. Review this step and try again."
      }
    },
    dataSource: {
      boundaryPlain: "Boundary snapshot: 2020; administrative names reviewed: 2025",
      officialAttribution: "geoBoundaries/HDX COD-AB Indonesia ADM2 snapshot 2020, CC BY 3.0 IGO"
    },
    exportLabels: {
      defaultTitle: brand.defaults.projectTitle,
      legend: "Legend",
      noData: "No data",
      matchReport: "Region match table"
    },
    testIdentifiers: {
      appReady: "app-ready",
      importSuccess: "import-success",
      unmatchedWarning: "unmatched-warning",
      safeError: "safe-error"
    }
  });

  function resolve(key) {
    return String(key || "").split(".").reduce((value, part) => value && value[part], strings);
  }

  function text(key, values = {}) {
    const template = resolve(key);
    if (typeof template !== "string") throw new Error(`Unknown product-content key: ${key}`);
    return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, name) => Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : `{${name}}`);
  }

  function apply(rootNode) {
    if (!rootNode || !rootNode.querySelectorAll) return;
    rootNode.querySelectorAll("[data-copy]").forEach((element) => { element.textContent = text(element.dataset.copy); });
    rootNode.querySelectorAll("[data-copy-placeholder]").forEach((element) => { element.setAttribute("placeholder", text(element.dataset.copyPlaceholder)); });
    rootNode.querySelectorAll("[data-copy-title]").forEach((element) => { element.setAttribute("title", text(element.dataset.copyTitle)); });
    rootNode.querySelectorAll("[data-copy-aria]").forEach((element) => { element.setAttribute("aria-label", text(element.dataset.copyAria)); });
  }

  return Object.freeze({ schemaVersion: "batch2r.product-content.v1", strings, text, apply });
});
