// The choropleth: counties nationally, tracts for the state of the selected county.
import { METRICS, flagsFor, format } from "./metrics.js";

const BASEMAPS = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

// One blue ramp, light to dark. On a dark surface the anchor flips so the
// lowest class still recedes toward the background.
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#1c5cab", "#0d366b"];
const CLASSES = RAMP.length;

const US_BOUNDS = [[-125, 24], [-66.5, 50]]; // the contiguous states
// Alaska's islands cross the 180th meridian, so its computed box wraps the globe.
const STATE_BOUNDS = { "02": [[-170, 52], [-130, 71.5]] };

const dataUrl = (path) => new URL(`data/${path}`, document.baseURI).href;
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Quantile class breaks, with duplicates dropped so heavily tied metrics
// (many counties permit zero homes) still give strictly rising steps.
function quantileBreaks(values) {
  const sorted = values.filter((v) => v != null && !Number.isNaN(v)).sort((a, b) => a - b);
  if (!sorted.length) return [];
  const breaks = [];
  for (let i = 1; i < CLASSES; i++) {
    const value = sorted[Math.floor((i / CLASSES) * (sorted.length - 1))];
    if (value > sorted[0] && value > (breaks[breaks.length - 1] ?? -Infinity)) breaks.push(value);
  }
  return breaks;
}

function rampFor(count) {
  const ramp = darkQuery.matches ? [...RAMP].reverse() : RAMP;
  if (count >= CLASSES) return ramp;
  // Fewer classes than colours: spread the picks across the whole ramp.
  return Array.from({ length: count }, (_, i) =>
    ramp[Math.round((i * (CLASSES - 1)) / Math.max(1, count - 1))]);
}

async function loadStyle() {
  const background = { id: "background", type: "background", paint: { "background-color": css("--page") } };
  try {
    const response = await fetch(darkQuery.matches ? BASEMAPS.dark : BASEMAPS.light);
    if (!response.ok) throw new Error(response.status);
    return await response.json();
  } catch {
    // No basemap (offline, or the tile host is down): the choropleth still works.
    return { version: 8, sources: {}, layers: [background] };
  }
}

function withProperties(geojson, rowsById) {
  for (const feature of geojson.features) {
    const row = rowsById.get(feature.properties.geoid);
    if (!row) continue;
    for (const [key, value] of Object.entries(row)) {
      // Leave nulls off so the paint expression can test for presence.
      if (value !== null && value !== undefined) feature.properties[key] = value;
    }
  }
  return geojson;
}

