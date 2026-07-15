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
  const RUNTIME_BASE = typeof window !== "undefined" && window.location.pathname.startsWith("/workspace/") ? "../" : "./";
  const PARSER_URL = `${RUNTIME_BASE}assets/vendor/read-excel-file/read-excel-file.min.js`;
  let parserPromise = null;

  function isCanceled(signal) {
    return Boolean(signal && signal.canceled);
  }

  function assertNotCanceled(signal) {
    if (isCanceled(signal)) throw new Error("The XLSX import was canceled. Your current map has not changed. Choose a file when you are ready.");
  }

  function safeError(error) {
    const message = String(error && error.message ? error.message : error || "");
    if (/password|encrypt/i.test(message)) return "Password-protected workbooks are not supported. Your current map is safe. Save an unprotected .xlsx copy or paste the data.";
    if (/not found|invalid|zip|archive|unexpected|unsupported|corrupt|truncated/i.test(message)) return "We could not read this XLSX file. Your current map is safe. Upload a valid .xlsx file without macros, or paste the data.";
    return "We could not read this XLSX file safely. Your current map has not changed. Try another .xlsx file or paste the data.";
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
      if (typeof document === "undefined") return reject(new Error("The spreadsheet reader is not available. Your current map is safe. Reload the page and try again, or paste the data."));
      const script = document.createElement("script");
      script.src = PARSER_URL;
      script.async = true;
      script.dataset.lazyXlsxParser = "true";
      script.onload = () => typeof readXlsxFile === "function"
        ? resolve(readXlsxFile)
        : reject(new Error("The spreadsheet reader could not load. Your current map is safe. Reload the page and try again, or paste the data."));
      script.onerror = () => reject(new Error("The spreadsheet reader could not load. Your current map is safe. Reload the page and try again, or paste the data."));
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
    if (bytes.length < 22) throw new Error("This XLSX file is incomplete or damaged. Your current map is safe. Choose a valid .xlsx file.");
    if (readUInt32(view, 0) !== 0x04034b50) throw new Error("This is not a valid XLSX file. Your current map is safe. Choose a valid .xlsx file.");
    if (bytes.length > limits.maxXlsxCompressedBytes) throw new Error("This XLSX file is too large. Your current map is safe. Use a smaller workbook or paste fewer rows.");

    let eocd = -1;
    const min = Math.max(0, bytes.length - 65558);
    for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
      if (readUInt32(view, offset) === 0x06054b50) {
        eocd = offset;
        break;
      }
    }
    if (eocd < 0) throw new Error("This XLSX file is incomplete. Your current map is safe. Choose a valid .xlsx file.");

    const entryCount = readUInt16(view, eocd + 10);
    const centralDirectoryOffset = readUInt32(view, eocd + 16);
    if (!entryCount || entryCount > limits.maxZipEntries) throw new Error("This XLSX file contains too many parts. Your current map is safe. Use a simpler workbook without macros or external links.");
    if (centralDirectoryOffset >= bytes.length) throw new Error("This XLSX file is damaged. Your current map is safe. Choose a valid .xlsx file.");

    const entries = [];
    let offset = centralDirectoryOffset;
    let estimatedUncompressedBytes = 0;
    for (let index = 0; index < entryCount; index += 1) {
      if (offset + 46 > bytes.length || readUInt32(view, offset) !== 0x02014b50) {
        throw new Error("This XLSX file is damaged. Your current map is safe. Choose a valid .xlsx file.");
      }
      const compressionMethod = readUInt16(view, offset + 10);
      const compressedSize = readUInt32(view, offset + 20);
      const uncompressedSize = readUInt32(view, offset + 24);
      const nameLength = readUInt16(view, offset + 28);
      const extraLength = readUInt16(view, offset + 30);
      const commentLength = readUInt16(view, offset + 32);
      const nameStart = offset + 46;
      const nameEnd = nameStart + nameLength;
      if (nameEnd > bytes.length) throw new Error("This XLSX file has a damaged file entry. Your current map is safe. Choose a valid .xlsx file.");
      const name = bytesToText(bytes.slice(nameStart, nameEnd)).replace(/\\/g, "/");
      estimatedUncompressedBytes += uncompressedSize;
      if (estimatedUncompressedBytes > limits.maxXlsxEstimatedUncompressedBytes) {
        throw new Error("This XLSX file is too large when opened. Your current map is safe. Use a smaller workbook or paste fewer rows.");
      }
      if (compressedSize > 0 && uncompressedSize / compressedSize > limits.maxCompressionRatio) {
        throw new Error("This XLSX file cannot be opened safely. Your current map has not changed. Save a new plain .xlsx copy and try again.");
      }
      if (![0, 8].includes(compressionMethod)) throw new Error("This XLSX file uses an unsupported compression method. Your current map is safe. Save a new plain .xlsx copy and try again.");
      entries.push({ name, compressedSize, uncompressedSize, compressionMethod });
      offset = nameEnd + extraLength + commentLength;
    }

    const names = entries.map((entry) => entry.name.toLowerCase());
    if (!names.includes("[content_types].xml") || !names.includes("xl/workbook.xml")) {
      throw new Error("This is not a valid XLSX workbook. Your current map is safe. Choose a valid .xlsx file.");
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
    if (blockedEntry) throw new Error(`This XLSX file contains content we cannot open safely: ${blockedEntry.name}. Your current map has not changed. Save a plain .xlsx file without macros, embedded files, or external links.`);

    return {
      entryCount,
      compressedBytes: bytes.length,
      estimatedUncompressedBytes,
      entries
    };
  }

  function assertSupportedName(file) {
    const name = String(file && file.name ? file.name : "").toLowerCase();
    if (/\.(xlsm|xlsb|xls|ods)$/.test(name)) throw new Error("This file type is not supported. Your current map is safe. Save the file as .xlsx or paste the data.");
    if (!/\.xlsx$/.test(name)) throw new Error("Choose a valid .xlsx file. Your current map has not changed.");
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
      if (text.length > DEFAULT_BUDGET.maxSingleCellLength) throw new Error("A spreadsheet cell is too long to read safely. Your current map has not changed. Shorten the cell and try again.");
      return /[\t\r\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }).join("\t")).join("\n");
  }

  function validateSheetData(sheet, budget = {}) {
    const limits = Object.assign({}, DEFAULT_BUDGET, budget);
    const rows = sheet.data || [];
    if (!rows.length) throw new Error("This spreadsheet sheet is empty. Your current map has not changed. Choose a sheet with data.");
    if (rows.length - 1 > limits.maxRows) throw new Error("This spreadsheet has too many rows. Your current map has not changed. Use fewer rows and try again.");
    const columns = rows.reduce((max, row) => Math.max(max, row.length), 0);
    if (columns > limits.maxColumns) throw new Error("This spreadsheet has too many columns. Your current map has not changed. Remove unneeded columns and try again.");
    if ((rows.length - 1) * columns > limits.maxCells) throw new Error("This spreadsheet has too many cells. Your current map has not changed. Use fewer rows or columns and try again.");
    rows.forEach((row) => {
      row.forEach((cell) => {
        if (cellToText(cell).length > limits.maxSingleCellLength) throw new Error("A spreadsheet cell is too long to read safely. Your current map has not changed. Shorten the cell and try again.");
      });
    });
  }

  function parsedFromSheet(sheet, options = {}) {
    validateSheetData(sheet, options.budget);
    const parsed = ImportCore.parseTabularInput({
      text: rowsToTsv(sheet.data || []),
      sourceType: "xlsx",
      sourceLabel: options.sourceLabel || "Local XLSX file",
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
    if (!Array.isArray(sheets) || !sheets.length) throw new Error("This workbook has no readable sheets. Your current map is safe. Choose another .xlsx file or paste the data.");
    if (sheets.length > budget.maxSheets) throw new Error("This workbook has too many sheets. Your current map is safe. Keep only the sheets you need and try again.");
    const usableSheets = sheets.filter((sheet) => Array.isArray(sheet.data) && sheet.data.length);
    if (!usableSheets.length) throw new Error("This workbook has no sheets with data. Your current map is safe. Add data to a sheet or choose another file.");
    usableSheets.forEach((sheet) => validateSheetData(sheet, budget));
    const selectedSheetName = options.sheetName || usableSheets[0].sheet;
    const selectedSheet = usableSheets.find((sheet) => sheet.sheet === selectedSheetName) || usableSheets[0];
    return {
      contractVersion: "batch2.xlsxWorkbook.v1",
      sourceType: "xlsx",
      sourceLabel: "Local XLSX file",
      selectedSheetName: selectedSheet.sheet,
      sheets: usableSheets.map((sheet) => ({
        name: sheet.sheet,
        rows: Math.max(0, sheet.data.length - 1),
        columns: sheet.data.reduce((max, row) => Math.max(max, row.length), 0)
      })),
      zipSummary,
      parsed: parsedFromSheet(selectedSheet, {
        sourceLabel: "Local XLSX file",
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
