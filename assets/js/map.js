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

  function detailProvinceCodesForViewport({ zoom, mobile, selectedProvinceCode, focusedProvinceCodes, visibleProvinceCodes }) {
    if (selectedProvinceCode) return [String(selectedProvinceCode)];
    if (mobile) return [];
    if (Array.isArray(focusedProvinceCodes) && focusedProvinceCodes.length) return focusedProvinceCodes.slice(0, 3).map(String);
    return Number(zoom) >= 7 ? Array.from(new Set(visibleProvinceCodes || [])).slice(0, 3).map(String) : [];
  }

  function createMap(elementId, callbacks) {
    const map = L.map(elementId, { zoomControl: false, attributionControl: false, minZoom: 4, maxZoom: 12, zoomSnap: 0.25, zoomDelta: 0.25, wheelPxPerZoomLevel: 240 });
    L.control.zoom({ position: "topleft" }).addTo(map);
    [["boundaryMeshPane", "410"], ["detailGeometryPane", "415"], ["detailMeshPane", "420"], ["boundaryHighlightPane", "425"], ["boundarySelectionPane", "430"]].forEach(([name, zIndex]) => {
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
    let collisionFrame = null;
    let detailTimer = null;
    let lastDetailKey = "";
    let lastLabelUpdate = 0;

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

    function bindRegionTooltip(layer, permanent) {
      layer.unbindTooltip();
      layer.bindTooltip(labelText(layer.feature), { permanent, direction: "center", className: "region-name-label" });
      layer._labelPermanent = permanent;
    }

    function setLayerAccessibility() {
      baseLayersById.forEach((layer) => {
        if (!layer._path) return;
        layer._path.setAttribute("role", "button");
        layer._path.setAttribute("aria-label", labelText(layer.feature));
      });
    }

    function isVisible(layer) { return map.getBounds().intersects(layer.getBounds()); }

    function updatePermanentLabelCandidates() {
      baseLayersById.forEach((layer, id) => {
        const permanent = labelPriority(id, selectedId, highlights, contextLabelIds, presentationView) > 0 && isVisible(layer);
        if (layer._labelPermanent !== permanent) bindRegionTooltip(layer, permanent);
      });
    }

    function updateLabelCollisions() {
      collisionFrame = null;
      lastLabelUpdate = performance.now();
      updatePermanentLabelCandidates();
      const labels = [];
      baseLayersById.forEach((layer, id) => {
        if (!layer._labelPermanent || !isVisible(layer)) return;
        const tooltip = layer.getTooltip && layer.getTooltip();
        const element = tooltip && tooltip.getElement && tooltip.getElement();
        if (!element) return;
        element.classList.remove("label-hidden");
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        labels.push({ element, bounds, priority: labelPriority(id, selectedId, highlights, contextLabelIds, presentationView) });
      });
      labels.sort((a, b) => b.priority - a.priority);
      const visible = [];
      labels.forEach((label) => {
        if (visible.some((item) => boxesOverlap(label.bounds, item.bounds, 4))) label.element.classList.add("label-hidden");
        else visible.push(label);
      });
    }

    function scheduleLabelCollisionUpdate() {
      if (collisionFrame) cancelAnimationFrame(collisionFrame);
      const delay = performance.now() - lastLabelUpdate < 80 ? 80 : 0;
      collisionFrame = requestAnimationFrame(() => delay ? window.setTimeout(updateLabelCollisions, delay) : updateLabelCollisions());
    }

    function boxesOverlap(a, b, padding) {
      return !(a.right + padding < b.left || a.left - padding > b.right || a.bottom + padding < b.top || a.top - padding > b.bottom);
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
          bindRegionTooltip(layer, false);
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
      map.on("moveend resize", () => { scheduleLabelCollisionUpdate(); scheduleDetailViewportRequest(); });
      if (options.fit !== false) fitIndonesia();
      renderHighlightOutlines();
      scheduleLabelCollisionUpdate();
      setLayerAccessibility();
    }

    function refreshTooltipLabels() {
      baseLayersById.forEach((layer) => {
        const tooltip = layer.getTooltip && layer.getTooltip();
        if (tooltip) tooltip.setContent(labelText(layer.feature));
        if (layer._path) layer._path.setAttribute("aria-label", labelText(layer.feature));
      });
      scheduleLabelCollisionUpdate();
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
      scheduleLabelCollisionUpdate();
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
      refreshTooltipLabels();
      setDetailOverlaysFromCurrent();
    }

    function setContextLabels(ids) { contextLabelIds = new Set((ids || []).map(String)); scheduleLabelCollisionUpdate(); }

    function setPresentationView(enabled) {
      presentationView = Boolean(enabled);
      map.getContainer().dataset.presentationView = String(presentationView);
      baseLayersById.forEach((layer) => layer.setStyle(styleFeature(layer.feature)));
      if (baseBoundaryMesh) baseBoundaryMesh.setStyle(meshStyle());
      renderHighlightOutlines();
      setDetailOverlaysFromCurrent();
      if (selectedId && baseLayersById.has(selectedId)) showPresentationOutline(baseLayersById.get(selectedId).feature, "selected");
      scheduleLabelCollisionUpdate();
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

    function invalidate() { map.invalidateSize(); scheduleLabelCollisionUpdate(); scheduleDetailViewportRequest(); }

    return { map, render, fitIndonesia, fitProvince, select, zoomTo, setHighlights, setContextLabels, setPresentationView, setLegend, setDetailOverlays, getCurrentView, invalidate, get selectedId() { return selectedId; }, get geometryDetail() { return geometryDetail; }, get detailOverlayCount() { return detailOverlays.size; } };
  }

  window.IndonesiaMap = { createMap, geometryDetailForZoom, labelPriority, detailProvinceCodesForViewport };
})();
