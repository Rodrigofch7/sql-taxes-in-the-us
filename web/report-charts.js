// Charts for the Findings report. Each takes a container and a chart spec
// from findings.json ({ type, title, rows, ... }) and draws SVG at the
// container's width, so text stays the same size on a phone and a desktop.
//
// Row shapes, by type:
//   bars     { label, value, sub }
//   strip    { label, value, labelled }
//   range    { label, lo, hi, mid, lo_name, hi_name }
//   scatter  { x, y, grp, name, labelled }
//   lines    { x, series, y }
import { format } from "./metrics.js";

const SVG = "http://www.w3.org/2000/svg";
const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];
const QUIET = "var(--quiet)";

function svgEl(name, attrs = {}, text) {
  const node = document.createElementNS(SVG, name);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function htmlEl(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Round tick values covering [min, max] in about `count` steps.
function niceTicks(min, max, count = 5) {
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * power).find((s) => s >= raw);
  const ticks = [];
  for (let v = Math.floor(min / step) * step; v <= max + step * 1e-9; v += step) ticks.push(+v.toPrecision(12));
  if (ticks[ticks.length - 1] < max) ticks.push(+(ticks[ticks.length - 1] + step).toPrecision(12));
  return ticks;
}

const linear = (d0, d1, r0, r1) => (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
const textWidth = (text, size = 12) => String(text).length * size * 0.56;

// One tooltip per chart: value first, then what it is.
function tooltip(plot) {
  const tip = htmlEl("div", "rc-tip");
  tip.hidden = true;
  plot.append(tip);
  return {
    show(x, y, lines) {
      tip.replaceChildren();
      for (const [strong, rest, color] of lines) {
        const row = htmlEl("div", "rc-tip-row");
        if (color) {
          const key = htmlEl("span", "rc-key");
          key.style.background = color;
          row.append(key);
        }
        if (strong) row.append(htmlEl("strong", null, strong));
        if (rest) row.append(htmlEl("span", null, rest));
        tip.append(row);
      }
      tip.hidden = false;
      const width = plot.clientWidth;
      const flip = x > width * 0.6;
      tip.style.left = flip ? "auto" : `${x + 12}px`;
      tip.style.right = flip ? `${width - x + 12}px` : "auto";
      tip.style.top = `${Math.max(0, y - 10)}px`;
    },
    hide() { tip.hidden = true; },
  };
}

function legend(container, items) {
  const box = htmlEl("div", "rc-legend");
  for (const { label, color, shape } of items) {
    const item = htmlEl("span", "rc-legend-item");
    const key = htmlEl("span", `rc-swatch rc-${shape ?? "dot"}`);
    key.style.background = color;
    item.append(key, htmlEl("span", null, label));
    box.append(item);
  }
  container.append(box);
}

function frame(container, width, height, label) {
  const plot = htmlEl("div", "rc-plot");
  const svg = svgEl("svg", { width, height, viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": label });
  plot.append(svg);
  container.append(plot);
  return { plot, svg, tip: tooltip(plot) };
}

const pointer = (event, plot) => {
  const box = plot.getBoundingClientRect();
  return [event.clientX - box.left, event.clientY - box.top];
};

// ---- bars: a few ordered groups, one value each ------------------------------

function bars(container, spec, width) {
  const rows = spec.rows;
  const rowHeight = 52, top = 4;
  const height = top + rows.length * rowHeight;
  const { svg, plot, tip } = frame(container, width, height, spec.title);
  const max = Math.max(...rows.map((r) => r.value));
  const valueRoom = 56;
  const x = linear(0, max, 0, width - valueRoom);

  rows.forEach((row, i) => {
    const y = top + i * rowHeight;
    svg.append(svgEl("text", { class: "rc-label", x: 0, y: y + 13 }, row.label));
    if (row.sub) {
      svg.append(svgEl("text", { class: "rc-sub", x: textWidth(row.label, 13) + 14, y: y + 13 }, row.sub));
    }
    const w = Math.max(2, x(row.value));
    // Square at the baseline, rounded at the data end.
    svg.append(svgEl("path", {
      class: "rc-bar", fill: SERIES[0],
      d: `M0,${y + 22} h${w - 4} a4,4 0 0 1 4,4 v8 a4,4 0 0 1 -4,4 h${-(w - 4)} z`,
    }));
    svg.append(svgEl("text", { class: "rc-value", x: w + 8, y: y + 35 }, format(row.value, spec.fmt)));
    const hit = svgEl("rect", { class: "rc-hit", x: 0, y, width, height: rowHeight - 4, tabindex: 0 });
    const show = () => tip.show(Math.min(w, width - 160), y + 6, [[format(row.value, spec.fmt), row.label], [null, row.sub]]);
    hit.addEventListener("pointermove", show);
    hit.addEventListener("focus", show);
    hit.addEventListener("pointerleave", tip.hide);
    hit.addEventListener("blur", tip.hide);
    svg.append(hit);
  });
  plot.dataset.type = "bars";
}

// ---- strip: every item as a dot on one axis ----------------------------------

function strip(container, spec, width) {
  const rows = [...spec.rows].sort((a, b) => a.value - b.value);
  const margin = { left: 22, right: 26 };
  const ticks = niceTicks(0, Math.max(...rows.map((r) => r.value)), width < 480 ? 4 : 6);
  const x = linear(0, ticks[ticks.length - 1], margin.left, width - margin.right);
  const radius = 5.5;

  // Labels sit above the dots, on as many levels as it takes not to collide.
  const labelled = rows.filter((r) => r.labelled);
  const levels = [];
  for (const row of labelled) {
    const text = `${row.label} ${format(row.value, spec.fmt)}`;
    const w = textWidth(text, 12) + 10;
    const cx = Math.min(Math.max(x(row.value), w / 2), width - w / 2);
    let level = 0;
    while ((levels[level] ?? []).some((other) => Math.abs(other.cx - cx) < (other.w + w) / 2)) level++;
    (levels[level] ??= []).push({ cx, w });
    Object.assign(row, { text, cx, level });
  }
  const labelSpace = levels.length * 18 + 10;
  const swarm = 84;
  const axisY = labelSpace + swarm;
  const height = axisY + 26;
  const { svg, plot, tip } = frame(container, width, height, spec.title);

  svg.append(svgEl("line", { class: "rc-axis", x1: margin.left, x2: width - margin.right, y1: axisY, y2: axisY }));
  for (const tick of ticks) {
    svg.append(svgEl("line", { class: "rc-grid", x1: x(tick), x2: x(tick), y1: labelSpace, y2: axisY }));
    svg.append(svgEl("text", { class: "rc-tick", x: x(tick), y: axisY + 16, "text-anchor": "middle" }, format(tick, spec.axis_fmt ?? spec.fmt)));
  }

  // Dots that would overlap are nudged up or down, nearest free slot first.
  const placed = [];
  const centre = labelSpace + swarm / 2;
  for (const row of rows) {
    const cx = x(row.value);
    let cy = centre;
    for (const offset of [0, -12, 12, -24, 24, -36, 36]) {
      cy = centre + offset;
      if (!placed.some((p) => Math.hypot(p.cx - cx, p.cy - cy) < radius * 2 + 1)) break;
    }
    placed.push({ cx, cy });
    Object.assign(row, { px: cx, py: cy });
  }

  for (const row of labelled) {
    const y = labelSpace - 8 - row.level * 18;
    svg.append(svgEl("line", { class: "rc-leader", x1: row.px, x2: row.px, y1: y + 4, y2: row.py - radius - 2 }));
    svg.append(svgEl("text", { class: "rc-label rc-halo", x: row.cx, y, "text-anchor": "middle" }, row.text));
  }
  for (const row of rows) {
    const dot = svgEl("circle", {
      class: "rc-dot", cx: row.px, cy: row.py, r: radius, fill: SERIES[0],
      "fill-opacity": row.labelled ? 1 : 0.42, tabindex: 0,
    });
    const show = () => tip.show(row.px, row.py, [[format(row.value, spec.fmt), row.label]]);
    dot.addEventListener("pointermove", show);
    dot.addEventListener("focus", show);
    dot.addEventListener("pointerleave", tip.hide);
    dot.addEventListener("blur", tip.hide);
    svg.append(dot);
  }
  plot.dataset.type = "strip";
}

// ---- range: lowest and highest for each row, with a marker between -----------

function range(container, spec, width) {
  const rows = spec.rows;
  legend(container, [
    { label: spec.legend.lo, color: SERIES[0] },
    { label: spec.legend.hi, color: SERIES[1] },
    { label: spec.legend.mid, color: "var(--text)", shape: "tick" },
  ]);
  const labelWidth = Math.min(150, Math.max(...rows.map((r) => textWidth(r.label, 13))) + 12);
  const margin = { left: labelWidth, right: 26, top: 6 };
  const rowHeight = 26;
  const axisY = margin.top + rows.length * rowHeight + 4;
  const height = axisY + 24;
  const { svg, plot, tip } = frame(container, width, height, spec.title);
  const ticks = niceTicks(0, Math.max(...rows.map((r) => r.hi)), width < 480 ? 3 : 5);
  const x = linear(0, ticks[ticks.length - 1], margin.left, width - margin.right);

  for (const tick of ticks) {
    svg.append(svgEl("line", { class: "rc-grid", x1: x(tick), x2: x(tick), y1: margin.top, y2: axisY }));
    svg.append(svgEl("text", { class: "rc-tick", x: x(tick), y: axisY + 16, "text-anchor": "middle" }, format(tick, spec.axis_fmt ?? spec.fmt)));
  }
  rows.forEach((row, i) => {
    const y = margin.top + i * rowHeight + rowHeight / 2;
    svg.append(svgEl("text", { class: i === 0 ? "rc-label rc-strong" : "rc-label", x: 0, y: y + 4 }, row.label));
    svg.append(svgEl("line", { class: "rc-span", x1: x(row.lo), x2: x(row.hi), y1: y, y2: y }));
    svg.append(svgEl("line", { class: "rc-mid", x1: x(row.mid), x2: x(row.mid), y1: y - 7, y2: y + 7 }));
    svg.append(svgEl("circle", { class: "rc-dot", cx: x(row.lo), cy: y, r: 5.5, fill: SERIES[0] }));
    svg.append(svgEl("circle", { class: "rc-dot", cx: x(row.hi), cy: y, r: 5.5, fill: SERIES[1] }));
    const hit = svgEl("rect", { class: "rc-hit", x: 0, y: y - rowHeight / 2, width, height: rowHeight, tabindex: 0 });
    const show = () => tip.show(x(row.mid), y - rowHeight / 2, [
      [null, row.label],
      [format(row.lo, spec.fmt), row.lo_name, SERIES[0]],
      [format(row.hi, spec.fmt), row.hi_name, SERIES[1]],
      [format(row.mid, spec.fmt), spec.legend.mid, "var(--text)"],
    ]);
    hit.addEventListener("pointermove", show);
    hit.addEventListener("focus", show);
    hit.addEventListener("pointerleave", tip.hide);
    hit.addEventListener("blur", tip.hide);
    svg.append(hit);
  });
  plot.dataset.type = "range";
}

// ---- scatter: one dot per county, a few groups picked out --------------------

function scatter(container, spec, width) {
  const rows = spec.rows;
  const keys = Object.keys(spec.groups);
  // The first group is the background crowd; the others take series colours.
  const color = (grp) => (grp === keys[0] ? QUIET : SERIES[keys.indexOf(grp) - 1]);
  legend(container, keys.map((key) => ({ label: spec.groups[key], color: color(key) })));

  const narrow = width < 480;
  const margin = { left: 52, right: 28, top: 34, bottom: 44 };
  const height = narrow ? 340 : 440;
  const { svg, plot, tip } = frame(container, width, height, spec.title);
  const xs = rows.map((r) => r.x), ys = rows.map((r) => r.y);
  const xTicks = niceTicks(Math.min(0, ...xs), Math.max(...xs), narrow ? 4 : 6);
  const yTicks = niceTicks(Math.min(0, ...ys), Math.max(...ys), 5);
  const x = linear(xTicks[0], xTicks[xTicks.length - 1], margin.left, width - margin.right);
  const y = linear(yTicks[0], yTicks[yTicks.length - 1], height - margin.bottom, margin.top);

  for (const tick of yTicks) {
    svg.append(svgEl("line", { class: "rc-grid", x1: margin.left, x2: width - margin.right, y1: y(tick), y2: y(tick) }));
    svg.append(svgEl("text", { class: "rc-tick", x: margin.left - 8, y: y(tick) + 4, "text-anchor": "end" }, format(tick, spec.y_fmt)));
  }
  for (const tick of xTicks) {
    svg.append(svgEl("text", { class: "rc-tick", x: x(tick), y: height - margin.bottom + 16, "text-anchor": "middle" }, format(tick, spec.x_fmt)));
  }
  svg.append(svgEl("text", { class: "rc-axis-title", x: (margin.left + width - margin.right) / 2, y: height - 6, "text-anchor": "middle" }, spec.x_label));
  svg.append(svgEl("text", { class: "rc-axis-title", x: 0, y: 12 }, spec.y_label));

  if (spec.zero_lines) {
    svg.append(svgEl("line", { class: "rc-axis", x1: margin.left, x2: width - margin.right, y1: y(0), y2: y(0) }));
    svg.append(svgEl("line", { class: "rc-axis", x1: x(0), x2: x(0), y1: margin.top, y2: height - margin.bottom }));
  }
  if (spec.diagonal) {
    const lo = Math.max(xTicks[0], yTicks[0]), hi = Math.min(xTicks[xTicks.length - 1], yTicks[yTicks.length - 1]);
    svg.append(svgEl("line", { class: "rc-ref", x1: x(lo), y1: y(lo), x2: x(hi), y2: y(hi) }));
    svg.append(svgEl("text", {
      class: "rc-ref-label rc-halo", x: x(hi) - 10, y: y(hi) + 26, "text-anchor": "end",
    }, spec.diagonal));
  }
  if (spec.vline) {
    const value = rows[0][spec.vline.value_from];
    svg.append(svgEl("line", { class: "rc-ref", x1: x(value), x2: x(value), y1: margin.top, y2: height - margin.bottom }));
    svg.append(svgEl("text", { class: "rc-ref-label", x: x(value) + 6, y: margin.top + 12 }, spec.vline.label));
  }

  // Background crowd first, picked-out groups on top.
  // A group of a few dozen gets large ringed dots; one of hundreds would
  // turn into a blob, so it gets small plain ones.
  const size = Object.fromEntries(keys.map((key) => [key, rows.filter((r) => r.grp === key).length]));
  const ordered = [...rows].sort((a, b) => keys.indexOf(a.grp) - keys.indexOf(b.grp));
  for (const row of ordered) {
    const quiet = row.grp === keys[0];
    const dense = size[row.grp] > 120;
    svg.append(svgEl("circle", {
      class: quiet ? "rc-crowd" : dense ? "rc-dense" : "rc-dot", cx: x(row.x), cy: y(row.y),
      r: quiet ? 2.6 : dense ? 3 : 4.5, fill: color(row.grp),
    }));
  }
  for (const row of rows.filter((r) => r.labelled)) {
    const right = x(row.x) < width * 0.62;
    const name = row.name.split(",")[0];
    svg.append(svgEl("text", {
      class: "rc-label rc-halo", x: x(row.x) + (right ? 9 : -9), y: y(row.y) + 4,
      "text-anchor": right ? "start" : "end",
    }, name));
  }

  // The pointer only has to be closest to a dot, not on it.
  const ring = svgEl("circle", { class: "rc-ring", r: 7, visibility: "hidden" });
  svg.append(ring);
  svg.addEventListener("pointermove", (event) => {
    const [px, py] = pointer(event, plot);
    let best = null, bestDistance = 32;
    for (const row of rows) {
      const d = Math.hypot(x(row.x) - px, y(row.y) - py) - (row.grp === keys[0] ? 0 : 6);
      if (d < bestDistance) { best = row; bestDistance = d; }
    }
    if (!best) { ring.setAttribute("visibility", "hidden"); tip.hide(); return; }
    ring.setAttribute("cx", x(best.x)); ring.setAttribute("cy", y(best.y)); ring.setAttribute("visibility", "visible");
    tip.show(x(best.x), y(best.y), [
      [null, best.name, color(best.grp)],
      [format(best.x, spec.tip_x_fmt ?? spec.x_fmt), spec.x_label.toLowerCase()],
      [format(best.y, spec.tip_y_fmt ?? spec.y_fmt), spec.y_label.toLowerCase()],
    ]);
  });
  svg.addEventListener("pointerleave", () => { ring.setAttribute("visibility", "hidden"); tip.hide(); });
  plot.dataset.type = "scatter";
}

// ---- lines: a few series over an ordered x -----------------------------------

function lines(container, spec, width) {
  const names = [...new Set(spec.rows.map((r) => r.series))];
  const series = names.map((name, i) => ({
    name, color: SERIES[i], points: spec.rows.filter((r) => r.series === name),
  }));
  legend(container, series.map((s) => ({ label: s.name, color: s.color, shape: "line" })));

  const narrow = width < 480;
  const endLabels = spec.x_scale === "point" && !narrow;
  const margin = { left: 46, right: endLabels ? 196 : 26, top: 16, bottom: spec.x_label ? 46 : 28 };
  const height = narrow ? 300 : 360;
  const { svg, plot, tip } = frame(container, width, height, spec.title);

  const xValues = [...new Set(spec.rows.map((r) => r.x))];
  const ys = spec.rows.map((r) => r.y);
  const yTicks = niceTicks(Math.min(0, ...ys), Math.max(...ys), 5);
  const y = linear(yTicks[0], yTicks[yTicks.length - 1], height - margin.bottom, margin.top);
  const x0 = margin.left + (spec.x_scale === "point" ? 8 : 0), x1 = width - margin.right;

  let x, xTicks;
  if (spec.x_scale === "log") {
    const max = Math.max(...xValues);
    const scale = linear(0, Math.log10(max), x0, x1);
    x = (v) => scale(Math.log10(v));
    xTicks = [1, 10, 100, 1000].filter((t) => t <= max);
  } else if (spec.x_scale === "point") {
    const scale = linear(0, xValues.length - 1, x0, x1);
    x = (v) => scale(xValues.indexOf(v));
    xTicks = xValues;
  } else {
    const ticks = niceTicks(Math.min(...xValues), Math.max(...xValues));
    x = linear(ticks[0], ticks[ticks.length - 1], x0, x1);
    xTicks = ticks;
  }

  for (const tick of yTicks) {
    svg.append(svgEl("line", { class: tick === 0 ? "rc-axis" : "rc-grid", x1: margin.left, x2: x1, y1: y(tick), y2: y(tick) }));
    svg.append(svgEl("text", { class: "rc-tick", x: margin.left - 8, y: y(tick) + 4, "text-anchor": "end" }, format(tick, spec.y_fmt)));
  }
  for (const tick of xTicks) {
    svg.append(svgEl("text", {
      class: "rc-tick", x: x(tick), y: height - margin.bottom + 16, "text-anchor": "middle",
    }, spec.x_fmt ? format(tick, spec.x_fmt) : tick));
  }
  if (spec.x_label) {
    svg.append(svgEl("text", { class: "rc-axis-title", x: (margin.left + x1) / 2, y: height - 6, "text-anchor": "middle" }, spec.x_label));
  }

  const crosshair = svgEl("line", { class: "rc-crosshair", y1: margin.top, y2: height - margin.bottom, visibility: "hidden" });
  svg.append(crosshair);

  for (const s of series) {
    svg.append(svgEl("path", {
      class: "rc-line", stroke: s.color,
      d: s.points.map((p, i) => `${i ? "L" : "M"}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(""),
    }));
    if (spec.x_scale === "point") {
      for (const p of s.points) svg.append(svgEl("circle", { class: "rc-dot", cx: x(p.x), cy: y(p.y), r: 4.5, fill: s.color }));
    }
  }

  // Name and final value at the end of each line, kept from overlapping.
  if (endLabels) {
    const ends = series.map((s) => ({ s, last: s.points[s.points.length - 1] }))
      .map((e) => ({ ...e, y: y(e.last.y) })).sort((a, b) => a.y - b.y);
    for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 16);
    for (const end of ends) {
      svg.append(svgEl("text", { class: "rc-label", x: x1 + 12, y: end.y + 4 },
        `${end.s.name} ${format(end.last.y, spec.y_fmt)}`));
    }
  }

  // A marked position: a guide line and each series' value where it crosses.
  if (spec.marker) {
    const mx = x(spec.marker.x);
    svg.append(svgEl("line", { class: "rc-ref", x1: mx, x2: mx, y1: margin.top, y2: height - margin.bottom }));
    svg.append(svgEl("text", { class: "rc-ref-label", x: mx - 6, y: margin.top + 10, "text-anchor": "end" }, spec.marker.label));
    for (const s of series) {
      const point = s.points.find((p) => p.x === spec.marker.x);
      if (!point) continue;
      svg.append(svgEl("circle", { class: "rc-dot", cx: mx, cy: y(point.y), r: 5, fill: s.color }));
      svg.append(svgEl("text", { class: "rc-label rc-halo", x: mx + 9, y: y(point.y) + 4 },
        `${format(point.y, spec.y_fmt)} ${narrow ? "" : s.name.toLowerCase()}`.trim()));
    }
  }

  const show = (value) => {
    const cx = x(value);
    crosshair.setAttribute("x1", cx); crosshair.setAttribute("x2", cx); crosshair.setAttribute("visibility", "visible");
    const head = spec.x_scale === "log" ? `Top ${format(value, "int")} counties` : String(value);
    tip.show(cx, margin.top, [[null, head], ...series.map((s) => {
      const point = s.points.find((p) => p.x === value);
      return [format(point?.y, spec.y_fmt), s.name, s.color];
    })]);
  };
  const hide = () => { crosshair.setAttribute("visibility", "hidden"); tip.hide(); };
  svg.addEventListener("pointermove", (event) => {
    const [px] = pointer(event, plot);
    show(xValues.reduce((best, v) => (Math.abs(x(v) - px) < Math.abs(x(best) - px) ? v : best)));
  });
  svg.addEventListener("pointerleave", hide);
  plot.dataset.type = "lines";
}

const TYPES = { bars, strip, range, scatter, lines };

// Draw `spec` into `container`, and again whenever the container's width changes.
export function renderChart(container, spec) {
  const draw = TYPES[spec.type];
  if (!draw) throw new Error(`Unknown chart type: ${spec.type}`);
  let drawn = 0;
  const render = () => {
    const width = Math.floor(container.clientWidth);
    if (!width || width === drawn) return;
    drawn = width;
    container.replaceChildren();
    draw(container, spec, width);
  };
  render();
  new ResizeObserver(render).observe(container);
}
