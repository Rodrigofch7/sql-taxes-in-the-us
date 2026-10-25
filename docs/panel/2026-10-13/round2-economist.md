# Economist, round 2

## 1. Agreements that matter for the plan
- **Default view:** the investor (F1), the designer (side note) and I (F1) each found it on our own; the coordinator confirmed it.
- **Two "median rent" figures on a profile:** investor F6 and my F5 found the same thing. Both fixes are the same: chart contract rent and base rent growth on it.
- **Insurance table B25141:** the investor and I both found it only in the 2023 and 2024 releases, owner-occupiers only, with a top bracket of "$4,000 or more".
- **No tract trends** (all four of us), and **no hand-coded one-metro zoning layer** (investor, designer, me).
- **Data scientist F3(a)** matters in my lane: some finding ratios divide by a count (`n_both / n_fell`), so a NaN could publish while `holds` is true.

## 2. Disagreements (re-checked)
**Investor's "rentals pay ~N×; resets at sale: yes/no".**
- **It double-counts in some states and misses in others.** Dividing Lincoln's apartment rate by its ratio gives back the homestead rate the ratio uses:
  - Jacksonville: 1.48 / 3.443 = 0.43%. That is the rate for an owner of average tenure (Table 2b, 0.449%), not a new buyer's (1.259%). Charleston, NYC and Houston work the same way.
  - Los Angeles: 1.17 / 1.009 = 1.16%. That is the new-buyer rate (1.155%).
  - So the reset at sale is already inside N in FL, SC, TX and NYC. Adding "resets: yes" counts it twice. In California it is missing: a rental bought now pays about 1.7× this tool's LA rate.
- **The choice of multiplier decides the ranking.**
  - If only Berkeley SC is multiplied by 2.5, it is dearer than 75% of counties of 50,000+. This replicates the investor's figure.
  - If every county gets its own state's Lincoln ratio, Berkeley ×2.5 is dearer than 48%. With South Carolina's own ratio (5.69), it is dearer than 95%.
  - Within New York the ratio runs from 1.49 (Buffalo) to 4.24 (NYC).
  - Answer to the investor: a state multiplier is not sound enough to rank counties on.

**Designer: owner and landlord rates side by side, plus a map toggle.** A county "landlord rate" would be the owner rate times one state number. Mapping it paints a state-level assumption as county data, and a tile with two decimals claims precision nobody has.

**Designer: diverging colour scale with a hard break at 0.**
- **Population:** right. 49.7% of counties shrank. County population totals carry little sampling error, because ACS weights are fitted to official estimates (from memory).
- **Value and rent:** a hard break colours noise. The 90% margin on the 12-year change is about ±8 points for value and ±9 for rent in the median county, and ±17–19 points in counties under 10,000 people.
- **Fix:** add a neutral "about flat, ±5 points" class, and write "after inflation" in the legend. CPI rose 36.6% from 2012 to 2024, so −2% after inflation is about +34% in dollars.

## 3. Costs not seen
**HUD Fair Market Rents** add little that is current or local:
- They are the 40th-percentile gross rent from the same ACS 2020–24 five-year data. A 2024 recent-mover factor is applied but is not allowed to lower rents. The result is trended forward and cannot fall below 90% of the previous year's figure. (This is from HUD's methodology as quoted in search results; the PDF would not open.)
- So they cannot show the falling Austin rents that motivated the proposal.
- One FMR covers a whole metro, so Hays, Travis and Williamson counties would all show the same figure.
- They are gross rents, so dividing them by home values brings back the F6 mismatch.

**FHFA house price index:**
- Fine shown alone as "price change since the survey".
- Scaling ACS values by index growth since 2022 double-counts about 7% of inflation (CPI 2022→2024), because those values are already in 2024 dollars.
- Never divide a 2025 value into a 2020–24 rent.

**A cheaper option nobody named:** ACS one-year 2024 estimates for counties of 65,000+. That covers 836 of the 999 default counties and 85.5% of the population. Same definitions as now, about two years fresher, wider margins.

**FEMA National Risk Index:**
- Use expected annual building loss ÷ building value. The composite score multiplies that loss by social vulnerability, so poorer counties look riskier for the same hazard (from memory).
- It is historical, and premiums also reflect state regulation. Show it as a rank, not a cost.

**Investor's cash-flow sheet:**
- It should take the rate from the assessor, not a prefilled multiplier.
- "Yield below the mortgage rate" means borrowing lowers the cash return, not that the deal loses money; price growth also counts.

**Designer's indexed "since 2008–12" chart** starts at the bottom of the housing bust. Keep the recovery caveat on the chart.

## 4. What their proposals depend on
- **Any rental ratio** must be measured against this tool's rate. For the 53 Lincoln counties, apartment rate ÷ this tool's rate has a median of 1.42 and a range of 0.91–4.01.
- **The trend years for the data scientist's refresh:**
  - Shift the grid to 2013/2017/2021/2025. Even spacing, one-year overlaps and the "12-year total" wording all survive.
  - The pre-2022 value rule still applies to the three older releases. Older years need state and county data only.
  - Do not add 2025 as a fifth point beside 2024: the two periods share four of five years.
  - Findings 7 and 8 will change and need re-checking.

## 5. The two questions
**(a) Rental-tax table.** Build a record from statutes, shown as a badge plus one sentence. No multiplier and no county landlord rate. The smallest honest version:
- **"Rentals pay much more", naming the rule,** for the eight states whose largest city is above 2× in Lincoln Table 6b:
  - South Carolina, Florida, Indiana, Mississippi, West Virginia and Alabama;
  - New York, for NYC only;
  - Massachusetts, marked "varies by town".
- **"New buyers pay more"** for the 12 states whose assessment caps reset at sale. For FL, SC, TX and NYC, note that this is already in Lincoln's figure.
- **Everywhere else:** "no statewide surcharge found; check locally".
- **Lincoln's city figure,** quoted with city and year, only once permission is confirmed.

**(b) Default view.**
- Sort by population, largest first. That implies no recommendation and puts the best-measured places on top.
- Colour the map by population growth on the diverging scale.
- Cost: Connecticut needs a "no trend" legend entry.
- The tax rate can return as the default map once the badge exists.

## 6. Revised priorities
1. Default view (S).
2. Smallest honest rental badge (S–M), then the full table (M).
3. **The data scientist's refresh readiness and coverage tests.** I now rank these above my insurance and supply steps: without them the December release would print wrong permit labels on the new trend grid.
4. **The designer's map honesty pass**, above my supply typology, because the new default depends on an honest legend.
5. Wording fixes (S).
6. The ACS one-year layer plus FHFA "change since the survey", instead of FMRs (M).
7. B25141 median for mortgaged owners, plus the NRI building-loss rate (M).

Sources: Lincoln 2022 study (https://archive.legmt.gov/content/Publications/fiscal/2025-Biennium/Special-Topics/Property-Tax/Lincoln-50-State-Property-Tax-Comparison-2022.pdf); Lincoln 2025, which confirms the investor's Miami 3.2× (https://www.lincolninst.edu/land-wise/report-finds-new-homebuyers-some-cities-pay-double-property-taxes-neighbors/); HUD FY2027 FMR methodology (https://www.huduser.gov/portal/datasets/fmr/fmr2027/FY27-Public-FMR-Methodology.pdf).

Files are in (the session's scratch folder: economist/):
- lincoln6b_ratio.csv
