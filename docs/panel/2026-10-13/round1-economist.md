# Economist, round 1

## 1. Verdict
The round-1 fixes in my lane are in place. Pre-2022 home values are now adjusted for inflation, yield uses contract rent, ratios built on floor-coded values are blank, and the labels say "owner-occupier". The biggest remaining problem is the default view rather than the wording. The screener opens sorted by the owner-occupier tax rate, lowest first, and Alabama fills the top of that list. Alabama assesses rental homes at twice the owner-occupier ratio. The project's own data also show that low tax rates come with lower yields, yet the interface treats the two as separate virtues.

## 2. Findings

**F1. The default view ranks by the measure that misleads investors most, and the top of the list is where it misleads most.**
- The default metric and sort are the owner tax rate, ascending (web/app.js:13-18).
- With the default 50,000-population filter, 16 of the first 25 counties and 24 of the first 50 are in Alabama. There rentals are Class II, assessed at 20% of value, against 10% for "single-family owner occupied" homes (Alabama Department of Revenue).
- I checked the tool's rates against the Lincoln Institute 50-State Study (taxes paid in 2022), using the counties of the 53 largest cities in that study:
  - Rank correlation with Lincoln's homestead rate is 0.87; with its apartment rate it is 0.71.
  - Only 5 of the tool's 10 lowest-rate counties are among the 10 lowest for apartments.
  - Rank moves from this tool to Lincoln apartments: Charleston SC 2nd→33rd, Phoenix 3rd→17th, Birmingham 10th→27th, Charleston WV 12th→37th.
  - Lincoln's apartment rate divided by this tool's rate: median 1.42, range 0.91–4.01, at least 2× in 11 of 53 counties.
- So the caveat "two to three times" (README.md:31, web/metrics.js:12, web/methods.html:43) understates the top end. Charleston SC is 4.0× and Hinds MS (Jackson) is 3.8×.
- **Fix:** use a neutral default sort (for example population) until the investor tax table exists, then show the state badge next to the rate. Change "two to three" to "up to about four times".

**F2. The data say a low tax rate is largely priced in; the interface says lower is better.**
- In counties of at least 50,000 people, the rank correlation between gross yield and tax rate is 0.35. Each extra percentage point of tax rate goes with 0.7 points more gross yield.
- By tax-rate quartile, median gross yield is 3.9 / 4.1 / 4.4 / 4.7%. Yield minus tax is nearly flat: 3.42 / 3.41 / 3.40 / 3.07%.
- This is a cross-sectional pattern, not proof of cause. It is what the user-cost model predicts (Poterba 1984; Himmelberg, Mayer and Sinai 2005) and fits partial capitalisation (Oates 1969; Yinger et al. 1988). These citations are from the literature and I did not re-check them here.
- Yet the tax rate and tax-bill growth both sort lowest first (metrics.js:11, 59). The "tax at most" and "yield at least" filters pull against each other.
- An investor-specific point (my judgement): where rentals pay more than owners, owner-occupier buyers set prices, so the rental surcharge is not priced in and comes out of the landlord's return. Little of it reaches tenants: about 14% in Schwegman and Yinger (2020); earlier studies found over 60%.
- **Fix:** add this as a ninth Finding with its own `holds` query. Change "much of the difference is already in the price" (methods.html:48-50) to "part of", and add the landlord point.

**F3. The county summary uses one landlord sentence everywhere and misdescribes counties with tribal trust land.**
- summary.js:38 adds "A landlord or new buyer may pay more" for every county. Lincoln's apartment-to-homestead ratio is 1.00 in Newark and 5.69 in Charleston SC.
- Apache County AZ is first in the default list. Its summary says owner-occupiers pay "0.21% ... about $252 on average, lower than 99% of US counties". The median tax there is $572, more than twice the mean. That fits many owners paying no tax, probably on Navajo Nation trust land (my inference, unverified).
- McKinley NM: mean tax $447, median $1,574, yield 9.5%. 15 counties in all have a mean below 0.6 of the median.
- The numbers in the 14 summaries I generated match the data. The problems are of kind, not arithmetic.
- **Fix:** write the landlord sentence per state from the investor table. Where mean/median is below 0.6, say "many owners here pay no property tax" and drop the percentile.

