## Data scientist, round 2

### 1. Agreements that matter for the plan
- **The map can take the whole tool down.** The designer (F6) and I (F4) found this independently. The designer adds a second trigger: WebGL being unavailable.
- **One profile shows two different "median rent" figures** (economist F5, investor F6). The fix is supported by the data: contract rent (B25058) is fetched for all four years and has the same caps.
- **All three of the others flagged the default view.**
- **Tract rental vacancy is mostly noise.** Re-checked: 39,229 of 83,185 tracts with a figure show exactly 0%, and 27,006 of those carry no warning. Margins of error for B25004 are not fetched.
- **Extreme tract yields.** The economist's numbers re-check: 126 tract yields are above 25%, 57 of them unflagged, with a maximum of 112%. This is why that warning rule belongs in SQL, not JavaScript.
- **The economist's Finding 8 fix works exactly.** With mean value growth on the x-axis, 0 of 989 dots sit on the wrong side of the diagonal, against 98 with median value. It needs one new mart column, real mean home value.

### 2. Disagreements
- **Finding 5 (economist F4a): the fix is right, but it means rewriting the finding.**
  - Compared like for like, the top 100 counties take 50.3% of permits against 40.6% of homes, a ratio of 1.24.
  - The finding's own `holds` threshold is 1.25, so it would fail. Under today's gate, that failure blocks the entire export.
- **Contract rent for rent growth (economist F5, investor F6) reverses Finding 7.**
  - Median real contract-rent growth is 11.7%, against 8.5% for incomes. With gross rent it is 8.3%.
  - So "rents kept pace with incomes" fails, and the share of people in counties where rents outgrew incomes rises from 73% to 82%.
  - The economist should choose which rent measure carries the affordability story.
  - Saved links that use the `rentg_min` filter would also change meaning.
- **The "changed since last release" view (investor step 8) is not something the data can support.**
  - Census lists overlapping comparisons, such as 2019–23 against 2020–24, under "Do Not".
  - The honest version compares 2021–25 with 2016–20, which is already in the database.
- **HUD Fair Market Rents as current rents (investor step 4) don't work as described.**
  - FY2026 FMRs start from ACS five-year 40th-percentile two-bedroom gross rents. They are carried forward by a 64/36 blend of private rent data and CPI, plus a forecast.
  - Each year's FMR is floored at 90% of the previous year's.
  - So they partly reuse the project's own ACS input, they cannot be compared with a contract-rent median, and they lag falls such as Austin's.
