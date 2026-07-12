const fs = require("node:fs");
const crypto = require("node:crypto");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const ACCESS_DATE = "2026-07-12";
const BOUNDARY_VERSION = "IDN-ADM2-2020-geoboundaries-22746128";
const REGISTRY_VERSION = "IDN-ADM-REGISTRY-v1-2025-06-23";
const METADATA_SOURCE_VERSION = "Kepmendagri-300.2.2-2138-2025-as-amended-by-300.2.2-2430-2025";

const provinceRows = [
  ["idn-prov-11-aceh", "Aceh", "aceh", "Nanggroe Aceh Darussalam|Daerah Istimewa Aceh", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-12-sumatera-utara", "Sumatera Utara", "sumatera utara", "Sumut|North Sumatra", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-13-sumatera-barat", "Sumatera Barat", "sumatera barat", "Sumbar|West Sumatra", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-14-riau", "Riau", "riau", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-15-jambi", "Jambi", "jambi", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-16-sumatera-selatan", "Sumatera Selatan", "sumatera selatan", "Sumsel|South Sumatra", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-17-bengkulu", "Bengkulu", "bengkulu", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-18-lampung", "Lampung", "lampung", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-19-kepulauan-bangka-belitung", "Kepulauan Bangka Belitung", "kepulauan bangka belitung", "Bangka Belitung|Babel", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-21-kepulauan-riau", "Kepulauan Riau", "kepulauan riau", "Kepri|Riau Islands", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-31-dki-jakarta", "DKI Jakarta", "dki jakarta", "Daerah Khusus Ibukota Jakarta|Jakarta", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-32-jawa-barat", "Jawa Barat", "jawa barat", "Jabar|West Java", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-33-jawa-tengah", "Jawa Tengah", "jawa tengah", "Jateng|Central Java", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-34-di-yogyakarta", "DI Yogyakarta", "di yogyakarta", "Daerah Istimewa Yogyakarta|Yogyakarta|DIY", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-35-jawa-timur", "Jawa Timur", "jawa timur", "Jatim|East Java", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-36-banten", "Banten", "banten", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-51-bali", "Bali", "bali", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-52-nusa-tenggara-barat", "Nusa Tenggara Barat", "nusa tenggara barat", "NTB|West Nusa Tenggara", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-53-nusa-tenggara-timur", "Nusa Tenggara Timur", "nusa tenggara timur", "NTT|East Nusa Tenggara", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-61-kalimantan-barat", "Kalimantan Barat", "kalimantan barat", "Kalbar|West Kalimantan", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-62-kalimantan-tengah", "Kalimantan Tengah", "kalimantan tengah", "Kalteng|Central Kalimantan", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-63-kalimantan-selatan", "Kalimantan Selatan", "kalimantan selatan", "Kalsel|South Kalimantan", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-64-kalimantan-timur", "Kalimantan Timur", "kalimantan timur", "Kaltim|East Kalimantan", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-65-kalimantan-utara", "Kalimantan Utara", "kalimantan utara", "Kaltara|North Kalimantan", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-71-sulawesi-utara", "Sulawesi Utara", "sulawesi utara", "Sulut|North Sulawesi", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-72-sulawesi-tengah", "Sulawesi Tengah", "sulawesi tengah", "Sulteng|Central Sulawesi", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-73-sulawesi-selatan", "Sulawesi Selatan", "sulawesi selatan", "Sulsel|South Sulawesi", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-74-sulawesi-tenggara", "Sulawesi Tenggara", "sulawesi tenggara", "Sultra|Southeast Sulawesi", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-75-gorontalo", "Gorontalo", "gorontalo", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-76-sulawesi-barat", "Sulawesi Barat", "sulawesi barat", "Sulbar|West Sulawesi", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-81-maluku", "Maluku", "maluku", "", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-82-maluku-utara", "Maluku Utara", "maluku utara", "Malut|North Maluku", "", "2025-04-25", "", "current", "active in 2025 Kemendagri metadata; official code retained blank until lampiran row audit is recorded"],
  ["idn-prov-91-papua-barat", "Papua Barat", "papua barat", "West Papua", "", "2025-04-25", "", "current", "current province registry includes Papua-region split; 2020 geometry remains old snapshot metadata"],
  ["idn-prov-92-papua-barat-daya", "Papua Barat Daya", "papua barat daya", "Southwest Papua", "", "2025-04-25", "", "current", "current province with no direct 2020 geometry province bucket"],
  ["idn-prov-93-papua-selatan", "Papua Selatan", "papua selatan", "South Papua", "", "2025-04-25", "", "current", "current province with no direct 2020 geometry province bucket"],
  ["idn-prov-94-papua", "Papua", "papua", "", "", "2025-04-25", "", "current", "current province registry includes Papua-region split; 2020 geometry remains old snapshot metadata"],
  ["idn-prov-95-papua-tengah", "Papua Tengah", "papua tengah", "Central Papua", "", "2025-04-25", "", "current", "current province with no direct 2020 geometry province bucket"],
  ["idn-prov-96-papua-pegunungan", "Papua Pegunungan", "papua pegunungan", "Highland Papua|Papua Highlands", "", "2025-04-25", "", "current", "current province with no direct 2020 geometry province bucket"]
];

const provinceAliases = new Map();
for (const row of provinceRows) {
  provinceAliases.set(normalizeName(row[1]), row[0]);
  for (const alias of row[3].split("|").filter(Boolean)) {
    provinceAliases.set(normalizeName(alias), row[0]);
  }
}
provinceAliases.set(normalizeName("Daerah Istimewa Yogyakarta"), "idn-prov-34-di-yogyakarta");
provinceAliases.set(normalizeName("Dki Jakarta"), "idn-prov-31-dki-jakarta");

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(headers, rows) {
  return `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")).join("\n")}\n`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift();
  return rows.filter((item) => item.length === headers.length).map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index]])));
}

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, filename))).digest("hex");
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(daerah|provinsi|province)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalRegionId(row) {
  return `idn-adm2-gb-${row.geometry_source_id.toLowerCase()}`;
}

