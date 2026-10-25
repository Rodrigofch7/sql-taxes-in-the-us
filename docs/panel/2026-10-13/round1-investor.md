## Investor review, round 1

**Repo:** this repository. The database was present. All 28 tests pass. The live site matches the local build: the copies of `metrics.js` and `profile.js` have the same hashes, and `meta.json` on both says built 2026-10-11.

### 1. Verdict
The county screener now gives shortlists I would genuinely start from. My three screens returned:
- **Single-family buy-and-hold:** the Atlanta suburbs, Tampa–Orlando, Jacksonville, Charleston's Berkeley County and OKC's Canadian County.
- **Small multifamily:** Rochester, Dayton, Indianapolis, Kansas City KS and Harrisburg.
- **Build-to-rent:** the suburbs of Austin, Dallas–Fort Worth, Nashville, Charlotte and NW Arkansas.

I still would not act on it. Its tax signal, and the insurance cost it leaves out, both point the wrong way in exactly the states its low-tax screens favour. The app also opens on that tax rate. And the figures lag the market by years, which matters most for build-to-rent. The first-review fixes landed. Two of them created new problems (findings 6 and 8).

### 2. Findings, most serious first

**F1. The app opens on a measure that steers investors to the states where landlords pay the most tax.**
- The default map colour and sort are the owner-occupier tax rate, lowest first (`web/app.js:13,17-18`).
- Row 1 of the default view is Apache County AZ: 0.21% tax, home values −47%, population −9%. About 66% of the county is reservation land (Arizona Commerce).
- 24 of the 50 lowest-rate counties of 50,000+ are in Alabama. Alabama assesses rentals at 20% of value and owner-occupied homes at 10% (Code of Alabama §40-8-1).
- The screen "tax ≤0.8%, yield ≥5%, population growth ≥10%, 100k+ people" returns 13 counties: 7 in Florida, 3 in Mississippi, plus Berkeley SC.
- In the Lincoln Institute 2022 study, apartments pay 5.69× the homestead rate in Charleston SC, 3.44× in Jacksonville and 2.18× in Jackson MS. The average across cities is 1.44×.
- New buyers also pay more where taxable value resets at sale: 64% more than a 2010 owner in Jacksonville, and 3.2× a 2012 buyer in Miami (2025 edition).
- If a rental in Berkeley paid just 2.5× the owner rate, the county would move from cheaper than 89.5% of 50k+ counties to dearer than 75.3% of them.
- The profile summary only says "A landlord or new buyer may pay more" (`web/summary.js:38`).

*Fix:* open on a neutral measure or a preset screen. Until the state table exists, put a per-state tag beside every tax figure: "rentals pay ~N×; resets at sale: yes/no".

**F2. Insurance is missing exactly where the screens point.**
- Florida supplies 7 of those 13 counties. It has the highest average homeowners (HO-3) premium: $2,677 against $1,569 nationally (NAIC 2022, via the Insurance Information Institute).
- In Polk County FL, the owner tax already takes 14.3% of gross rent, and that average premium would take another 19.7%.
- The ACS insurance table B25141 exists only in the 2023 and 2024 five-year releases; the Census API returns 404 for 2020–22. It covers owner-occupiers only and is published in brackets, the top one being "$4,000 or more". B25142 and B25143 do not exist, and I found no median table.

*Fix:* see next step 3.

**F3. Lag: the build-to-rent screen ranks an oversupplied market near the top.**
- Screen: 100k+ people, growth ≥20%, permits ≥15 per 1,000, rent growth ≥15%, rental vacancy ≤7%. It returns 56 counties.
- Hays County TX ranks 1st, Williamson TX 5th and Bastrop TX 12th, showing rental vacancy of 3.5%, 4.2% and 1.7%.
- The current market says the opposite: Austin apartment vacancy was 12.29% in Q2 2026 and effective rents fell 3.88% over the year (Matthews/CoStar).
- The permits filter only takes a minimum (`web/metrics.js:103`). A buy-and-hold landlord cannot screen out heavy competing supply.

*Fix:* add a current-market layer (next step 4) and allow both a minimum and a maximum on every filter.

**F4. At tract level, rental vacancy is sampling noise, and tracts cannot be screened at all.**
- 46.5% of tracts show exactly 0.0% rental vacancy, and 27,006 of those carry no ⚠.
- In Marion County IN, 114 of 253 tracts show 0%, including one with 2,206 rented homes. Non-zero counts come in lumps of about 45–54 homes, which is one sampled unit.
- The filters, sorting and CSV export cover counties only (`web/data.js:31-57`, `web/map.js:147-153`).

*Fix:* stop showing rental vacancy for tracts (`tract: false`) or flag it everywhere, and add a tract table with CSV export.

**F5. The yield's level invites a wrong go/no-go decision.**
- Among the 999 counties of 50k+, the median gross yield is 4.29% and the 90th percentile is 5.43%.
- Only 3 reach today's 7.40% 30-year mortgage rate (Freddie Mac, 8 Oct 2026). All 3 are losing population. None clears it after a rough 40% cost allowance plus tax.
- A typical investor target misfires: "Gross yield at least 8%" returns 1 county; the "1% rule" (12%) returns none.
- The checklist says "a yield below your mortgage rate loses money on borrowed funds" (`web/profile.js:29`). That flags 996 of 999 counties and implies that passing the test is enough.
- The rent includes apartments while the value is owned homes, so the figure runs below a house's listing yield. I did not check by how much.

*Fix:* label the yield on the filter and the profile as for ranking places, not a return. Reword the checklist to "net yield on a real listing".

