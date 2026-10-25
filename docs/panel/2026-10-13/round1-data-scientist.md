## Data scientist, round 1

### 1. Verdict
The round-1 fixes in my lane are correct. The weak points are now the next ACS refresh, which takes hand edits in about six places and some mistakes would publish without warning, and the deploy, which can publish data that no commit describes. Separately, the web export rounds published population counts, and an outage at one CDN takes the whole app down, table included. Nothing I found would change a ranking a user sees today.

### 2. Findings (most serious first)

**F1. The next refresh needs hand edits in about six places, and some mistakes would publish without warning.**
- **Hard-coded vintages** in three fetchers:
  - `code/fetch_census_data.py:22`
  - `code/fetch_permits.py:21` (`range(2012, 2025)`)
  - `code/fetch_geometry.py:21,27-28` (GENZ2024)
- **Permit coverage is never checked.** `sql/marts.sql:28-36` averages whatever years exist. The building-concentration finding takes "from X to Y" from the ACS year. So with ACS 2025 and the permits fetcher left alone, it would print "2021 to 2025" over a four-year average.
- **The 2025 permits file is already published** (`co2025a.txt`, HTTP 200).
- **Numbers typed by hand that no test checks:**
  - "12-year totals" (`web/index.html:51`, `web/methods.html:74`)
  - "four periods" (`methods.html:103`)
  - "About 3% … 27 counties" (`methods.html:129-130`)
  - All are true today (109 of 3,144 counties have no permits; 27 have fewer than five years).
- **Name parsing is fragile.** Tract NAME switched from ", " to "; " in the 2024 release (all 84,401 tracts; query). State names are parsed with `split_part(name, ', ', 2)` (`marts.sql:92`). If county names follow, every state name goes blank.
- **Timing is uncertain.** The 2020–24 release slipped to 29 January 2026. The 2025 1-year release date is "being determined" under a new Commerce disclosure-avoidance order (Census ACS updates, 6 August 2026).
- **Fix:**
  - one vintages config;
  - `check_inputs` asserts permits for every window year and that the boundary vintage equals the latest ACS year;
  - take state names from the state FIPS code;
  - generate the counts and the "N-year" wording from meta.json.

**F2. Deploys don't tie the data to the code; inputs aren't recorded; the build isn't atomic.**
- **The deploy cannot see stale data.** `code/deploy.sh:7` promises "the live site always matches a commit". But `web/data/` and the database are gitignored (`.gitignore:39`), so the `git status` check (`deploy.sh:10`) cannot see data built from older SQL. deploy.sh runs no tests.
- **No record of inputs.** meta.json holds only years and an export date (`code/export_web.py:99-106`). There are no download dates, checksums or row counts, yet released ACS data does change: Errata 148 suppressed the Brentwood and Wyandanch CDPs in the 2019–23 and 2020–24 releases (Census Reporter, citing the erratum; I did not check the official notice).
- **The build isn't atomic.** `code/build_db.py` rebuilds the live file in place (`:124`, `:72`), and `check_inputs` runs only after the base tables are replaced (`:132`). From reading the code, a failure there leaves new base tables next to the old marts.
- **Fix:**
  - the export writes the git SHA, a hash of `sql/*.sql` and an input manifest into meta.json;
  - deploy refuses if that SHA is not HEAD or pytest fails;
  - build into a temporary file, then `os.replace` it over the old one.

**F3. The `holds` gate is a good idea with three gaps.**
- **(a) NaN and infinity pass.** In DuckDB 0/0 is NaN, 1/0 is inf, and `NaN > 1` is true (query). `fill()` rejects only None (`code/findings.py:57`). A zero denominator could therefore publish "nan%" or "inf×" with `holds = true`.
- **(b) Parameters are typed more than once, and nothing checks the copies agree.**
  - 50000 appears 19 times in `data/metadata/findings.json` (13 in the finding queries, 6 in chart queries), and again in `findings.html:30-31` and `metrics.js:95`.
  - `top_n` (50) is typed 8 times; the "15 states" count twice.
  - Nothing checks that `{min_pop}` matches the WHERE clause.
