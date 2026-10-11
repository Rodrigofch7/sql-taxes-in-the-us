// Renders the Findings page from web/data/findings.json, which the build
// writes with every number already filled in from the database.
const list = document.querySelector("#findings");
const status = document.querySelector("#status");

const node = (tag, className, text) => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
};

async function main() {
  const [findings, meta] = await Promise.all(
    ["findings.json", "meta.json"].map(async (file) => {
      const response = await fetch(new URL(`data/${file}`, document.baseURI));
      if (!response.ok) throw new Error(`Could not load ${file} (${response.status})`);
      return response.json();
    })
  );

  for (const finding of findings) {
    const item = node("article", "finding");
    item.id = finding.id;
    item.append(node("h2", null, finding.headline), node("p", null, finding.body));

    const details = node("details");
    details.append(node("summary", null, "How this was calculated"));
    details.append(node("pre", null, finding.sql));
    item.append(details);
    list.append(item);
  }

  document.querySelector("#vintage").textContent =
    `Based on the American Community Survey ${meta.latest_year - 4}–${meta.latest_year} ` +
    `and building permits ${meta.permit_years[0]}–${meta.permit_years[1]}. Built ${meta.built}.`;
  status.hidden = true;
}

main().catch((error) => {
  console.error(error);
  status.textContent = `The findings could not be loaded: ${error.message}`;
});
