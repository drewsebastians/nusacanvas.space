const assert = require("node:assert/strict");
const test = require("node:test");
const zlib = require("node:zlib");
const ImportCore = require("../../assets/js/import-core.js");

global.ImportCore = ImportCore;
const XlsxImport = require("../../assets/js/xlsx-import.js");

const encoder = new TextEncoder();
const parserStub = async () => [
  {
    sheet: "Data",
    data: [
      ["wilayah", "nilai", "kategori"],
      ["Kota Surabaya", 125, "A"],
      ["Kota Denpasar", 0, "B"],
      ["Kabupaten Badung", 2, "cached"]
    ]
  },
  {
    sheet: "Cadangan",
    data: [
      ["wilayah", "nilai"],
      ["Kota Denpasar", 77]
    ]
  }
];

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0);
  return buffer;
}

function makeZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach((file) => {
    const name = encoder.encode(file.name);
    const raw = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const body = file.store ? Buffer.from(raw) : zlib.deflateRawSync(Buffer.from(raw));
    const method = file.store ? 0 : 8;
    const crc = crc32(raw);
    const local = Buffer.concat([
      u32(0x04034b50), u16(20), u16(0), u16(method), u16(0), u16(0), u32(crc),
      u32(body.length), u32(raw.length), u16(name.length), u16(0), Buffer.from(name), body
    ]);
    const central = Buffer.concat([
      u32(0x02014b50), u16(20), u16(20), u16(0), u16(method), u16(0), u16(0), u32(crc),
      u32(body.length), u32(raw.length), u16(name.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset), Buffer.from(name)
    ]);
    localParts.push(local);
    centralParts.push(central);
    offset += local.length;
  });
  const central = Buffer.concat(centralParts);
  const end = Buffer.concat([
    u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length),
    u32(central.length), u32(offset), u16(0)
  ]);
  const zip = Buffer.concat([...localParts, central, end]);
  return zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength);
}

function xlsxXmlFiles(extraFiles = []) {
  return [
    {
      name: "[Content_Types].xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`
    },
    {
      name: "_rels/.rels",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`
    },
    {
      name: "xl/workbook.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Data" sheetId="1" r:id="rId1"/>
    <sheet name="Cadangan" sheetId="2" r:id="rId2"/>
  </sheets>
</workbook>`
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
</Relationships>`
    },
    {
      name: "xl/worksheets/sheet1.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:C4"/>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>wilayah</t></is></c><c r="B1" t="inlineStr"><is><t>nilai</t></is></c><c r="C1" t="inlineStr"><is><t>kategori</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Kota Surabaya</t></is></c><c r="B2"><v>125</v></c><c r="C2" t="inlineStr"><is><t>A</t></is></c></row>
    <row r="3"><c r="A3" t="inlineStr"><is><t>Kota Denpasar</t></is></c><c r="B3"><v>0</v></c><c r="C3" t="inlineStr"><is><t>B</t></is></c></row>
    <row r="4"><c r="A4" t="inlineStr"><is><t>Kabupaten Badung</t></is></c><c r="B4"><f>1+1</f><v>2</v></c><c r="C4" t="inlineStr"><is><t>cached</t></is></c></row>
  </sheetData>
</worksheet>`
    },
    {
      name: "xl/worksheets/sheet2.xml",
      content: `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:B2"/>
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>wilayah</t></is></c><c r="B1" t="inlineStr"><is><t>nilai</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>Kota Denpasar</t></is></c><c r="B2"><v>77</v></c></row>
  </sheetData>
</worksheet>`
    },
    ...extraFiles
  ];
}

function fileFromArrayBuffer(name, buffer) {
  return {
    name,
    size: buffer.byteLength,
    arrayBuffer: async () => buffer
  };
}

test("parseFile reads a valid XLSX into the shared tabular contract", async () => {
  const buffer = makeZip(xlsxXmlFiles());
  const result = await XlsxImport.parseFile(fileFromArrayBuffer("contoh.xlsx", buffer), { parser: parserStub });
  assert.equal(result.contractVersion, "batch2.xlsxWorkbook.v1");
  assert.equal(result.parsed.importedSource.sourceType, "xlsx");
  assert.equal(result.parsed.importedSource.sheetName, "Data");
  assert.deepEqual(result.parsed.headers, ["wilayah", "nilai", "kategori"]);
  assert.equal(result.parsed.rows[2].cells.nilai, "2");
});

test("parseFile supports deterministic sheet selection", async () => {
  const buffer = makeZip(xlsxXmlFiles());
  const result = await XlsxImport.parseFile(fileFromArrayBuffer("contoh.xlsx", buffer), {
    parser: parserStub,
    sheetName: "Cadangan"
  });
  assert.equal(result.selectedSheetName, "Cadangan");
  assert.equal(result.parsed.rows[0].cells.wilayah, "Kota Denpasar");
  assert.equal(result.parsed.rows[0].cells.nilai, "77");
});

test("inspectZip rejects macro-bearing workbooks before parser handoff", () => {
  const buffer = makeZip(xlsxXmlFiles([{ name: "xl/vbaProject.bin", content: "macro" }]));
  assert.throws(() => XlsxImport.inspectZip(buffer), /tidak didukung/i);
});

test("parseFile rejects unsupported workbook extensions", async () => {
  const buffer = makeZip(xlsxXmlFiles());
  await assert.rejects(
    () => XlsxImport.parseFile(fileFromArrayBuffer("contoh.xlsm", buffer), { parser: parserStub }),
    /Gunakan \.xlsx/
  );
});

test("inspectZip rejects malformed archives", () => {
  const buffer = encoder.encode("not an xlsx").buffer;
  assert.throws(() => XlsxImport.inspectZip(buffer), /terlalu kecil|bukan ZIP/i);
});