- **(c) One stale finding blocks the whole data refresh.** `render_findings` runs before any file is written (`export_web.py:62-63`), so new screener data cannot ship until the text is fixed.
- **Minor:** `tests/test_marts.py:266` assumes every finding has a chart; `findings.py:114` makes charts optional.
- **Fix:**
  - reject values that are not finite;
  - declare each finding's parameters once and pass them to both queries via DuckDB `SET VARIABLE`/`getvariable()`;
  - export the data regardless, withhold a failing finding, and fail the job loudly.

**F4. A CDN outage takes down the whole app, not just the map.**
- `web/app.js:169` waits for `createMap` before it creates the screener and profile (`:177`, `:184`). If jsdelivr is blocked, `new maplibregl.Map` (`map.js:81`) throws and the page shows "The data could not be loaded".
- The CDN tags have no `integrity` attribute (`index.html:8,94`).
- The basemap fallback covers only the style fetch (`map.js:45-52`). Tiles, fonts and sprites also come from tiles.openfreemap.org.
- **Fix:** vendor maplibre-gl 4.7.1 (212 kB gzipped). Render the table and profile first, and catch map errors.

**F5. The tests miss the most likely breakages.**
- **No check that data and boundaries line up.** Counties match 3,144 of 3,144. Tracts do not: 14 Suffolk County, NY shapes have no data.
- **No check that tracts add up to their county.** Suffolk's 2024 tracts sum to 1,452,567 people against a county total of 1,530,146. The cause is the Census suppression (Errata 148), but no test noticed.
- **The completeness threshold is weak.** It only requires at least 70,000 tracts (`test_marts.py:146`), so it would also miss a whole small state.
- **The cap test uses fixed cap values** (`:48-50`), so it would miss a change in the Census top-codes.
- **Hard-coded years** (`:56`, `:62`, `:233`) will fail or stop testing anything when the vintages move.
- **Most valuable missing test:** a coverage check that, per year:
  - tract totals equal county totals, with an allow-list for known suppressions;
  - every latest geoid has a shape;
  - permits cover the whole window.
- **Also add:**
  - the medians at each year's maximum must be flagged as capped;
  - one pinned case of the CPI formula.

**F6. The export changes published counts.**
- `compact()` rounds every float to six significant digits (`export_web.py:35-43`). That alters 42 county and 44 state populations, and 41 housing-unit counts. Examples: California 39,287,377 becomes 39,287,400; Los Angeles 9,808,667 becomes 9,808,670.
- These values reach the profile and the CSV download.
- **Fix:** leave whole numbers as integers and round only fractional values.

**F7. Data-quality rules are split between SQL and JavaScript.**
- The warning for yields above 25% lives only in `web/metrics.js:161` (126 tracts are above it).
- The cap values are hard-coded in the warning text (`metrics.js:168-177`).
- The CSV download leaves out the floor and tax-cap flags (`screener.js:112`), so blank yields arrive with no reason.
- **Fix:** compute every flag in `schema.sql`, export the flags, and include all of them in the CSV.

### 3. Next steps (most valuable first)
1. **Get ready for the 2021–25 release (F1).** Use the vintages config; fetch the 2025 permits now; add the coverage checks; generate the text from meta.json; fix the state names; check variable labels against `variables.json`.
   - Helps: every user, whose permit and growth labels stay right after the release.
   - Effort: M.
   - Depends on: the economist choosing the trend years (2025 next to 2024 gives two points sharing four of five years).
   - Risk: the disclosure-avoidance order may change tables or suppress more.
2. **Provenance manifest and atomic build (F2).**
   - Helps: developers, and policy users who cite numbers.
   - Effort: S. Risk: low.
3. **Coverage tests (F5).**
   - Helps: everyone, by catching partial downloads and vintage mismatches before deploy.
   - Effort: S. Risk: the allow-list goes stale.
