// Loads the exported tables and answers the app's questions about them.
// Everything is small enough to filter and sort in plain JavaScript.
import { FILTERS, METRICS } from "./metrics.js";

const dataUrl = (path) => new URL(`data/${path}`, document.baseURI).href;

async function fetchJson(path) {
  const response = await fetch(dataUrl(path));
  if (!response.ok) throw new Error(`Could not load ${path} (${response.status})`);
  return response.json();
}

// Tables are stored as { columns, rows } to save space; turn rows into objects.
async function table(path) {
  const { columns, rows } = await fetchJson(path);
  return rows.map((row) => {
    const out = {};
    columns.forEach((column, i) => { out[column] = row[i]; });
    return out;
  });
}

export const loadCounties = () => table("county_latest.json");
export const loadStates = () => table("state_latest.json");
export const loadMeta = () => fetchJson("meta.json");

// Geoids of the counties passing the screener, in sorted order.
//   filters   { [FILTERS key]: number in display units }; missing or null = no bound
//   options   { state, sort, dir, reliableOnly }
// A county with no figure for a filtered measure does not pass that filter.
export function screen(counties, filters, { state, sort, dir, reliableOnly }) {
  const tests = [];
  for (const f of FILTERS) {
    const value = filters[f.key];
    if (value === undefined || value === null || Number.isNaN(value)) continue;
    const bound = value * f.scale;
    tests.push(f.op === "<="
      ? (row) => row[f.col] != null && row[f.col] <= bound
      : (row) => row[f.col] != null && row[f.col] >= bound);
  }
  if (state) tests.push((row) => row.state_fips === state);
  if (reliableOnly) tests.push((row) => !row.low_reliability);

  const key = sort === "name" || METRICS[sort] ? sort : "effective_tax_rate_agg";
  const sign = dir === "asc" ? 1 : -1;
  const compare = (a, b) => {
    const x = a[key], y = b[key];
    if (x == null || y == null) return (x == null) - (y == null) || a.name.localeCompare(b.name); // blanks last
    if (x === y) return a.name.localeCompare(b.name);
    return key === "name" ? sign * x.localeCompare(y) : sign * (x - y);
  };

  return counties
    .filter((row) => tests.every((test) => test(row)))
    .sort(compare)
    .map((row) => row.geoid);
}

let trendsByGeoid;

export async function trends(geoids) {
  if (!trendsByGeoid) {
    trendsByGeoid = new Map();
    for (const row of await table("county_trend.json")) {
      if (!trendsByGeoid.has(row.geoid)) trendsByGeoid.set(row.geoid, []);
      trendsByGeoid.get(row.geoid).push(row);
    }
  }
  return geoids.flatMap((geoid) => trendsByGeoid.get(geoid) ?? []);
}

const tractCache = new Map();

export function tracts(stateFips) {
  if (!/^\d{2}$/.test(stateFips)) throw new Error(`Bad state code: ${stateFips}`);
  if (!tractCache.has(stateFips)) {
    tractCache.set(stateFips, table(`tracts/tract_latest_${stateFips}.json`));
  }
  return tractCache.get(stateFips);
}

export function median(values) {
  const sorted = values.filter((v) => v != null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
