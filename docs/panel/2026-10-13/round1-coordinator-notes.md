# Coordinator's notes after round 1

I re-ran the round-1 claims most likely to change the plan, against the database, the code and the live screenshots. Everything below holds unless marked otherwise.

## Investor
- Row 1 of the default view is Apache County AZ. 24 of the 50 lowest-rate counties of 50,000+ are in Alabama (16 of the first 25).
- 47.2% of tracts that have a rental vacancy figure show exactly 0% (the 46.5% in the report used a different denominator). 27,006 of them carry no warning.
- No county of 50,000+ is flagged low-reliability, so "Hide small-sample counties" changes nothing in the default view.
- Among counties of 50,000+, the median gross yield is 4.29% and the 90th percentile 5.43%. Three counties reach 7.4%.
- A profile shows two rent figures. Henry County GA has $1,432 (contract rent) in the header and $1,674 (gross rent) in the chart. The gap is 19.4% in the median county of 50,000+ (90th percentile 33.4%) and 29.9% across all counties. The economist's "median 19%" refers to the 50,000+ group.
- B25141 (homeowners insurance) exists in the 2023 and 2024 five-year releases only. The Census API returns 404 for 2020 and 2022.

## Data scientist
- In DuckDB, `NaN > 1` is true, `0/0` is NaN and `1/0` is inf. code/findings.py would publish either.
- The export rounds California's population from 39,287,377 to 39,287,400.
- 14 tract shapes in Suffolk County NY have no data row. Suffolk's tracts sum to 1,452,567 people, against a county total of 1,530,146.
- The 2025 county permits file is published (HTTP 200).
- web/app.js awaits createMap before it builds the screener and profile.

## Economist
- In the default view, 16 of the first 25 and 24 of the first 50 counties are in Alabama.
- Counties of 50,000+ by owner tax-rate quartile:
  - median gross yield: 3.92 / 4.13 / 4.36 / 4.70%
  - gross yield minus the tax rate: 3.42 / 3.41 / 3.40 / 3.07%
- Apache County AZ: mean tax $252, median tax $572. 15 counties have a mean below 0.6 of the median.
- The median-based rate exceeds the aggregate rate in 72.6% of counties of 50,000+.
- 106 counties show zero permits.
- Finding 5: the 100 largest counties by homes hold 40.6% of homes and 41.1% of permits.
- Finding 8's chart: in 96 of 984 dots, the colour (rate rose or fell) disagrees with the side of the diagonal the dot is on.

## Designer
These are confirmed in the code, and visually in screenshots 36-light and 37-dark:
- Filtered-out counties are drawn at 7% opacity (map.js:135), with no legend entry.
- Data layers are inserted below the first symbol layer (map.js:105–110). In the dark basemap that puts roads and buildings on top of the data.
- The profile scrolls into view only after the first render (app.js:225).
- Warning detail is available only as a `title` attribute (screener.js:74).
- Trend charts are drawn at a fixed width of 320 (charts.js:42).
- One source line, which names the permits survey, is used for every chart (findings.js:25).

## Items closed in round 1
- The permits column order, and the use of the imputed block rather than the reported block, were confirmed by the data scientist against the file header.
- Every row of county_changes.csv matches the Census County Changes pages (data scientist).

## Not checked by the coordinator
- External market figures: Austin vacancy, the Freddie Mac rate, NAIC premiums.
- The Lincoln Institute figures the economist transcribed (scratchpad/panel/economist/lincoln2022.csv).
- The legal claims about Alabama and South Carolina beyond the sources cited.