function writeProvinceRegistry() {
  const headers = [
    "canonical_province_id",
    "official_display_name",
    "normalized_name",
    "aliases_legacy_names",
    "official_code_verified",
    "valid_from",
    "valid_to",
    "status",
    "source_version",
    "source_url",
    "source_access_date",
    "notes"
  ];
  const rows = provinceRows.map((row) => ({
    canonical_province_id: row[0],
    official_display_name: row[1],
    normalized_name: row[2],
    aliases_legacy_names: row[3],
    official_code_verified: row[4],
    valid_from: row[5],
    valid_to: row[6],
    status: row[7],
    source_version: METADATA_SOURCE_VERSION,
    source_url: "https://peraturan.bpk.go.id/Details/322942/keputusan-mendagri-no-nomor-30022-2138-tahun; https://peraturan.bpk.go.id/Details/322912/keputusan-mendagri-no-30022-2430-tahun-2025",
    source_access_date: ACCESS_DATE,
    notes: row[8]
  }));
  fs.writeFileSync(path.join(DATA_DIR, "canonical-provinces-v1.csv"), toCsv(headers, rows));
}

function writeRegionRegistry() {
  const oldRows = parseCsv(fs.readFileSync(path.join(DATA_DIR, "indonesia-adm2-registry.csv"), "utf8"));
  const headers = [
    "canonical_region_id",
    "geometry_feature_id",
    "legacy_region_id",
    "geometry_source_id",
    "geometry_source_name",
    "geometry_snapshot_name",
    "official_current_name_verified",
    "region_type",
    "current_province_id_verified",
    "geometry_snapshot_province",
    "kemendagri_code_verified",
    "bps_code_verified",
    "aliases",
    "valid_from",
    "valid_to",
    "status",
    "match_status",
    "ambiguity_reason",
    "geometry_boundary_version",
    "metadata_source_version",
    "source_access_date",
    "notes"
  ];
  const rows = oldRows.map((row) => {
    const ambiguous = row.match_status === "ambiguous_name";
    return {
      canonical_region_id: canonicalRegionId(row),
      geometry_feature_id: row.internal_id,
      legacy_region_id: row.internal_id,
      geometry_source_id: row.geometry_source_id,
      geometry_source_name: row.geometry_source_name,
      geometry_snapshot_name: row.display_name || row.geometry_source_name,
      official_current_name_verified: "",
      region_type: ambiguous ? "unresolved" : row.region_type,
      current_province_id_verified: "",
      geometry_snapshot_province: row.province_name,
      kemendagri_code_verified: "",
      bps_code_verified: "",
      aliases: row.alternative_names,
      valid_from: ambiguous ? "" : "2020-01-01",
      valid_to: "",
      status: ambiguous ? "ambiguous_metadata_unresolved" : "geometry_snapshot_metadata_only",
      match_status: row.match_status,
      ambiguity_reason: ambiguous ? (row.notes || "Same display name has multiple administrative candidates; no automatic assignment.") : "",
      geometry_boundary_version: BOUNDARY_VERSION,
      metadata_source_version: ambiguous ? "HDX-COD-AB-2020-candidates-unresolved" : "HDX-COD-AB-2020-geometry-metadata",
      source_access_date: ACCESS_DATE,
      notes: ambiguous
        ? "Do not assign official code/name/province without row-level evidence."
        : "Metadata values are retained as 2020 geometry-snapshot metadata only; current official name/province/code fields stay blank until row-level evidence is committed."
    };
  });
  fs.writeFileSync(path.join(DATA_DIR, "canonical-regions-v1.csv"), toCsv(headers, rows));
  return { oldRows, rows };
}

