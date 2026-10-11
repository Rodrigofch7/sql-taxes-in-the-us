// Renders the Findings report from web/data/findings.json, which the build
// writes with every number, place name and chart row filled in from the database.
import { renderChart } from "./report-charts.js";

const list = document.querySelector("#findings");
const status = document.querySelector("#status");

const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

async function load(file) {
  const response = await fetch(new URL(`data/${file}`, document.baseURI));
  if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
  return response.json();
}

async function main() {
  const [findings, meta] = await Promise.all([load("findings.json"), load("meta.json")]);
  const source =
    `Source: US Census Bureau, American Community Survey ${meta.latest_year - 4}–${String(meta.latest_year).slice(2)}` +
    ` and Building Permits Survey; author's calculations`;

  findings.forEach((finding, i) => {
    const story = node("article", "story");
    story.id = finding.id;
    story.append(
      node("div", "kicker", `${String(i + 1).padStart(2, "0")} · ${finding.kicker}`),
      node("h2", null, finding.headline),
      node("p", "standfirst", finding.body),
    );

    if (finding.chart) {
      const figure = node("figure");
      figure.append(node("figcaption", "fig-title", finding.chart.title));
      if (finding.chart.subtitle) figure.append(node("div", "fig-sub", finding.chart.subtitle));
      const chart = node("div", "rc");
      figure.append(chart, node("div", "fig-source", source));
      story.append(figure);
      // Draw once the figure is in the page and has a width.
      queueMicrotask(() => renderChart(chart, finding.chart));
    }

    const details = node("details", "method");
    details.append(node("summary", null, "How this was calculated"), node("pre", null, finding.sql));
    story.append(details);
    list.append(story);
  });

  document.querySelector("#dateline").textContent =
    `Data: American Community Survey ${meta.latest_year - 4}–${meta.latest_year}, ` +
    `building permits ${meta.permit_years[0]}–${meta.permit_years[1]}. Updated ${meta.built}.`;
  status.hidden = true;
}

main().catch((error) => {
  console.error(error);
  status.textContent = `The findings could not be loaded: ${error.message}`;
});
