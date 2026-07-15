(function () {
  const defaultStyle = {
    fillColor: "#e7ebef",
    fillOpacity: 0.88
  };
  const boundaryStyle = {
    color: "#8d9aa6",
    weight: 0.8,
    lineCap: "round",
    lineJoin: "round",
    interactive: false,
    smoothFactor: 0
  };

  function createMap(elementId, callbacks) {
    const map = L.map(elementId, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 4,
      maxZoom: 12,
      zoomSnap: 0.25,
      zoomDelta: 0.25,
      wheelPxPerZoomLevel: 240
    });
    L.control.zoom({ position: "topleft" }).addTo(map);
    map.createPane("boundaryMeshPane");
    map.getPane("boundaryMeshPane").style.zIndex = "410";
    map.getPane("boundaryMeshPane").style.pointerEvents = "none";
    map.getPane("boundaryMeshPane").dataset.boundaryMesh = "single-pass";
    map.createPane("boundarySelectionPane");
    map.getPane("boundarySelectionPane").style.zIndex = "420";
    map.getPane("boundarySelectionPane").style.pointerEvents = "none";
    const layersById = new Map();
    let geoLayer = null;
    let boundaryMesh = null;
    let selectedOutline = null;
    let hoverOutline = null;
    let legendControl = null;
    let legendContainer = null;
    let selectedId = null;
    let features = [];
    let highlights = {};
    let collisionFrame = null;
    let lastLabelUpdate = 0;
    const labelZoomThreshold = window.matchMedia && window.matchMedia("(max-width: 860px)").matches ? 7.25 : 6.5;

    function styleFeature(feature) {
      const id = feature.properties.region_id;
      const item = highlights[id];
      return {
        fillColor: item ? item.color : defaultStyle.fillColor,
        fillOpacity: item ? 0.82 : defaultStyle.fillOpacity,
        stroke: false
      };
    }

    function coordinateKey(point) {
      return `${Number(point[0])},${Number(point[1])}`;
    }

    function addRingSegments(ring, seen, segments, stats) {
      for (let index = 1; index < ring.length; index += 1) {
        const start = ring[index - 1];
        const end = ring[index];
        if (!Array.isArray(start) || !Array.isArray(end)) continue;
        const startKey = coordinateKey(start);
        const endKey = coordinateKey(end);
        if (startKey === endKey) continue;
        stats.inputSegments += 1;
        const key = startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`;
        if (seen.has(key)) {
          stats.sharedSegments += 1;
          continue;
        }
        seen.add(key);
        segments.push([[start[1], start[0]], [end[1], end[0]]]);
      }
    }

    // The source has no topology object. Exact segment de-duplication keeps
    // every coordinate untouched and only draws a shared edge once.
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
        style: {
          color: selected ? "#172a3a" : "#596673",
          weight: selected ? 2.2 : 1.35,
          opacity: 1,
          fill: false,
          lineCap: "round",
          lineJoin: "round",
          smoothFactor: 0
        }
      }).addTo(map);
      if (selected) selectedOutline = outline;
      else hoverOutline = outline;
    }

    function render(collection) {
      features = collection.features;
      if (geoLayer) geoLayer.remove();
      if (boundaryMesh) boundaryMesh.remove();
      removePresentationOutline("selected");
      removePresentationOutline("hover");
      layersById.clear();
      geoLayer = L.geoJSON(collection, {
        style: styleFeature,
        onEachFeature(feature, layer) {
          const id = feature.properties.region_id;
          layer.feature = feature;
          layersById.set(id, layer);
          bindRegionTooltip(layer, false);
          layer.on({
            click() {
              select(id, true);
            },
            mouseover() {
              if (id !== selectedId) showPresentationOutline(feature, "hover");
            },
            mouseout() {
              removePresentationOutline("hover");
            }
          });
        }
      }).addTo(map);
      const mesh = buildBoundaryMesh(collection);
      // Leaflet's Canvas renderer uses the device pixel ratio internally. This
      // keeps the single mesh sharp on high-DPI displays without a second SVG
      // stroke for every administrative polygon.
      const canvasRenderer = L.canvas({ padding: 0.5, pane: "boundaryMeshPane" });
      boundaryMesh = L.polyline(mesh.segments, Object.assign({}, boundaryStyle, {
        pane: "boundaryMeshPane",
        renderer: canvasRenderer || undefined
      })).addTo(map);
      const boundaryProvider = window.NusaCanvasBoundaryProvider && window.NusaCanvasBoundaryProvider.current;
      if (!boundaryProvider) throw new Error("Boundary provider metadata is required before map rendering.");
      window.NusaCanvasBoundaryRendering = Object.freeze({
        boundaryVersion: boundaryProvider.getVersion(),
        strategy: "single-pass-exact-segment-mesh",
        renderer: canvasRenderer ? "Leaflet Canvas (device-pixel-ratio aware)" : "Leaflet SVG fallback",
        ...mesh.stats
      });
      map.on("zoomend moveend resize", scheduleLabelCollisionUpdate);
      fitIndonesia();
      refreshTooltipLabels();
      setLayerAccessibility();
    }

    function labelText(feature) {
      const p = feature.properties || {};
      const item = highlights[p.region_id];
      const parts = [p.display_name || p.geometry_source_name || p.region_name || "Region"];
      if (item && item.category) parts.push(item.category);
      if (item && item.value) parts.push(item.value);
      return parts.join(" - ");
    }

    function refreshTooltipLabels() {
      layersById.forEach((layer) => {
        const tooltip = layer.getTooltip && layer.getTooltip();
        if (tooltip) tooltip.setContent(labelText(layer.feature));
        if (layer._path) layer._path.setAttribute("aria-label", labelText(layer.feature));
      });
      scheduleLabelCollisionUpdate();
    }

    function scheduleLabelCollisionUpdate() {
      if (collisionFrame) cancelAnimationFrame(collisionFrame);
      const now = performance.now();
      const delay = now - lastLabelUpdate < 80 ? 80 : 0;
      collisionFrame = requestAnimationFrame(() => {
        if (delay) window.setTimeout(updateLabelCollisions, delay);
        else updateLabelCollisions();
      });
    }

    function updateLabelCollisions() {
      collisionFrame = null;
      lastLabelUpdate = performance.now();
      updatePermanentLabelCandidates();
      const labels = [];
      layersById.forEach((layer, id) => {
        const tooltip = layer.getTooltip && layer.getTooltip();
        const element = tooltip && tooltip.getElement && tooltip.getElement();
        if (!element) return;
        element.classList.remove("label-hidden");
        const bounds = element.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        labels.push({
          id,
          element,
          bounds,
          highlighted: Boolean(highlights[id]),
          selected: id === selectedId
        });
      });

      // Prioritize selected and highlighted labels, then hide later labels whose boxes overlap.
      labels.sort((a, b) => Number(b.selected) - Number(a.selected) || Number(b.highlighted) - Number(a.highlighted));
      const visible = [];
      labels.forEach((label) => {
        const overlaps = visible.some((item) => boxesOverlap(label.bounds, item.bounds, 4));
        if (overlaps) label.element.classList.add("label-hidden");
        else visible.push(label);
      });
    }

    function updatePermanentLabelCandidates() {
      const zoomAllowsGeneralLabels = map.getZoom() >= labelZoomThreshold;
      layersById.forEach((layer, id) => {
        const shouldBePermanent = id === selectedId || Boolean(highlights[id]) || zoomAllowsGeneralLabels;
        if (layer._labelPermanent !== shouldBePermanent) bindRegionTooltip(layer, shouldBePermanent);
      });
    }

    function bindRegionTooltip(layer, permanent) {
      layer.unbindTooltip();
      layer.bindTooltip(labelText(layer.feature), {
        permanent,
        direction: "center",
        className: "region-name-label"
      });
      layer._labelPermanent = permanent;
    }

    function setLayerAccessibility() {
      layersById.forEach((layer) => {
        if (!layer._path) return;
        layer._path.setAttribute("role", "button");
        layer._path.setAttribute("aria-label", labelText(layer.feature));
      });
    }

    function boxesOverlap(a, b, padding) {
      return !(a.right + padding < b.left || a.left - padding > b.right || a.bottom + padding < b.top || a.top - padding > b.bottom);
    }

    function fitIndonesia() {
      if (geoLayer) map.fitBounds(geoLayer.getBounds(), { padding: [20, 20] });
    }

    function select(id, notify) {
      const previous = selectedId;
      selectedId = id;
      if (previous && layersById.has(previous)) layersById.get(previous).setStyle(styleFeature(layersById.get(previous).feature));
      removePresentationOutline("hover");
      removePresentationOutline("selected");
      if (id && layersById.has(id)) {
        const layer = layersById.get(id);
        layer.setStyle(styleFeature(layer.feature));
        showPresentationOutline(layer.feature, "selected");
        if (notify && callbacks && callbacks.onSelect) callbacks.onSelect(layer.feature);
      }
      scheduleLabelCollisionUpdate();
    }

    function zoomTo(id) {
      const layer = layersById.get(id);
      if (!layer) return;
      select(id, true);
      map.fitBounds(layer.getBounds(), { padding: [28, 28], maxZoom: 9 });
    }

    function fitProvince(provinceName) {
      if (!provinceName || provinceName === "__all") return fitIndonesia();
      const bounds = [];
      features.forEach((feature) => {
        if (feature.properties.province_name === provinceName && layersById.has(feature.properties.region_id)) {
          bounds.push(layersById.get(feature.properties.region_id).getBounds());
        }
      });
      if (!bounds.length) return;
      const merged = bounds.reduce((acc, item) => acc ? acc.extend(item) : item, null);
      map.fitBounds(merged, { padding: [24, 24] });
    }

    function setHighlights(next) {
      highlights = next || {};
      layersById.forEach((layer) => layer.setStyle(styleFeature(layer.feature)));
      refreshTooltipLabels();
    }

    function setLegend(items, visible, position) {
      if (!legendControl) {
        legendControl = L.control({ position: toLeafletPosition(position || "bottom-right") });
        legendControl.onAdd = function () {
          legendContainer = L.DomUtil.create("div", "map-legend");
          L.DomEvent.disableClickPropagation(legendContainer);
          return legendContainer;
        };
        legendControl.addTo(map);
      }
      if (legendControl.getPosition() !== toLeafletPosition(position || "bottom-right")) {
        legendControl.setPosition(toLeafletPosition(position || "bottom-right"));
      }
      renderLegend(items || [], visible !== false);
    }

    function renderLegend(items, visible) {
      if (!legendContainer) return;
      legendContainer.innerHTML = "";
      legendContainer.style.display = visible && items.length ? "block" : "none";
      if (!visible || !items.length) return;
      const title = document.createElement("div");
      title.className = "map-legend-title";
      title.textContent = "Legend";
      legendContainer.appendChild(title);
      const list = document.createElement("div");
      list.className = "map-legend-list";
      items.forEach((item) => {
        const row = document.createElement("div");
        row.className = "map-legend-row";
        const chip = document.createElement("span");
        chip.className = "map-legend-chip";
        chip.style.backgroundColor = item.color;
        const label = document.createElement("span");
        label.textContent = item.label;
        row.append(chip, label);
        list.appendChild(row);
      });
      legendContainer.appendChild(list);
    }

    function toLeafletPosition(position) {
      if (position === "top-left") return "topleft";
      if (position === "top-right") return "topright";
      if (position === "bottom-left") return "bottomleft";
      return "bottomright";
    }

    function getCurrentView() {
      const bounds = map.getBounds();
      const visibleIds = [];
      layersById.forEach((layer, id) => {
        if (bounds.intersects(layer.getBounds())) visibleIds.push(id);
      });
      return {
        bounds: {
          minX: bounds.getWest(),
          minY: bounds.getSouth(),
          maxX: bounds.getEast(),
          maxY: bounds.getNorth()
        },
        visibleIds
      };
    }

    function invalidate() {
      map.invalidateSize();
      scheduleLabelCollisionUpdate();
    }

    return { map, render, fitIndonesia, fitProvince, select, zoomTo, setHighlights, setLegend, getCurrentView, invalidate, get selectedId() { return selectedId; } };
  }

  window.IndonesiaMap = { createMap };
})();