**F6. A profile shows two different "median rent" figures (new problem).**
- The header uses contract rent (`web/profile.js:165`).
- The "Median monthly rent" chart and the rent-growth figure use gross rent, which includes utilities (`sql/marts.sql:55,122`, `sql/schema.sql:132`).
- The gap is 19.4% in the typical county and 33.4% at the 90th percentile. In Henry County GA the header says $1,432 and the chart $1,674.

*Fix:* chart contract rent (it is fetched for every year) and base rent growth on it.

**F7. In resort and college counties, rental vacancy reflects short-term lets, not tenant demand.**
- Examples: Walton FL 37.9%, Lafayette MS (Oxford) 31.6%, Brunswick NC 27.9%, Cape May NJ 26.1%, Baldwin AL 24.9%, Sevier TN 20.5%.
- The note says seasonal homes "are not counted" (`web/metrics.js:28`), so users will read these figures as weak tenant demand.
- That short-term lets are counted as "for rent" is my inference from the pattern (unverified).

*Fix:* flag counties where seasonal vacancies (B25004_006) are a large share of the stock.

**F8. "Hide small-sample counties" does nothing by default (new problem).**
- It removes 0 of the 999 counties in the default view; all 100 flagged counties have fewer than 50,000 people.
- The real noise is in tracts (28% flagged), where the checkbox does not apply.

*Fix:* apply it to tracts, or state that no county at this population is flagged.

### 3. Next steps, most valuable first
1. **State investor-tax table.** For each state: the rental-to-homestead tax ratio, whether value resets at sale, and any cap. Sources: the Lincoln Institute/MCFE 2025 study and state statutes. *Helps* every investor choose states; fixes F1. *Effort* M. *Depends on* the study's licence terms and legal reading. *Main risk:* the ratios are for apartment buildings in each state's largest city, not suburban houses, and laws change.
2. **Default view and presets.** Open on a neutral measure, with three one-click starting screens (the ones above). *Effort* S. *Main risk:* users read presets as recommendations.
3. **Insurance and hazard.** For mortgaged owners in B25141: a median interpolated from the brackets, plus the share in the $4,000+ bracket. Add FEMA National Risk Index v1.20 expected annual loss (county and tract, 18 hazards). *Helps* buyers in Florida, on the Gulf and in wildfire areas. *Effort* M. *Main risks:* the bracket top-code binds where insurance matters most, and homeowner (HO-3) premiums are not landlord (DP-3) premiums.
4. **Current-market layer.** HUD FY2027 Fair Market Rents by bedroom count (Small Area FMRs by ZIP), and the FHFA county house price index to show value change since the survey. *Helps* build-to-rent and anyone buying now (fixes F3). *Effort* M. *Main risks:* FMRs also lag (by how much is unverified), and FMR areas are not counties in New England.
5. **Tract table and CSV export, with tract rental vacancy suppressed** (fixes F4). *Effort* S–M.
6. **Editable cash-flow sheet on the profile:** price, rent, state tax multiplier, insurance, vacancy, upkeep, mortgage rate. Turns the yield into a go/no-go. *Effort* S–M. *Main risk:* false precision.
7. **Housing stock and unit sizes:** B25024 (share of homes in 2–4 unit buildings) and B25031 (rent by bedrooms). *Helps* small-multifamily and single-family investors find the stock and house-level rents. *Effort* S.
8. **Rebuild on the 2021–25 ACS (due December 2026)** with a "changed since last release" view. *Effort* S.

**Would not do now:**
- Zoning pilot: L effort, covers one metro, and permits already serve as a proxy.
- Policy-maker view.
- Tract trends: L effort on noisy data.
- Property-level new-purchase tax estimate: fold the state-level version into step 1 instead.

**What would bring me back a second time:** steps 1 and 4, plus the December release. The URL already saves a screen (`web/app.js:45-61`); a visible "copy link" button would turn that into a watchlist.

### 4. What is sound
- The screens return credible shortlists.
- Floor-coded yields are gone, and the flag for yields above 25% catches the mobile-home and co-op tracts.
- The new filters, honest labels and "12-year total" wording all landed.
- The "Check before you act" list is the right idea.
- Two of the Findings warn investors well: the one on population loss in high-yield counties (43% against 4%), and the one on Marin County and California reassessment at sale.

### 5. For other specialists
- **Economist:** is a state-level multiplier sound enough to rank counties on?
- **Data scientist:** no margins of error are fetched for B25004, so `low_reliability` ignores rental vacancy.
- **Designer:** the tax tile reads "Higher than 10% of US counties" while the summary says "lower than 90%". Percentiles and "all counties" medians use all 3,144 counties, not the 999 shown.

Sources: Code of Alabama §40-8-1 (https://law.justia.com/codes/alabama/title-40/chapter-8/section-40-8-1/) · Lincoln Institute 2022 summary (https://www.lincolninst.edu/app/uploads/legacy-files/pubfiles/50-state-property-tax-comparison-for-2022-exec-summary.pdf) · Lincoln Institute 2025 edition (https://www.lincolninst.edu/land-wise/report-finds-new-homebuyers-some-cities-pay-double-property-taxes-neighbors/) · Arizona Commerce, Apache County (https://www.azcommerce.com/a/profiles/ViewProfile/2/Apache+County/) · Census API, B25141 (https://api.census.gov/data/2024/acs/acs5/groups/B25141.json) · Freddie Mac PMMS (https://www.freddiemac.com/pmms) · Matthews, Austin Q2 2026 (https://www.matthews.com/insights/austin-tx-multifamily-q2-2026) · Florida premiums, NAIC via III (https://theapopkavoice.com/stories/florida-home-insurance-costs-remain-highest-in-the-nation,183730) · FEMA National Risk Index (https://www.fema.gov/about/openfema/data-sets/national-risk-index-data)
