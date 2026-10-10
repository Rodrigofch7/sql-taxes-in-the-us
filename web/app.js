// Wires the page together: one state object, mirrored in the URL hash.
import * as data from "./data.js";
import { createMap } from "./map.js";
import { DEFAULT_FILTERS, FILTERS, METRICS, format, period } from "./metrics.js";
import { createProfile } from "./profile.js";
import { createScreener } from "./screener.js";

const $ = (selector) => document.querySelector(selector);

const firstDirection = (metric) => (METRICS[metric].lowFirst ? "asc" : "desc");

const DEFAULTS = {
  metric: "effective_tax_rate_agg",
  filters: DEFAULT_FILTERS, // a null value means the user cleared a default
  st: "",
  reliable: false,
  sort: "effective_tax_rate_agg",
  dir: firstDirection("effective_tax_rate_agg"),
  county: "",
  compare: [],
};

// ---- URL hash <-> state ----------------------------------------------------

function readHash() {
  const params = new URLSearchParams(location.hash.slice(1));
  const state = { ...DEFAULTS, filters: { ...DEFAULT_FILTERS }, compare: [] };
  if (METRICS[params.get("m")]) state.metric = params.get("m");
  state.sort = state.metric;
  if (params.get("sort") === "name" || METRICS[params.get("sort")]) state.sort = params.get("sort");
  state.dir = ["asc", "desc"].includes(params.get("dir")) ? params.get("dir")
    : state.sort === "name" ? "asc" : firstDirection(state.sort);
  if (/^\d{2}$/.test(params.get("st") ?? "")) state.st = params.get("st");
  state.reliable = params.get("ok") === "1";
  if (/^\d{5}$/.test(params.get("c") ?? "")) state.county = params.get("c");
  state.compare = (params.get("cmp") ?? "").split(",").filter((g) => /^\d{5}$/.test(g)).slice(0, 3);
  for (const f of FILTERS) {
    if (!params.has(f.key)) continue;
    const value = parseFloat(params.get(f.key));
    state.filters[f.key] = Number.isFinite(value) ? value : null;
  }
  return state;
}

function writeHash(state) {
  const params = new URLSearchParams();
  if (state.metric !== DEFAULTS.metric) params.set("m", state.metric);
  if (state.sort !== state.metric) params.set("sort", state.sort);
  const expected = state.sort === "name" ? "asc" : firstDirection(state.sort);
  if (state.dir !== expected) params.set("dir", state.dir);
  if (state.st) params.set("st", state.st);
  if (state.reliable) params.set("ok", "1");
  for (const f of FILTERS) {
    const value = state.filters[f.key] ?? null;
    if (value !== (f.default ?? null)) params.set(f.key, value === null ? "any" : value);
  }
  if (state.county) params.set("c", state.county);
  if (state.compare.length) params.set("cmp", state.compare.join(","));
  const hash = params.toString();
  history.replaceState(null, "", hash ? `#${hash}` : location.pathname + location.search);
}

const activeFilters = (state) =>
  FILTERS.filter((f) => state.filters[f.key] != null).length + (state.st ? 1 : 0) + (state.reliable ? 1 : 0);

// ---- controls --------------------------------------------------------------

function buildControls(states) {
  const metricSelect = $("#metric");
  for (const [key, metric] of Object.entries(METRICS)) {
    metricSelect.append(new Option(metric.label, key));
  }

  const stateSelect = $("#state");
  stateSelect.append(new Option("All states", ""));
  for (const s of states) stateSelect.append(new Option(s.name, s.state_fips));

  const filterBox = $("#filters");
  for (const f of FILTERS) {
    const label = document.createElement("label");
    label.className = "filter";
    const text = document.createElement("span");
    text.textContent = f.label;
    const field = document.createElement("span");
    field.className = "field";
    const input = document.createElement("input");
    input.type = "number";
    input.step = f.step;
    input.id = `f-${f.key}`;
    input.placeholder = "any";
    input.inputMode = "decimal";
    field.append(input);
    if (f.unit) {
      const unit = document.createElement("em");
      unit.textContent = f.unit;
      field.append(unit);
    }
    label.append(text, field);
    filterBox.append(label);
  }
}

function syncControls(state, meta) {
  $("#metric").value = state.metric;
  $("#metric-note").textContent = METRICS[state.metric].note
    .replaceAll("{from}", period(meta.first_year))
    .replaceAll("{to}", period(meta.latest_year));
  $("#state").value = state.st;
  $("#reliable").checked = state.reliable;
  for (const f of FILTERS) {
    const input = $(`#f-${f.key}`);
    // Leave the box being typed in alone, or the cursor jumps.
    if (document.activeElement !== input) input.value = state.filters[f.key] ?? "";
    input.closest(".filter").classList.toggle("on", state.filters[f.key] != null);
  }
  const n = activeFilters(state);
  $("#filter-count").textContent = n ? `${n} active` : "none active";
}

