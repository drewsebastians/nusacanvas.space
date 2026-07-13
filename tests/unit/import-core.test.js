const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ImportCore = require("../../assets/js/import-core.js");

function fixture(name) {
  return fs.readFileSync(path.resolve(__dirname, "..", "fixtures", "batch-2", "import", name), "utf8");
}

test("detects and parses paste, comma CSV, semicolon CSV, and TSV", () => {
  const paste = ImportCore.parseTabularInput({ text: fixture("paste-two-column.tsv"), sourceType: "paste" });
  assert.equal(paste.importedSource.detected.delimiter, "tab");
  assert.equal(paste.importedSource.counts.rows, 3);
  assert.equal(paste.mapping.roles.regionName, "wilayah");
  assert.equal(paste.mapping.roles.numericValue, "nilai");

  const comma = ImportCore.parseTabularInput({ text: fixture("comma.csv"), sourceType: "csv" });
  assert.equal(comma.importedSource.detected.delimiter, "comma");
  assert.equal(comma.mapping.roles.period, "period");

  const semicolon = ImportCore.parseTabularInput({ text: fixture("semicolon.csv"), sourceType: "csv" });
  assert.equal(semicolon.importedSource.detected.delimiter, "semicolon");
  assert.equal(semicolon.mapping.roles.province, "provinsi");

  const tab = ImportCore.parseTabularInput({ text: fixture("tab.tsv"), sourceType: "tsv" });
  assert.equal(tab.importedSource.detected.delimiter, "tab");
  assert.equal(tab.mapping.roles.numericValue, "persen");
});

test("supports quoted delimiters, quoted newlines, escaped quotes, BOM, and trailing empty cells", () => {
  const text = "\uFEFFregion,province,value,note\n\"Kota, Surabaya\",Jawa Timur,\"12\",\"line one\nline two\"\n\"A \"\"quoted\"\" name\",X,,";
  const parsed = ImportCore.parseTabularInput({ text, sourceType: "csv" });
  assert.equal(parsed.importedSource.detected.encoding, "utf-8-bom");
  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].cells.region, "Kota, Surabaya");
  assert.match(parsed.rows[0].cells.note, /line two/);
  assert.equal(parsed.rows[1].cells.region, 'A "quoted" name');
  assert.equal(parsed.rows[1].cells.value, "");
});

test("keeps blank, zero, invalid, ambiguous, negative, accounting, and percentage values distinct", () => {
  assert.deepEqual(ImportCore.parseLocaleNumber("").kind, "blank");
  assert.equal(ImportCore.parseLocaleNumber("0").value, 0);
  assert.equal(ImportCore.parseLocaleNumber("1.234.567,89").value, 1234567.89);
  assert.equal(ImportCore.parseLocaleNumber("1,234,567.89").value, 1234567.89);
  assert.equal(ImportCore.parseLocaleNumber("12,5%").value, 0.125);
  assert.equal(ImportCore.parseLocaleNumber("-3.2").value, -3.2);
  assert.equal(ImportCore.parseLocaleNumber("(1234.50)", { locale: "en-US" }).value, -1234.5);
  assert.equal(ImportCore.parseLocaleNumber("1,234").kind, "ambiguous");
  assert.equal(ImportCore.parseLocaleNumber("abc").kind, "invalid");
  assert.equal(ImportCore.parseLocaleNumber("=1+1").kind, "invalid");
});

test("enforces input limits before expensive import work", () => {
  assert.throws(() => ImportCore.parseTabularInput({
    text: "a,b\n1,2\n3,4",
    budget: { maxTextBytes: 5 }
  }), /ukuran/);
  assert.throws(() => ImportCore.parseTabularInput({
    text: "a,b\n" + "x,y\n".repeat(4),
    budget: { maxRows: 2, maxTextBytes: 1000, maxColumns: 50, maxCells: 100, maxSingleCellLength: 2000 }
  }), /baris/);
  assert.throws(() => ImportCore.parseTabularInput({
    text: "a\n" + "x".repeat(2001),
    budget: { maxSingleCellLength: 20, maxTextBytes: 10000, maxRows: 10, maxColumns: 10, maxCells: 100 }
  }), /panjang/);
});

test("redacts downloadable CSV formula prefixes", () => {
  assert.equal(ImportCore.escapeFormula("=1+1"), "'=1+1");
  assert.equal(ImportCore.escapeFormula("+SUM(A1:A2)"), "'+SUM(A1:A2)");
  assert.equal(ImportCore.escapeFormula("-2"), "'-2");
  assert.equal(ImportCore.escapeFormula("@cmd"), "'@cmd");
  assert.equal(ImportCore.escapeFormula("plain"), "plain");
});
