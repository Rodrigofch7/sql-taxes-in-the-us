## Investor, round 3: final recommendation

### 1. Ranked next steps

**1. Save every setting in links, then switch to a neutral default view** (data scientist, economist, designer)
- **Why:** every first visit opens on the measure that mis-ranks counties most for a landlord (round-1 F1). Links people have already saved must keep their meaning.
- **Effort:** M. **Depends on:** nothing.
- **Done when:**
  - the bare URL lists Los Angeles, Cook and Harris first, under "Sorted by population";
  - population loss on the map has its own colour;
  - three starting-screen buttons, named by their filters, apply visible filters and no tax limit;
  - a link saved before the change (no `v=`) opens exactly as it did before.

**2. Rental-tax badge built from state statutes** (economist writes the content; data scientist builds the file and tests; designer handles display)
- **Why:** tells every investor which states' tax figures understate a landlord's bill, without showing a number nobody can support.
- **Effort:** M (S to build, plus three to five days of research). **Depends on:** 1.
- **Done when:**
  - a test confirms all 51 rows have a rule, a statute link and a check date within 18 months, with "Not checked yet" in place of any blank;
  - Cullman County AL shows Alabama's rule beside its 0.21% rate;
  - the profile summary states the state's rule in place of the generic landlord sentence (`web/summary.js:38`).

**3. One rent definition on the profile, and a corrected financing line** (economist, investor)
- **Why:** a profile shows two different rents (F6), and the "Check before you act" list misstates what borrowing does (F5).
- **Effort:** S. **Depends on:** 1.
- **Done when:**
  - Henry County GA shows $1,432 in both the header and the 2020–24 point of the rent chart;
  - rent growth uses a new contract-rent column;
  - Finding 7 still holds and says it uses gross rent;
  - the checklist says that borrowing at a rate above the yield lowers the cash return.

**4. Get the build ready for the 2021–25 release** (data scientist, economist)
- **Why:** the December release is when users come back, and its labels must not go wrong silently.
- **Effort:** L. **Depends on:** the economist's trend years (2013/2017/2021/2025).
- **Done when:**
  - a build with a missing permit year fails;
  - the coverage tests pass;
  - meta.json records the commit and the inputs;
  - the Findings check rejects NaN.

**5. Map honesty and resilience** (designer, data scientist)
- **Why:** the map is how I see where matches cluster and which places are shrinking.
- **Effort:** M. **Depends on:** 1.
- **Done when:**
  - with WebGL off, the table and filters still work;
  - the legend separates "Filtered out" from "No data";
  - about a sixth of Marion County IN's tracts fall in the top yield class, on that county's own scale, with low-reliability tracts hatched;
  - tract rental vacancy reads "Not shown for tracts: samples too small";
  - the permits filter accepts a maximum.

**6. Hazard, then insurance cost** (investor, economist, data scientist)
- **Why:** this is the biggest missing cost in the places my screens point to (F2).
- **Effort:** M. **Depends on:** 4.
- **Done when:** Polk County FL shows a hazard rank from FEMA's Risk Index (expected building loss ÷ building value) and the share of mortgaged owners paying $4,000 or more a year for insurance. Both carry a date, and neither is shown as a premium.

**7. Tract table with CSV export for the selected county** (investor, data scientist)
- **Why:** for choosing neighbourhoods inside a shortlisted county.
- **Effort:** S. **Depends on:** 5.
- **Done when:** Marion County IN lists its 253 tracts, sortable and paginated, and every blank cell in the CSV has a flag explaining why.

### 2. What I would not do
**The cash-flow check on the profile.** It needs the assessor's rate, an insurance quote, the rent for the actual house and a view on price growth. If the user types all four in, it is just a spreadsheet. If any is filled in for them, it gives a verdict on figures the panel agreed cannot support one.

### 3. Questions the owner must answer
- **When a user picks the tax rate, should it still sort lowest first?**
  - *My answer:* yes, with the badge beside it and no longer as the default. Yield already reflects the price, so at equal yield a lower landlord tax really is better.
  - *Economist:* low rates are largely priced in, so "lowest first" suggests a virtue the data do not show.
- **Does the profile get a cash-flow check?**
  - *My answer:* no (section 2).
  - *Designer:* a collapsed check that the user fills in and that shows a range is honest.
- **What replaces HUD Fair Market Rents for current market data?**
  - *My answer:* ACS one-year 2024 estimates (850 counties, about 86% of residents), shown as dated tiles on the profile, after step 4. Say plainly that no free source shows the 2025–26 rent falls. Add a private rent index only if its licence allows republishing (unverified).
  - *Data scientist:* FHFA's county price index is labelled developmental, so it should be optional and clearly labelled.
- **Insurance or the FEMA Risk Index first?**
  - *My answer:* the Risk Index. It covers counties and tracts and needs no change to the fetcher, whereas the insurance table (B25141) needs the per-year variable lists from step 4.
  - *Economist:* B25141 is closer to what owners actually pay.
- **Which rent measure carries the affordability finding?**
  - *My answer:* gross rent, named as such, because the finding is about what tenants pay. Use contract rent everywhere a landlord reads.
  - *Data scientist:* this changes what saved links using the rent-growth filter return; step 1 handles that.
