// The county profile: headline tiles, trend charts and a comparison.
import { lineChart } from "./charts.js";
import { METRICS, flagsFor, format, period } from "./metrics.js";
import { summarise } from "./summary.js";

const MAX_COMPARE = 3;

// A percentile within a state only means something with enough counties.
const MIN_COUNTIES_FOR_STATE_RANK = 5;

// Tiles: metric, and the percentile columns that rank it where they exist.
const TILES = [
  { key: "effective_tax_rate_agg", pctl: "tax_rate" },
  { key: "mean_real_estate_taxes_paid" },
  { key: "gross_rent_yield", pctl: "yield" },
  { key: "rental_vacancy_rate" },
  { key: "price_to_income", pctl: "price_to_income" },
  { key: "real_home_value_growth" },
  { key: "population_growth" },
  { key: "permits_per_1000_units", pctl: "permits" },
];

// What the data here cannot tell a buyer. Shown on every profile.
const CHECKLIST = [
  "The tax bill for a non-homestead property, from the county assessor. It can be well above the rate shown here.",
  "An insurance quote. In coastal and storm-prone areas it can exceed the tax bill.",
  "Current asking rents and prices. The figures here are five-year averages and lag the market.",
  "State and local landlord-tenant rules, including any rent regulation.",
  "Your financing cost against the yield: a yield below your mortgage rate loses money on borrowed funds.",
];

const CHARTS = [
  { key: "real_median_home_value", title: "Median home value", fmt: "usd", axisFmt: "usdk" },
  { key: "real_median_rent", title: "Median monthly rent", fmt: "usd", axisFmt: "usd" },
  { key: "real_mean_real_estate_taxes_paid", title: "Average tax bill", fmt: "usd", axisFmt: "usd" },
  { key: "real_median_household_income", title: "Median household income", fmt: "usd", axisFmt: "usdk" },
];

const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

