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

  function buildLegendItems(state, features) {
    const featureById = new Map((features || []).map((feature) => [feature.properties.region_id, feature]));
    const highlightItems = Object.keys(state.highlights || {}).map((id) => {
      const item = state.highlights[id];
      const feature = featureById.get(id);
      const labelParts = [feature ? displayName(feature) : id];
      if (item.category) labelParts.push(item.category);
      if (item.value) labelParts.push(item.value);
      return {
        color: item.color,
        label: labelParts.join(" - ")
      };
    }).sort((a, b) => a.label.localeCompare(b.label, "id"));
    if (highlightItems.length) return highlightItems;
    return Array.isArray(state.legend) ? state.legend : [];
  }

  function buildSvg(features, state, options) {
    const size = getSize(options);
    const margin = 58;
    const legendWidth = 290;
    const bounds = options.viewBounds || getBounds(features);
    const boundsWidth = Math.max(bounds.maxX - bounds.minX, 0.001);
    const boundsHeight = Math.max(bounds.maxY - bounds.minY, 0.001);
    const scale = Math.min((size.width - margin * 2) / boundsWidth, (size.height - margin * 2 - 70) / boundsHeight);
    const mapWidth = (bounds.maxX - bounds.minX) * scale;
    const mapHeight = (bounds.maxY - bounds.minY) * scale;
    const offsetX = (size.width - mapWidth) / 2;
    const offsetY = 92 + ((size.height - 120 - mapHeight) / 2);
    const project = (x, y) => ({ x: offsetX + (x - bounds.minX) * scale, y: offsetY + (bounds.maxY - y) * scale });
    const background = options.transparent ? "" : `<rect width="100%" height="100%" fill="#ffffff"/>`;
    const paths = features.map((feature) => {
      const id = feature.properties.region_id;
      const item = state.highlights[id];
      const fill = item ? item.color : "#e7ebef";
      const stroke = item ? "#49535d" : "#aeb8c2";
      return `<path d="${pathForGeometry(feature.geometry, project)}" fill="${fill}" stroke="${stroke}" stroke-width="0.75" vector-effect="non-scaling-stroke"><title>${escapeXml(feature.properties.display_name)}</title></path>`;
    }).join("\n");
    const labels = options.labels ? features.map((feature) => {
      const c = centroid(feature);
      const p = project(c[0], c[1]);
      return `<text x="${p.x.toFixed(1)}" y="${p.y.toFixed(1)}" text-anchor="middle" font-size="11" paint-order="stroke" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" fill="#1e2933">${escapeXml(displayName(feature))}</text>`;
    }).join("\n") : "";
    const legend = state.legendVisible ? buildLegend(state, size, legendWidth, options.legendFeatures || features) : "";
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${size.width}" height="${size.height}" viewBox="0 0 ${size.width} ${size.height}" role="img" aria-label="${escapeXml(state.title)}">\n${background}\n<text x="${size.width / 2}" y="44" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#1e2933">${escapeXml(state.title)}</text>\n<g font-family="Arial, Helvetica, sans-serif">${paths}\n${labels}\n${legend}</g>\n<text x="${margin}" y="${size.height - 24}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#5c6975">Data: geoBoundaries/HDX COD-AB Indonesia ADM2, CC BY-IGO. Batas referensi visual.</text>\n</svg>`;
  }

  function buildLegend(state, size, legendWidth, features) {
    const items = buildLegendItems(state, features);
    if (!items.length) return "";
    const rowHeight = 23;
    const maxRows = Math.max(1, Math.floor((size.height - 170) / rowHeight));
    const columns = Math.min(3, Math.ceil(items.length / maxRows));
    const rowsPerColumn = Math.ceil(items.length / columns);
    const columnWidth = legendWidth;
    const width = Math.min(size.width - 116, columnWidth * columns);
    const height = 34 + rowsPerColumn * rowHeight;
    const pos = state.legendPosition || "bottom-right";
    const x = pos.includes("right") ? size.width - width - 58 : 58;
    const y = pos.includes("top") ? 76 : size.height - height - 54;
    const rows = items.map((item, index) => {
      const column = Math.floor(index / rowsPerColumn);
      const row = index % rowsPerColumn;
      const xx = x + column * columnWidth;
      const yy = y + 34 + row * rowHeight;
      return `<rect x="${xx + 14}" y="${yy - 12}" width="14" height="14" fill="${item.color}" stroke="#4b5563"/><text x="${xx + 38}" y="${yy}" font-size="13" fill="#1e2933">${escapeXml(item.label)}</text>`;
    }).join("");
    return `<g><rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#ffffff" stroke="#d8dee6"/><text x="${x + 14}" y="${y + 22}" font-size="15" font-weight="700" fill="#1e2933">Legenda</text>${rows}</g>`;
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
