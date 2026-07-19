(function () {
  const presentationStyles = window.NusaCanvasPresentationStyles || {
    normal: { unselectedFill: "#edf1f3", unselectedFillOpacity: 0.72, highlightedFillOpacity: 0.78, boundaryColor: "#a6b0b9", boundaryWeight: 0.6, boundaryOpacity: 0.76, highlightOutlineColor: "#4f6472", highlightOutlineWeight: 1.15, selectedOutlineColor: "#172a3a", selectedOutlineWeight: 2.2 },
    presentation: { unselectedFill: "#f1f4f5", unselectedFillOpacity: 0.46, highlightedFillOpacity: 0.82, boundaryColor: "#c0c8ce", boundaryWeight: 0.45, boundaryOpacity: 0.64, highlightOutlineColor: "#405866", highlightOutlineWeight: 1.35, selectedOutlineColor: "#172a3a", selectedOutlineWeight: 2.35 }
  };

  function geometryDetailForZoom(zoom, currentDetail) {
    if (Number(zoom) >= 7) return "detailed";
    if (Number(zoom) <= 5.75) return "lite";
    return currentDetail === "detailed" ? "detailed" : "lite";
  }

  function labelPriority(id, selectedId, highlights, contextIds, presentationView) {
    if (id === selectedId) return 3;
    if (highlights && highlights[id]) return 2;
    if (!presentationView && contextIds && contextIds.has(id)) return 1;
    return 0;
  }

  function normalizeLabelAnchor(row) {
    if (!Array.isArray(row) || row.length < 7) return null;
    const [id, name, type, province, priority, lng, lat] = row;
    if (!id || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
    return { id: String(id), name: String(name || "Region"), type: String(type || "Unresolved"), province: String(province || ""), priority: Number(priority) || 0, lng: Number(lng), lat: Number(lat) };
  }

  function labelFontSize(zoom) {
    if (Number(zoom) < 5.75) return 11;
    if (Number(zoom) < 7.5) return 11;
    return Math.max(11, Math.min(14, Math.round(11 + (Number(zoom) - 7.5) * 1.2)));
  }

  function labelCandidates(anchors, bounds, { zoom, density, selectedId, highlights, presentationView }) {
    const visible = anchors.filter((anchor) => anchor.lng >= bounds.minX && anchor.lng <= bounds.maxX && anchor.lat >= bounds.minY && anchor.lat <= bounds.maxY);
    const rank = (anchor) => anchor.id === selectedId ? 100 : highlights && highlights[anchor.id] ? 90 : anchor.type === "Kota" ? 80 : anchor.priority > 1 ? 70 : 10;
    if (Number(zoom) < 5.75) {
      const provinces = new Map();
      visible.forEach((anchor) => {
        const existing = provinces.get(anchor.province);
        if (!existing || rank(anchor) > rank(existing)) provinces.set(anchor.province, anchor);
      });
      return Array.from(provinces.values()).map((anchor) => Object.assign({}, anchor, { text: anchor.province || anchor.name, rank: rank(anchor) }));
    }
    const mode = presentationView ? "minimal" : density;
    return visible.filter((anchor) => mode === "detailed" || anchor.id === selectedId || (highlights && highlights[anchor.id]) || (mode === "balanced" && (anchor.type === "Kota" || anchor.priority > 1)))
      .map((anchor) => Object.assign({}, anchor, { text: anchor.name, rank: rank(anchor) }))
      .sort((a, b) => b.rank - a.rank || a.name.localeCompare(b.name, "id"));
  }

  function placeLabelsInGrid(labels, cellSize = 64) {
    const grid = new Map();
    const placed = [];
    const key = (x, y) => `${x}:${y}`;
    labels.forEach((label) => {
      const width = Math.max(label.fontSize * 3, label.text.length * label.fontSize * 0.56);
      const height = label.fontSize * 1.25;
      const box = { left: label.x - width / 2 - 3, right: label.x + width / 2 + 3, top: label.y - height / 2 - 3, bottom: label.y + height / 2 + 3 };
      const minX = Math.floor(box.left / cellSize), maxX = Math.floor(box.right / cellSize), minY = Math.floor(box.top / cellSize), maxY = Math.floor(box.bottom / cellSize);
      let overlaps = false;
      for (let x = minX; x <= maxX && !overlaps; x += 1) for (let y = minY; y <= maxY && !overlaps; y += 1) (grid.get(key(x, y)) || []).forEach((other) => { if (!(box.right < other.left || box.left > other.right || box.bottom < other.top || box.top > other.bottom)) overlaps = true; });
      if (overlaps) return;
      placed.push(Object.assign({}, label, { box }));
      for (let x = minX; x <= maxX; x += 1) for (let y = minY; y <= maxY; y += 1) { const bucket = grid.get(key(x, y)) || []; bucket.push(box); grid.set(key(x, y), bucket); }
    });
    return placed;
  }

  function detailProvinceCodesForViewport({ zoom, mobile, selectedProvinceCode, focusedProvinceCodes, visibleProvinceCodes }) {
    if (selectedProvinceCode) return [String(selectedProvinceCode)];
    if (mobile) return [];
    if (Array.isArray(focusedProvinceCodes) && focusedProvinceCodes.length) return focusedProvinceCodes.slice(0, 3).map(String);
    return Number(zoom) >= 7 ? Array.from(new Set(visibleProvinceCodes || [])).slice(0, 3).map(String) : [];
  }

  function createMap(elementId, callbacks) {
    const map = L.map(elementId, { zoomControl: false, attributionControl: false, minZoom: 4, maxZoom: 12, zoomSnap: 0.25, zoomDelta: 0.25, wheelPxPerZoomLevel: 240 });
    L.control.zoom({ position: "topleft" }).addTo(map);
    [["boundaryMeshPane", "410"], ["detailGeometryPane", "415"], ["detailMeshPane", "420"], ["boundaryHighlightPane", "425"], ["boundarySelectionPane", "430"], ["labelCanvasPane", "440"]].forEach(([name, zIndex]) => {
      map.createPane(name);
      map.getPane(name).style.zIndex = zIndex;
      map.getPane(name).style.pointerEvents = "none";
    });
    map.getPane("boundaryMeshPane").dataset.boundaryMesh = "single-pass";

    const baseLayersById = new Map();
    const detailOverlays = new Map();
    let baseGeoLayer = null;
    let baseBoundaryMesh = null;
    let highlightOutlines = null;
    let selectedOutline = null;
    let hoverOutline = null;
    let legendControl = null;
    let legendContainer = null;
    let selectedId = null;
    let baseFeatures = [];
    let highlights = {};
    let contextLabelIds = new Set();
    let presentationView = false;
    let focusedProvinceCodes = [];
    let geometryDetail = "lite";
    let detailChunkData = [];
    let labelCanvas = null;
    let labelAnchors = [];
    let labelDensity = "balanced";
    let labelTimer = null;
    let detailTimer = null;
    let lastDetailKey = "";

    function visual() {
      return presentationView ? presentationStyles.presentation : presentationStyles.normal;
    }

    function styleFeature(feature) {
      const item = highlights[feature.properties.region_id];
      return { fillColor: item ? item.color : visual().unselectedFill, fillOpacity: item ? visual().highlightedFillOpacity : visual().unselectedFillOpacity, stroke: false };
    }

    function meshStyle() {
      return { color: visual().boundaryColor, weight: visual().boundaryWeight, opacity: visual().boundaryOpacity, lineCap: "round", lineJoin: "round", interactive: false, smoothFactor: 0 };
    }

    function coordinateKey(point) { return `${Number(point[0])},${Number(point[1])}`; }

    function addRingSegments(ring, seen, segments, stats) {
      for (let index = 1; index < ring.length; index += 1) {
        const start = ring[index - 1];
        const end = ring[index];
        const startKey = coordinateKey(start);
        const endKey = coordinateKey(end);
        if (startKey === endKey) continue;
        stats.inputSegments += 1;
        const key = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
        if (seen.has(key)) { stats.sharedSegments += 1; continue; }
        seen.add(key);
        segments.push([[start[1], start[0]], [end[1], end[0]]]);
      }
    }

    function buildBoundaryMesh(collection) {
      const seen = new Set();
      const segments = [];
      const stats = { inputSegments: 0, uniqueSegments: 0, sharedSegments: 0 };
      (collection.features || []).forEach((feature) => {
        const geometry = feature.geometry || {};
        if (geometry.type === "Polygon") geometry.coordinates.forEach((ring) => addRingSegments(ring, seen, segments, stats));
        if (geometry.type === "MultiPolygon") geometry.coordinates.forEach((polygon) => polygon.forEach((ring) => addRingSegments(ring, seen, segments, stats)));
      });
      stats.uniqueSegments = segments.length;
      return { segments, stats };
    }

    function removePresentationOutline(kind) {
      const existing = kind === "selected" ? selectedOutline : hoverOutline;
      if (existing) existing.remove();
      if (kind === "selected") selectedOutline = null;
      else hoverOutline = null;
    }

    function showPresentationOutline(feature, kind) {
      removePresentationOutline(kind);
      if (!feature) return;
      const selected = kind === "selected";
      const outline = L.geoJSON(feature, {
        interactive: false,
        pane: "boundarySelectionPane",
        style: { color: selected ? visual().selectedOutlineColor : "#596673", weight: selected ? visual().selectedOutlineWeight : 1.35, opacity: 1, fill: false, lineCap: "round", lineJoin: "round", smoothFactor: 0 }
      }).addTo(map);
      if (selected) selectedOutline = outline;
      else hoverOutline = outline;
    }

    function labelText(feature) {
      const p = feature.properties || {};
      const item = highlights[p.region_id];
      return [p.display_name || p.geometry_source_name || p.region_name || "Region", item && item.category, item && item.value].filter(Boolean).join(" - ");
    }

    function setLayerAccessibility() {
      baseLayersById.forEach((layer) => {
        if (!layer._path) return;
        layer._path.setAttribute("role", "button");
        layer._path.setAttribute("aria-label", labelText(layer.feature));
      });
    }

    function isVisible(layer) { return map.getBounds().intersects(layer.getBounds()); }

    function createLabelCanvas() {
      const CanvasLayer = L.Layer.extend({
        onAdd(targetMap) {
          this._map = targetMap;
          this._canvas = L.DomUtil.create("canvas", "adm2-label-canvas", targetMap.getPane("labelCanvasPane"));
          this._canvas.setAttribute("aria-hidden", "true");
          this._reset();
        },
        onRemove() { if (this._canvas) this._canvas.remove(); this._canvas = null; },
        _reset() {
          const size = this._map.getSize();
          const ratio = window.devicePixelRatio || 1;
          this._canvas.width = Math.round(size.x * ratio); this._canvas.height = Math.round(size.y * ratio);
          this._canvas.style.width = `${size.x}px`; this._canvas.style.height = `${size.y}px`;
          L.DomUtil.setPosition(this._canvas, this._map.containerPointToLayerPoint([0, 0]));
        },
        draw(labels) {
          this._reset();
          const context = this._canvas.getContext("2d");
          const ratio = window.devicePixelRatio || 1;
          context.scale(ratio, ratio);
          context.textAlign = "center"; context.textBaseline = "middle"; context.lineJoin = "round";
          labels.forEach((label) => {
            context.font = `${label.rank >= 90 ? "700 " : "600 "}${label.fontSize}px system-ui, sans-serif`;
            context.strokeStyle = "rgba(255,255,255,.9)"; context.lineWidth = Math.max(2, label.fontSize / 3); context.strokeText(label.text, label.x, label.y);
            context.fillStyle = label.rank >= 90 ? "#102a43" : "#334e5c"; context.fillText(label.text, label.x, label.y);
          });
        }
      });
      return new CanvasLayer();
    }

    function updateCanvasLabels() {
      if (!labelCanvas || !labelAnchors.length) return;
      const bounds = map.getBounds();
      const activeDensity = isMobile() && !selectedId ? "minimal" : labelDensity;
      const candidates = labelCandidates(labelAnchors, { minX: bounds.getWest(), minY: bounds.getSouth(), maxX: bounds.getEast(), maxY: bounds.getNorth() }, {
        zoom: map.getZoom(), density: activeDensity, selectedId, highlights, presentationView
      }).map((label) => {
        const point = map.latLngToContainerPoint([label.lat, label.lng]);
        return Object.assign(label, { x: point.x, y: point.y, fontSize: labelFontSize(map.getZoom()) });
      }).filter((label) => label.x >= -80 && label.y >= -24 && label.x <= map.getSize().x + 80 && label.y <= map.getSize().y + 24);
      const labels = placeLabelsInGrid(candidates);
      labelCanvas.draw(labels);
      map.getContainer().dataset.labelCount = String(labels.length);
      map.getContainer().dataset.labelDensity = presentationView || (isMobile() && !selectedId) ? "minimal" : labelDensity;
    }

    function scheduleLabelUpdate() {
      if (labelTimer) window.clearTimeout(labelTimer);
      labelTimer = window.setTimeout(updateCanvasLabels, 180);
    }

    function loadLabelAnchors() {
      const labelUrl = window.location.pathname.startsWith("/workspace/") ? "../data/indonesia-adm2-label-anchors.json" : "./data/indonesia-adm2-label-anchors.json";
      const load = () => fetch(labelUrl).then((response) => response.ok ? response.json() : null).then((data) => {
        labelAnchors = Array.isArray(data && data.labels) ? data.labels.map(normalizeLabelAnchor).filter(Boolean) : [];
        if (labelAnchors.length !== 519) throw new Error("ADM2 label anchor data is incomplete.");
        scheduleLabelUpdate();
      }).catch(() => {});
      // Keep the map's first interactive frame free of label-data parsing.
      window.setTimeout(load, 750);
    }

    function visibleProvinceCodes() {
      const codes = [];
      baseLayersById.forEach((layer) => {
        if (!isVisible(layer)) return;
        const code = String(layer.feature.properties.province_code || "__unresolved");
        if (!codes.includes(code)) codes.push(code);
      });
      return codes;
    }

    function isMobile() { return Boolean(window.matchMedia && window.matchMedia("(max-width: 860px)").matches); }

    function scheduleDetailViewportRequest() {
      if (detailTimer) window.clearTimeout(detailTimer);
      detailTimer = window.setTimeout(() => {
        const selectedLayer = selectedId && baseLayersById.get(selectedId);
        const provinceCodes = detailProvinceCodesForViewport({
          zoom: map.getZoom(),
          mobile: isMobile(),
          selectedProvinceCode: selectedLayer && (selectedLayer.feature.properties.province_code || "__unresolved"),
          focusedProvinceCodes,
          visibleProvinceCodes: visibleProvinceCodes()
        });
        const key = provinceCodes.join(",");
        if (key === lastDetailKey) return;
        lastDetailKey = key;
        if (callbacks && callbacks.onDetailViewportRequest) {
          Promise.resolve(callbacks.onDetailViewportRequest({ provinceCodes, selectedId, zoom: map.getZoom(), mobile: isMobile() })).catch(() => {});
        }
      }, 300);
    }

    function renderHighlightOutlines() {
      if (highlightOutlines) highlightOutlines.remove();
      const features = baseFeatures.filter((feature) => highlights[feature.properties.region_id]);
      highlightOutlines = features.length ? L.geoJSON({ type: "FeatureCollection", features }, {
        interactive: false,
        pane: "boundaryHighlightPane",
        style: { color: visual().highlightOutlineColor, weight: visual().highlightOutlineWeight, opacity: 0.9, fill: false, lineCap: "round", lineJoin: "round", smoothFactor: 0 }
      }).addTo(map) : null;
    }

    function removeDetailOverlays() {
      detailOverlays.forEach((overlay) => [overlay.geometry, overlay.mesh, overlay.focus].forEach((layer) => layer && layer.remove()));
      detailOverlays.clear();
    }

    function setDetailOverlays(chunks) {
      detailChunkData = chunks || [];
      removeDetailOverlays();
      detailChunkData.forEach((chunk) => {
        if (!chunk || !chunk.provinceCode || !Array.isArray(chunk.features) || !chunk.mesh) return;
        const geometry = L.geoJSON(chunk, { interactive: false, pane: "detailGeometryPane", style: styleFeature }).addTo(map);
        const mesh = L.polyline(chunk.mesh.segments, Object.assign({}, meshStyle(), { pane: "detailMeshPane", renderer: L.canvas({ padding: 0.5, pane: "detailMeshPane" }) })).addTo(map);
        const focusFeatures = chunk.features.filter((feature) => feature.properties.region_id === selectedId || highlights[feature.properties.region_id]);
        const focus = focusFeatures.length ? L.geoJSON({ type: "FeatureCollection", features: focusFeatures }, {
          interactive: false,
          pane: "boundaryHighlightPane",
          style: (feature) => ({ color: feature.properties.region_id === selectedId ? visual().selectedOutlineColor : visual().highlightOutlineColor, weight: feature.properties.region_id === selectedId ? visual().selectedOutlineWeight : visual().highlightOutlineWeight, opacity: 0.92, fill: false, lineCap: "round", lineJoin: "round", smoothFactor: 0 })
        }).addTo(map) : null;
        detailOverlays.set(String(chunk.provinceCode), { geometry, mesh, focus });
      });
      geometryDetail = detailOverlays.size ? "province-overlay" : "lite";
      map.getContainer().dataset.geometryDetail = geometryDetail;
      map.getContainer().dataset.detailOverlayCount = String(detailOverlays.size);
    }

    function render(collection, options = {}) {
      if (baseGeoLayer) return;
      baseFeatures = collection.features || [];
      map.getContainer().dataset.geometryDetail = "lite";
      map.getContainer().dataset.detailOverlayCount = "0";
      baseGeoLayer = L.geoJSON(collection, {
        style: styleFeature,
        onEachFeature(feature, layer) {
          const id = feature.properties.region_id;
          layer.feature = feature;
          baseLayersById.set(id, layer);
          layer.on({
            click() { select(id, true); },
            mouseover() { if (id !== selectedId) showPresentationOutline(feature, "hover"); },
            mouseout() { removePresentationOutline("hover"); }
          });
        }
      }).addTo(map);
      const mesh = buildBoundaryMesh(collection);
      baseBoundaryMesh = L.polyline(mesh.segments, Object.assign({}, meshStyle(), { pane: "boundaryMeshPane", renderer: L.canvas({ padding: 0.5, pane: "boundaryMeshPane" }) })).addTo(map);
      const boundaryProvider = window.NusaCanvasBoundaryProvider && window.NusaCanvasBoundaryProvider.current;
      if (!boundaryProvider) throw new Error("Boundary provider metadata is required before map rendering.");
      window.NusaCanvasBoundaryRendering = Object.freeze({ boundaryVersion: boundaryProvider.getVersion(), strategy: "single-pass-exact-segment-mesh", renderer: "Leaflet Canvas (device-pixel-ratio aware)", geometryDetail: "lite-base", ...mesh.stats });
      labelCanvas = createLabelCanvas().addTo(map);
      map.on("moveend zoomend resize", () => { scheduleLabelUpdate(); scheduleDetailViewportRequest(); });
      if (options.fit !== false) fitIndonesia();
      renderHighlightOutlines();
      setLayerAccessibility();
      loadLabelAnchors();
    }

    function refreshAccessibleLabels() {
      baseLayersById.forEach((layer) => {
        if (layer._path) layer._path.setAttribute("aria-label", labelText(layer.feature));
      });
      scheduleLabelUpdate();
    }

    function fitIndonesia() {
      focusedProvinceCodes = [];
      lastDetailKey = "__reset__";
      if (baseGeoLayer) map.fitBounds(baseGeoLayer.getBounds(), { padding: [20, 20] });
      scheduleDetailViewportRequest();
    }

    function select(id, notify) {
      selectedId = id || null;
      removePresentationOutline("hover");
      removePresentationOutline("selected");
      const layer = selectedId && baseLayersById.get(selectedId);
      if (layer) {
        showPresentationOutline(layer.feature, "selected");
        if (notify && callbacks && callbacks.onSelect) callbacks.onSelect(layer.feature);
      }
      setDetailOverlaysFromCurrent();
      scheduleLabelUpdate();
      scheduleDetailViewportRequest();
    }

    function setDetailOverlaysFromCurrent() { if (detailChunkData.length) setDetailOverlays(detailChunkData); }

    function zoomTo(id) {
      const layer = baseLayersById.get(id);
      if (!layer) return;
      select(id, true);
      map.fitBounds(layer.getBounds(), { padding: [28, 28], maxZoom: 9 });
    }

    function fitProvince(provinceName) {
      if (!provinceName || provinceName === "__all") return fitIndonesia();
      const bounds = [];
      focusedProvinceCodes = [];
      baseFeatures.forEach((feature) => {
        if (feature.properties.province_name !== provinceName) return;
        const layer = baseLayersById.get(feature.properties.region_id);
        if (layer) bounds.push(layer.getBounds());
        const code = String(feature.properties.province_code || "__unresolved");
        if (!focusedProvinceCodes.includes(code)) focusedProvinceCodes.push(code);
      });
      if (!bounds.length) return;
      map.fitBounds(bounds.reduce((acc, item) => acc ? acc.extend(item) : item, null), { padding: [24, 24] });
      lastDetailKey = "__reset__";
      scheduleDetailViewportRequest();
    }

    function setHighlights(next) {
      highlights = next || {};
      baseLayersById.forEach((layer) => layer.setStyle(styleFeature(layer.feature)));
      renderHighlightOutlines();
      refreshAccessibleLabels();
      setDetailOverlaysFromCurrent();
    }

    function setContextLabels(ids) { contextLabelIds = new Set((ids || []).map(String)); scheduleLabelUpdate(); }

    function setLabelDensity(value) { labelDensity = ["minimal", "detailed"].includes(value) ? value : "balanced"; scheduleLabelUpdate(); }

    function setPresentationView(enabled) {
      presentationView = Boolean(enabled);
      map.getContainer().dataset.presentationView = String(presentationView);
      baseLayersById.forEach((layer) => layer.setStyle(styleFeature(layer.feature)));
      if (baseBoundaryMesh) baseBoundaryMesh.setStyle(meshStyle());
      renderHighlightOutlines();
      setDetailOverlaysFromCurrent();
      if (selectedId && baseLayersById.has(selectedId)) showPresentationOutline(baseLayersById.get(selectedId).feature, "selected");
      scheduleLabelUpdate();
    }

    function setLegend(items, visible, position) {
      if (!legendControl) {
        legendControl = L.control({ position: toLeafletPosition(position || "bottom-right") });
        legendControl.onAdd = function () { legendContainer = L.DomUtil.create("div", "map-legend"); L.DomEvent.disableClickPropagation(legendContainer); return legendContainer; };
        legendControl.addTo(map);
      }
      if (legendControl.getPosition() !== toLeafletPosition(position || "bottom-right")) legendControl.setPosition(toLeafletPosition(position || "bottom-right"));
      legendContainer.innerHTML = "";
      legendContainer.style.display = visible !== false && items.length ? "block" : "none";
      if (visible === false || !items.length) return;
      const title = document.createElement("div"); title.className = "map-legend-title"; title.textContent = "Legend";
      const list = document.createElement("div"); list.className = "map-legend-list";
      items.forEach((item) => { const row = document.createElement("div"); row.className = "map-legend-row"; const chip = document.createElement("span"); chip.className = "map-legend-chip"; chip.style.backgroundColor = item.color; const label = document.createElement("span"); label.textContent = item.label; row.append(chip, label); list.appendChild(row); });
      legendContainer.append(title, list);
    }

    function toLeafletPosition(position) { return ({ "top-left": "topleft", "top-right": "topright", "bottom-left": "bottomleft" })[position] || "bottomright"; }

    function getCurrentView() {
      const bounds = map.getBounds();
      const visibleIds = [];
      baseLayersById.forEach((layer, id) => { if (bounds.intersects(layer.getBounds())) visibleIds.push(id); });
      return { bounds: { minX: bounds.getWest(), minY: bounds.getSouth(), maxX: bounds.getEast(), maxY: bounds.getNorth() }, visibleIds };
    }

    function invalidate() { map.invalidateSize(); scheduleLabelUpdate(); scheduleDetailViewportRequest(); }

    return { map, render, fitIndonesia, fitProvince, select, zoomTo, setHighlights, setContextLabels, setLabelDensity, setPresentationView, setLegend, setDetailOverlays, getCurrentView, invalidate, get selectedId() { return selectedId; }, get geometryDetail() { return geometryDetail; }, get detailOverlayCount() { return detailOverlays.size; } };
  }

  window.IndonesiaMap = { createMap, geometryDetailForZoom, labelPriority, detailProvinceCodesForViewport, normalizeLabelAnchor, labelFontSize, labelCandidates, placeLabelsInGrid };
})();
