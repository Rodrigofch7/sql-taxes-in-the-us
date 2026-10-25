# Economist, round 3: final recommendation

## 1. Ranked next steps

**1. Neutral opening view** (all four lanes) — effort S–M
- **What:** first make links store every setting (or carry `v=1`). Then sort the table by population, largest first, with that column moved beside the county name. Colour the map by population growth on a diverging palette: a hard break at 0 for population, and an "about flat, ±5 points" class for value and rent growth.
- **Why:** the first ranking every visitor sees stops recommending Apache County and Alabama on the strength of an owner-occupier tax rate.
- **Depends on:** nothing.
- **Done when:**
  - a link saved before the change reopens identically (automated test);
  - the live site opens on Los Angeles, Cook and Harris;
  - population decline shows in its own colour.

**2. State rental-tax badge built from statutes** (economist; all four agree) — effort M for the research, S to wire in
- **What:** a 51-row CSV holding, per state:
  - a category;
  - a one-line rule;
  - a link to the statute;
  - whether taxable value resets at sale;
  - the date checked.
  New York City and Cook County get their own override rows.
- **How it shows:** grey chips with words, in the tax tile, as a narrow column and as a filter.
- **Levels:** set from the statute's effect on a median-value home in the state: under 1.1× is "about the same", 1.1–1.5× "higher", 1.5× or more "much higher".
- **Lincoln figures:** none without the Institute's permission.
- **Why:** investors choosing between states.
- **Depends on:** step 1.
- **Done when:**
  - pytest confirms 51 rows, each with a source and checked within 18 months;
  - the Jefferson County AL profile names Alabama's 20% vs 10% assessment rule in place of summary.js:38;
  - no page shows a numeric landlord rate.

**3. Readiness for the 2021–25 release** (data scientist; trend years from Q4) — effort M
- **What:**
  - one config for all vintages;
  - an assertion that permits cover every window year;
  - state names taken from the FIPS code;
  - period wording generated rather than typed;
  - coverage tests;
  - a record of inputs.
- **Why:** without it, the December release prints wrong labels under every saved screen.
- **Depends on:** Q4.
- **Done when:** a build with 2025 mocked as the latest vintage passes the coverage tests and shows no blank state names.

**4. Findings and rent consistency** (economist and data scientist) — effort S–M
- **What:**
  - reject NaN and infinity in the `holds` gate;
  - declare each finding's parameters once;
  - keep finding slots stable when one is withheld;
  - rewrite Findings 5, 7 and 8 (Q1, Q2);
  - use contract rent in the profile header, trend chart, rent growth and its filter;
  - stop sorting tax-bill growth lowest first.
- **Depends on:** step 1, because the meaning of the rent-growth filter changes.
- **Done when:**
  - `findings.py` prints the three rewritten findings, all holding;
  - a 0/0 test fails the gate;
  - no dot in Finding 8's chart sits on the wrong side of the diagonal;
  - Travis shows $1,592 in both the header and the chart.

**5. Honest map, and a table that works without it** (designer and data scientist) — effort M
- **Done when:**
  - with WebGL off, the table and filters still work;
  - the legend lists "Filtered out" and "No data";
  - in dark mode the data is drawn above the roads.

**6. Hazard and insurance** (investor and economist) — effort M
- **What:**
  - FEMA's National Risk Index expected building loss rate, for counties and tracts, shown as a percentile;
  - from B25141, the share of mortgaged owners paying $4,000 or more, for 2020–24 only.
- **Why:** it is the missing cost, and it points the wrong way exactly where the low-tax screens lead (Florida and the Gulf).
- **Depends on:** step 3 (per-year variable lists).
- **Done when:** profiles show both figures, dated and labelled "owners' policies, not landlord premiums".

**7. Current-market tiles** (economist and investor) — effort M
- **What:** dated tiles on the profile, not table columns:
  - ACS one-year 2024 contract rent and home value, for the 850 counties it covers;
  - FHFA's index of value change since the survey.
- **Depends on:** steps 3 and 4.
- **Done when:** those counties show the tiles, and no measure combines data from different survey periods.

## 2. What I would not do
**HUD Fair Market Rents as "current rents".** They come from this project's own ACS input, carried forward. They are gross rents, set for a whole metro, and cannot fall below 90% of the previous year. So they cannot show the falling Austin rents that motivated the proposal.

## 3. Questions for the owner

**Q1. Which rent measure carries the affordability story?**
- **My answer:** gross rent for what renters pay; contract rent for everything investors see.
- Finding 7 should say both: rent paid to landlords rose 12% after inflation, faster than incomes (8%); with utilities included, renters' costs rose 8%, in step with incomes.
- *Other view:* one rent definition everywhere. Then Finding 7 becomes "rents outgrew incomes" (82% of people).

**Q2. How should Findings 5 and 8 be rewritten?**
- **Finding 5:** drop "more concentrated than housing". Add that the 100 largest counties hold 41% of homes. Move the claim to Texas and Florida: 28% of permits against 16% of homes. Show it as two bars.
- Do not lower the 1.25 threshold to rescue the old sentence.
- **Finding 8:** put real growth in mean home value on the x-axis. This needs one new column in the marts.

**Q3. Should the tax rate keep sorting lowest first?**
- **My answer:** yes when a user clicks the column, once the badge sits in the same cell. Never as the default, and no tax bound in the starting screens.
- *Investor's view:* at a given rent and price, a lower landlord tax is genuinely better. I agree. The harm came from making it the default and from the gap between owner and landlord rates.

**Q4. Which trend years for the December release?**
- **My answer:** 2013, 2017, 2021 and 2025. Spacing stays the same, the one-year overlaps are already disclosed, and the "12-year total" wording still holds.
- *Other view:* fully separate periods (2010, 2015, 2020, 2025) follow the Census advice not to compare overlapping periods. But that baseline includes the bubble peak and older population weighting (from memory), and growth becomes a 15-year total.
- The release note should compare 2021–25 with 2016–20, which do not overlap.

**Q5. Should the profile get a cash-flow check?** Not before steps 2 and 6. If built, the user enters the tax and insurance figures, and the result is shown as a range.
