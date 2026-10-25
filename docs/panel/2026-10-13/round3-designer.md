**Designer, round 3: final recommendation**

## 1. Ranked steps

**1. Links store every setting** (data scientist)
- What: write every setting into the URL hash, plus a version marker `v=1`.
- Why: saved and shared screens keep their meaning when defaults change.
- Effort: S. Depends on: nothing.
- Done when: the investor's low-tax link shows the same 13 counties, in the same order, after step 2.

**2. Neutral default view on an honest map** (economist, investor, designer)
- What:
  - sort by population;
  - colour the map by population growth on a diverging palette;
  - add legend rows "Filtered out", "No data" and "No trend", and move the legend off Washington State;
  - in dark mode, draw the data above the roads;
  - add three starting-screen chips, named by their criteria.
- Why: the first view stops ranking by a misleading measure.
- Effort: M. Depends on: 1.
- Done when: the bare URL opens on Los Angeles County with decline in warm colours, and no county sits under the legend at 1440 px.

**3. Table works without the map; MapLibre self-hosted** (data scientist, designer)
- Why: visitors without WebGL, or behind a CDN block, can still screen.
- Effort: S. Depends on: nothing.
- Done when: with WebGL disabled, all 999 rows render and filter.

**4. State rental-tax badge from statutes** (economist)
- What: a 51-row CSV with the category in words, the rule, a statute link, whether value resets at sale, and the date checked.
- Why: investors can see where rentals pay more.
- Effort: S to build, M for the research. Depends on: nothing.
- Done when:
  - a test rejects unsourced or stale rows;
  - Berkeley County SC's profile names South Carolina's rule;
  - no number derived from the Lincoln study appears.

**5. Ready for the 2021–25 release** (data scientist, using the economist's trend grid)
- What: one vintages config, coverage tests, and a findings gate that rejects NaN and no longer blocks the data export.
- Why: the December release must not print wrong periods.
- Effort: M, finished before December. Depends on: the trend-grid decision.
- Done when: a dry run with vintage 2025 passes the coverage tests.

**6. One rent definition; Findings 5, 7 and 8 corrected; profile chart redrawn** (economist, data scientist, designer)
- Why: one rent figure per page, and report claims that pass their own checks.
- Effort: M. Depends on: 5.
- Done when:
  - Travis shows $1,592 everywhere;
  - every `holds` check passes;
  - Finding 8 has no dot on the wrong side of the diagonal.

**7. Phone, touch, accessibility and the tract view** (designer, investor)
- Why: phone visitors reach the map and profile, and tract colours carry meaning.
- Effort: M. Depends on: 2.
- Done when:
  - at 390 px the map is on the first screen;
  - ⚠ details open by tap and by keyboard;
  - axe reports no contrast failures;
  - tracts are coloured "relative to this county", hatched where unreliable.

Next after these: insurance and FEMA risk.

## 2. Would not do
HUD Fair Market Rents as "current rent". One figure covers a whole metro and cannot fall more than 10% a year. Hays, Travis and Williamson would show identical rents, and the layer would miss Austin's fall while looking fresher than the ACS figure it is built from. Use the ACS one-year release plus a labelled FHFA price index instead.

## 3. Questions for the owner

**Should the profile get a cash-flow check?**
- My answer: no. Link each "Check before you act" item to its source, and offer the county's figures as a CSV.
- Other view (mine in round 2): a check the user fills in would stop people reading yield as a return.

**Should growth maps get an "about flat" class or a hard break at 0?**
- My answer: a hard break for population, whose totals are controlled to official estimates. An "about flat, ±5 points" class for value, rent and tax growth, with "after inflation" in the legend title.
- Other view: one rule for all four maps is easier to learn.

**How should Finding 5 read once corrected?**
- My answer: compared like for like, its ratio (1.24) fails its own test. Retitle it "100 counties permit half of new homes", and replace the log-scale curve with two bars: 50% of permits, 41% of homes.
- Other view (economist): two curves, each sorted by its own measure, show every cut-off, not just the top 100.

**How should Finding 8 read once corrected?**
- My answer:
  - keep the scatter, with mean value growth on the x-axis, labelled "average home value";
  - label the diagonal "Tax rate unchanged";
  - put the housing-bust caveat in the subtitle.
- Other view: none of substance; it needs one new column in the data.

**Which rent measure?**
- My answer: "rent" on its own means contract rent everywhere, including Finding 7. Gross rent appears only in rent-to-income, labelled "including utilities".
- Other view: gross rent is the standard measure of affordability.

**Should the tax rate sort lowest first?**
- My answer: yes when a user clicks it, never as the default, and always beside the badge.
- Other view (economist): keep it less prominent altogether.

Nothing in the repository changed (git status is clean), and I did not run deploy.sh.