// Headline numbers for whatever the filters currently let through.
function renderSummary(rows, all, metricKey) {
  const metric = METRICS[metricKey];
  const tiles = [
    ["Counties", format(rows.length, "int"), `of ${format(all.length, "int")}`],
    ["Residents", format(rows.reduce((sum, r) => sum + (r.population ?? 0), 0), "compact"),
      `of ${format(all.reduce((sum, r) => sum + (r.population ?? 0), 0), "compact")}`],
    [`Median ${metric.short.toLowerCase()}`, format(data.median(rows.map((r) => r[metricKey])), metric.fmt),
      `all counties ${format(data.median(all.map((r) => r[metricKey])), metric.fmt)}`],
  ];
  if (metricKey !== "gross_rent_yield") {
    tiles.push(["Median gross yield", format(data.median(rows.map((r) => r.gross_rent_yield)), "pct1"),
      `all counties ${format(data.median(all.map((r) => r.gross_rent_yield)), "pct1")}`]);
  }
  const box = $("#summary");
  box.replaceChildren();
  for (const [label, value, sub] of tiles) {
    const tile = document.createElement("div");
    tile.className = "stat";
    for (const [className, text] of [["stat-label", label], ["stat-value", value], ["stat-sub", sub]]) {
      const el = document.createElement("div");
      el.className = className;
      el.textContent = text;
      tile.append(el);
    }
    box.append(tile);
  }
}

// ---- main ------------------------------------------------------------------

async function main() {
  const status = $("#status");
  let state = readHash();

  const [counties, states, meta] = await Promise.all([
    data.loadCounties(), data.loadStates(), data.loadMeta(),
  ]);
  const countiesById = new Map(counties.map((c) => [c.geoid, c]));

  buildControls(states);
  const names = $("#county-names");
  for (const c of counties) names.append(new Option(c.name));
  $("#vintage").textContent =
    `American Community Survey ${period(meta.latest_year)}; ` +
    `building permits ${meta.permit_years[0]}–${meta.permit_years[1]}. Built ${meta.built}.`;

  const select = (geoid) => update({ county: geoid, compare: [] });

  const map = await createMap({
    container: $("#map"),
    legend: $("#legend"),
    tooltip: $("#map-tooltip"),
    counties,
    onSelect: select,
  });

  const screener = createScreener({
    root: $("#results-panel"),
    countiesById,
    onSort: (sort, dir) => update({ sort, dir }),
    onSelect: select,
  });

  const profile = createProfile({
    root: $("#profile"),
    counties,
    states,
    meta,
    loadTrends: data.trends,
    onClose: () => update({ county: "", compare: [] }),
    onCompare: (compare) => update({ compare }),
  });

  let shown = {};

  function render() {
    writeHash(state);
    syncControls(state, meta);

    if (shown.metric !== state.metric) map.setMetric(state.metric);

    const geoids = data.screen(counties, state.filters, {
      state: state.st, sort: state.sort, dir: state.dir, reliableOnly: state.reliable,
    });
    map.setMatches(geoids.length === counties.length ? null : new Set(geoids));
    renderSummary(geoids.map((g) => countiesById.get(g)), counties, state.metric);
    screener.render({ geoids, metric: state.metric, sort: state.sort, dir: state.dir, selected: state.county });

    const inProfile = Boolean(state.county);
    $("#results-panel").hidden = inProfile;
    $("#profile").hidden = !inProfile;

    if (shown.county !== state.county) {
      map.select(state.county || null, data.tracts).catch((error) => {
        console.error(error);
        status.textContent = "Tract detail could not be loaded for this state.";
        status.hidden = false;
      });
    }
    // Picking a state frames it; leaving a profile returns to the state or country.
    if (!inProfile && (shown.st !== state.st || shown.county)) map.focusState(state.st);

    if (inProfile && (shown.county !== state.county || shown.compare !== state.compare.join())) {
      profile.render(state.county, state.compare);
      if (shown.county !== undefined) $("#profile").scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    shown = { metric: state.metric, st: state.st, county: state.county, compare: state.compare.join() };
  }

  function update(patch) {
    state = { ...state, ...patch };
    render();
  }

  // ---- events ----
  $("#metric").addEventListener("change", (e) =>
    update({ metric: e.target.value, sort: e.target.value, dir: firstDirection(e.target.value) }));
  $("#state").addEventListener("change", (e) => update({ st: e.target.value, county: "", compare: [] }));
  $("#reliable").addEventListener("change", (e) => update({ reliable: e.target.checked }));

  for (const f of FILTERS) {
    let timer;
    // Apply while typing, after a short pause, so there is no need to press Enter.
    $(`#f-${f.key}`).addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const value = parseFloat(e.target.value);
        update({ filters: { ...state.filters, [f.key]: Number.isFinite(value) ? value : null } });
      }, 200);
    });
  }
  $("#reset").addEventListener("click", () => {
    document.activeElement?.blur();
    update({ filters: { ...DEFAULT_FILTERS }, st: "", reliable: false,
      sort: state.metric, dir: firstDirection(state.metric), county: "", compare: [] });
  });
  window.addEventListener("hashchange", () => { state = readHash(); render(); });

  render();
  status.hidden = true;
  document.body.classList.add("ready");
}

main().catch((error) => {
  console.error(error);
  const status = $("#status");
  status.textContent = `The data could not be loaded: ${error.message}`;
  status.classList.add("error");
  status.hidden = false;
});
