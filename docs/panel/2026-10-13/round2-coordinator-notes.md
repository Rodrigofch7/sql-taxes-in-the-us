# Coordinator's notes after round 2

I re-checked the round-2 claims that would most change the plan. Everything below holds unless marked otherwise.

## Confirmed
- **Saved links depend on defaults** (investor, data scientist). writeHash in web/app.js omits any setting equal to its default, and readHash fills the defaults back in. Changing a default therefore changes what every existing link shows.
- **Tract colouring on the national county scale** (investor). For gross yield, 69% of tracts in Henry GA, 64% in Polk FL and 57% in Marion IN fall in the top class; Travis TX has 15%.
- **Population decline is hidden** (investor, designer, economist). 49.7% of counties lost people. The map's class breaks for population growth are −7.6, −3.5, +0.1, +4.1 and +10.5%, so all of the decline falls in the three lightest blues.
- **Contract rent reverses Finding 7** (data scientist). In the 989 counties of 50,000+ with trends, median real growth is 11.7% for contract rent, 8.3% for gross rent and 8.5% for income. The share of people in counties where rent outgrew income is 73% with gross rent and 82% with contract rent.
- **Finding 5, compared like for like** (data scientist): 50.3% against 40.6% gives a ratio of 1.239, below the finding's own `holds` threshold of 1.25.
- **Two rent figures in Travis County** (designer): the header shows $1,592 (contract rent), the chart $1,744 (gross rent).
- **Rental vacancy for tracts** (designer): setting `tract: false` would make the legend say "this measure is not published for tracts" (web/map.js:190), which is untrue.
- **Withholding a finding renumbers the rest** (designer): the "01 · …" numbers come from list position (web/findings.js:31).
- **The population column is cut off at 1440 px** (designer): with long county names it sits off screen (screenshot round2/r2-proposed-default.png).
- **ACS one-year 2024** (economist): the release has county data for 850 counties in the 50 states and DC, covering 292.2 million people (about 86% of residents). The economist's 836 and 85.5% were estimated from five-year populations of 65,000+; the real release is slightly larger.
- **CPI rose 36.6% from 2012 to 2024** (economist).

## Not checked by the coordinator
- HUD's Fair Market Rent methodology details, FHFA's "developmental" label, and the FEMA Risk Index geography and version (data scientist, economist).
- The economist's Lincoln Table 6b and 2b figures (Jacksonville, Los Angeles, Buffalo, NYC) and the list of 12 states whose caps reset at sale.
- The margins of error on 12-year growth (±8 to ±19 points) that the economist cites for a neutral class.

## Where the panel now agrees
- **(a) Rental tax.** All four now back a statute-based badge in words, with no multiplier and no county landlord rate. The investor withdrew the multiplier and the designer withdrew the side-by-side rate. Lincoln figures appear only with permission.
- **(b) Default view.** All four back sorting by population, largest first, with the map coloured by population growth on a diverging palette, after links store every setting. The data scientist and the investor make storing every setting a precondition.

## Still open going into round 3
- Whether the tax rate should keep sorting lowest first (investor: yes; economist: wants it less prominent).
- Which rent measure carries the affordability story, and how to rewrite Findings 5, 7 and 8.
- Whether the profile gets a cash-flow check: the investor dropped it; the designer would add it later as a collapsed, user-filled check.
- What replaces HUD Fair Market Rents for current market data (the economist proposes ACS one-year plus FHFA); the order of insurance and the FEMA Risk Index.
- The trend grid for the December release (the economist proposes 2013/2017/2021/2025).