**F4. Findings page: two unfair comparisons and one missing explanation.**
- (a) Finding 5 (findings.json:82, 97) says building is "more concentrated than housing". It compares the top 100 counties *ranked by permits* (50.3% of permits) with the same counties' 33.1% share of homes. Ranking on the outcome guarantees a gap. Like for like, the 100 largest counties by homes hold 40.6% of homes and receive 41.1% of permits. **Fix:** compare each curve sorted by its own variable (50% vs 41%).
- (b) Finding 8's chart (findings.json:150) colours dots by the aggregate rate but puts median value growth on the x-axis. As a result, 96 of 984 dots sit on the wrong side of the "grew equally" diagonal. **Fix:** put mean value growth (aggregate value ÷ owner homes) on the x-axis, so the diagonal is exactly constant rate. Only 5 dots are cropped, which is fine.
- (c) Finding 3 (findings.json:34): the 4.3× gap between Monroe and Kings is mostly New York City's separate, capped class for small homes. Apartments there pay 4.24× the homestead rate (Lincoln Table 6b). Add one clause.
- The other charts start at zero and compare fairly.

**F5. One county page shows two different "median rent" figures.**
- The header shows contract rent (profile.js:165). The "Median monthly rent" chart (profile.js:34), rent growth and the summary's "rents rose" all use gross rent (sql/marts.sql:51-55, 122).
- Jefferson County AL: $925 in the header, $1,193 in the chart. The gap has a median of 19% across counties (90th percentile 33%).
- **Fix:** use contract rent for rent growth and the chart, which matches the yield. B25058 is already fetched for every year.

**F6. The tax rate is weighted by value.** Median tax ÷ median value is above the aggregate rate in 73% of counties of at least 50,000 people (median ratio 1.04). That fits regressive assessment (Berry 2021; Avenancio-León and Howard 2022; not re-checked). Investors buying below-median homes probably face a higher rate. **Fix:** one line in methods.

**F7. Permits where no permit is needed.**
- 109 counties have no permit data and 106 show zero (Texas 29 with no data, Kentucky 21, New Mexico 13, Montana 11).
- The Census says building outside permit areas is under 1–2% nationally but varies widely among counties. Yet McKinley NM reads "0.2 ... lower than 93% of US counties".
- **Fix:** add a methods line, and show no percentile where permits are zero.

## 3. What is sound
- The home-value adjustment follows Census user note 2023-07, which uses R-CPI-U-RS where this project uses CPI-U; the difference is minor. For example, California's 2008–12 rate is 0.748% adjusted against 0.778% unadjusted. Using national CPI leaves rankings unchanged.
- Sound: the contract-rent yield, the blank floor-coded ratios, and the rental vacancy definition, which matches the Census one.
- The reliability flag catches 28% of tracts. Only 1.6% of unflagged tract yields have a combined coefficient of variation above 30%.
- Findings 1, 2, 4, 6 and 7 are fairly framed. The methods page now covers capitalisation, overlapping periods and lag. All 28 tests pass.

## 4. Next steps (most valuable first)

