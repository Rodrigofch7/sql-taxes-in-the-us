# US Property Tax and Housing Screener

**Live site: https://rodrigofch7.github.io/sql-taxes-in-the-us/** · [Findings](https://rodrigofch7.github.io/sql-taxes-in-the-us/findings.html) · [Methods and caveats](https://rodrigofch7.github.io/sql-taxes-in-the-us/methods.html)

A free tool for comparing US counties and census tracts on property tax, rent yield,
prices and how much housing gets built. It is aimed first at real-estate investors
screening for places to look at, and is built on public data only.

The repo has two parts:

- a **data pipeline** (Python and DuckDB SQL) that downloads Census data and builds the tables
- a **static web app** (`web/`) with a map, a screener and county profiles, which queries
  those tables in the browser

## What it shows

| Measure | Definition |
|---|---|
| Owner-occupier tax rate | Total real estate taxes paid by owner-occupiers ÷ total value of their homes |
| Owner-occupier tax bill | Total real estate taxes paid ÷ owner-occupied homes |
| Gross rent yield | 12 × median contract rent ÷ median home value |
| Rental vacancy rate | Vacant homes for rent ÷ all rental homes |
| Price-to-income ratio | Median home value ÷ median household income |
| Growth in value, rent, tax bill, population | Total change between the 2008–12 and 2020–24 survey periods, after inflation |
| Homes permitted per 1,000 existing | Building permits per year, 2020–2024, ÷ existing homes |

Counties have all measures and a 2012–2024 trend. Tracts have the latest period only.

## Read this before using the numbers

- **Tax figures are what current owner-occupiers pay.** Homestead exemptions, assessment
  caps and property classes mean a rental or newly bought home often pays more: about the
  same in some states, two to three times as much in others. So the rate does not just
  understate an investor's bill, it can rank places in the wrong order.
- **High yield mostly marks cheap, often shrinking markets.** Read it next to population
  growth and rental vacancy. It also ignores insurance, upkeep and financing.
- **Every figure is a five-year average** and lags today's prices and rents.
- **Permits show where building is happening, not zoning.** Real zoning rules are planned
  for a pilot metro, not yet built.
- **No trend where boundaries changed:** all of Connecticut, and a few counties in Alaska
  and Virginia.
- **Not yet covered:** insurance costs, and a state-by-state table of how investors are
  taxed differently from owner-occupiers.
- Values capped by the Census, or resting on a small sample, are marked with ⚠ in the app.

The full list is in `web/methods.html`.

## Build the data

Requires Python 3.13 and [uv](https://docs.astral.sh/uv/). Get a free
[Census API key](https://api.census.gov/data/key_signup.html) and put it in `.env`:

```
CENSUS_API_KEY=your_key_here
```

Then run, from the repo root:

```bash
uv sync
uv run python code/fetch_census_data.py   # ACS, about 5 minutes
uv run python code/fetch_permits.py       # building permits
uv run python code/fetch_cpi.py           # inflation index
uv run python code/fetch_geometry.py      # county and tract boundaries
uv run python code/build_db.py            # data/processed/acs.duckdb
uv run pytest                             # sanity checks on the result
uv run python code/export_web.py          # web/data/
```

## Publish

The live site is the `gh-pages` branch, served by GitHub Pages. After rebuilding the data:

```bash
bash code/deploy.sh
```

## Query the database directly

```bash
duckdb data/processed/acs.duckdb
.read sql/analysis.sql
```

| Object | Contents |
|---|---|
| `state`, `county`, `tract` | Views: every ACS year, with all derived measures and data-quality flags |
| `county_latest` | One row per county for 2024, with permits, growth and percentile ranks |
| `county_changes` | Counties that were renamed or redrawn, from `data/metadata/county_changes.csv` |
| `county_trend` | One row per county per ACS year |
| `tract_latest` | One row per tract for 2024 |
| `state_latest` | One row per state for 2024 |

Measures and flags are defined in `sql/schema.sql`; the app's tables in `sql/marts.sql`.

## Layout

```
code/   fetchers, database build, web export
sql/    schema.sql (views), marts.sql (app tables), analysis.sql (example queries)
web/    the static app; web/data/ is generated and not checked in
tests/  checks on the built database
data/   raw downloads and the DuckDB file (not checked in), plus the CPI table
        and the list of county changes
```

## Review panel

`.claude/` defines four review-only specialists for [Claude Code](https://claude.com/claude-code):
an economist, an investor, a data scientist and a designer. `/panel <question>` asks all
four and merges their answers into one memo.
What to build next, agreed by the panel, is in [ROADMAP.md](ROADMAP.md). A fifth agent, the writer, drafts the
Findings page.

## Findings page

`data/metadata/findings.json` holds the written findings, shown as an illustrated report
at `web/findings.html`. Each is a headline, a body, one SQL query and a chart with its
own query: every number and place name in the text is a placeholder filled from the
query, and the query's `holds` column says whether the claim is still true. The export
and the tests fail if any finding stops holding, so the page cannot go stale quietly.

```bash
uv run python code/findings.py   # print the findings as they will be published
```

## Sources

- US Census Bureau: American Community Survey 5-year estimates (2012, 2016, 2020, 2024),
  Building Permits Survey, cartographic boundary files.
- US Bureau of Labor Statistics: CPI-U, retrieved through FRED.
- Basemap: OpenFreeMap, © OpenMapTiles, data from OpenStreetMap.

This product uses Census Bureau data but is not endorsed or certified by the Census Bureau.
Nothing here is investment, tax or legal advice.
