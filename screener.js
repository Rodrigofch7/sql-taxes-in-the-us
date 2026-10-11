// The results table: sortable, capped for speed, exportable.
import { METRICS, TABLE_COLUMNS, flagsFor, format } from "./metrics.js";

const PAGE = 200;

export function createScreener({ root, countiesById, onSort, onSelect }) {
  const count = root.querySelector("#result-count");
  const table = root.querySelector("#results");
  const more = root.querySelector("#show-more");
  const exportButton = root.querySelector("#export-csv");

  let current = { geoids: [], columns: [], showAll: false };

  function columnsFor(metric) {
    return TABLE_COLUMNS.includes(metric) ? TABLE_COLUMNS : [metric, ...TABLE_COLUMNS];
  }

  function headerCell(key, label, { sort, dir }, numeric) {
    const th = document.createElement("th");
    th.scope = "col";
    if (numeric) th.className = "num";
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    if (sort === key) {
      th.setAttribute("aria-sort", dir === "asc" ? "ascending" : "descending");
      button.textContent += dir === "asc" ? " ▲" : " ▼";
    }
    button.addEventListener("click", () => {
      // Names start A to Z; numbers start from the end an investor wants first.
      const first = key === "name" || METRICS[key].lowFirst ? "asc" : "desc";
      onSort(key, sort === key ? (dir === "asc" ? "desc" : "asc") : first);
    });
    th.append(button);
    return th;
  }

  function render({ geoids, metric, sort, dir, selected }) {
    const columns = columnsFor(metric);
    if (geoids !== current.geoids) current.showAll = false;
    current = { ...current, geoids, columns, metric, sort, dir, selected };

    count.textContent = geoids.length === countiesById.size ? "All counties"
      : `${geoids.length.toLocaleString("en-US")} matching ${geoids.length === 1 ? "county" : "counties"}`;

    const head = document.createElement("tr");
    head.append(headerCell("name", "County", { sort, dir }, false));
    for (const key of columns) head.append(headerCell(key, METRICS[key].short, { sort, dir }, true));
    const thead = document.createElement("thead");
    thead.append(head);

    const tbody = document.createElement("tbody");
    const shown = current.showAll ? geoids : geoids.slice(0, PAGE);
    for (const geoid of shown) {
      const row = countiesById.get(geoid);
      const tr = document.createElement("tr");
      tr.tabIndex = 0;
      if (geoid === selected) tr.className = "selected";

      const name = document.createElement("th");
      name.scope = "row";
      name.textContent = row.name;
      tr.append(name);

      for (const key of columns) {
        const td = document.createElement("td");
        td.className = key === metric ? "num active" : "num";
        td.textContent = format(row[key], METRICS[key].fmt);
        const flags = row[key] == null ? [] : flagsFor(row, key);
        if (flags.length) {
          const mark = document.createElement("span");
          mark.className = "flag-mark";
          mark.textContent = " ⚠";
          mark.title = flags.join(" ");
          mark.setAttribute("aria-label", flags.join(" "));
          td.append(mark);
        }
        tr.append(td);
      }

      tr.addEventListener("click", () => onSelect(geoid));
      tr.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { onSelect(geoid); e.preventDefault(); }
      });
      tbody.append(tr);
    }

    if (!geoids.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = columns.length + 1;
      td.className = "empty";
      td.textContent = "No county passes every filter. Loosen one, or reset, to see results.";
      tr.append(td);
      tbody.append(tr);
    }

    table.replaceChildren(thead, tbody);

    more.hidden = current.showAll || geoids.length <= PAGE;
    more.textContent = `Show all ${geoids.length.toLocaleString("en-US")}`;
    exportButton.disabled = !geoids.length;
  }

  more.addEventListener("click", () => {
    current.showAll = true;
    render(current);
  });

  exportButton.addEventListener("click", () => {
    const keys = Object.keys(METRICS);
    const flagKeys = ["value_topcoded", "rent_topcoded", "low_reliability", "trend_unavailable", "permit_years"];
    const quote = (v) => (v == null ? "" : /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const lines = [["geoid", "name", ...keys, ...flagKeys].join(",")];
    for (const geoid of current.geoids) {
      const row = countiesById.get(geoid);
      lines.push([geoid, row.name, ...keys.map((k) => row[k]), ...flagKeys.map((k) => row[k])].map(quote).join(","));
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    link.download = "counties.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  });

  return { render };
}
