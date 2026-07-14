(function (root, factory) {
  const api = factory(root && root.ProductBrand);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ProductBrandMigration = api;
})(typeof window !== "undefined" ? window : globalThis, function (brand) {
  if (!brand || !brand.defaults) throw new Error("Product brand configuration is required before brand migration.");

  const MIGRATION_VERSION = "batch2r.brand-project-migration.v1";
  const LEGACY_DEFAULT_PROJECT_TITLES = new Set([
    "Peta Sorotan Wilayah Indonesia",
    "Peta Warna Wilayah Indonesia",
    "Indonesia region map"
  ]);
  const LEGACY_DEFAULT_EXPORT_PREFIXES = new Set([
    "peta-warna-indonesia",
    "peta-warna-wilayah-indonesia",
    "peta-wilayah-indonesia",
    "indonesia-region-map"
  ]);

  function copyProject(rawProject) {
    if (!rawProject || typeof rawProject !== "object" || Array.isArray(rawProject)) return rawProject;
    // Object spread creates own data properties, including `__proto__`, instead
    // of invoking Object.prototype's legacy setter. The project sanitizer can
    // therefore still see and reject every dangerous key after this copy.
    const copy = { ...rawProject };
    if (rawProject.exportMeta && typeof rawProject.exportMeta === "object" && !Array.isArray(rawProject.exportMeta)) {
      copy.exportMeta = { ...rawProject.exportMeta };
    }
    return copy;
  }

  function migrateProject(rawProject) {
    const project = copyProject(rawProject);
    const report = {
      migrationVersion: MIGRATION_VERSION,
      createdAt: new Date().toISOString(),
      status: "not-needed",
      migratedFields: [],
      retainedFields: [],
      unresolvedEntries: [],
      droppedEntries: [],
      backupStatus: "handled-by-caller"
    };

    if (!project || typeof project !== "object" || Array.isArray(project)) {
      report.status = "not-applicable";
      report.unresolvedEntries.push({ kind: "project-root", count: 1 });
      return { project, report };
    }

    if (LEGACY_DEFAULT_PROJECT_TITLES.has(String(project.title || ""))) {
      project.title = brand.defaults.projectTitle;
      report.migratedFields.push("title");
    } else if (Object.prototype.hasOwnProperty.call(project, "title")) {
      report.retainedFields.push("title");
    }

    if (project.exportMeta && typeof project.exportMeta === "object" && !Array.isArray(project.exportMeta)) {
      const filename = String(project.exportMeta.filenameSlug || "");
      if (LEGACY_DEFAULT_EXPORT_PREFIXES.has(filename)) {
        project.exportMeta.filenameSlug = brand.defaults.exportFilenamePrefix;
        report.migratedFields.push("exportMeta.filenameSlug");
      } else {
        report.retainedFields.push("exportMeta.filenameSlug");
      }
      report.retainedFields.push("exportMeta");
    }

    report.retainedFields = Array.from(new Set(report.retainedFields)).sort();
    if (report.migratedFields.length) report.status = "migrated";
    return { project, report };
  }

  return Object.freeze({
    MIGRATION_VERSION,
    migrateProject
  });
});
