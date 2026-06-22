(function () {
  const defaultStyle = {
    color: "#aeb8c2",
    weight: 0.8,
    fillColor: "#e7ebef",
    fillOpacity: 0.88
  };

  function createMap(elementId, callbacks) {
    const map = L.map(elementId, {
      zoomControl: true,
      attributionControl: false,
      minZoom: 4,
      maxZoom: 12
    });
    const layersById = new Map();
    let geoLayer = null;
    let legendControl = null;
    let legendContainer = null;
    let selectedId = null;
    let features = [];
    let highlights = {};
    let collisionFrame = null;

    function styleFeature(feature) {
      const id = feature.properties.region_id;
      const item = highlights[id];
      const selected = id === selectedId;
      return {
        color: selected ? "#111827" : (item ? "#49535d" : defaultStyle.color),
        weight: selected ? 2.2 : (item ? 1.2 : defaultStyle.weight),
        fillColor: item ? item.color : defaultStyle.fillColor,
        fillOpacity: item ? 0.82 : defaultStyle.fillOpacity
      };
    }

    function render(collection) {
      features = collection.features;
      if (geoLayer) geoLayer.remove();
      layersById.clear();
      geoLayer = L.geoJSON(collection, {
        style: styleFeature,
        onEachFeature(feature, layer) {
          const id = feature.properties.region_id;
          layersById.set(id, layer);
          layer.bindTooltip(labelText(feature), {
            permanent: true,
            direction: "center",
            className: "region-name-label"
          });
          layer.on({
            click() {
              select(id, true);
            },
            mouseover() {
              if (id !== selectedId) layer.setStyle({ weight: 1.8, color: "#596673" });
            },
            mouseout() {
              layer.setStyle(styleFeature(feature));
            }
          });
        }
      }).addTo(map);
      map.on("zoomend moveend resize", scheduleLabelCollisionUpdate);
      fitIndonesia();
      refreshTooltipLabels();
    }

    function labelText(feature) {
      const p = feature.properties || {};
      const item = highlights[p.region_id];
      const parts = [p.display_name || p.geometry_source_name || p.region_name || "Wilayah"];
      if (item && item.category) parts.push(item.category);
      if (item && item.value) parts.push(item.value);
      return parts.join(" - ");
    }

    function refreshTooltipLabels() {
      layersById.forEach((layer) => {
        const tooltip = layer.getTooltip && layer.getTooltip();
        if (tooltip) tooltip.setContent(labelText(layer.feature));
      });
      scheduleLabelCollisionUpdate();
    }

    function scheduleLabelCollisionUpdate() {
      if (collisionFrame) cancelAnimationFrame(collisionFrame);
      collisionFrame = requestAnimationFrame(updateLabelCollisions);
    }

    function updateLabelCollisions() {
      collisionFrame = null;
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
      if (id && layersById.has(id)) {
        const layer = layersById.get(id);
        layer.setStyle(styleFeature(layer.feature));
        layer.bringToFront();
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
      title.textContent = "Legenda";
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