- **FHFA county price index:** FHFA labels it developmental, it mixes in refinance appraisals, and its county coverage is unverified. It can serve as a labelled "value change since the survey" index, not as a price.
- **A county landlord rate (designer step 8, and the investor's interim "~N×" tag):** the project has no data to compute one. The owner rate already includes exemptions and caps. Multiplying it by one city's ratio gives a number people will rank counties on, whatever the label says.

### 3. Costs they did not see
- **Changing any default changes every shared link.**
  - When it writes the URL, the app leaves out any value equal to a default (web/app.js:47,55), and on load the sort follows the metric (:29).
  - So an old link opened after the defaults change shows something different from what was shared.
  - Write every value into the hash, or version it, before changing defaults. The designer's links from findings into the screener depend on this too.
- **Insurance from B25141 is effort M, not S.**
  - The fetcher sends one variable list for every year, and code/build_db.py:49-54 rejects any file missing a variable.
  - B25141 returns 404 for 2016, 2020 and 2022, so the fetcher first needs a variable list per year.
  - The table has 12 brackets per mortgage status, topping out at "$4,000 or more". Where insurance costs most, the median may fall in that open top bracket, so publish the bracket shares rather than a median.
- **A minimum and a maximum on every filter (investor F3)** means changing both the filter definitions and the URL format. Each filter has one direction (web/metrics.js:94-104), and the URL holds one value per filter.
- **National tract table:** a slim nine-column file is 1.8 MB gzipped (all tract files today total 6.4 MB). The size is fine, but "Show all" renders every row (web/screener.js:53), so 84,000 rows need pagination.
- **Hatched no-data areas (designer):** switching between light and dark basemaps drops pattern images, and the code re-adds only the layers (web/map.js:291-298).

### 4. What their proposals depend on
- Every new input (statutes, B25141, the FEMA Risk Index, FHFA, HUD) needs my input record and a freshness test.
- A ninth finding or any rewrite needs the gate fixes first: parameters declared once, NaN and infinity rejected, and the data refresh no longer blocked by findings.
- The FEMA National Risk Index is supportable. Version 1.20 uses 2020-based tracts and Connecticut's planning regions, so it joins the project's geography.

### (a) Rental-tax table
Build the economist's badge, not a number. The smallest honest version is a checked-in CSV:
- one row per state plus DC;
- a category: about the same / higher / much higher / depends on the city;
- a one-line rule, the statute URL, whether taxable value resets at sale, and the date checked;
- county overrides only for named exceptions (New York City's five counties, Cook County);
- joined on state code, with tests that all 51 rows have a source and were checked within 18 months.

Effort: S to build in, M for the research (three to five days), and S each year to re-check.

The other two forms:
- **Multiplier:** effort M. It needs the Lincoln Institute's permission (that is the economist's reading of the licence; I did not check it). Nothing the project holds could validate it.
- **Owner and landlord rates side by side:** a county-level landlord rate cannot be supported.

### (b) Default view
Open on population, largest first. That ranking needs no tax-regime caveat, has no Census cap, and none of the 999 counties in the default view is flagged unreliable. Add the badge as a column once it exists. Fix the URL format first, as above.

### Effort estimates
| Proposal | Effort | Can the data support it as described? |
|---|---|---|
| Rental-tax badge | S to build, M research | Yes |
| Rental-tax multiplier | M, plus licence | Not validatable |
| Side-by-side landlord rate | – | No |
| Insurance from B25141 | M | Bracket shares only, latest period only |
| FHFA county price index | S–M | Yes, as a labelled index |
| HUD county FMRs | S–M | Not as a current rent |
| HUD Small Area FMRs | M–L (ZIP crosswalk) | Not as a current rent |
| FEMA National Risk Index | county S, tract S–M | Yes |
| Tract table with export | S per state, M national | Yes |
| Map honesty pass | M | Yes |
| Phone layout | M, CSS only | Yes |

### 5. Revised priorities
1. Write every value into the URL, then switch to a neutral default (S). I now rank this above all my own steps.
2. Let the table work without the map, and self-host MapLibre (S). Two of us found this independently.
3. Record inputs, make the build atomic, and add the coverage tests (S).
4. The economist's badge table, ahead of my refresh-readiness and GitHub Action steps.
5. Fix the findings gate and rewrite Findings 5, 7 and 8 at the same time (S–M).
6. Refresh readiness for 2021–25, including the per-year variable lists insurance needs (M).
7. GitHub Action for rebuild and deploy (M).
8. Rounding fix, flags in SQL, licence and merge to main (S).

Sources:
- Census, Comparing ACS Data (https://www.census.gov/programs-surveys/acs/guidance/comparing-acs-data.html)
- Census 2026 pre-release slides (https://www2.census.gov/about/training-workshops/2026/2026-01-22-2020-2024-acs-5-year-prerelease-presentation.pdf)
- HUD FY2026 FMR methodology (https://www.huduser.gov/portal/datasets/fmr/fmr2026/FY26-Public-FMR-Methodology.pdf)
- FEMA NRI update documentation (https://www.fema.gov/sites/default/files/documents/fema_national-risk-index_data-version-update-documentation.pdf)
- FHFA HPI datasets (https://www.fhfa.gov/data/hpi/datasets)
- Census API, B25141 (https://api.census.gov/data/2024/acs/acs5/groups/B25141.json)
