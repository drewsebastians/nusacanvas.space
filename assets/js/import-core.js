(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.ImportCore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  const DEFAULT_BUDGET = {
    maxTextBytes: 1048576,
    maxRows: 5000,
    maxColumns: 50,
    maxCells: 100000,
    maxSingleCellLength: 2000
  };

  const ROLE_ALIASES = {
    regionCode: ["official_code", "kode", "kode wilayah", "kode bps", "adm2_pcode", "code", "region code"],
    regionName: ["region", "region_name", "wilayah", "nama", "nama wilayah", "kabupaten/kota", "kab kota", "region name"],
    province: ["province", "provinsi", "nama provinsi", "propinsi"],
    numericValue: ["value", "nilai", "jumlah", "total", "angka", "persen", "percentage", "percent"],
    category: ["category", "kategori", "kelas", "status", "label"],
    source: ["source", "sumber"],
    period: ["period", "periode", "tahun", "year"]
  };

  function byteLength(text) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
    return Buffer.byteLength(text, "utf8");
  }

  function stableHash(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36).padStart(7, "0");
  }

  function makeId(prefix, parts) {
    return `${prefix}_${stableHash(parts.join("|"))}`;
  }

  function normalizeNewlines(text) {
    return String(text || "").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  function delimiterChar(name) {
    return { comma: ",", semicolon: ";", tab: "\t" }[name] || name;
  }

  function delimiterName(char) {
    return { ",": "comma", ";": "semicolon", "\t": "tab" }[char] || "unknown";
  }

  function scanRows(text, delimiter, limitRows) {
    const rows = [];
    let columns = 1;
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          index += 1;
        } else if (char === '"') {
          quoted = false;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === delimiter) {
        columns += 1;
      } else if (char === "\n") {
        rows.push(columns);
        columns = 1;
        if (rows.length >= limitRows) return rows;
      }
    }
    rows.push(columns);
    return rows.filter((count) => count > 1);
  }

  function detectDelimiter(text) {
    const candidates = [",", ";", "\t"].map((char) => {
      const rows = scanRows(text, char, 20);
      const usable = rows.filter((count) => count > 1);
      const mode = usable.reduce((best, count) => {
        const frequency = usable.filter((item) => item === count).length;
        if (!best || frequency > best.frequency) return { count, frequency };
        return best;
      }, null);
      return {
        name: delimiterName(char),
        char,
        rows: usable.length,
        columns: mode ? mode.count : 1,
        consistency: mode && usable.length ? mode.frequency / usable.length : 0,
        score: (mode ? mode.count : 1) * (mode && usable.length ? mode.frequency / usable.length : 0) * Math.max(usable.length, 1)
      };
    }).sort((left, right) => right.score - left.score);
    const best = candidates[0];
    const confidence = best.score >= 6 && best.consistency >= 0.8 ? "high" : best.score >= 3 ? "medium" : "low";
    return { delimiter: best.name, delimiterChar: best.char, confidence, candidates };
  }

  function parseDelimited(text, delimiter, budget = DEFAULT_BUDGET) {
    const normalized = normalizeNewlines(text);
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;
    let fieldStart = true;
    for (let index = 0; index < normalized.length; index += 1) {
      const char = normalized[index];
      const next = normalized[index + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          field += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          field += char;
        }
      } else if (char === '"' && fieldStart) {
        quoted = true;
        fieldStart = false;
      } else if (char === delimiter) {
        row.push(field);
        field = "";
        fieldStart = true;
      } else if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        fieldStart = true;
      } else {
        field += char;
        fieldStart = false;
      }
      if (field.length > budget.maxSingleCellLength) throw new Error("Satu sel melebihi batas panjang yang diizinkan.");
    }
    if (quoted) throw new Error("Input memiliki kutip yang belum ditutup.");
    row.push(field);
    rows.push(row);
    return rows.filter((items) => items.some((value) => String(value).trim() !== ""));
  }

  function normalizeHeader(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[_-]+/g, " ")
      .replace(/[^a-z0-9/% ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniqueHeaders(headers) {
    const seen = new Map();
    return headers.map((header, index) => {
      const base = String(header || `Kolom ${index + 1}`).trim() || `Kolom ${index + 1}`;
      const normalized = normalizeHeader(base);
      const count = (seen.get(normalized) || 0) + 1;
      seen.set(normalized, count);
      return count === 1 ? base : `${base}__${count}`;
    });
  }

  function inferColumnMapping(headers) {
    const normalizedHeaders = headers.map(normalizeHeader);
    const roles = {};
    const ignoredColumns = [];
    const suggestions = [];
    Object.keys(ROLE_ALIASES).forEach((role) => {
      const aliases = ROLE_ALIASES[role].map(normalizeHeader);
      const exactIndex = normalizedHeaders.findIndex((header) => aliases.includes(header));
      const containsIndex = exactIndex >= 0 ? exactIndex : normalizedHeaders.findIndex((header) => aliases.some((alias) => header.includes(alias) || alias.includes(header)));
      const index = exactIndex >= 0 ? exactIndex : containsIndex;
      roles[role] = index >= 0 ? headers[index] : null;
      if (index >= 0) {
        suggestions.push({
          column: headers[index],
          role,
          confidence: exactIndex >= 0 ? "high" : "medium",
          reason: exactIndex >= 0 ? "Header cocok dengan alias." : "Header mirip dengan alias."
        });
      }
    });
    headers.forEach((header) => {
      if (!Object.values(roles).includes(header)) ignoredColumns.push(header);
    });
    return { contractVersion: "batch2.columnMapping.v1", roles, ignoredColumns, suggestions };
  }

  function parseTabularInput(options) {
    const budget = Object.assign({}, DEFAULT_BUDGET, options.budget || {});
    const rawText = String(options.text || "");
    if (!rawText.trim()) throw new Error("Input kosong.");
    if (byteLength(rawText) > budget.maxTextBytes) throw new Error("Input melebihi batas ukuran.");
    const text = normalizeNewlines(rawText);
    const detection = options.delimiterOverride && options.delimiterOverride !== "auto"
      ? { delimiter: options.delimiterOverride, delimiterChar: delimiterChar(options.delimiterOverride), confidence: "manual", candidates: [] }
      : detectDelimiter(text);
    const records = parseDelimited(text, detection.delimiterChar, budget);
    if (!records.length) throw new Error("Input tidak berisi baris data.");
    const originalHeaders = records[0].map((header) => String(header || "").trim());
    const headers = uniqueHeaders(originalHeaders);
    if (!headers.length || headers.every((header) => !header.trim())) throw new Error("Header tidak ditemukan.");
    if (headers.length > budget.maxColumns) throw new Error("Jumlah kolom melebihi batas.");
    const dataRows = records.slice(1);
    if (dataRows.length > budget.maxRows) throw new Error("Jumlah baris melebihi batas.");
    if (dataRows.length * headers.length > budget.maxCells) throw new Error("Jumlah sel melebihi batas.");
    const sourceType = options.sourceType || "paste";
    const sourceId = makeId("src", [sourceType, detection.delimiter, text.slice(0, 4096), records.length, headers.length]);
    const duplicateHeaderIssues = duplicateHeaderIssuesFor(originalHeaders);
    const rows = dataRows.map((items, index) => {
      const cells = {};
      headers.forEach((header, columnIndex) => { cells[header] = String(items[columnIndex] || ""); });
      const issues = [];
      if (items.length !== headers.length) {
        issues.push({ severity: "warning", code: "row.column_count_mismatch", message: "Jumlah sel berbeda dari jumlah header." });
      }
      return {
        contractVersion: "batch2.rawRow.v1",
        rowId: makeId("row", [sourceId, String(index + 2), items.join("\u001f")]),
        sourceId,
        sheetName: null,
        rowNumber: index + 2,
        cells,
        normalized: {},
        issues
      };
    });
    const warnings = [];
    if (detection.confidence === "low") warnings.push({ severity: "warning", code: "delimiter.low_confidence", message: "Delimiter terdeteksi dengan keyakinan rendah." });
    warnings.push(...duplicateHeaderIssues);
    const importedSource = {
      contractVersion: "batch2.importedSource.v1",
      sourceId,
      sourceType,
      sourceLabel: String(options.sourceLabel || sourceType).slice(0, 80),
      sheetName: null,
      detected: {
        encoding: rawText.charCodeAt(0) === 0xFEFF ? "utf-8-bom" : "utf-8",
        delimiter: detection.delimiter,
        locale: options.localeOverride && options.localeOverride !== "auto" ? options.localeOverride : "unknown"
      },
      counts: { rows: rows.length, columns: headers.length, cells: rows.length * headers.length },
      warnings,
      truncated: false
    };
    return {
      contractVersion: "batch2.tabularImport.v1",
      importedSource,
      delimiter: detection,
      headers,
      originalHeaders,
      rows,
      mapping: inferColumnMapping(headers)
    };
  }

  function duplicateHeaderIssuesFor(headers) {
    const counts = new Map();
    headers.forEach((header) => {
      const normalized = normalizeHeader(header);
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) || 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([header]) => ({ severity: "warning", code: "header.duplicate", message: `Header duplikat terdeteksi: ${header}.` }));
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/\b(KABUPATEN|KAB\.?|KOTA|CITY|REGENCY)\b/g, " ")
      .replace(/[^A-Z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeCode(value) {
    const text = String(value || "").trim().toUpperCase().replace(/^ID/, "").replace(/\./g, "");
    if (/^\d{4}$/.test(text)) return text.slice(0, 2) + "." + text.slice(2);
    return String(value || "").trim().toUpperCase();
  }

  function parseLocaleNumber(value, options = {}) {
    const original = String(value || "");
    let text = original.trim();
    if (!text) return { kind: "blank", original, value: null, percent: false, format: "blank" };
    if (/^[=+@]/.test(text)) return { kind: "invalid", original, value: null, percent: false, format: "formula-like" };
    let negative = false;
    if (/^\(.*\)$/.test(text)) {
      negative = true;
      text = text.slice(1, -1).trim();
    }
    let percent = false;
    if (/%$/.test(text)) {
      percent = true;
      text = text.slice(0, -1).trim();
    }
    if (/^-/.test(text)) {
      negative = !negative;
      text = text.slice(1).trim();
    }
    text = text.replace(/\s+/g, "");
    const locale = options.locale || "auto";
    const parsed = locale === "id-ID"
      ? parseWithLocale(text, ",", ".")
      : locale === "en-US"
        ? parseWithLocale(text, ".", ",")
        : parseAutoNumber(text);
    if (parsed.kind !== "number") return Object.assign({ original, value: null, percent }, parsed);
    const signed = negative ? -parsed.value : parsed.value;
    return {
      kind: percent ? "percentage" : "number",
      original,
      value: percent ? signed / 100 : signed,
      percent,
      format: parsed.format
    };
  }

  function parseAutoNumber(text) {
    const hasComma = text.includes(",");
    const hasDot = text.includes(".");
    if (hasComma && hasDot) {
      return text.lastIndexOf(",") > text.lastIndexOf(".")
        ? parseWithLocale(text, ",", ".")
        : parseWithLocale(text, ".", ",");
    }
    if (hasComma) return parseSingleSeparator(text, ",");
    if (hasDot) return parseSingleSeparator(text, ".");
    if (/^\d+$/.test(text)) return { kind: "number", value: Number(text), format: "integer" };
    return { kind: "invalid", format: "not-numeric" };
  }

  function parseSingleSeparator(text, separator) {
    const parts = text.split(separator);
    if (parts.length > 2) return parseWithLocale(text, ".", separator).kind === "number" ? parseWithLocale(text, ".", separator) : parseWithLocale(text, ",", separator);
    const decimals = parts[1] || "";
    if (decimals.length === 3 && /^\d{1,3}$/.test(parts[0])) return { kind: "ambiguous", format: "ambiguous-separator" };
    const normalized = parts.join(".");
    if (!/^\d+(\.\d+)?$/.test(normalized)) return { kind: "invalid", format: "not-numeric" };
    return { kind: "number", value: Number(normalized), format: separator === "," ? "decimal-comma" : "decimal-dot" };
  }

  function parseWithLocale(text, decimal, group) {
    if (!/^[\d.,]+$/.test(text)) return { kind: "invalid", format: "not-numeric" };
    const decimalParts = text.split(decimal);
    if (decimalParts.length > 2) return { kind: "invalid", format: "too-many-decimals" };
    const integerPart = decimalParts[0];
    const fractionPart = decimalParts[1] || "";
    if (integerPart.includes(group)) {
      const groups = integerPart.split(group);
      const validGroups = /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((item) => /^\d{3}$/.test(item));
      if (!validGroups) return { kind: "invalid", format: "invalid-grouping" };
    }
    if (fractionPart && !/^\d+$/.test(fractionPart)) return { kind: "invalid", format: "invalid-fraction" };
    const normalized = integerPart.replace(new RegExp("\\" + group, "g"), "") + (fractionPart ? "." + fractionPart : "");
    if (!/^\d+(\.\d+)?$/.test(normalized)) return { kind: "invalid", format: "not-numeric" };
    return { kind: "number", value: Number(normalized), format: decimal === "," ? "id-ID" : "en-US" };
  }

  function escapeFormula(value) {
    const text = String(value || "");
    return /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  }

  return {
    DEFAULT_BUDGET,
    ROLE_ALIASES,
    detectDelimiter,
    parseDelimited,
    parseTabularInput,
    inferColumnMapping,
    normalizeHeader,
    normalizeText,
    normalizeCode,
    parseLocaleNumber,
    escapeFormula
  };
});
