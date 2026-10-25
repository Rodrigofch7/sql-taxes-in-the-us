## Investor, round 2

One correction to my round 1: tracts showing exactly 0% rental vacancy are 47.2% of those that have a figure, as the coordinator found. My 46.5% used all tracts as the denominator.

### 1. Agreements that matter for the plan
- **Default view:** the economist, the designer and I each found independently that it leads with Apache County AZ and then Alabama.
- **Two rent figures on one profile:** the economist (F5) and I (F6) both found this. Use contract rent everywhere.
- **B25141 insurance table:** the economist and I both found it only in the 2019–23 and 2020–24 releases, in brackets with a top bracket of "$4,000 or more". Use mortgaged owners, latest period only, as a risk rank rather than a premium.
- **Map failure takes down the table too:** the data scientist (F4) and the designer (F6) both found this.
- **Would not do:** the zoning pilot, the policy-maker view and tract trends. All four of us agree.

### 2. Disagreements
- **The designer's landlord rate shown side by side with the owner rate, plus a map toggle (their step 8).**
  - No source supports a county-level landlord rate. In South Carolina it depends on each district's school operating levy, in Florida on how long the owner has held the home, and in Texas and Indiana on local rates and caps.
  - The economist's own figures show the spread: Lincoln's apartment rate divided by our rate ranges from 0.91 to 4.01, and Charleston's ratio moved by 1.94 in one year.
  - Calling it an estimate does not help: it is still a number in a tile.
  - It is also L effort, not M, because it needs local levy data.
- **The designer's tract colouring on the state's scale.** I checked it for gross yield:
  - On today's national county scale, 57–69% of tracts in Polk FL, Henry GA and Marion IN land in the top class, so neighbourhoods all look the same.
  - A state scale brings that down to 20–26%, but puts only 2% of Travis County tracts in the top class, so Austin turns uniformly pale.
  - The selected county's own scale gives about 17% in every case. Use that, label it "relative to this county", and hatch the low-reliability tracts.
- **Economist F2 (low tax rates are largely priced in): I agree, but would keep sorting tax lowest first.**
  - With the yield column alongside, a lower landlord tax is genuinely better, so the direction is right.
  - Because yield minus tax is flat across tax-rate quartiles, the exceptions a screen turns up sit where costs we do not measure are hiding.
  - Of the 79 counties in the top tenth on yield minus tax (50k+, not shrinking), 33 are in Alabama, South Carolina, Florida, Mississippi, Indiana or Louisiana.

### 3. Costs the others did not see
- **Changing any default silently changes every saved link.**
  - The URL leaves out any setting equal to its default (web/app.js:47-56), and opening a link fills those settings back in from the defaults (:25-43).
  - So a link saved today for "tax ≤0.8%, yield ≥5%" would reopen with a different map colour and sort. If the population default moves, it would also show different counties.
  - The designer's prepared "Explore in the screener" links have the same dependency.
  - **Fix first:** write every setting into the URL, or add a version marker such as `v=1`.
- **The designer's table comparing profile tiles across counties (F4)** puts owner tax rates from different states side by side, which is exactly the mis-ranking. Ship it only together with the badge.
- **The data scientist's scheduled rebuild:** a new survey release changes every number under users' saved screens. Publish it with a dated "what changed" note, never silently.

### 4. What their proposals depend on
- **A population-growth map needs the diverging palette first.** 49.7% of all counties lost people, and the national class breaks (−7.6, −3.5, +0.1, +4.1, +10.5%) put all of the decline in the three lightest blues.
- **The badge needs its levels defined in numbers taken from the statutes.** For example, the gap in assessment ratio, or what the homestead exemption is worth at the state's median home value. Without that, "higher" against "much higher" reads as opinion.

### (a) Rental-tax table
Build the economist's statute-based version, with two fields per state:
- **Rental treatment:** about the same / higher / much higher / depends on locality.
- **Taxable value resets at sale:** yes or no.

Each field gets a citation and the date it was checked. Where the law fixes the ratio outright, state it as a fact: Alabama assesses rentals at 20% and owner-occupied homes at 10%.

Smallest honest version: the 51-row table, the badge shown in the same cell as the owner rate, and one sentence on the profile replacing the generic landlord line (web/summary.js:38).

Do not build my Lincoln-derived multiplier: the licence forbids reproduction, it covers one city per state, and it values a $600,000 apartment building. Do not build the designer's county landlord rate either.

### (b) Default view
**Sort by population, largest first, keeping the 50,000 filter.** It is the only neutral candidate I tested:
- Sorting by growth opens on Hays, Comal and Kaufman TX, exurbs that were building hardest just before the Austin supply glut.
- Sorting by lowest rental vacancy opens on sampling zeros, such as Culpeper VA at 0.0%.
- Sorting by highest yield opens on shrinking, high-poverty counties: McKinley NM, Apache AZ and Vermilion IL.

**Colour the map by population growth,** and ship the diverging palette in the same release.

**Add the three screens as one-click starting points,** with their criteria shown.

Do all of this only after links store every setting.

### Proposals that would change what I do, and ones I would never notice
- **Would change what I do:**
  - designer F1 (filtered-out vs no data on the map);
  - designer F3 (diverging palette, county-scale tracts);
  - designer F4's comparison table, once the badge exists;
  - the ⚠ details made reachable on touch;
  - the data scientist's flags in the CSV;
  - a table that works without the map.
- **Would never notice:**
  - population rounding;
  - provenance records and the atomic build;
  - the NaN check on findings;
  - the new tests;
  - the Action, licence and merge;
  - polish of the Findings report;
  - chart pixel sizes.
- I would never see the data scientist's F1 (getting the code ready for the next release) either, but it protects the December release, which is the reason I would come back.

### 5. Revised priorities
1. The statute badge, as in (a).
2. Links that store every setting, then the new default view and the starting-point screens (S).
3. **The data scientist's release readiness**, now ranked above my insurance and current-market steps. A wrong "2021 to 2025" label or blank state names in December would cost more trust than any new layer adds.
4. **The designer's map honesty pass**, now ranked above my tract table.
5. Insurance and hazard: B25141 plus FEMA's National Risk Index.
6. A current-market layer: HUD Fair Market Rents and the FHFA house price index.
7. A tract table, with tract rental vacancy suppressed.
8. Housing-stock fields.

I am dropping my cash-flow sheet. Without an honest landlord tax figure it would need the user to type in tax and insurance, which a spreadsheet does as well.