export async function createMap({ container, legend, tooltip, counties, onSelect }) {
  const countiesById = new Map(counties.map((c) => [c.geoid, c]));
  const countyGeo = withProperties(await (await fetch(dataUrl("geo/counties.geojson"))).json(), countiesById);
  const tractCache = new Map();

  const state = {
    metric: "effective_tax_rate_agg",
    breaks: [],
    matches: null,     // Set of geoids passing the screener, or null for all
    selected: null,    // county geoid
    tractState: null,  // state fips whose tracts are on the map
    tractRows: new Map(),
  };

  const map = new maplibregl.Map({
    container,
    style: await loadStyle(),
    bounds: US_BOUNDS,
    fitBoundsOptions: { padding: 20 },
    minZoom: 2,
    maxZoom: 13,
    attributionControl: { compact: true },
  });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  map.dragRotate.disable();
  map.touchZoomRotate.disableRotation();

  const tractsOn = () => state.tractState && METRICS[state.metric].tract !== false;

  function fillColor() {
    const colors = rampFor(state.breaks.length + 1);
    const steps = ["step", ["get", state.metric], colors[0]];
    state.breaks.forEach((b, i) => steps.push(b, colors[i + 1]));
    return ["case", ["has", state.metric], state.breaks.length ? steps : colors[0], css("--no-data")];
  }

  function addLayers() {
    // Draw under the basemap's labels so place names stay readable.
    const firstLabel = map.getStyle().layers.find((l) => l.type === "symbol")?.id;

    map.addSource("counties", { type: "geojson", data: countyGeo, promoteId: "geoid" });
    map.addSource("tracts", { type: "geojson", data: { type: "FeatureCollection", features: [] }, promoteId: "geoid" });

    map.addLayer({ id: "county-fill", type: "fill", source: "counties", paint: {} }, firstLabel);
    map.addLayer({ id: "tract-fill", type: "fill", source: "tracts", paint: {} }, firstLabel);
    // Hairlines in the surface colour separate neighbours without adding ink.
    map.addLayer({
      id: "tract-line", type: "line", source: "tracts", minzoom: 8,
      paint: { "line-color": css("--surface"), "line-width": 0.5 },
    }, firstLabel);
    map.addLayer({
      id: "county-line", type: "line", source: "counties",
      paint: { "line-color": css("--surface"), "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.2, 8, 1.2] },
    }, firstLabel);
    map.addLayer({
      id: "county-selected", type: "line", source: "counties",
      filter: ["==", ["get", "geoid"], state.selected ?? ""],
      paint: { "line-color": css("--text"), "line-width": 2.5 },
    });
    repaint();
    applyMatches();
  }

  function repaint() {
    if (!map.getLayer("county-fill")) return;
    const color = fillColor();
    map.setPaintProperty("county-fill", "fill-color", color);
    map.setPaintProperty("county-fill", "fill-opacity",
      ["case", ["boolean", ["feature-state", "dimmed"], false], 0.07, 0.9]);
    map.setPaintProperty("tract-fill", "fill-color", color);
    map.setPaintProperty("tract-fill", "fill-opacity", 0.9);

    // Where tracts are showing, the counties underneath step aside.
    map.setLayoutProperty("tract-fill", "visibility", tractsOn() ? "visible" : "none");
    map.setLayoutProperty("tract-line", "visibility", tractsOn() ? "visible" : "none");
    map.setFilter("county-fill", tractsOn() ? ["!=", ["get", "state_fips"], state.tractState] : null);
    map.setFilter("county-selected", ["==", ["get", "geoid"], state.selected ?? ""]);
    renderLegend();
  }

  function applyMatches() {
    if (!map.getSource("counties")) return;
    for (const county of counties) {
      map.setFeatureState({ source: "counties", id: county.geoid },
        { dimmed: state.matches !== null && !state.matches.has(county.geoid) });
    }
  }

  function renderLegend() {
    const metric = METRICS[state.metric];
    const colors = rampFor(state.breaks.length + 1);
    const div = (className, text) => {
      const el = document.createElement("div");
      el.className = className;
      if (text !== undefined) el.textContent = text;
      return el;
    };
    legend.replaceChildren(div("legend-title", metric.label));

    // A stepped bar, with each class boundary labelled underneath it.
    const bar = div("legend-bar");
    const ticks = div("legend-ticks");
    colors.forEach((color, i) => {
      const step = div("legend-step");
      step.style.background = color;
      bar.append(step);
      if (i < state.breaks.length) {
        const tick = div("legend-tick", format(state.breaks[i], metric.fmt));
        tick.style.left = `${((i + 1) / colors.length) * 100}%`;
        ticks.append(tick);
      }
    });
    legend.append(bar, ticks);

    const none = div("legend-row");
    const swatch = document.createElement("span");
    swatch.className = "swatch";
    swatch.style.background = css("--no-data");
    none.append(swatch, document.createTextNode("No data"));
    legend.append(none);

    legend.append(div("legend-note",
      state.tractState && metric.tract === false
        ? "County-level only: this measure is not published for tracts."
        : tractsOn() ? "Tracts are coloured on the county scale."
        : "Each step holds about a sixth of counties."));
  }

  // ---- hover tooltip -------------------------------------------------------

  function showTooltip(event, row, name) {
    const metric = METRICS[state.metric];
    tooltip.replaceChildren();
    const value = document.createElement("strong");
    value.textContent = format(row?.[state.metric], metric.fmt);
    const label = document.createElement("span");
    label.textContent = ` ${metric.short}`;
    const head = document.createElement("div");
    head.append(value, label);
    const place = document.createElement("div");
    place.className = "muted";
    place.textContent = name;
    tooltip.append(head, place);
    for (const flag of flagsFor(row, state.metric)) {
      const warn = document.createElement("div");
      warn.className = "flag";
      warn.textContent = `⚠ ${flag}`;
      tooltip.append(warn);
    }
    tooltip.hidden = false;
    const box = container.getBoundingClientRect();
    const flip = event.point.x > box.width - 260;
    tooltip.style.left = flip ? "auto" : `${event.point.x + 14}px`;
    tooltip.style.right = flip ? `${box.width - event.point.x + 14}px` : "auto";
    tooltip.style.top = `${event.point.y + 14}px`;
  }

  const hideTooltip = () => { tooltip.hidden = true; map.getCanvas().style.cursor = ""; };

  map.on("mousemove", "county-fill", (e) => {
    const id = e.features[0].properties.geoid;
    map.getCanvas().style.cursor = "pointer";
    showTooltip(e, countiesById.get(id), countiesById.get(id)?.name ?? id);
  });
  map.on("mousemove", "tract-fill", (e) => {
    const id = e.features[0].properties.geoid;
    const row = state.tractRows.get(id);
    map.getCanvas().style.cursor = "pointer";
    // "Census Tract 4012; Autauga County; Alabama" -> "Census Tract 4012, Autauga County"
    const name = row?.name ? row.name.split(/[;,]\s*/).slice(0, 2).join(", ") : `Tract ${id}`;
    showTooltip(e, row, name);
  });
  map.on("mouseleave", "county-fill", hideTooltip);
  map.on("mouseleave", "tract-fill", hideTooltip);

  map.on("click", "county-fill", (e) => onSelect(e.features[0].properties.geoid));
  map.on("click", "tract-fill", (e) => onSelect(e.features[0].properties.geoid.slice(0, 5)));

  // ---- tracts --------------------------------------------------------------

  async function showTracts(stateFips, loadRows) {
    if (state.tractState === stateFips) return;
    if (!tractCache.has(stateFips)) {
      const [geojson, rows] = await Promise.all([
        fetch(dataUrl(`geo/tracts_${stateFips}.geojson`)).then((r) => r.json()),
        loadRows(stateFips),
      ]);
      const rowsById = new Map(rows.map((r) => [r.geoid, r]));
      tractCache.set(stateFips, { geojson: withProperties(geojson, rowsById), rowsById });
    }
    const cached = tractCache.get(stateFips);
    state.tractState = stateFips;
    state.tractRows = cached.rowsById;
    map.getSource("tracts")?.setData(cached.geojson);
    repaint();
  }

  function clearTracts() {
    state.tractState = null;
    state.tractRows = new Map();
    map.getSource("tracts")?.setData({ type: "FeatureCollection", features: [] });
    repaint();
  }

  // The box around every county feature that passes `test`.
  function boundsOf(test) {
    const bounds = new maplibregl.LngLatBounds();
    const walk = (coords) => (typeof coords[0] === "number" ? bounds.extend(coords) : coords.forEach(walk));
    for (const feature of countyGeo.features) {
      if (test(feature.properties)) walk(feature.geometry.coordinates);
    }
    return bounds.isEmpty() ? null : bounds;
  }

  // ---- lifecycle -----------------------------------------------------------

  await new Promise((resolve) => (map.loaded() ? resolve() : map.once("load", resolve)));
  addLayers();

  // Following the system theme means a new basemap and a flipped ramp.
  darkQuery.addEventListener("change", async () => {
    map.setStyle(await loadStyle());
    map.once("style.load", () => {
      addLayers();
      const cached = tractCache.get(state.tractState);
      if (cached) map.getSource("tracts").setData(cached.geojson);
    });
  });

  return {
    setMetric(key) {
      state.metric = key;
      state.breaks = quantileBreaks(counties.map((c) => c[key]));
      repaint();
    },
    setMatches(geoids) {
      state.matches = geoids;
      applyMatches();
    },
    async select(geoid, loadRows) {
      state.selected = geoid;
      if (!geoid) {
        clearTracts();
        return;
      }
      repaint();
      const bounds = boundsOf((p) => p.geoid === geoid);
      if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 10, duration: 600 });
      await showTracts(geoid.slice(0, 2), loadRows);
    },
    // Frame one state, or the whole country when no state is given.
    focusState(stateFips) {
      const bounds = !stateFips ? US_BOUNDS
        : STATE_BOUNDS[stateFips] ?? boundsOf((p) => p.state_fips === stateFips);
      if (bounds) map.fitBounds(bounds, { padding: stateFips ? 40 : 20, duration: 600 });
    },
    resize: () => map.resize(),
    _map: map,
  };
}
