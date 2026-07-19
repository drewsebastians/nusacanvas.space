/*
 * BoundaryProvider is deliberately independent from matching and project UI.
 * It describes a reviewed boundary snapshot and supplies only local artifacts.
 * New sources must be introduced through the documented build-time pipeline.
 */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NusaCanvasBoundaryProvider = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  const CURRENT_MANIFEST = deepFreeze({
    schemaVersion: "nusacanvas.boundary-provider-manifest.v1",
    providerId: "geoboundaries-hdx-idn-adm2-2020",
    providerVersion: "1.0.0",
    boundaryVersion: "IDN-ADM2-2020-geoboundaries-22746128",
    administrativeLevel: "ADM2",
    featureCount: 519,
    canonicalRegistryVersion: "IDN-ADM-REGISTRY-v1-2025-06-23",
    sourceVersion: "geoBoundaries-IDN-ADM2-22746128 + Kepmendagri-300.2.2-2138/2025 amended 300.2.2-2430/2025",
    createdAt: "2026-07-15",
    attribution: "Data: geoBoundaries/HDX COD-AB ADM2 snapshot 2020; 519 boundary features; registry metadata v1 2025. For visual reference only; not a legal boundary decision.",
    sourceRecords: [{
      id: "geoboundaries-hdx-idn-adm2-2020",
      title: "Indonesia ADM2 boundary snapshot",
      sourceUrl: "https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM2/",
      sourceBoundaryId: "IDN-ADM2-22746128",
      representedYear: "2020",
      licenseId: "CC-BY-3.0-IGO"
    }, {
      id: "kemendagri-registry-metadata-2025",
      title: "Administrative registry metadata",
      sourceUrl: "https://peraturan.bpk.go.id/Details/322942/keputusan-mendagri-no-nomor-30022-2138-tahun",
      representedYear: "2025",
      licenseId: "project-curation-with-official-reference-citations"
    }],
    licenseRecords: [{
      id: "CC-BY-3.0-IGO",
      name: "Creative Commons Attribution 3.0 Intergovernmental Organisations",
      useStatus: "approved_with_attribution",
      attributionRequired: true
    }, {
      id: "project-curation-with-official-reference-citations",
      name: "Project curation with official reference citations",
      useStatus: "approved_with_limitations",
      attributionRequired: true
    }],
    detailTiers: {
      lite: {
        artifact: "data/indonesia-adm2-simplified.geojson",
        sha256: "6d735512fb7cab04ac7ca6048aa41437eba4f53595b83d8da4f25c198ba01f91",
        featureCount: 519,
        startup: true,
        purpose: "National overview and normal interactive map"
      },
      standard: {
        artifact: "data/indonesia-adm2-simplified.geojson",
        sha256: "6d735512fb7cab04ac7ca6048aa41437eba4f53595b83d8da4f25c198ba01f91",
        featureCount: 519,
        startup: false,
        aliasOf: "lite",
        purpose: "Current approved normal interactive detail"
      },
      detailed: {
        artifact: "data/indonesia-adm2-detailed.geojson",
        sha256: "146653d488331086ddc43d159a261b01ea6dd08c7ed422e34a9886c3c690430c",
        featureCount: 519,
        startup: false,
        requiresExplicitRequest: true,
        purpose: "Approved full-detail export only"
      },
      provinceChunks: {
        indexArtifact: "data/indonesia-adm2-detailed-provinces-index.json",
        sha256: "1f21757fb607d37340441c56dc95d7b6d231efa45d87489bb33474262bdff68e",
        featureCount: 519,
        chunkCount: 35,
        startup: false,
        maxRuntimeCache: 3,
        purpose: "Visible or selected province detail overlays"
      }
    },
    crosswalk: {
      artifact: "data/boundary-version-crosswalk-v1.json",
      fromVersion: "IDN-ADM2-2020-geoboundaries-22746128",
      toVersion: "IDN-ADM2-2020-geoboundaries-22746128",
      status: "identity-current-snapshot",
      requiresReviewForOtherVersions: true
    },
    knownLimitations: [
      "This provider is a reviewed 2020 ADM2 geometry snapshot; it is not a statement of current legal administrative boundaries.",
      "Province registry references are reviewed metadata, and not a replacement for official legal attachments.",
      "A newer source requires explicit stable-ID crosswalk and project compatibility review before it can replace this provider."
    ]
  });

  function deepFreeze(value) {
    if (value && typeof value === "object" && !Object.isFrozen(value)) {
      Object.freeze(value);
      Object.values(value).forEach(deepFreeze);
    }
    return value;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function assertLocalArtifact(path) {
    if (typeof path !== "string" || !/^data\/[a-z0-9._/-]+$/i.test(path) || path.includes("..")) {
      throw new Error("Boundary provider metadata contains an unsafe artifact path.");
    }
  }

  function validateManifest(manifest) {
    const value = manifest || {};
    ["schemaVersion", "providerId", "providerVersion", "boundaryVersion", "administrativeLevel", "canonicalRegistryVersion", "sourceVersion", "createdAt", "attribution"].forEach((field) => {
      if (!value[field]) throw new Error(`Boundary provider metadata is missing ${field}.`);
    });
    if (value.administrativeLevel !== "ADM2" || Number(value.featureCount) !== 519) {
      throw new Error("Boundary provider metadata does not describe the approved ADM2 baseline.");
    }
    if (!Array.isArray(value.sourceRecords) || !value.sourceRecords.length || !Array.isArray(value.licenseRecords) || !value.licenseRecords.length) {
      throw new Error("Boundary provider metadata is missing traceable source or license records.");
    }
    ["lite", "standard", "detailed"].forEach((detail) => {
      const tier = value.detailTiers && value.detailTiers[detail];
      if (!tier || !tier.artifact || !/^[a-f0-9]{64}$/i.test(tier.sha256 || "")) {
        throw new Error(`Boundary provider metadata is missing a verified ${detail} artifact.`);
      }
      assertLocalArtifact(tier.artifact);
    });
    const chunks = value.detailTiers && value.detailTiers.provinceChunks;
    if (!chunks || !chunks.indexArtifact || !/^[a-f0-9]{64}$/i.test(chunks.sha256 || "") || Number(chunks.featureCount) !== 519 || Number(chunks.chunkCount) < 1) {
      throw new Error("Boundary provider metadata is missing verified province detail chunks.");
    }
    assertLocalArtifact(chunks.indexArtifact);
    if (!value.crosswalk || !value.crosswalk.artifact || !value.crosswalk.fromVersion || !value.crosswalk.toVersion) {
      throw new Error("Boundary provider metadata is missing its compatibility crosswalk.");
    }
    assertLocalArtifact(value.crosswalk.artifact);
    return true;
  }

  function runtimeBase() {
    const pathname = root && root.location && root.location.pathname || "";
    return pathname.startsWith("/workspace/") ? "../" : "./";
  }

  function artifactUrl(baseUrl, artifact) {
    const base = typeof baseUrl === "string" ? baseUrl : runtimeBase();
    if (/^(?:https?:|\/\/)/i.test(base)) throw new Error("Boundary provider does not permit a remote runtime source.");
    assertLocalArtifact(artifact);
    return `${base.replace(/\/?$/, "/")}${artifact}`;
  }

  function collectionIsValid(collection) {
    return collection && collection.type === "FeatureCollection" && Array.isArray(collection.features);
  }

  // Keep application-facing names stable even if a future source uses a
  // different property schema. Original properties remain available for
  // traceability; workflows only need these normalized registry fields.
  function normalizeFeature(feature) {
    const source = feature && feature.properties || {};
    const geometrySourceId = String(source.geometry_source_id || source.shapeID || source.shape_id || "").trim();
    // The approved detailed source uses shapeID rather than the application's
    // stable ID. Its lineage is explicitly known, so normalize it to the same
    // current stable-ID form before the merge/export code sees it.
    const regionId = String(source.region_id || source.stable_region_id || source.id || (geometrySourceId ? `gb-${geometrySourceId}` : "")).trim();
    if (!regionId) throw new Error("A boundary feature is missing its stable region ID.");
    const regionName = String(source.region_name || source.name || source.geometry_source_name || source.shapeName || "").trim();
    const provinceName = String(source.province_name || source.province || "").trim();
    const regionType = String(source.region_type || source.type_name || "").trim();
    const displayName = String(source.display_name || [regionType, regionName].filter(Boolean).join(" ") || regionName || regionId).trim();
    return Object.assign({}, feature, {
      properties: Object.assign({}, source, {
        region_id: regionId,
        geometry_source_id: geometrySourceId || source.geometry_source_id || "",
        region_name: regionName,
        province_name: provinceName,
        region_type: regionType,
        display_name: displayName
      })
    });
  }

  function normalizeCollection(collection) {
    const features = collection.features.map(normalizeFeature);
    if (new Set(features.map((feature) => feature.properties.region_id)).size !== CURRENT_MANIFEST.featureCount) {
      throw new Error("The local boundary artifact does not contain the expected unique stable region IDs.");
    }
    return Object.assign({}, collection, { features });
  }

  function normalizeProvinceCollection(collection) {
    const features = collection.features.map(normalizeFeature);
    if (!features.length || new Set(features.map((feature) => feature.properties.region_id)).size !== features.length) {
      throw new Error("The local province boundary artifact does not contain unique stable region IDs.");
    }
    const mesh = collection.mesh;
    if (!mesh || !Array.isArray(mesh.segments) || !mesh.stats) {
      throw new Error("The local province boundary artifact is missing its precomputed boundary mesh.");
    }
    return Object.assign({}, collection, { features });
  }

  async function sha256(text, cryptoImplementation) {
    if (!cryptoImplementation || !cryptoImplementation.subtle || typeof TextEncoder === "undefined") {
      throw new Error("Boundary integrity verification is not available in this browser.");
    }
    const digest = await cryptoImplementation.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function stableIds(project) {
    return Array.from(new Set([
      ...Object.keys(project && project.highlights || {}),
      ...Object.keys(project && project.manualHighlights || {}),
      ...Object.keys(project && project.unresolvedHighlights || {}),
      ...Object.keys(project && project.regionRefs || {})
    ].map(String))).sort();
  }

  function createCurrentBoundaryProvider(options = {}) {
    validateManifest(CURRENT_MANIFEST);
    const fetchImplementation = options.fetchImpl || root && root.fetch && root.fetch.bind(root);
    const cryptoImplementation = options.cryptoImpl || root && root.crypto;
    const baseUrl = options.baseUrl == null ? runtimeBase() : options.baseUrl;
    const verifyChecksums = options.verifyChecksums !== false;
    const collections = new Map();
    const provinceCollections = new Map();
    let provinceIndexPromise = null;

    function tierFor(detail) {
      const key = detail || "lite";
      if (!Object.prototype.hasOwnProperty.call(CURRENT_MANIFEST.detailTiers, key)) {
        throw new Error(`Boundary detail tier ${String(key)} is not available from this provider.`);
      }
      return { key, tier: CURRENT_MANIFEST.detailTiers[key] };
    }

    function layerFor(level, detail, provinceId) {
      if (level && level !== CURRENT_MANIFEST.administrativeLevel) {
        throw new Error(`Boundary provider supports ${CURRENT_MANIFEST.administrativeLevel}, not ${String(level)}.`);
      }
      const selected = tierFor(detail);
      const artifact = selected.tier.artifact;
      const url = artifactUrl(baseUrl, artifact);
      async function load(loadOptions = {}) {
        const cacheKey = `${selected.key}:${url}`;
        if (!collections.has(cacheKey)) {
          if (typeof fetchImplementation !== "function") throw new Error("Boundary provider cannot load local boundaries because fetch is unavailable.");
          collections.set(cacheKey, (async () => {
            const response = await fetchImplementation(url, { cache: "force-cache", signal: loadOptions.signal });
            if (!response || !response.ok) throw new Error(`The ${selected.key} boundary artifact could not be loaded. No spreadsheet data was sent.`);
            const text = await response.text();
            if (/^version https:\/\/git-lfs.github.com\/spec\/v1/.test(text.trim())) throw new Error("The local boundary artifact is unavailable. No spreadsheet data was sent.");
            if (verifyChecksums) {
              const actual = await sha256(text, cryptoImplementation);
              if (actual !== selected.tier.sha256) throw new Error("The local boundary artifact did not pass integrity verification. No spreadsheet data was sent.");
            }
            const collection = JSON.parse(text);
            if (!collectionIsValid(collection) || collection.features.length !== CURRENT_MANIFEST.featureCount) {
              throw new Error("The local boundary artifact is not a valid approved boundary collection.");
            }
            return normalizeCollection(collection);
          })());
        }
        const source = await collections.get(cacheKey);
        const selectedFeatures = provinceId == null ? source.features : source.features.filter((feature) => {
          const properties = feature && feature.properties || {};
          return [properties.province_id, properties.province_code, properties.province_name, properties.province].map(String).includes(String(provinceId));
        });
        return Object.assign({}, source, { features: selectedFeatures.map((feature) => Object.assign({}, feature, { properties: Object.assign({}, feature.properties) })) });
      }
      return Object.freeze({
        providerId: CURRENT_MANIFEST.providerId,
        boundaryVersion: CURRENT_MANIFEST.boundaryVersion,
        level: CURRENT_MANIFEST.administrativeLevel,
        detail: selected.key,
        artifact,
        url,
        lazy: !selected.tier.startup,
        load
      });
    }

    async function loadProvinceIndex(loadOptions = {}) {
      if (!provinceIndexPromise) {
        const tier = CURRENT_MANIFEST.detailTiers.provinceChunks;
        const url = artifactUrl(baseUrl, tier.indexArtifact);
        provinceIndexPromise = (async () => {
          if (typeof fetchImplementation !== "function") throw new Error("Boundary provider cannot load local province boundaries because fetch is unavailable.");
          const response = await fetchImplementation(url, { cache: "force-cache", signal: loadOptions.signal });
          if (!response || !response.ok) throw new Error("The province boundary index could not be loaded. No spreadsheet data was sent.");
          const text = await response.text();
          if (verifyChecksums && await sha256(text, cryptoImplementation) !== tier.sha256) throw new Error("The province boundary index did not pass integrity verification. No spreadsheet data was sent.");
          const index = JSON.parse(text);
          if (!index || Number(index.featureCount) !== 519 || Number(index.chunkCount) !== tier.chunkCount || !Array.isArray(index.chunks)) {
            throw new Error("The province boundary index is not a valid approved artifact.");
          }
          index.chunks.forEach((entry) => {
            if (!entry || !entry.provinceCode || !entry.artifact || !/^[a-f0-9]{64}$/i.test(entry.sha256 || "")) throw new Error("The province boundary index contains an invalid chunk.");
            assertLocalArtifact(entry.artifact);
          });
          return index;
        })().catch((error) => {
          provinceIndexPromise = null;
          throw error;
        });
      }
      return provinceIndexPromise;
    }

    async function loadProvinceChunk(entry, loadOptions = {}) {
      const cached = provinceCollections.get(entry.artifact);
      if (cached) {
        provinceCollections.delete(entry.artifact);
        provinceCollections.set(entry.artifact, cached);
        return cached;
      }
      const url = artifactUrl(baseUrl, entry.artifact);
      const promise = (async () => {
        const response = await fetchImplementation(url, { cache: "force-cache", signal: loadOptions.signal });
        if (!response || !response.ok) throw new Error("The selected province boundary artifact could not be loaded. No spreadsheet data was sent.");
        const text = await response.text();
        if (verifyChecksums && await sha256(text, cryptoImplementation) !== entry.sha256) throw new Error("The selected province boundary artifact did not pass integrity verification. No spreadsheet data was sent.");
        const collection = JSON.parse(text);
        if (!collectionIsValid(collection) || Number(entry.featureCount) !== collection.features.length) throw new Error("The selected province boundary artifact is not valid.");
        return normalizeProvinceCollection(collection);
      })();
      provinceCollections.set(entry.artifact, promise);
      while (provinceCollections.size > CURRENT_MANIFEST.detailTiers.provinceChunks.maxRuntimeCache) provinceCollections.delete(provinceCollections.keys().next().value);
      try {
        return await promise;
      } catch (error) {
        if (provinceCollections.get(entry.artifact) === promise) provinceCollections.delete(entry.artifact);
        throw error;
      }
    }

    function provinceLayerFor(provinceId, level, detail) {
      if (level && level !== CURRENT_MANIFEST.administrativeLevel) throw new Error(`Boundary provider supports ${CURRENT_MANIFEST.administrativeLevel}, not ${String(level)}.`);
      if (detail && detail !== "detailed") throw new Error("Province boundary layers are available only from the approved detailed tier.");
      if (provinceId == null || provinceId === "") throw new Error("A province ID is required to request a province boundary layer.");
      async function load(loadOptions = {}) {
        const index = await loadProvinceIndex(loadOptions);
        const expected = String(provinceId);
        const entry = index.chunks.find((chunk) => String(chunk.provinceCode) === expected || String(chunk.provinceName) === expected);
        if (!entry) throw new Error("The requested province boundary chunk is not available from the approved provider.");
        return loadProvinceChunk(entry, loadOptions);
      }
      return Object.freeze({
        providerId: CURRENT_MANIFEST.providerId,
        boundaryVersion: CURRENT_MANIFEST.boundaryVersion,
        level: CURRENT_MANIFEST.administrativeLevel,
        detail: "detailed",
        artifact: CURRENT_MANIFEST.detailTiers.provinceChunks.indexArtifact,
        url: artifactUrl(baseUrl, CURRENT_MANIFEST.detailTiers.provinceChunks.indexArtifact),
        lazy: true,
        load
      });
    }

    function validateProjectCompatibility(project) {
      const sourceProviderId = String(project && project.boundaryProviderId || "");
      const sourceBoundaryVersion = String(project && project.boundaryVersion || "");
      const affectedStableRegionIds = stableIds(project);
      let status = "compatible";
      let reason = "This project uses the active boundary version.";
      let requiresUserReview = false;
      if (!sourceProviderId && sourceBoundaryVersion === CURRENT_MANIFEST.boundaryVersion) {
        status = "legacy-compatible";
        reason = "This older project predates provider IDs but pins the active boundary version.";
      } else if (!sourceProviderId && !sourceBoundaryVersion) {
        status = "legacy-unpinned";
        reason = "This legacy project has no boundary version. It remains compatible with the active provider, but must be reviewed before any provider change.";
      } else if (sourceProviderId !== CURRENT_MANIFEST.providerId || sourceBoundaryVersion !== CURRENT_MANIFEST.boundaryVersion) {
        status = "review-required";
        reason = "This project is pinned to an unknown or different boundary provider/version. Region IDs were not reinterpreted.";
        requiresUserReview = true;
      }
      return Object.freeze({
        compatible: !requiresUserReview,
        requiresUserReview,
        status,
        reason,
        source: { providerId: sourceProviderId || null, boundaryVersion: sourceBoundaryVersion || null },
        target: { providerId: CURRENT_MANIFEST.providerId, boundaryVersion: CURRENT_MANIFEST.boundaryVersion },
        affectedStableRegionIds,
        crosswalkRequired: requiresUserReview
      });
    }

    return Object.freeze({
      getManifest: () => clone(CURRENT_MANIFEST),
      getNationalLayer: (level = "ADM2", detail = "lite") => layerFor(level, detail),
      getProvinceLayer: (provinceId, level = "ADM2", detail = "detailed") => provinceLayerFor(provinceId, level, detail),
      getFeatureByStableId: async (stableId, detail = "standard") => {
        const collection = await layerFor("ADM2", detail).load();
        return collection.features.find((feature) => String(feature && feature.properties && feature.properties.region_id || "") === String(stableId)) || null;
      },
      getVersion: () => CURRENT_MANIFEST.boundaryVersion,
      getAttribution: () => CURRENT_MANIFEST.attribution,
      getLicenseInfo: () => clone(CURRENT_MANIFEST.licenseRecords),
      getCrosswalk: (fromVersion, toVersion) => {
        if (fromVersion === CURRENT_MANIFEST.boundaryVersion && toVersion === CURRENT_MANIFEST.boundaryVersion) return clone(CURRENT_MANIFEST.crosswalk);
        return { status: "unavailable", fromVersion: fromVersion || null, toVersion: toVersion || null, requiresReview: true, artifact: CURRENT_MANIFEST.crosswalk.artifact };
      },
      validateProjectCompatibility
    });
  }

  validateManifest(CURRENT_MANIFEST);
  return Object.freeze({ CURRENT_MANIFEST, createCurrentBoundaryProvider, validateManifest, current: createCurrentBoundaryProvider() });
});
