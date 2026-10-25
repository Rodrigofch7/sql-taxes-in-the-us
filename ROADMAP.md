# Roadmap

What to build next, and why. Agreed on 2026-10-13 by a three-round review of the live site
by four specialist agents (economist, investor, data scientist, designer): each reviewed
independently, then responded to the other three, then gave a final ranking. Their reports
are in [docs/panel/2026-10-13/](docs/panel/2026-10-13/). Figures quoted here are from the
2020–24 survey data.

Effort: **S** is under a day, **M** a few days, **L** a week or more.

## Why this order

The screener opens sorted by the owner-occupier tax rate, lowest first. That puts 16 of the
first 25 counties in Alabama, which assesses rentals at twice the owner-occupier rate, so the
first view steers investors towards the places where a landlord's bill is most understated.
Fixing that, and the few outright errors below, comes before any new data.

## Phase 1: stop the screener misleading (about a week)

| # | Step | Effort | Done when |
|---|---|---|---|
| 1 | Deploys record which commit and data built the site, run the tests first, and export whole numbers exactly | S | California's population reads 39,287,377, not 39,287,400; deploying data built from older SQL is refused |
| 2 | Shared links store every setting, with a version marker, so changing a default cannot change an old link | S | A link saved before step 3 reopens identically after it |
| 3 | Neutral opening view: sort by population (column next to the county name), colour the map by population growth with decline in its own colour, legend entries for "filtered out", "no data" and "no trend", data drawn above roads in dark mode, legend moved off Washington State, three starting screens named by their filters with no tax limit | M | The site opens on Los Angeles, Cook and Harris; population loss has its own colour |
| 4 | The table and filters work even when the map cannot load; MapLibre served from the site instead of a CDN | S | In a browser without WebGL, all 999 counties still filter; no request goes to cdn.jsdelivr.net |
| 5 | One rent figure per profile (contract rent in the header, chart and rent growth), plus wording fixes | S | Travis County shows $1,592 in both the header and the chart |

Step 5's wording fixes:
- "two to three times" becomes "up to about four times" (confirm the Lincoln Institute figures behind it first);
- counties where the mean tax is under 0.6 of the median (15, including Apache County AZ) say "many owners here pay no property tax" and drop the percentile;
- no percentile for counties with zero permits;
- tile percentiles use "lower than X%" when that reads better;
- the "Check before you act" line on borrowing says it lowers the cash return, not that the deal loses money;
- rental vacancy is not shown for tracts, labelled "Not shown for tracts: samples too small";
- "Hide small-sample counties" says how many it hides in the current view.

## Phase 2: rental-tax badge (about a week; the research can start now)

| # | Step | Effort | Done when |
|---|---|---|---|
| 6 | A checked-in table, one row per state plus DC and overrides for New York City and Cook County: how rentals are taxed (about the same / higher / much higher / depends on the city), whether taxable value resets at sale, the rule in one line, the statute link and the date checked. Shown as grey chips in words beside the tax rate, as a table column and as a filter; replaces the generic "A landlord or new buyer may pay more" sentence | M (3–5 days of research, under a day to build) | A test rejects any row without a source or checked more than 18 months ago; Cullman County, Alabama names Alabama's 20%-versus-10% assessment rule; no landlord tax number appears anywhere |

No number derived from the Lincoln Institute's 50-State Property Tax Comparison Study is
shown unless the Institute gives permission; the study says it may not be reproduced
without it.

## Phase 3: before the 2021–25 survey release, expected December 2026 (one to two weeks)

| # | Step | Effort | Done when |
|---|---|---|---|
| 7 | Release readiness: survey years and boundary vintage in one config; 2025 permits; checks that permits cover every year of the window and every county and tract has a shape; tract totals checked against county totals (allowing for the Census suppression in Suffolk County NY, Errata 148); state names taken from FIPS codes; period wording generated rather than typed; a record of every input; a build that cannot leave a half-finished database | M | A trial build with 2025 as the latest year passes; one missing a permit year fails |
| 8 | Keep the findings true: a failing finding keeps its number and place and no longer blocks the data update; NaN and infinity are rejected; each finding's parameters are declared once; findings 5, 7 and 8 rewritten (writer drafts, economist checks) | M | Every finding holds; finding 8's chart has no dot on the wrong side of its diagonal |

Planned rewrites:
- **Finding 5** compares the top 100 permitting counties with the same counties' share of
  homes, which guarantees a gap. Like for like it is 50% of permits against 41% of homes,
  which fails the finding's own test. Retitle it "100 counties permit about half of new
  homes", show the two figures as bars, and carry the comparison on Texas and Florida
  (28% of permits, 16% of homes).
- **Finding 7** depends on the rent decision below.
- **Finding 8** colours dots by the aggregate tax rate but plots median value growth, so
  96 of 984 dots sit on the wrong side of the diagonal. Plot mean value growth instead
  (one new mart column) and label the diagonal "tax rate unchanged".

## Phase 4: after the release

| # | Step | Effort |
|---|---|---|
| 9 | Phone, touch and accessibility: map on the first screen at 390 px, warning details by tap and keyboard, focus handling, contrast fixes; tracts coloured relative to their own county and hatched where unreliable; one indexed trend chart and a comparison table on profiles | M–L |
| 10 | Disaster risk from FEMA's National Risk Index (expected building loss ÷ building value, shown as a rank), then insurance cost from ACS table B25141 (share of mortgaged owners paying $4,000 or more a year; 2019–23 and 2020–24 releases only) | M |
| 11 | Fresher figures as dated tiles on the profile: the ACS 2024 one-year release (850 counties, about 86% of residents), and optionally FHFA's county price index, labelled as developmental | M |
| 12 | Tract table with sorting, pagination and CSV export for the selected county | S |
| 13 | Automated rebuild and deploy (GitHub Action with the Census key as a secret), only after one release has gone out cleanly by hand | M |

## Decisions still open

1. **Which rent finding 7 uses.** All agree that everything investors see uses contract rent
   (what the landlord is paid, without utilities). For finding 7 the panel split:
   - report both: rent paid to landlords rose 12% after inflation, faster than incomes (8%);
     counting utilities, renters' costs rose 8%, in step with incomes (economist, investor);
   - contract rent everywhere, so the finding becomes "rents outgrew incomes" (data scientist,
     designer).
2. **Trend years from the December release.** The panel recommends 2013, 2017, 2021 and
   2025: the same spacing, still a 12-year total, and only state and county data to
   re-download. It changes every growth figure, so it ships with a dated "what changed" note.
3. **Who checks the statute research** before the badge goes live.
4. **Whether to ask the Lincoln Institute** for permission to quote its city figures.
5. **A licence**, and merging `screener-v1` into `main`.

## Agreed not to do

- **Any number for a landlord's tax rate**, as a multiplier or beside the owner rate: nothing
  supports one at county level.
- **HUD Fair Market Rents as "current rents"**: HUD builds them from the same ACS five-year
  data, sets one per metro, and limits any fall to 10% a year (FY2026 methodology).
- **A cash-flow calculator**, for now.
- **Tract trends**: the 2020 tract redraw makes them modelled rather than published figures.
- **A hand-built zoning layer for one metro, or a separate policy-maker view.** Zoning comes
  later and should start from an existing measure, such as the Wharton land-use regulation
  index (licence not checked), and a finding on places where prices rose but little was built.
