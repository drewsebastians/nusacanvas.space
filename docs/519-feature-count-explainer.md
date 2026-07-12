# Why the map has 519 geometry features

This app uses a 2020 geoBoundaries/HDX COD-AB Indonesia ADM2 geometry snapshot.

The number 519 means: there are 519 map features in that selected geometry file.

It does not mean:

- Indonesia currently has exactly 519 autonomous kabupaten/kota;
- the geometry is the newest official legal boundary;
- all current province splits are represented as separate 2025 geometry buckets;
- every same-name map feature has been resolved to an official code.

The app separates:

- boundary snapshot: the geometry used for map drawing;
- administrative registry: versioned metadata used for names, stable IDs, and future migration.

When those sources disagree, the app keeps the disagreement visible instead of guessing.
