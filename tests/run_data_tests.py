import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "indonesia-adm2-simplified.geojson"
REGISTRY = ROOT / "data" / "indonesia-adm2-registry.csv"
PROVINCES = ROOT / "data" / "canonical-provinces-v1.csv"
CANONICAL_REGIONS = ROOT / "data" / "canonical-regions-v1.csv"
CROSSWALK = ROOT / "data" / "crosswalk-region-ids-v1.csv"
BOUNDARY_CROSSWALK = ROOT / "data" / "boundary-version-crosswalk-v1.json"
MANIFEST = ROOT / "data" / "registry-manifest-v1.json"
STABLE_ID_FIXTURES = ROOT / "data" / "stable-id-fixtures.json"
SAMPLE_CSV = ROOT / "sample" / "sample-region-colors.csv"
SAMPLE_PROJECT = ROOT / "sample" / "sample-project.json"


def walk_coords(geometry):
    if geometry["type"] == "Polygon":
        for ring in geometry["coordinates"]:
            for point in ring:
                yield point[0], point[1]
    elif geometry["type"] == "MultiPolygon":
        for polygon in geometry["coordinates"]:
            for ring in polygon:
                for point in ring:
                    yield point[0], point[1]


def main():
    failures = []
    geo = json.loads(DATA.read_text(encoding="utf-8"))
    features = geo.get("features", [])
    if geo.get("type") != "FeatureCollection":
        failures.append("GeoJSON is not a FeatureCollection")
    if len(features) != 519:
        failures.append(f"Expected 519 features, found {len(features)}")

    ids = [f["properties"].get("region_id") for f in features]
    duplicates = [key for key, value in Counter(ids).items() if value > 1]
    if duplicates:
        failures.append(f"Duplicate region IDs: {duplicates[:5]}")

    geometry_types = Counter((f.get("geometry") or {}).get("type") for f in features)
    unexpected = set(geometry_types) - {"Polygon", "MultiPolygon"}
    if unexpected:
        failures.append(f"Unexpected geometry types: {sorted(unexpected)}")

    for feature in features:
        props = feature["properties"]
        for field in ["region_id", "display_name", "geometry_source_name", "geometry_source_id", "match_status"]:
            if not props.get(field):
                failures.append(f"Missing {field} on {props.get('region_id')}")
                break
        geometry = feature.get("geometry")
        if not geometry:
            failures.append(f"Missing geometry on {props.get('region_id')}")
            continue
        coords = list(walk_coords(geometry))
        if not coords:
            failures.append(f"Empty coordinates on {props.get('region_id')}")
        if any(not (-180 <= x <= 180 and -90 <= y <= 90) for x, y in coords):
            failures.append(f"Out-of-range coordinate on {props.get('region_id')}")

    registry_rows = list(csv.DictReader(REGISTRY.open(encoding="utf-8")))
    if len(registry_rows) != len(features):
        failures.append("Registry row count does not match feature count")
    if set(row["internal_id"] for row in registry_rows) != set(ids):
        failures.append("Registry IDs do not match GeoJSON IDs")

    province_rows = list(csv.DictReader(PROVINCES.open(encoding="utf-8")))
    province_ids = [row["canonical_province_id"] for row in province_rows]
    if len(province_rows) != 38:
        failures.append(f"Expected exactly 38 canonical provinces, found {len(province_rows)}")
    if len(set(province_ids)) != len(province_ids):
        failures.append("Duplicate canonical province IDs")
    if any(row["status"] != "current" for row in province_rows):
        failures.append("Province registry v1 must contain current provinces only")
    if any(row["official_code_verified"] for row in province_rows):
        failures.append("Province official codes must stay blank until row-level source evidence is committed")

    canonical_rows = list(csv.DictReader(CANONICAL_REGIONS.open(encoding="utf-8")))
    canonical_ids = [row["canonical_region_id"] for row in canonical_rows]
    if len(canonical_rows) != len(features):
        failures.append("Canonical region registry row count does not match feature count")
    if len(set(canonical_ids)) != len(canonical_ids):
        failures.append("Duplicate canonical region IDs")
    if set(row["legacy_region_id"] for row in canonical_rows) != set(ids):
        failures.append("Canonical registry does not preserve every legacy region ID")
    orphan_provinces = sorted({
        row["current_province_id_verified"]
        for row in canonical_rows
        if row["current_province_id_verified"] and row["current_province_id_verified"] not in set(province_ids)
    })
    if orphan_provinces:
        failures.append(f"Canonical registry has orphan province references: {orphan_provinces[:5]}")

    ambiguous_rows = [row for row in canonical_rows if row["match_status"] == "ambiguous_name"]
    if len(ambiguous_rows) != 53:
        failures.append(f"Expected 53 explicit ambiguous metadata rows, found {len(ambiguous_rows)}")
    hidden_assignments = [
        row["legacy_region_id"]
        for row in ambiguous_rows
        if row["official_current_name_verified"] or row["current_province_id_verified"] or row["kemendagri_code_verified"]
    ]
    if hidden_assignments:
        failures.append(f"Ambiguous rows have silently assigned metadata: {hidden_assignments[:5]}")
    ambiguous_without_reason = [row["legacy_region_id"] for row in ambiguous_rows if not row["ambiguity_reason"]]
    if ambiguous_without_reason:
        failures.append(f"Ambiguous rows lack reasons: {ambiguous_without_reason[:5]}")
    official_code_without_evidence = [
        row["legacy_region_id"]
        for row in canonical_rows
        if row["kemendagri_code_verified"] and row["match_status"] == "ambiguous_name"
    ]
    if official_code_without_evidence:
        failures.append(f"Official codes assigned without evidence: {official_code_without_evidence[:5]}")

    crosswalk_rows = list(csv.DictReader(CROSSWALK.open(encoding="utf-8")))
    if len(crosswalk_rows) != len(features):
        failures.append("Crosswalk row count does not match feature count")
    if set(row["legacy_region_id"] for row in crosswalk_rows) != set(ids):
        failures.append("Crosswalk does not cover every production geometry feature")
    if set(row["canonical_region_id"] for row in crosswalk_rows) != set(canonical_ids):
        failures.append("Crosswalk canonical IDs do not match canonical region registry")
    crosswalk_status = Counter(row["mapping_status"] for row in crosswalk_rows)
    if crosswalk_status.get("ambiguous_metadata") != 53:
        failures.append("Crosswalk does not preserve 53 ambiguous metadata mappings")

    boundary_crosswalk = json.loads(BOUNDARY_CROSSWALK.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if boundary_crosswalk["boundaryVersion"] != manifest["boundaryVersion"]:
        failures.append("Boundary crosswalk and manifest boundary versions differ")
    if manifest["registryVersion"] != "IDN-ADM-REGISTRY-v1-2025-06-23":
        failures.append("Unexpected registry version in manifest")
    if manifest["counts"]["provinces"] != 38 or manifest["counts"]["canonicalRegions"] != 519:
        failures.append("Manifest counts do not reconcile")

    stable_fixtures = json.loads(STABLE_ID_FIXTURES.read_text(encoding="utf-8"))
    expected_fixture_statuses = {"mapped", "ambiguous_metadata", "historical_geometry_snapshot", "missing", "rejected"}
    actual_fixture_statuses = {case["expectedStatus"] for case in stable_fixtures["cases"]}
    if not expected_fixture_statuses.issubset(actual_fixture_statuses):
        failures.append("Stable ID fixtures do not cover required migration cases")

    sample_rows = list(csv.DictReader(SAMPLE_CSV.open(encoding="utf-8")))
    code_index = {row["official_code"] for row in registry_rows if row["official_code"]}
    missing_sample = [row["Official_Code"] for row in sample_rows if row["Official_Code"] not in code_index]
    if missing_sample:
        failures.append(f"Sample CSV codes do not match registry: {missing_sample}")

    project = json.loads(SAMPLE_PROJECT.read_text(encoding="utf-8"))
    unknown_project_ids = [key for key in project["highlights"] if key not in set(ids)]
    if unknown_project_ids:
        failures.append(f"Sample project contains unknown IDs: {unknown_project_ids}")

    if failures:
        print("FAILED")
        for failure in failures:
            print("-", failure)
        raise SystemExit(1)
    print("PASSED")
    print(f"features={len(features)} polygon={geometry_types['Polygon']} multipolygon={geometry_types['MultiPolygon']}")
    print(f"registry={len(registry_rows)} canonical_regions={len(canonical_rows)} provinces={len(province_rows)} sample_csv_rows={len(sample_rows)}")
    print(f"crosswalk={len(crosswalk_rows)} ambiguous={len(ambiguous_rows)}")


if __name__ == "__main__":
    main()

