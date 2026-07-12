(function () {
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
    if (options.ratio === "1:1") return { width: 1400, height: 1400 };
    return { width: 1600, height: 900 };
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

  function centroid(feature) {
    let sx = 0; let sy = 0; let count = 0;
    walkCoords(feature.geometry, (x, y) => { sx += x; sy += y; count += 1; });
    return count ? [sx / count, sy / count] : [0, 0];
  }

  function displayName(feature) {
    const p = feature.properties || {};
    return p.display_name || p.geometry_source_name || p.region_name || p.region_id || "Wilayah";
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
      "#4472C4": "Group Warna Biru",
      "#5B9BD5": "Group Warna Biru Muda",
      "#E74C3C": "Group Warna Merah",
      "#70AD47": "Group Warna Hijau",
      "#FFC000": "Group Warna Kuning",
      "#A64D79": "Group Warna Ungu",
      "#00A388": "Group Warna Toska",
      "#7F6000": "Group Warna Coklat"
    };
    return names[color] || `Group Warna ${color}`;
  }

  function buildLegendItems(state, features) {
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
    const size = getSize(options);
    const margin = 58;
    const legendAreaHeight = state.legendVisible ? 142 : 72;
    const bounds = options.viewBounds || getBounds(features);
    const boundsWidth = Math.max(bounds.maxX - bounds.minX, 0.001);
    const boundsHeight = Math.max(bounds.maxY - bounds.minY, 0.001);
    const scale = Math.min((size.width - margin * 2) / boundsWidth, (size.height - margin * 2 - legendAreaHeight) / boundsHeight);
    const labelSize = getLabelSize(boundsWidth, boundsHeight, features.length, size);
    const mapWidth = (bounds.maxX - bounds.minX) * scale;
    const mapHeight = (bounds.maxY - bounds.minY) * scale;
    const offsetX = (size.width - mapWidth) / 2;
    const offsetY = 92 + ((size.height - 88 - legendAreaHeight - mapHeight) / 2);
    const project = (x, y) => ({ x: offsetX + (x - bounds.minX) * scale, y: offsetY + (bounds.maxY - y) * scale });
    const background = options.transparent ? "" : `<rect width="100%" height="100%" fill="#97d2e2"/>`;
    const paths = features.map((feature) => {
      const id = feature.properties.region_id;
      const item = state.highlights[id];
      const fill = item ? item.color : "#e7ebef";
      const stroke = item ? "#49535d" : "#aeb8c2";
      return `<path d="${pathForGeometry(feature.geometry, project)}" fill="${fill}" stroke="${stroke}" stroke-width="0.75" vector-effect="non-scaling-stroke"><title>${escapeXml(feature.properties.display_name)}</title></path>`;
    }).join("\n");
    const labelPlacements = options.labels ? placeLabels(features, state, project, size, labelSize) : [];
    const labels = labelPlacements.map((item) => {
      return `<text x="${item.x.toFixed(1)}" y="${item.y.toFixed(1)}" text-anchor="middle" font-size="${item.fontSize}" paint-order="stroke" stroke="#ffffff" stroke-width="${(item.fontSize / 4).toFixed(1)}" stroke-linejoin="round" fill="#1e2933">${escapeXml(labelText(item.feature, state))}</text>`;
    }).join("\n");
    const legend = state.legendVisible ? buildLegend(state, size, options.legendFeatures || features) : "";
    const title = buildTitle(state.title, size);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" role="img" aria-label="${escapeXml(state.title)}">\n${background}\n<metadata>${escapeXml(JSON.stringify({ boundaryVersion: "IDN-ADM2-2020-geoboundaries-22746128", registryVersion: "IDN-ADM-REGISTRY-v1-2025-06-23", featureScope: "519 geometry features; not current autonomous region count", disclaimer: "visual reference only; not a legal boundary determination" }))}</metadata>\n<g font-family="Arial, Helvetica, sans-serif">${paths}\n${labels}\n${legend}</g>\n${title}\n<text x="${margin}" y="${size.height - 40}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5c6975">Data: geoBoundaries/HDX COD-AB ADM2 snapshot 2020; 519 fitur geometri; registry metadata v1 2025.</text>\n<text x="${margin}" y="${size.height - 22}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5c6975">Referensi visual; bukan penetapan batas hukum. Atribusi sumber wajib dipertahankan.</text>\n</svg>`;
  }

  function buildTitle(title, size) {
    const text = String(title || "Peta Sorotan Wilayah Indonesia").slice(0, 90);
    const width = Math.min(size.width - 116, Math.max(360, text.length * 18));
    const x = (size.width - width) / 2;
    return `<g><rect x="${x.toFixed(1)}" y="17" width="${width.toFixed(1)}" height="42" rx="6" fill="rgba(255,255,255,0.92)" stroke="#d8dee6"/><text x="${size.width / 2}" y="44" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#1e2933">${escapeXml(text)}</text></g>`;
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

  function buildLegend(state, size, features) {
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
    return `<g><rect x="${x.toFixed(1)}" y="${y}" width="${width.toFixed(1)}" height="${height}" fill="#ffffff" stroke="#d8dee6"/><text x="${x + 14}" y="${y + 22}" font-size="15" font-weight="700" fill="#1e2933">Legenda Warna</text>${rows}</g>`;
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
    const svg = buildSvg(features, state, options);
    downloadText("peta-warna-indonesia.svg", svg, "image/svg+xml");
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

  function renderPng(features, state, options, size, fallbackUsed) {
    return new Promise((resolve, reject) => {
      if (options.forceCanvasFailure) {
        reject(new Error("Simulasi kegagalan canvas."));
        return;
      }
      const svg = buildSvg(features, state, Object.assign({}, options, { pngSize: `${size.width}x${size.height}` }));
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
          if (!ctx) throw new Error("Browser tidak dapat membuat canvas PNG.");
          if (!options.transparent) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size.width, size.height);
          }
          ctx.drawImage(image, 0, 0);
          canvas.toBlob((png) => {
            if (!png) {
              cleanup();
              reject(new Error("Browser tidak dapat membuat PNG."));
              return;
            }
            const link = document.createElement("a");
            pngUrl = URL.createObjectURL(png);
            link.href = pngUrl;
            link.download = "peta-warna-indonesia.png";
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
        reject(new Error("SVG tidak dapat dirender menjadi PNG."));
      };
      image.src = url;
    });
  }

  window.MapExport = { buildSvg, exportSvg, exportPng, estimatePngCost };
})();