function writeCrosswalk(oldRows) {
  const headers = [
    "legacy_region_id",
    "canonical_region_id",
    "geometry_feature_id",
    "mapping_status",
    "boundary_version_from",
    "boundary_version_to",
    "requires_user_review",
    "notes"
  ];
  const rows = oldRows.map((row) => ({
    legacy_region_id: row.internal_id,
    canonical_region_id: canonicalRegionId(row),
    geometry_feature_id: row.internal_id,
    mapping_status: row.match_status === "ambiguous_name" ? "ambiguous_metadata" : "remapped_to_canonical_id",
    boundary_version_from: "IDN-ADM2-2020-CODAB-geoboundaries",
    boundary_version_to: BOUNDARY_VERSION,
    requires_user_review: row.match_status === "ambiguous_name" ? "yes" : "no",
    notes: row.match_status === "ambiguous_name"
      ? "Geometry feature remains usable by legacy geometry ID, but official metadata is unresolved."
      : "Adapter maps legacy geometry ID to canonical stable ID; geometry ID is unchanged in GeoJSON for compatibility."
  }));
  fs.writeFileSync(path.join(DATA_DIR, "crosswalk-region-ids-v1.csv"), toCsv(headers, rows));
  const summary = rows.reduce((acc, row) => {
    acc[row.mapping_status] = (acc[row.mapping_status] || 0) + 1;
    return acc;
  }, {});
  return { rows, summary };
}

function writeBoundaryCrosswalk() {
  const payload = {
    schemaVersion: "1.0",
    boundaryVersion: BOUNDARY_VERSION,
    createdAt: ACCESS_DATE,
    purpose: "Forward-compatible structure for future exact-boundary migrations. The 2020 geometry is not renamed in-place.",
    versions: [
      {
        boundaryVersion: BOUNDARY_VERSION,
        sourceBoundaryId: "IDN-ADM2-22746128",
        representedYear: "2020",
        featureCount: 519,
        status: "active_historical_snapshot",
        compatibility: "legacy geometry feature IDs retained"
      }
    ],
    futureMigrationRules: [
      "A newer boundary artifact must pass license, topology, feature reconciliation, and project migration review before use.",
      "Display-name changes alone must not change canonical IDs.",
      "Split, merge, and retirement events require explicit crosswalk rows and user-visible migration reports.",
      "Unresolved regions must remain unresolved instead of being fuzzy matched silently."
    ],
    mappings: []
  };
  fs.writeFileSync(path.join(DATA_DIR, "boundary-version-crosswalk-v1.json"), `${JSON.stringify(payload, null, 2)}\n`);
}