4. **GitHub Action for rebuild and deploy.**
   - Triggers: manual dispatch, plus a monthly schedule that checks `api.census.gov/data/<year>/acs/acs5`.
   - The Census key is held as a secret.
   - Steps: `uv sync --frozen`, fetch, build, pytest, export, then `upload-pages-artifact` and `deploy-pages`.
   - This replaces committing on top of gh-pages history (`deploy.sh:25`). The repo is already 27.5 MB after two deploys.
   - Attach the database and raw inputs to a Release for each vintage.
   - Effort: M. Depends on steps 2 and 3.
   - Fits Pages' limits: 10-minute deploys; the 10-builds-per-hour limit doesn't apply to Actions.
   - Risk: Census API outages and rate limits.
5. **Separate the findings from the data refresh, and fix the gate (F3).**
   - Helps: the owner, who can refresh data without rewriting text first.
   - Effort: S. Risk: findings lag the data unless each is labelled with its own vintage.
6. **Vendor MapLibre and render the table without the map (F4).**
   - Helps: visitors on networks that block CDNs.
   - Effort: S. Risk: library updates become manual.
7. **Fix the rounding and move the flags into SQL (F6, F7).**
   - Helps: users who download the CSV.
   - Effort: S.
8. **Add a licence and merge to main.**
   - The GitHub API reports `license: null`, and the repo's default branch still shows old code.
   - Effort: S.

Would not do:
- **Size or tiling work.** It isn't needed (see below).
- **Tract trends from the 2010–2020 relationship files.** Effort L, and medians can't be split across divided tracts, so the results would be modelled figures, not published ones.

### 4. What is sound
- **Inflation arithmetic** matches a hand calculation exactly (Cook County, 2012, 2020 and 2024: value, rent and tax rate).
- **Caps and floors** in schema.sql match the observed maxima and minima in all four years.
- **county_changes.csv:** all 8 rows match the Census County Changes 2010s page, and the 2020s page lists only Connecticut. This closes the open Alaska item.
- **Permits column order** matches the header of `co2024a.txt` itself, and the first block holds the imputed totals (Los Angeles 9,106 imputed against 8,325 reported). This closes the open layout item.
- **Exports and the live site:** the exports match the database row for row, and the live site matches the local build. Without a database, pytest exits with code 5, so CI cannot pass by accident.
- **Locked dependencies;** `sql/analysis.sql` still runs.
- **Size:**
  - 123.6 MB raw (28 MB gzipped) against Pages' 1 GB limit;
  - a first visit is about 1.5 MB compressed before basemap tiles;
  - a California drill-down adds 2.1 MB;
  - the 100 GB monthly soft bandwidth limit covers roughly 65,000 first visits.
- **Minor:** permits_county has exact duplicate rows for five counties in 2014–15. They fall outside the permit window used, but should be removed before any permit trend.

### 5. For other specialists
- Designer: 14 Brentwood and Wyandanch tracts (Suffolk County, NY) show "No data" with no explanation. The cause is a Census suppression (Errata 148).
- Economist: choose the trend years before the 2021–25 refresh.

Side effect: one `INSTALL spatial` query cached an 80 MB DuckDB extension under ~/.duckdb/extensions. It is outside the repository, which is unchanged.

Sources: Census Reporter, Errata 148 notice (https://censusreporter.org/profiles/15000US361031462041-bg-1-tract-146204-suffolk-ny/); Census ACS updates 2026 (https://www.census.gov/programs-surveys/acs/news/updates/2026.html); GitHub Pages limits (https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits); Census county changes 2010s (https://www.census.gov/programs-surveys/geography/technical-documentation/county-changes/2010.html) and 2020s (https://www.census.gov/programs-surveys/geography/technical-documentation/county-changes/2020.html); BPS co2024a.txt (https://www2.census.gov/econ/bps/County/co2024a.txt) and co2025a.txt (https://www2.census.gov/econ/bps/County/co2025a.txt).
