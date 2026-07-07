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
    const labelSize = getLabelSize(boundsWidth);
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
      return `<text x="${item.x.toFixed(1)}" y="${item.y.toFixed(1)}" text-anchor="middle" font-size="${labelSize}" paint-order="stroke" stroke="#ffffff" stroke-width="${(labelSize / 4).toFixed(1)}" stroke-linejoin="round" fill="#1e2933">${escapeXml(labelText(item.feature, state))}</text>`;
    }).join("\n");
    const legend = state.legendVisible ? buildLegend(state, size, options.legendFeatures || features) : "";
    const title = buildTitle(state.title, size);
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" role="img" aria-label="${escapeXml(state.title)}">\n${background}\n<g font-family="Arial, Helvetica, sans-serif">${paths}\n${labels}\n${legend}</g>\n${title}\n<text x="${margin}" y="${size.height - 24}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5c6975">Data: geoBoundaries/HDX COD-AB Indonesia ADM2, CC BY-IGO. Batas referensi visual.</text>\n</svg>`;
  }

  function buildTitle(title, size) {
    const text = String(title || "Peta Sorotan Wilayah Indonesia").slice(0, 90);
    const width = Math.min(size.width - 116, Math.max(360, text.length * 18));
    const x = (size.width - width) / 2;
    return `<g><rect x="${x.toFixed(1)}" y="17" width="${width.toFixed(1)}" height="42" rx="6" fill="rgba(255,255,255,0.92)" stroke="#d8dee6"/><text x="${size.width / 2}" y="44" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#1e2933">${escapeXml(text)}</text></g>`;
  }

  function getLabelSize(boundsWidth) {
    return Math.round(clamp(18 + (16 - boundsWidth) * 1.4, 18, 32));
  }

  function placeLabels(features, state, project, size, labelSize) {
    const placed = [];
    return features.slice().sort((a, b) => {
      const ah = Boolean(state.highlights && state.highlights[a.properties.region_id]);
      const bh = Boolean(state.highlights && state.highlights[b.properties.region_id]);
      return Number(bh) - Number(ah);
    }).map((feature) => {
      const c = centroid(feature);
      const p = project(c[0], c[1]);
      const text = labelText(feature, state);
      const width = Math.max(labelSize * 3, text.length * labelSize * 0.58);
      const height = labelSize * 1.25;
      const offsets = [
        [0, 0], [0, -26], [0, 26], [-60, 0], [60, 0],
        [-60, -26], [60, -26], [-60, 26], [60, 26],
        [0, -52], [0, 52], [-120, 0], [120, 0],
        [-120, -52], [120, -52], [-120, 52], [120, 52]
      ];
      let best = null;
      offsets.forEach((offset) => {
        const x = clamp(p.x + offset[0], 18 + width / 2, size.width - 18 - width / 2);
        const y = clamp(p.y + offset[1], 74 + height / 2, size.height - 48 - height / 2);
        const box = labelBox(x, y, width, height);
        const overlap = placed.reduce((total, item) => total + overlapArea(box, item), 0);
        const distance = Math.abs(offset[0]) + Math.abs(offset[1]);
        const candidate = { feature, x, y, box, overlap, distance };
        if (!best || candidate.overlap < best.overlap || (candidate.overlap === best.overlap && candidate.distance < best.distance)) {
          best = candidate;
        }
      });
      placed.push(best.box);
      return best;
    });
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
    return new Promise((resolve, reject) => {
      const size = getSize({ pngSize: options.pngSize });
      const svg = buildSvg(features, state, Object.assign({}, options, { pngSize: options.pngSize }));
      const image = new Image();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      image.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = size.width;
          canvas.height = size.height;
          const ctx = canvas.getContext("2d");
          if (!options.transparent) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, size.width, size.height);
          }
          ctx.drawImage(image, 0, 0);
          canvas.toBlob((png) => {
            if (!png) reject(new Error("Browser tidak dapat membuat PNG."));
            const link = document.createElement("a");
            link.href = URL.createObjectURL(png);
            link.download = "peta-warna-indonesia.png";
            link.click();
            URL.revokeObjectURL(link.href);
            URL.revokeObjectURL(url);
            resolve();
          }, "image/png");
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error("SVG tidak dapat dirender menjadi PNG."));
      image.src = url;
    });
  }

  window.MapExport = { buildSvg, exportSvg, exportPng };
})();