1. **Investor tax table, shown as a badge rather than a multiplier (M).**
   - **What it holds:** one row per state, plus named local exceptions (New York City, Cook County, Hawaii's counties, Massachusetts towns). Columns: the rental vs owner assessment ratio or tax rate; the homestead exemption; the assessment cap, whether it resets at sale, and any looser non-homestead cap; whether the rental rule applies to 1–4-unit homes; the source and the date checked.
   - **Sources:** state statutes, which are public. Cross-check against Lincoln Tables 6b and 7 and its "Significant Features of the Property Tax" database.
   - **How it shows:** a four-level badge in the table: about the same / higher / much higher / depends on the city. The profile gets one sentence naming the rule, plus Lincoln's largest-city figure and year.
   - **What it can honestly claim:** how the state treats rentals and new buyers. It cannot give a county's investor rate or any property's bill.
   - **Why not a multiplier:**
     - Lincoln covers one city per state, valuing a $600,000 apartment building.
     - Classification can depend on unit count: New York City's low class covers 1–3-family homes.
     - Lincoln treats assessment caps inconsistently. Its Los Angeles ratio is 1.009, yet new buyers there pay 2.2× what average-tenure owners pay (Table 7).
     - Ratios swing from year to year (Charleston rose 1.94 in one year).
     - The study "may not be reproduced in whole or in part without written permission".
   - **Helps:** investors building a shortlist.
   - **Main risk:** laws change, so the table needs an annual check.
2. **Neutral default sort plus the capitalisation Finding (S).** No dependencies.
3. **Wording fixes F3–F7 (S).**
4. **Insurance from B25141, latest period only (S–M).**
   - The table exists in the 2020–24 and 2019–23 five-year releases. The 2018–22 API call returns 404, so there can be no trend.
   - Owner-occupied homes only, reported in brackets topping out at "$4,000 or more", with no aggregate. Tract coverage is unverified; I did not use the project's API key.
   - Use mortgaged owners, who must carry insurance. Show the bracket median and the share at $4,000 or more as a risk rank, not as a premium.
   - **Risk:** it lags the 2023–25 premium rises, and landlord policies cost differently.
5. **Supply typology for policy makers (S–M).** Cross permits with real value growth and price-to-income, separating "prices rising, little building" from "little demand" (Glaeser and Gyourko 2018). For the zoning pilot, try the Wharton 2018 regulatory index before coding zoning by hand (licence and coverage unverified). **Risk:** readers may take the pattern as causal.
6. **ACS 2021–25 release, December 2026 (S).** Choose the new set of periods, keep the pre-2022 value rule, and re-run the `holds` checks.

**I would not do:**
- A county-level tax estimate for a new purchase: it needs local tax rates and special districts, so it would give false precision. Put the new-buyer gap into item 1 for the 12 states with resetting caps instead.
- Tract trends: medians cannot be split across boundary changes, and the 2008–12 tract margins are larger than the change.

## 5. For other specialists
- **Data scientist:** 126 tract yields above 25% remain (maximum 112%), and 57 of them are not flagged low-reliability. One is Bronx tract 462.06 at 82%, probably a limited-equity co-op. The aggregate tax and value margins (B25090_001M, B25082_001M) are not fetched, so the headline rate has no reliability check of its own.
- **Designer:** tiles read "Higher than 1% of US counties"; the summary's "lower than 99%" phrasing reads better.

Scratch files are in (the session's scratch folder: economist/): `lincoln2022.csv` (the Lincoln figures I transcribed) and `run_summary.mjs` (renders a county's summary in node).

**Sources:**
- Lincoln/MCFE 50-State Study, taxes paid 2022 (https://archive.legmt.gov/content/Publications/fiscal/2025-Biennium/Special-Topics/Property-Tax/Lincoln-50-State-Property-Tax-Comparison-2022.pdf) and the 2024 edition page (https://www.lincolninst.edu/publications/other/50-state-property-tax-comparison-study-2024/)
- Census user note 2023-07 (https://www.census.gov/programs-surveys/acs/technical-documentation/user-notes/2023-07.html); 2018–22 changes (https://www.census.gov/programs-surveys/acs/technical-documentation/table-and-geography-changes/2022/5-year.html); 2019–23 changes (https://www.census.gov/programs-surveys/acs/technical-documentation/table-and-geography-changes/2023/5-year.html)
- B25141 in the 2024 API (https://api.census.gov/data/2024/acs/acs5/groups/B25141.html); Census Reporter, B25141 (https://censusreporter.org/tables/B25141/)
- Alabama Department of Revenue (https://www.revenue.alabama.gov/property-tax/property-tax-assessment/)
- Schwegman and Yinger 2020 (https://www2.census.gov/ces/wp/2020/CES-WP-20-43.pdf)
- Building Permits Survey methodology (https://www.census.gov/construction/bps/methodology.html); QuickFacts permits note (https://www.census.gov/quickfacts/note/BPS030220)
- Secondary source for Yinger et al. (https://www.k-state.edu/economics/about/staff/websites/turner/tsoodleturner.pdf)