function writeManifest(counts) {
  const files = [
    "data/indonesia-adm2-simplified.geojson",
    "data/indonesia-adm2-detailed.geojson",
    "data/indonesia-adm2-registry.csv",
    "data/canonical-provinces-v1.csv",
    "data/canonical-regions-v1.csv",
    "data/crosswalk-region-ids-v1.csv",
    "data/boundary-version-crosswalk-v1.json"
  ];
  const manifest = {
    schemaVersion: "1.0",
    registryVersion: REGISTRY_VERSION,
    boundaryVersion: BOUNDARY_VERSION,
    sourceVersion: METADATA_SOURCE_VERSION,
    accessDate: ACCESS_DATE,
    counts,
    productionGeometry: {
      artifact: "data/indonesia-adm2-simplified.geojson",
      detailedArtifact: "data/indonesia-adm2-detailed.geojson",
      boundaryId: "IDN-ADM2-22746128",
      representedYear: "2020",
      featureCount: 519,
      sourceUrl: "https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM2/",
      license: "Creative Commons Attribution 3.0 Intergovernmental Organisations (CC BY 3.0 IGO)",
      licenseStatus: "redistribution and modification considered acceptable with attribution based on source metadata; not legal advice"
    },
    administrativeMetadata: {
      source: "Kementerian Dalam Negeri / JDIH via BPK metadata pages",
      sourceUrls: [
        "https://peraturan.bpk.go.id/Details/322942/keputusan-mendagri-no-nomor-30022-2138-tahun",
        "https://peraturan.bpk.go.id/Details/322912/keputusan-mendagri-no-30022-2430-tahun-2025"
      ],
      licenseStatus: "metadata used for citation/versioning; official attachments are not redistributed by this app",
      limitation: "Province registry is current v1 scaffolding; province official codes stay blank until row-level lampiran audit is committed."
    },
    fileHashesSha256: Object.fromEntries(files.map((file) => [file, sha256(file)]))
  };
  fs.writeFileSync(path.join(DATA_DIR, "registry-manifest-v1.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function writeFixtures(regionRows) {
  const first = regionRows.find((row) => row.match_status !== "ambiguous_name");
  const ambiguous = regionRows.find((row) => row.match_status === "ambiguous_name");
  const fixture = {
    schemaVersion: "1.0",
    registryVersion: REGISTRY_VERSION,
    boundaryVersion: BOUNDARY_VERSION,
    cases: [
      {
        name: "unchanged geometry ID adapter",
        legacyRegionId: first.legacy_region_id,
        canonicalRegionId: first.canonical_region_id,
        expectedStatus: "mapped"
      },
      {
        name: "renamed display value keeps stable ID",
        legacyRegionId: first.legacy_region_id,
        alternateDisplayName: `${first.geometry_snapshot_name} (label changed)`,
        canonicalRegionId: first.canonical_region_id,
        expectedStatus: "mapped"
      },
      {
        name: "new province administrative mapping on old geometry",
        legacyProvinceName: "Papua",
        canonicalProvinceIdsRepresentedInRegistry: ["idn-prov-94-papua", "idn-prov-93-papua-selatan", "idn-prov-95-papua-tengah", "idn-prov-96-papua-pegunungan"],
        expectedStatus: "historical_geometry_snapshot"
      },
      {
        name: "ambiguous region stays reviewable",
        legacyRegionId: ambiguous.legacy_region_id,
        canonicalRegionId: ambiguous.canonical_region_id,
        expectedStatus: "ambiguous_metadata"
      },
      {
        name: "deprecated legacy ID",
        legacyRegionId: "gb-deprecated-example",
        canonicalRegionId: "",
        expectedStatus: "missing"
      },
      {
        name: "unsupported version",
        schemaVersion: "9.9",
        expectedStatus: "rejected"
      }
    ]
  };
  fs.writeFileSync(path.join(DATA_DIR, "stable-id-fixtures.json"), `${JSON.stringify(fixture, null, 2)}\n`);
}

function main() {
  writeProvinceRegistry();
  const { oldRows, rows: regionRows } = writeRegionRegistry();
  const crosswalk = writeCrosswalk(oldRows);
  writeBoundaryCrosswalk();
  writeFixtures(regionRows);
  const counts = {
    provinces: provinceRows.length,
    canonicalRegions: regionRows.length,
    geometryFeatures: oldRows.length,
    matchedUniqueName: oldRows.filter((row) => row.match_status === "matched_unique_name").length,
    ambiguousMetadata: oldRows.filter((row) => row.match_status === "ambiguous_name").length,
    crosswalk: crosswalk.rows.length,
    crosswalkStatus: crosswalk.summary
  };
  writeManifest(counts);
  console.log(JSON.stringify(counts, null, 2));
}

main();
