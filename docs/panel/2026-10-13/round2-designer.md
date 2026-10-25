**Designer, round 2**

I re-checked the points below on the live site; files are in (the session's scratch folder: designer/round2/) (r2-proposed-default.png and r2.cjs). The repository is unchanged.

## 1. Agreements that matter
- **Default ranking by tax rate** (economist F1, investor F1): it is the first thing every visitor sees, so it goes at the top of the plan.
- **Two rent figures on one profile** (economist F5, investor F6): my own capture shows Travis at $1,592 in the header and $1,744 in the 2024 chart (25-profile-compare-hover). Fix it together with the profile chart redesign.
- **A map failure takes down the table** (data scientist F4, my F6), found independently. Render the table first: vendoring MapLibre alone does not help browsers without WebGL (85-no-webgl).
- **Small wording fixes:** tile percentiles should use the summary's "lower than 99%" phrasing (profile.js:66). "Hide small-sample counties" removes 0 of 999 counties (investor F8), so show "(0 in view)" beside it.
- **Finding 8's x-axis** (economist F4b): I missed it, and it is a worse honesty error than my clipping problems.

## 2. Disagreements
- **The investor's interim tag**, "rentals pay ~N×" beside every tax figure, is the multiplier itself. It would repeat in 999 rows, built from one city per state. It crowds the table, looks falsely precise everywhere, and needs the very state table it is meant to stand in for. The neutral default on its own is the interim fix.
- **The economist's badge** adds "Lincoln's largest-city figure" to every profile. That breaks the economist's own licence point, that the study may not be reproduced without permission. Either get permission or cite statutes only.
- **The investor's `tract: false` for rental vacancy** would make the legend say "this measure is not published for tracts" (map.js:190, confirmed live). That is untrue: the Census does publish it. Reword it to "Not shown for tracts: samples too small."
- **Sorting by population** (economist) looks arbitrary as specified. Population is the last table column and is clipped at 1440 px, so the column that sets the order is off screen (r2-proposed-default.png). Move it next to the county name and head the results "Sorted by population".

## 3. Costs they did not see
- **A minimum and maximum on every filter** (investor F3) means 18 inputs, in a sidebar that already fills a phone's first screen. Add a maximum to permits only.
- **An insurance median interpolated from brackets** reads as a premium, and the top bracket caps it exactly where it matters. Use the economist's rank or share form.
- **The proposed new measures** push the metric picker past 25 options in one ungrouped list. Group the options first.
- **Current-market figures next to 2020–24 ACS figures** invite ratios across vintages. Show them as dated tiles on the profile, not as table columns.
- **Withholding a failing finding** (data scientist F3c) renumbers the "01 · …" labels (findings.js:31) and breaks links into the report. Keep the slot, with a stable id and a "being updated" note.
- **Re-sorting each curve in Finding 5** (economist F4a) draws two lines over different counties. Two bars, 50% against 41%, would read better.

## 4. What their proposals depend on
- **Presets** need my dimming fix, or a preset will look like an empty map. They also need a rule of no tax bound: the investor's low-tax screen returns 7 Florida and 3 Mississippi counties out of 13 (re-run live).
- **The cash-flow sheet** needs the badge, insurance data and a single rent definition. Prefilling gross rent would overstate a landlord's income.
- **The badge** needs a popover that works on touch, the same component my ⚠ fix builds.

## 5. Revised priorities
1. Default view and starting screens (S; from the economist and investor), shipped with the diverging palette it needs.
2. My map honesty pass.
3. The economist's badge, now ranked above my phone layout.
4. Phone layout and touch, absorbing focus management, the contrast fixes and the ⚠ popover.
5. Profile: one rent definition, the indexed chart, and a comparison table.
6. Table without the map, and a self-hosted MapLibre.
7. Findings honesty fixes (economist F4a–c), with the phone clipping fixes and cross-links.
8. Keyboard access to the Findings charts.

## (a) The rental-tax table
Build the economist's badge. I withdraw my side-by-side "landlord rate", because users would read any number there as their own rate. The smallest honest version gives each state two worded fields, each with a statute link and the date checked:
- "Rentals taxed: same / higher / much higher / depends on the city"
- "Value resets at sale: yes / no"

A state not yet checked shows "Not checked yet", never a blank. The badge appears in three places:
- a sub-line on the profile's tax tile, replacing summary.js:38;
- a narrow "Rentals pay" column beside the tax rate in the table;
- a filter that hides "much higher" states.

It should use grey chips with words. Traffic-light colours would read as a verdict and carry their meaning by colour alone.

## (b) The default view
Colour the map by population growth on the diverging palette, and sort the table by population, largest first (Los Angeles, Cook, Harris…). Mark the 50,000-population filter as the default.

The investor's presets become three chips above the results. Each one:
- is named by its criteria, not by strategy;
- sets visible filters and the URL;
- says "2020–24 data, not a recommendation";
- sets no tax bound until the badge exists.

The cash-flow sheet becomes a collapsed "Rough cash-flow check" below the profile tiles:
- the user enters the tax bill from the assessor, with the owner rate shown only as a hint;
- the result is shown as a range, with no green or red verdict.

That is M effort rather than S–M, and it should come after the badge and insurance.

**Data-scientist fixes users would see:**
- the table working without the map (F4);
- exact populations (F6);
- reasons for blank CSV cells (F7);
- labels that stay right after the next refresh (F1);
- no "nan%" in Findings (F3a).

The rest is invisible, but it prevents those failures.
