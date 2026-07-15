(function () {
  const brand = window.ProductBrand;
  if (!brand) throw new Error("Product brand configuration is required.");
  const boundaryProvider = window.NusaCanvasBoundaryProvider && window.NusaCanvasBoundaryProvider.current;
  if (!boundaryProvider || typeof boundaryProvider.getManifest !== "function") throw new Error("Boundary provider metadata is required before export.");

  function escapeXml(value) {
    return String(value || "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    }[char]));
  }

  function getSize(options) {
    if (options.pngSize) {
      const parts = options.pngSize.split("x").map(Number);
      return { width: parts[0], height: parts[1] };
    }
    if (options.ratio === "4:3") return { width: 1600, height: 1200 };
    if (options.ratio === "a4") return { width: 1754, height: 1240 };
    if (options.ratio === "a3") return { width: 2480, height: 1754 };
    if (options.ratio === "1:1") return { width: 1400, height: 1400 };
    return { width: 1600, height: 900 };
  }

  function sanitizeText(value, max = 180) {
    return String(value == null ? "" : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
  }

  function slugify(value) {
    const slug = sanitizeText(value, 80).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return slug || brand.defaults.exportFilenamePrefix;
  }

  function buildExportSpec(features, state, options = {}) {
    const boundaryManifest = boundaryProvider.getManifest();
    const metadata = Object.assign({
      title: state.title || brand.defaults.projectTitle,
      subtitle: "",
      source: "",
      period: "",
      footnote: "",
      legendTitle: "Legend",
      filenameSlug: brand.defaults.exportFilenamePrefix
    }, state.exportMeta || {}, options.metadata || {});
    Object.keys(metadata).forEach((key) => { metadata[key] = sanitizeText(metadata[key], key === "title" ? 90 : key === "filenameSlug" ? 80 : 180); });
    const extent = options.extent === "national" ? "national" : "current-view";
    return {
      version: "IDN-EXPORT-v2",
      features: features || [],
      legend: state.visualization && Array.isArray(state.visualization.legend) ? state.visualization.legend : (state.legend || []),
      metadata,
      extent,
      bounds: options.viewBounds || getBounds(features || []),
      size: getSize(options),
      transparent: Boolean(options.transparent),
      labels: options.labels !== false,
      selectedId: options.selectedId || null,
      attribution: boundaryProvider.getAttribution(),
      boundaryProviderId: boundaryManifest.providerId,
      boundaryVersion: boundaryProvider.getVersion(),
      registryVersion: boundaryManifest.canonicalRegistryVersion
    };
  }

  function estimatePngCost(options) {
    const size = getSize(options || {});
    const pixels = size.width * size.height;
    const estimatedMegabytes = Math.ceil((pixels * 4 * 2.2) / 1024 / 1024);
    const deviceMemory = navigator.deviceMemory || null;
    const risky = pixels >= 3840 * 2160 || estimatedMegabytes > 64 || (deviceMemory && deviceMemory <= 2 && pixels > 2560 * 1440);
    return { width: size.width, height: size.height, pixels, estimatedMegabytes, risky, deviceMemory };
  }

  function getBounds(features) {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    features.forEach((feature) => {
      walkCoords(feature.geometry, (x, y) => {
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      });
    });
    if (!features.length || !Number.isFinite(minX)) {
      return { minX: 94, minY: -12, maxX: 142, maxY: 8 };
    }
    return { minX, minY, maxX, maxY };
  }

  function walkCoords(geometry, callback) {
    if (!geometry) return;
    if (geometry.type === "Polygon") {
      geometry.coordinates.forEach((ring) => ring.forEach((point) => callback(point[0], point[1])));
    }
    if (geometry.type === "MultiPolygon") {
      geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach((point) => callback(point[0], point[1]))));
    }
  }

  function pathForGeometry(geometry, project) {
    const rings = [];
    const addRing = (ring) => {
      const commands = ring.map((point, index) => {
        const p = project(point[0], point[1]);
        return (index ? "L" : "M") + p.x.toFixed(2) + " " + p.y.toFixed(2);
      });
      if (commands.length) rings.push(commands.join(" ") + " Z");
    };
    if (geometry.type === "Polygon") geometry.coordinates.forEach(addRing);
    if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
    return rings.join(" ");
  }

  function coordinateKey(point) {
    return `${Number(point[0])},${Number(point[1])}`;
  }

  function boundaryMeshPath(features, project) {
    const seen = new Set();
    const commands = [];
    const addRing = (ring) => {
      for (let index = 1; index < ring.length; index += 1) {
        const start = ring[index - 1];
        const end = ring[index];
        if (!Array.isArray(start) || !Array.isArray(end)) continue;
        const startKey = coordinateKey(start);
        const endKey = coordinateKey(end);
        if (startKey === endKey) continue;
        const key = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const a = project(start[0], start[1]);
        const b = project(end[0], end[1]);
        commands.push(`M${a.x.toFixed(2)} ${a.y.toFixed(2)} L${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
      }
    };
    (features || []).forEach((feature) => {
      const geometry = feature.geometry || {};
      if (geometry.type === "Polygon") geometry.coordinates.forEach(addRing);
      if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((polygon) => polygon.forEach(addRing));
    });
    return { path: commands.join(" "), uniqueSegments: seen.size };
  }

  function centroid(feature) {
    let sx = 0; let sy = 0; let count = 0;
    walkCoords(feature.geometry, (x, y) => { sx += x; sy += y; count += 1; });
    return count ? [sx / count, sy / count] : [0, 0];
  }

  function displayName(feature) {
    const p = feature.properties || {};
    return p.display_name || p.geometry_source_name || p.region_name || p.region_id || "Region";
  }

  function labelText(feature, state) {
    const id = feature.properties && feature.properties.region_id;
    const item = state.highlights && state.highlights[id];
    const parts = [displayName(feature)];
    if (item && item.category) parts.push(item.category);
    if (item && item.value) parts.push(item.value);
    return parts.join(" - ");
  }

  function normalizeColor(color) {
    return String(color || "#4472C4").toUpperCase();
  }

  function defaultGroupName(color) {
    const names = {
      "#4472C4": "Blue group",
      "#5B9BD5": "Light blue group",
      "#E74C3C": "Red group",
      "#70AD47": "Green group",
      "#FFC000": "Yellow group",
      "#A64D79": "Purple group",
      "#00A388": "Teal group",
      "#7F6000": "Brown group"
    };
    return names[color] || `Color group ${color}`;
  }

  function buildLegendItems(state, features) {
    if (state.visualization && Array.isArray(state.visualization.legend) && state.visualization.legend.length) return state.visualization.legend;
    // Exported legends use color groups instead of one row for every highlighted region.
    const groups = new Map();
    Object.keys(state.highlights || {}).forEach((id) => {
      const item = state.highlights[id];
      const color = normalizeColor(item.color);
      if (!groups.has(color)) groups.set(color, { color, count: 0 });
      groups.get(color).count += 1;
    });
    const highlightItems = Array.from(groups.values()).map((group) => {
      const labelParts = [(state.groupNames && state.groupNames[group.color]) || defaultGroupName(group.color)];
      const meta = (state.groupMeta && state.groupMeta[group.color]) || {};
      if (meta.category) labelParts.push(meta.category);
      if (meta.value) labelParts.push(meta.value);
      return {
        color: group.color,
        label: labelParts.join(" - ")
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "id"));
    if (highlightItems.length) return highlightItems;
    return Array.isArray(state.legend) ? state.legend : [];
  }

  function buildSvg(features, state, options) {
    const spec = options && options.spec ? options.spec : buildExportSpec(features, state, options || {});
    const size = spec.size;
    const margin = 58;
    const legendAreaHeight = state.legendVisible ? 142 : 72;
    const bounds = spec.bounds;
    const boundsWidth = Math.max(bounds.maxX - bounds.minX, 0.001);
    const boundsHeight = Math.max(bounds.maxY - bounds.minY, 0.001);
    const scale = Math.min((size.width - margin * 2) / boundsWidth, (size.height - margin * 2 - legendAreaHeight) / boundsHeight);
    const labelSize = getLabelSize(boundsWidth, boundsHeight, features.length, size);
    const mapWidth = (bounds.maxX - bounds.minX) * scale;
    const mapHeight = (bounds.maxY - bounds.minY) * scale;
    const offsetX = (size.width - mapWidth) / 2;
    const offsetY = 92 + ((size.height - 88 - legendAreaHeight - mapHeight) / 2);
    const project = (x, y) => ({ x: offsetX + (x - bounds.minX) * scale, y: offsetY + (bounds.maxY - y) * scale });
    const background = spec.transparent ? "" : `<rect width="100%" height="100%" fill="#97d2e2"/>`;
    const fills = features.map((feature) => {
      const id = feature.properties.region_id;
      const item = state.highlights[id];
      const fill = item ? item.color : "#e7ebef";
      return `<path data-region-fill="${escapeXml(id)}" d="${pathForGeometry(feature.geometry, project)}" fill="${fill}" stroke="none"><title>${escapeXml(feature.properties.display_name)}</title></path>`;
    }).join("\n");
    const mesh = boundaryMeshPath(features, project);
    const selectedFeature = spec.selectedId && features.find((feature) => feature.properties && feature.properties.region_id === spec.selectedId);
    const selectedOutline = selectedFeature
      ? `<path data-selected-outline="${escapeXml(spec.selectedId)}" d="${pathForGeometry(selectedFeature.geometry, project)}" fill="none" stroke="#172a3a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`
      : "";
    const labelPlacements = spec.labels ? placeLabels(features, state, project, size, labelSize) : [];
    const labels = labelPlacements.map((item) => {
      return `<text x="${item.x.toFixed(1)}" y="${item.y.toFixed(1)}" text-anchor="middle" font-size="${item.fontSize}" paint-order="stroke" stroke="#ffffff" stroke-width="${(item.fontSize / 4).toFixed(1)}" stroke-linejoin="round" fill="#1e2933">${escapeXml(labelText(item.feature, state))}</text>`;
    }).join("\n");
    const legend = state.legendVisible ? buildLegend(state, size, spec.legendFeatures || features, spec.metadata.legendTitle) : "";
    const title = buildTitle(spec.metadata.title, size, spec.metadata.subtitle);
    const metadata = Object.assign({}, spec, { features: undefined });
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" role="img" aria-label="${escapeXml(spec.metadata.title)}">\n${background}\n<metadata>${escapeXml(JSON.stringify(metadata))}</metadata>\n<g font-family="Arial, Helvetica, sans-serif">${fills}\n<path id="boundary-mesh" data-boundary-mesh="single-pass" d="${mesh.path}" fill="none" stroke="#8d9aa6" stroke-width="0.8" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" shape-rendering="geometricPrecision"/>\n${selectedOutline}\n${labels}\n${legend}</g>\n${title}\n<text x="${margin}" y="${size.height - 58}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5c6975">${escapeXml(spec.metadata.source || spec.attribution)}</text>\n<text x="${margin}" y="${size.height - 40}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5c6975">${escapeXml(spec.metadata.period || "")}</text>\n<text x="${margin}" y="${size.height - 22}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5c6975">${escapeXml(spec.metadata.footnote || spec.attribution)} Keep the source credit with this map.</text>\n</svg>`;
  }

  function buildTitle(title, size, subtitle) {
    const text = String(title || brand.defaults.projectTitle).slice(0, 90);
    const width = Math.min(size.width - 116, Math.max(360, text.length * 18));
    const x = (size.width - width) / 2;
    const sub = sanitizeText(subtitle, 180);
    return `<g><rect x="${x.toFixed(1)}" y="17" width="${width.toFixed(1)}" height="${sub ? 60 : 42}" rx="6" fill="rgba(255,255,255,0.92)" stroke="#d8dee6"/><text x="${size.width / 2}" y="44" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#1e2933">${escapeXml(text)}</text>${sub ? `<text x="${size.width / 2}" y="64" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#5c6975">${escapeXml(sub)}</text>` : ""}</g>`;
  }

  function getLabelSize(boundsWidth, boundsHeight, labelCount, size) {
    const zoomSize = clamp(13 + (18 - boundsWidth) * 0.45, 10, 18);
    const densitySize = Math.sqrt((size.width * Math.max(1, size.height - 160)) / Math.max(1, labelCount * 15000));
    const aspectPenalty = clamp(boundsWidth / Math.max(boundsHeight, 0.1), 1, 2.4);
    return Math.round(clamp(zoomSize * Math.min(1, densitySize) / Math.sqrt(aspectPenalty), 9, 18));
  }

  function placeLabels(features, state, project, size, labelSize) {
    const placed = [];
    const hasHighlight = (feature) => Boolean(state.highlights && state.highlights[feature.properties.region_id]);
    return features.slice().sort((a, b) => {
      const ah = hasHighlight(a);
      const bh = hasHighlight(b);
      return Number(bh) - Number(ah);
    }).map((feature) => {
      const c = centroid(feature);
      const p = project(c[0], c[1]);
      const text = labelText(feature, state);
      const highlighted = hasHighlight(feature);
      const preferredSize = highlighted ? Math.min(18, labelSize + 2) : labelSize;
      const minSize = highlighted ? 10 : 8;
      const best = findLabelPlacement(feature, p, text, size, placed, preferredSize, minSize);
      if (!best || (!highlighted && best.overlap > 0)) return null;
      placed.push(best.box);
      return best;
    }).filter(Boolean);
  }

  function findLabelPlacement(feature, point, text, size, placed, preferredSize, minSize) {
    let best = null;
    for (let fontSize = preferredSize; fontSize >= minSize; fontSize -= 1) {
      const width = Math.max(fontSize * 3, text.length * fontSize * 0.54);
      const height = fontSize * 1.2;
      const offsets = labelOffsets(fontSize);
      for (let i = 0; i < offsets.length; i += 1) {
        const offset = offsets[i];
        const x = clamp(point.x + offset[0], 18 + width / 2, size.width - 18 - width / 2);
        const y = clamp(point.y + offset[1], 74 + height / 2, size.height - 48 - height / 2);
        const box = labelBox(x, y, width, height);
        const overlap = placed.reduce((total, item) => total + overlapArea(box, item), 0);
        const distance = Math.abs(offset[0]) + Math.abs(offset[1]);
        const candidate = { feature, x, y, box, fontSize, overlap, distance };
        if (!overlap) return candidate;
        if (!best || candidate.overlap < best.overlap || (candidate.overlap === best.overlap && candidate.fontSize > best.fontSize) || (candidate.overlap === best.overlap && candidate.fontSize === best.fontSize && candidate.distance < best.distance)) {
          best = candidate;
        }
      }
    }
    return best;
  }

  function labelOffsets(fontSize) {
    const horizontal = fontSize * 4.2;
    const vertical = fontSize * 1.8;
    return [
      [0, 0], [0, -vertical], [0, vertical], [-horizontal, 0], [horizontal, 0],
      [-horizontal, -vertical], [horizontal, -vertical], [-horizontal, vertical], [horizontal, vertical],
      [0, -vertical * 2], [0, vertical * 2], [-horizontal * 2, 0], [horizontal * 2, 0],
      [-horizontal * 2, -vertical], [horizontal * 2, -vertical], [-horizontal * 2, vertical], [horizontal * 2, vertical],
      [-horizontal, -vertical * 2], [horizontal, -vertical * 2], [-horizontal, vertical * 2], [horizontal, vertical * 2]
    ];
  }

  function boxesOverlap(a, b, padding) {
    return !(a.right + padding < b.left || a.left - padding > b.right || a.bottom + padding < b.top || a.top - padding > b.bottom);
  }

  function labelBox(x, y, width, height) {
    return { left: x - width / 2, right: x + width / 2, top: y - height / 2, bottom: y + height / 2 };
  }

  function overlapArea(a, b) {
    const left = Math.max(a.left, b.left);
    const right = Math.min(a.right, b.right);
    const top = Math.max(a.top, b.top);
    const bottom = Math.min(a.bottom, b.bottom);
    return Math.max(0, right - left + 5) * Math.max(0, bottom - top + 5);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function buildLegend(state, size, features, legendTitle) {
    const items = buildLegendItems(state, features);
    if (!items.length) return "";
    const rowHeight = 22;
    const maxRows = 4;
    const columns = Math.min(3, Math.ceil(items.length / maxRows));
    const rowsPerColumn = Math.ceil(items.length / columns);
    const columnWidth = Math.min(330, Math.max(190, Math.max(...items.map((item) => item.label.length)) * 7.2 + 54));
    const width = Math.min(size.width - 116, columns * columnWidth);
    const height = 46 + rowsPerColumn * rowHeight;
    const x = (size.width - width) / 2;
    const y = size.height - height - 54;
    const rows = items.map((item, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const xx = x + column * columnWidth;
      const yy = y + 48 + row * rowHeight;
      return `<rect x="${xx + 14}" y="${yy - 12}" width="14" height="14" fill="${item.color}" stroke="#4b5563"/><text x="${xx + 38}" y="${yy}" font-size="13" fill="#1e2933">${escapeXml(item.label)}</text>`;
    }).join("");
    return `<g><rect x="${x.toFixed(1)}" y="${y}" width="${width.toFixed(1)}" height="${height}" fill="#ffffff" stroke="#d8dee6"/><text x="${x + 14}" y="${y + 22}" font-size="15" font-weight="700" fill="#1e2933">${escapeXml(legendTitle || "Legend")}</text>${rows}</g>`;
  }

  function downloadText(filename, text, type) {
    const blob = new Blob([text], { type });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function exportSvg(features, state, options) {
    const spec = buildExportSpec(features, state, options || {});
    const svg = buildSvg(features, state, Object.assign({}, options, { spec }));
    downloadText(`${slugify(spec.metadata.filenameSlug)}.svg`, svg, "image/svg+xml");
  }

  function downloadBlob(filename, blob) {
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
  }

  function exportPng(features, state, options) {
    const requestedSize = getSize({ pngSize: options.pngSize });
    const fallbackSize = { width: 1920, height: 1080 };
    const hardPixelLimit = options.maxPixels || 3840 * 2160;
    const shouldUseFallback = requestedSize.width * requestedSize.height > hardPixelLimit;
    const firstSize = shouldUseFallback ? fallbackSize : requestedSize;
    return renderPng(features, state, options, firstSize, Boolean(shouldUseFallback)).catch((error) => {
      if (firstSize.width === fallbackSize.width && firstSize.height === fallbackSize.height) throw error;
      return renderPng(features, state, Object.assign({}, options, { forceCanvasFailure: false }), fallbackSize, true);
    });
  }

  function createJpegBlob(features, state, options, size) {
    return new Promise((resolve, reject) => {
      const spec = buildExportSpec(features, state, Object.assign({}, options, { pngSize: `${size.width}x${size.height}` }));
      const svg = buildSvg(features, state, Object.assign({}, options, { spec }));
      const image = new Image();
      const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas"); canvas.width = size.width; canvas.height = size.height;
          const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("The browser could not prepare the PDF. Your current map is safe. Try SVG or PNG instead.");
          ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, size.width, size.height); ctx.drawImage(image, 0, 0);
          canvas.toBlob((blob) => { URL.revokeObjectURL(svgUrl); blob ? resolve({ blob, spec, size }) : reject(new Error("The browser could not prepare the PDF. Your current map is safe. Try SVG or PNG instead.")); }, "image/jpeg", 0.92);
        } catch (error) { URL.revokeObjectURL(svgUrl); reject(error); }
      };
      image.onerror = () => { URL.revokeObjectURL(svgUrl); reject(new Error("The PDF preview could not be created. Your current map is safe. Try SVG or PNG instead.")); };
      image.src = svgUrl;
    });
  }

  function pdfAscii(value) {
    return sanitizeText(value, 180).replace(/[^\x20-\x7E]/g, "?").replace(/[()\\]/g, (char) => `\\${char}`);
  }

  async function exportPdf(features, state, options = {}) {
    const ratio = options.ratio === "a3" ? "a3" : "a4";
    const px = ratio === "a3" ? { width: 2480, height: 1754 } : { width: 1754, height: 1240 };
    const rendered = await createJpegBlob(features, state, Object.assign({}, options, { ratio }), px);
    const imageBytes = new Uint8Array(await rendered.blob.arrayBuffer());
    const pt = ratio === "a3" ? { width: 1190.55, height: 841.89 } : { width: 841.89, height: 595.28 };
    const enc = new TextEncoder(); const chunks = []; const offsets = [0]; let length = 0;
    const pushText = (text) => { const bytes = enc.encode(text); chunks.push(bytes); length += bytes.length; };
    const pushBytes = (bytes) => { chunks.push(bytes); length += bytes.length; };
    pushText("%PDF-1.4\n%\xFF\xFF\xFF\xFF\n");
    const object = (number, body) => { offsets[number] = length; pushText(`${number} 0 obj\n${body}\nendobj\n`); };
    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    object(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pt.width} ${pt.height}] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>`);
    const stream = `q\n${pt.width} 0 0 ${pt.height} 0 0 cm\n/Im0 Do\nQ\n`;
    object(4, `<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream`);
    offsets[5] = length; pushText(`5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${px.width} /Height ${px.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`); pushBytes(imageBytes); pushText("\nendstream\nendobj\n");
    object(6, `<< /Title (${pdfAscii(rendered.spec.metadata.title)}) /Subject (${pdfAscii(brand.productName)} ${rendered.spec.boundaryVersion}; ${pdfAscii(rendered.spec.attribution)}) >>`);
    const xrefOffset = length; pushText("xref\n0 7\n0000000000 65535 f \n");
    for (let index = 1; index <= 6; index += 1) pushText(`${String(offsets[index] || 0).padStart(10, "0")} 00000 n \n`);
    pushText(`trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
    downloadBlob(`${slugify(rendered.spec.metadata.filenameSlug)}.pdf`, new Blob(chunks, { type: "application/pdf" }));
    return { size: px, rasterized: true, spec: rendered.spec };
  }

  function exportMappingCsv(rows, state) {
    const boundaryManifest = boundaryProvider.getManifest();
    const lines = [["Source_Row_ID", "Source_Row_Number", "Original_Region", "Original_Province", "Original_Code", "Canonical_Region_ID", "Matched_Display_Name", "Match_Status", "Correction", "Value", "Category", "Visualization_Class", "Visualization_Color", "Boundary_Provider_ID", "Boundary_Version", "Registry_Version"].join(",")];
    const assignments = state.visualization && state.visualization.assignments || {};
    (rows || []).slice().sort((a, b) => Number(a.rowNumber) - Number(b.rowNumber) || String(a.rowId).localeCompare(String(b.rowId))).forEach((row) => {
      const assignment = assignments[row.matchedId] || {};
      const values = [row.rowId, row.rowNumber, row.record && row.record.regionName, row.record && row.record.province, row.record && row.record.regionCode, row.matchedId || "", row.matchedName || "", row.matchStatus || "", row.matchStatus === "user-resolved" ? "yes" : "no", row.record && row.record.numericValue, row.record && row.record.category, row.classKey || assignment.classKey || "", row.color || assignment.color || "", boundaryManifest.providerId, boundaryProvider.getVersion(), boundaryManifest.canonicalRegistryVersion].map((value) => `"${String(value == null ? "" : value).replace(/^[=+@-]/, "'").replace(/"/g, '""')}"`);
      lines.push(values.join(","));
    });
    const filename = `${slugify((state.exportMeta && state.exportMeta.filenameSlug) || brand.defaults.exportFilenamePrefix)}-mapping.csv`;
    downloadText(filename, lines.join("\n"), "text/csv;charset=utf-8");
    return lines.join("\n");
  }

  function renderPng(features, state, options, size, fallbackUsed) {
    return new Promise((resolve, reject) => {
      if (options.forceCanvasFailure) {
        reject(new Error("Simulated canvas failure."));
        return;
      }
      const spec = buildExportSpec(features, state, Object.assign({}, options, { pngSize: `${size.width}x${size.height}` }));
      const svg = buildSvg(features, state, Object.assign({}, options, { spec }));
      const image = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      let pngUrl = null;
      function cleanup() {
        if (pngUrl) URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(url);
      }
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = size.width;
          canvas.height = size.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("The browser could not prepare the PNG. Your current map is safe. Try a smaller size or export SVG.");
          if (!options.transparent) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size.width, size.height);
          }
          ctx.drawImage(image, 0, 0);
          canvas.toBlob((png) => {
            if (!png) {
              cleanup();
              reject(new Error("The browser could not create the PNG. Your current map is safe. Try a smaller size or export SVG."));
              return;
            }
            const link = document.createElement("a");
            pngUrl = URL.createObjectURL(png);
            link.href = pngUrl;
            link.download = `${slugify(spec.metadata.filenameSlug)}.png`;
            link.click();
            cleanup();
            resolve({ fallbackUsed, size });
          }, "image/png");
        } catch (error) {
          cleanup();
          reject(error);
        }
      };
      image.onerror = () => {
        cleanup();
        reject(new Error("The PNG could not be created from the map. Your current map is safe. Try a smaller size or export SVG."));
      };
      image.src = url;
    });
  }

  window.MapExport = { buildSvg, buildExportSpec, exportSvg, exportPng, exportPdf, exportMappingCsv, estimatePngCost, getBounds, slugify };
})();
