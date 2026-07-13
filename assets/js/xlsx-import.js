(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.XlsxImport = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const DEFAULT_BUDGET = {
    maxXlsxCompressedBytes: 2097152,
    maxXlsxEstimatedUncompressedBytes: 12582912,
    maxZipEntries: 256,
    maxRows: 5000,
    maxColumns: 50,
    maxCells: 100000,
    maxSingleCellLength: 2000,
    maxSheets: 20,
    maxCompressionRatio: 80
  };
  const PARSER_URL = "./assets/vendor/read-excel-file/read-excel-file.min.js";
  let parserPromise = null;

  function isCanceled(signal) {
    return Boolean(signal && signal.canceled);
  }

  function assertNotCanceled(signal) {
    if (isCanceled(signal)) throw new Error("Import XLSX dibatalkan.");
  }

  function safeError(error) {
    const message = String(error && error.message ? error.message : error || "");
    if (/password|encrypt/i.test(message)) return "Workbook terenkripsi/password-protected tidak didukung.";
    if (/not found|invalid|zip|archive|unexpected|unsupported|corrupt|truncated/i.test(message)) return "File XLSX rusak atau tidak didukung.";
    return "File XLSX tidak dapat dibaca dengan aman.";
  }

  function loadParser(options = {}) {
    if (options.parser) return Promise.resolve(options.parser);
    if (typeof require === "function") {
      try {
        return Promise.resolve(require("read-excel-file/universal"));
      } catch (_) {
        // Browser path below.
      }
    }
    if (typeof readXlsxFile === "function") return Promise.resolve(readXlsxFile);
    if (parserPromise) return parserPromise;
    parserPromise = new Promise((resolve, reject) => {
      if (typeof document === "undefined") return reject(new Error("Parser XLSX browser tidak tersedia."));
      const script = document.createElement("script");
      script.src = PARSER_URL;
      script.async = true;
      script.dataset.lazyXlsxParser = "true";
      script.onload = () => typeof readXlsxFile === "function"
        ? resolve(readXlsxFile)
        : reject(new Error("Parser XLSX gagal dimuat."));
      script.onerror = () => reject(new Error("Parser XLSX gagal dimuat."));
      document.head.appendChild(script);
    });
    return parserPromise;
  }

  function bytesToText(bytes) {
    if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(bytes);
    return Buffer.from(bytes).toString("utf8");
  }

  function readUInt16(view, offset) {
    return view.getUint16(offset, true);
  }

  function readUInt32(view, offset) {
    return view.getUint32(offset, true);
  }

  function inspectZip(buffer, budget = {}) {
    const limits = Object.assign({}, DEFAULT_BUDGET, budget);
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    if (bytes.length < 22) throw new Error("File XLSX terlalu kecil atau rusak.");
    if (readUInt32(view, 0) !== 0x04034b50) throw new Error("File bukan ZIP/XLSX yang valid.");
    if (bytes.length > limits.maxXlsxCompressedBytes) throw new Error("Ukuran file XLSX melebihi batas.");

    let eocd = -1;
    const min = Math.max(0, bytes.length - 65558);
    for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
      if (readUInt32(view, offset) === 0x06054b50) {
        eocd = offset;
        break;
      }
    }
    if (eocd < 0) throw new Error("Struktur ZIP/XLSX tidak lengkap.");

    const entryCount = readUInt16(view, eocd + 10);
    const centralDirectoryOffset = readUInt32(view, eocd + 16);
    if (!entryCount || entryCount > limits.maxZipEntries) throw new Error("Jumlah entry XLSX melebihi batas.");
    if (centralDirectoryOffset >= bytes.length) throw new Error("Struktur ZIP/XLSX rusak.");

    const entries = [];
    let offset = centralDirectoryOffset;
    let estimatedUncompressedBytes = 0;
    for (let index = 0; index < entryCount; index += 1) {
      if (offset + 46 > bytes.length || readUInt32(view, offset) !== 0x02014b50) {
        throw new Error("Central directory XLSX rusak.");
      }
      const compressionMethod = readUInt16(view, offset + 10);
      const compressedSize = readUInt32(view, offset + 20);
      const uncompressedSize = readUInt32(view, offset + 24);
      const nameLength = readUInt16(view, offset + 28);
      const extraLength = readUInt16(view, offset + 30);
      const commentLength = readUInt16(view, offset + 32);
      const nameStart = offset + 46;
      const nameEnd = nameStart + nameLength;
      if (nameEnd > bytes.length) throw new Error("Nama entry XLSX rusak.");
      const name = bytesToText(bytes.slice(nameStart, nameEnd)).replace(/\\/g, "/");
      estimatedUncompressedBytes += uncompressedSize;
      if (estimatedUncompressedBytes > limits.maxXlsxEstimatedUncompressedBytes) {
        throw new Error("Ukuran XLSX setelah dibuka melebihi batas.");
      }
      if (compressedSize > 0 && uncompressedSize / compressedSize > limits.maxCompressionRatio) {
        throw new Error("Rasio kompresi XLSX mencurigakan.");
      }
      if (![0, 8].includes(compressionMethod)) throw new Error("Metode kompresi XLSX tidak didukung.");
      entries.push({ name, compressedSize, uncompressedSize, compressionMethod });
      offset = nameEnd + extraLength + commentLength;
    }

    const names = entries.map((entry) => entry.name.toLowerCase());
    if (!names.includes("[content_types].xml") || !names.includes("xl/workbook.xml")) {
      throw new Error("File bukan workbook XLSX valid.");
    }
    const blocked = [
      /(^|\/)vbaProject\.bin$/i,
      /^xl\/macrosheets\//i,
      /^xl\/embeddings\//i,
      /^xl\/activeX\//i,
      /^xl\/ctrlProps\//i,
      /^xl\/externalLinks\//i,
      /^encryptioninfo$/i,
      /^encryptedpackage$/i
    ];
    const blockedEntry = entries.find((entry) => blocked.some((pattern) => pattern.test(entry.name)));
    if (blockedEntry) throw new Error(`Konten XLSX tidak didukung: ${blockedEntry.name}`);

    return {
      entryCount,
      compressedBytes: bytes.length,
      estimatedUncompressedBytes,
      entries
    };
  }

  function assertSupportedName(file) {
    const name = String(file && file.name ? file.name : "").toLowerCase();
    if (/\.(xlsm|xlsb|xls|ods)$/.test(name)) throw new Error("Gunakan .xlsx. XLS, XLSB, XLSM, dan ODS belum didukung.");
    if (!/\.xlsx$/.test(name)) throw new Error("Pilih file .xlsx yang valid.");
  }

  function cellToText(value) {
    if (value === null || value === undefined) return "";
    if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
    if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
    return String(value);
  }

  function rowsToTsv(rows) {
    return rows.map((row) => row.map((cell) => {
      const text = cellToText(cell);
      if (text.length > DEFAULT_BUDGET.maxSingleCellLength) throw new Error("Ada sel XLSX yang melebihi batas panjang.");
      return /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join("\t")).join("\n");
  }

  function validateSheetData(sheet, budget = {}) {
    const limits = Object.assign({}, DEFAULT_BUDGET, budget);
    const rows = sheet.data || [];
    if (!rows.length) throw new Error("Sheet XLSX kosong.");
    if (rows.length - 1 > limits.maxRows) throw new Error("Jumlah baris XLSX melebihi batas.");
    const columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    if (columns > limits.maxColumns) throw new Error("Jumlah kolom XLSX melebihi batas.");
    if ((rows.length - 1) * columns > limits.maxCells) throw new Error("Jumlah sel XLSX melebihi batas.");
    rows.forEach((row) => {
      row.forEach((cell) => {
        if (cellToText(cell).length > limits.maxSingleCellLength) throw new Error("Ada sel XLSX yang melebihi batas panjang.");
      });
    });
  }

  function parsedFromSheet(sheet, options = {}) {
    validateSheetData(sheet, options.budget);
    const parsed = ImportCore.parseTabularInput({
      text: rowsToTsv(sheet.data || []),
      sourceType: "xlsx",
      sourceLabel: options.sourceLabel || "File XLSX lokal",
      delimiterOverride: "tab",
      localeOverride: options.localeOverride || "auto",
      budget: options.budget
    });
    parsed.importedSource.sheetName = sheet.sheet;
    parsed.importedSource.detected.delimiter = "xlsx-sheet";
    parsed.rows.forEach((row) => { row.sheetName = sheet.sheet; });
    return parsed;
  }

  async function parseFile(file, options = {}) {
    const budget = Object.assign({}, DEFAULT_BUDGET, options.budget || {});
    assertSupportedName(file);
    assertNotCanceled(options.signal);
    const buffer = await file.arrayBuffer();
    assertNotCanceled(options.signal);
    const zipSummary = inspectZip(buffer, budget);
    const parser = await loadParser(options);
    assertNotCanceled(options.signal);
    let sheets;
    try {
      sheets = await parser(options.parser ? buffer : file);
    } catch (error) {
      if (options.debugErrors) throw error;
      throw new Error(safeError(error));
    }
    assertNotCanceled(options.signal);
    if (!Array.isArray(sheets) || !sheets.length) throw new Error("Workbook XLSX tidak memiliki sheet yang bisa dibaca.");
    if (sheets.length > budget.maxSheets) throw new Error("Jumlah sheet XLSX melebihi batas.");
    const usableSheets = sheets.filter((sheet) => Array.isArray(sheet.data) && sheet.data.length);
    if (!usableSheets.length) throw new Error("Workbook XLSX tidak memiliki sheet berisi data.");
    usableSheets.forEach((sheet) => validateSheetData(sheet, budget));
    const selectedSheetName = options.sheetName || usableSheets[0].sheet;
    const selectedSheet = usableSheets.find((sheet) => sheet.sheet === selectedSheetName) || usableSheets[0];
    return {
      contractVersion: "batch2.xlsxWorkbook.v1",
      sourceType: "xlsx",
      sourceLabel: "File XLSX lokal",
      selectedSheetName: selectedSheet.sheet,
      sheets: usableSheets.map((sheet) => ({
        name: sheet.sheet,
        rows: Math.max(0, sheet.data.length - 1),
        columns: sheet.data.reduce((max, row) => Math.max(max, row.length), 0)
      })),
      zipSummary,
      parsed: parsedFromSheet(selectedSheet, {
        sourceLabel: "File XLSX lokal",
        localeOverride: options.localeOverride,
        budget
      })
    };
  }

  return {
    parserUrl: PARSER_URL,
    loadParser,
    inspectZip,
    parseFile,
    parsedFromSheet
  };
});
