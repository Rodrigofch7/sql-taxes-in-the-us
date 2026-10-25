## Data scientist, round 3: final recommendation

### 1. Final ranked list

1. **Deploy guard and exact export** (data scientist)
   - **What:** meta.json records the git commit and a hash of the SQL files; deploy.sh runs pytest and refuses on any mismatch; whole numbers are exported exactly.
   - **Why:** every later fix ships through this deploy, and the published population counts stop being wrong (round-1 F2, F6).
   - **Effort:** S. **Depends on:** nothing.
   - **Done when:** the live meta.json shows the same commit as the gh-pages commit message; California's population reads 39,287,377; a deploy after editing SQL without rebuilding is refused.

2. **Links store every setting, then a neutral default** (all four lanes)
   - **What:** shared links record every setting, with a version marker, so changing a default no longer changes old links. Then the table opens sorted by population, largest first, with population beside the county name. The map is coloured by population growth on a diverging scale.
   - **Why:** stops the first view steering investors toward Alabama.
   - **Effort:** S–M. **Depends on:** 1.
   - **Done when:** a link saved before the change reopens unchanged; a fresh visit opens on Los Angeles, with decline shown in its own colour.

3. **The table works without the map; MapLibre is self-hosted** (data scientist, designer)
   - **Why:** a blocked CDN or a browser without WebGL no longer takes down the table and filters.
   - **Effort:** S. **Depends on:** 1.
   - **Done when:** with WebGL turned off, filters and table still work and a "map unavailable" note shows; the page makes no request to cdn.jsdelivr.net.

4. **Statute badge for how each state taxes rentals** (economist)
   - **What:** 51 rows covering rental treatment and whether taxable value resets at sale, each with a statute link and the date it was checked. It replaces the generic landlord sentence at `web/summary.js:38`.
   - **Why:** fixes the main way the tool mis-ranks places for investors.
   - **Effort:** S to build, M for the research. **Depends on:** 2.
   - **Done when:** a test checks all 51 rows have a source and were checked within 18 months; no Lincoln figures appear unless permission is confirmed.

5. **Map honesty pass** (designer)
   - **What:** legend rows for "Filtered out" and "No data"; tracts coloured on the selected county's own scale; data drawn above the roads in dark mode.
   - **Why:** users can tell apart counties that fail a filter, counties with no data, and genuinely low values.
   - **Effort:** M. **Depends on:** 2.
   - **Done when:** the legend counts match the screener; about 17% of Henry County GA tracts fall in the top class; a dark-mode screenshot shows no roads over the data.

6. **Release readiness on the 2013/2017/2021/2025 periods** (data scientist, economist)
   - **What:**
     - one config listing the survey years, with tracts fetched for the latest year only;
     - permits for 2021–25, and build checks on permit coverage and the boundary vintage;
     - per-year variable lists, with labels checked against the Census;
     - state names taken from FIPS codes, and period wording generated rather than typed;
     - coverage tests: tract totals match county totals (with an allow-list for the Census suppression in Errata 148), and every county and tract has a boundary shape;
     - a record of inputs and an atomic build.
   - **Why:** protects the release users come back for (round-1 F1, F5).
   - **Effort:** M. **Depends on:** 1.
   - **Done when:** the new tests pass on today's data; a build missing one permit year fails; at least 95% of counties have five years of permits.

7. **Findings integrity and rewrites** (data scientist, economist)
   - **What:**
     - each finding gets a stable number and id;
     - new data publishes even if a finding fails;
     - NaN and infinity are rejected, and parameters are declared once;
     - contract rent is used everywhere;
     - Finding 5 is rewritten as two bars (50% against 41%), Finding 7 is re-checked, and Finding 8 moves to a mean-value axis.
   - **Why:** the Findings page stays true across the refresh.
   - **Effort:** M. **Depends on:** 6.
   - **Done when:** a deliberately failing finding still exports every table and leaves the numbering unchanged; Finding 8's chart has no dots on the wrong side of the diagonal.

### 2. One thing I would not do
**HUD Fair Market Rents as the current-market layer** (investor step 6). They are built from the same ACS five-year data, as 40th-percentile gross rents, with one figure per metro. Each year's FMR cannot fall below 90% of the previous year's. So they cannot show a falling market like Austin's, and dividing them by home values brings back the two-rent mismatch. Instead, use ACS one-year estimates (850 counties, about 86% of residents) and the FHFA price index, shown as dated tiles on the profile.

### 3. Questions for the owner

**Q1. Which survey periods should the trend use after the next release?**
- **My answer:** 2013/2017/2021/2025, with tracts for 2025 only.
- **What it means for the pipeline:**
  - re-fetch state and county data for 2013, 2017 and 2021 (a handful of API calls);
  - drop the build's equal-years-across-levels check (`code/build_db.py:112`) and the matching test;
  - the cap and pre-2022 home-value rules still apply, and county_changes.csv stays valid;
  - re-check Findings 7 and 8;
  - publish a dated "what changed" note, because every number shifts.
- **Other view:** replace only 2024 with 2025. That needs no re-fetch, but leaves uneven spacing and makes it a 13-year total.

**Q2. What happens to a finding that stops holding, without renumbering the report?**
- **My answer:** keep its slot and number, show "Being updated for the 2021–25 survey; last held on <date>", deploy the data anyway, and have the build flag the failure.
- **Other view:** keep showing the last verified text, labelled with its survey years. That keeps more content but mixes survey years on one page.

**Q3. Which comes first: release readiness, provenance and automation, or the user-facing fixes?**
- **My answer:**
  - the deploy guard (step 1) goes first, because every fix ships through it;
  - then the user-facing steps 2–5;
  - then steps 6–7, finished before the release (whose date is uncertain; the last one slipped to 29 January);
  - automation only after one clean manual release on the new periods, since automating an unguarded pipeline just publishes errors faster.
- **Other view:** the investor puts the badge first. That is compatible: the statute research can run alongside steps 1–3.

**Q4. Which rent measure should the tool use?**
- **My answer:** contract rent everywhere. Finding 7 then becomes "rents outgrew incomes" (11.7% against 8.5%).
- **Other view:** gross rent is the usual affordability measure. Keep it, labelled, on the methods page.