export function createProfile({ root, counties, states, meta, loadTrends, onClose, onCompare }) {
  const countiesById = new Map(counties.map((c) => [c.geoid, c]));
  const byName = new Map(counties.map((c) => [c.name, c.geoid]));
  const statesByFips = new Map(states.map((s) => [s.state_fips, s]));
  const countiesInState = new Map();
  for (const c of counties) countiesInState.set(c.state_fips, (countiesInState.get(c.state_fips) ?? 0) + 1);
  let token = 0;

  const seriesColor = (i) =>
    getComputedStyle(document.documentElement).getPropertyValue(`--series-${i + 1}`).trim();

  function tile({ key, pctl }, county, stateRow) {
    const metric = METRICS[key];
    const box = node("div", "tile");
    box.append(node("div", "tile-label", metric.label));
    const value = node("div", "tile-value", format(county[key], metric.fmt));
    box.append(value);

    const lines = [];
    if (pctl && county[`pctl_us_${pctl}`] != null) {
      lines.push(`Higher than ${Math.round(100 * county[`pctl_us_${pctl}`])}% of US counties`);
      if (county[`pctl_state_${pctl}`] != null
          && countiesInState.get(county.state_fips) >= MIN_COUNTIES_FOR_STATE_RANK) {
        lines.push(`and ${Math.round(100 * county[`pctl_state_${pctl}`])}% in ${county.state_name}`);
      }
    } else if (stateRow?.[key] != null) {
      lines.push(`${county.state_name} overall: ${format(stateRow[key], metric.fmt)}`);
    }
    if (key === "permits_per_1000_units" && county.multifamily_permit_share != null) {
      lines.push(`${format(county.multifamily_permit_share, "pct0")} of permitted homes are in 5+ unit buildings`);
    }
    if (county[key] == null) lines.push("Not published for this county");
    for (const line of lines) box.append(node("div", "tile-sub", line));

    return box;
  }

  function compareControl(county, compare) {
    const wrap = node("div", "compare");
    const chips = node("div", "chips");
    [county.geoid, ...compare].forEach((geoid, i) => {
      const chip = node("span", "chip");
      const key = node("span", "line-key");
      key.style.background = seriesColor(i);
      chip.append(key, node("span", null, countiesById.get(geoid)?.name ?? geoid));
      if (i > 0) {
        const remove = node("button", "chip-remove", "×");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${countiesById.get(geoid)?.name ?? geoid}`);
        remove.addEventListener("click", () => onCompare(compare.filter((g) => g !== geoid)));
        chip.append(remove);
      }
      chips.append(chip);
    });
    wrap.append(chips);

    if (compare.length < MAX_COMPARE) {
      const label = node("label", "compare-add");
      label.append(node("span", null, "Compare with"));
      const input = node("input");
      input.type = "search";
      input.placeholder = "Type a county name";
      input.setAttribute("list", "county-names");
      // Re-rendering removes this input while it has focus, which makes the
      // browser fire a second change event halfway through. Take only the first.
      let added = false;
      input.addEventListener("change", () => {
        const geoid = byName.get(input.value);
        if (added || !geoid || geoid === county.geoid || compare.includes(geoid)) return;
        added = true;
        onCompare([...compare, geoid]);
      });
      label.append(input);
      wrap.append(label);
    }
    return wrap;
  }

  function trendTable(series) {
    const details = node("details", "table-view");
    details.append(node("summary", null, "Show these figures as a table"));
    const table = node("table");
    const head = node("tr");
    head.append(node("th", null, "County"), node("th", null, "Year"));
    for (const chart of CHARTS) head.append(node("th", "num", chart.title));
    const thead = node("thead");
    thead.append(head);
    const tbody = node("tbody");
    for (const s of series) {
      for (const row of s.rows) {
        const tr = node("tr");
        tr.append(node("th", null, s.name), node("td", null, String(row.year)));
        for (const chart of CHARTS) tr.append(node("td", "num", format(row[chart.key], chart.fmt)));
        tbody.append(tr);
      }
    }
    table.append(thead, tbody);
    details.append(table);
    return details;
  }

  async function render(geoid, compare) {
    const mine = ++token;
    const county = countiesById.get(geoid);
    if (!county) {
      root.replaceChildren(node("p", "muted", "That county is not in the data."));
      return;
    }
    const stateRow = statesByFips.get(county.state_fips);

    const header = node("div", "profile-head");
    const back = node("button", "back", "← All results");
    back.type = "button";
    back.addEventListener("click", onClose);
    const title = node("h2", null, county.name);
    header.append(back, title);

    const facts = node("p", "muted",
      `${format(county.population, "int")} residents · median home ${format(county.median_home_value, "usd")} · ` +
      `median rent ${format(county.median_contract_rent, "usd")} · median household income ${format(county.median_household_income, "usd")}`);

    const summary = node("p", "summary-text", summarise(county, stateRow, meta).join(" "));

    const tiles = node("div", "tiles");
    for (const t of TILES) tiles.append(tile(t, county, stateRow));

    // Each warning once, above the figures it applies to.
    const warnings = node("div", "warnings");
    const seen = new Set(TILES.flatMap((t) => (county[t.key] == null ? [] : flagsFor(county, t.key))));
    for (const flag of seen) warnings.append(node("p", "flag", `⚠ ${flag}`));

    const trendHead = node("h3", null, `Trends, ${period(meta.first_year)} to ${period(meta.latest_year)}`);
    const trendNote = node("p", "muted",
      `Each point is a five-year survey period ending in that year, in ${meta.latest_year} dollars.`);
    const charts = node("div", "charts");
    const chartBoxes = CHARTS.map(() => node("div", "chart"));
    charts.append(...chartBoxes);

    const checkHead = node("h3", null, "Check before you act");
    const checklist = node("ul", "checklist");
    for (const item of CHECKLIST) checklist.append(node("li", null, item));

    root.replaceChildren(header, facts, summary, warnings, tiles, trendHead, trendNote,
      compareControl(county, compare), charts, checkHead, checklist);

    const geoids = [geoid, ...compare];
    const rows = await loadTrends(geoids);
    if (mine !== token) return; // a newer selection replaced this one

    const series = geoids.map((g, i) => ({
      name: countiesById.get(g)?.name ?? g,
      color: seriesColor(i),
      rows: rows.filter((r) => r.geoid === g),
    }));

    if (county.trend_unavailable) {
      trendNote.textContent =
        `No trend for this county: its boundaries changed after ${meta.first_year}, ` +
        "so earlier figures describe a different area. Connecticut moved from counties to planning regions in 2022.";
    }

    CHARTS.forEach((chart, i) => {
      lineChart(chartBoxes[i], {
        title: chart.title,
        fmt: chart.fmt,
        axisFmt: chart.axisFmt,
        series: series.map((s) => ({
          name: s.name,
          color: s.color,
          // A county with no first-year row has no comparable history.
          points: s.rows.filter((r) => !r.trend_unavailable || r.year === meta.latest_year)
            .map((r) => ({ x: r.year, y: r[chart.key] })),
        })),
      });
    });
    charts.after(trendTable(series));
  }

  return { render };
}
