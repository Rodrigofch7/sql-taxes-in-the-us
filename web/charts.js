// A small SVG line chart: one measure, a few series, a handful of years.
// Built with DOM calls and textContent only; names come from data files.
import { format } from "./metrics.js";

const SVG = "http://www.w3.org/2000/svg";

function el(name, attrs = {}, text) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

// Round tick values covering [min, max] in about `count` steps.
function niceTicks(min, max, count = 4) {
  if (min === max) { min *= 0.9; max = max * 1.1 || 1; }
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
  const ticks = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 0.999; v += step) ticks.push(v);
  return ticks;
}

// series: [{ name, color, points: [{ x, y }] }]   x is a year, y may be null.
export function lineChart(container, { title, series, fmt, axisFmt }) {
  container.replaceChildren();

  const heading = document.createElement("h4");
  heading.textContent = title;
  container.append(heading);

  const values = series.flatMap((s) => s.points.map((p) => p.y)).filter((y) => y != null);
  if (!values.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No data for these years.";
    container.append(empty);
    return;
  }

  const width = 320, height = 180;
  const margin = { top: 12, right: 14, bottom: 24, left: 46 };
  const years = [...new Set(series.flatMap((s) => s.points.map((p) => p.x)))].sort();
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const y0 = ticks[0], y1 = ticks[ticks.length - 1];

  const x = (year) => margin.left + (years.length === 1 ? 0.5
    : (year - years[0]) / (years[years.length - 1] - years[0])) * (width - margin.left - margin.right);
  const y = (value) => height - margin.bottom - ((value - y0) / (y1 - y0)) * (height - margin.top - margin.bottom);

  const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": title });

  for (const tick of ticks) {
    svg.append(el("line", { class: "grid", x1: margin.left, x2: width - margin.right, y1: y(tick), y2: y(tick) }));
    svg.append(el("text", { class: "tick", x: margin.left - 6, y: y(tick), dy: "0.32em", "text-anchor": "end" }, format(tick, axisFmt ?? fmt)));
  }
  for (const year of years) {
    svg.append(el("text", { class: "tick", x: x(year), y: height - 6, "text-anchor": "middle" }, year));
  }

  const crosshair = el("line", { class: "crosshair", y1: margin.top, y2: height - margin.bottom, visibility: "hidden" });
  svg.append(crosshair);

  for (const s of series) {
    const points = s.points.filter((p) => p.y != null);
    if (points.length > 1) {
      svg.append(el("path", {
        class: "line", stroke: s.color,
        d: points.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(""),
      }));
    }
    for (const p of points) {
      svg.append(el("circle", { class: "dot", cx: x(p.x), cy: y(p.y), r: 4, fill: s.color }));
    }
  }

  // One tooltip listing every series at the nearest year.
  const tip = document.createElement("div");
  tip.className = "tooltip";
  tip.hidden = true;

  function show(year) {
    crosshair.setAttribute("x1", x(year));
    crosshair.setAttribute("x2", x(year));
    crosshair.setAttribute("visibility", "visible");
    tip.replaceChildren();
    const head = document.createElement("div");
    head.className = "tooltip-head";
    head.textContent = year;
    tip.append(head);
    for (const s of series) {
      const point = s.points.find((p) => p.x === year);
      const row = document.createElement("div");
      row.className = "tooltip-row";
      const key = document.createElement("span");
      key.className = "line-key";
      key.style.background = s.color;
      const value = document.createElement("strong");
      value.textContent = format(point?.y, fmt);
      const name = document.createElement("span");
      name.textContent = s.name;
      row.append(key, value, name);
      tip.append(row);
    }
    tip.hidden = false;
    const left = (x(year) / width) * 100;
    tip.style.left = left > 55 ? "auto" : `calc(${left}% + 10px)`;
    tip.style.right = left > 55 ? `calc(${100 - left}% + 10px)` : "auto";
  }

  function hide() {
    crosshair.setAttribute("visibility", "hidden");
    tip.hidden = true;
  }

  const nearestYear = (clientX) => {
    const box = svg.getBoundingClientRect();
    const px = ((clientX - box.left) / box.width) * width;
    return years.reduce((best, year) => (Math.abs(x(year) - px) < Math.abs(x(best) - px) ? year : best));
  };

  let focused = 0;
  svg.setAttribute("tabindex", "0");
  svg.addEventListener("pointermove", (e) => show(nearestYear(e.clientX)));
  svg.addEventListener("pointerleave", hide);
  svg.addEventListener("focus", () => show(years[focused]));
  svg.addEventListener("blur", hide);
  svg.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    focused = Math.max(0, Math.min(years.length - 1, focused + (e.key === "ArrowRight" ? 1 : -1)));
    show(years[focused]);
    e.preventDefault();
  });

  const plot = document.createElement("div");
  plot.className = "plot";
  plot.append(svg, tip);
  container.append(plot);
}
