**Designer, round 1** (live site, 13 Oct 2026)

I rendered the live site with Playwright/Chromium (SwiftShader WebGL) at 1440×900 and at 390×844 with touch, in light and dark. The live files are byte-identical to web/ on screener-v1, so path:line references apply to both. Screenshots are in (the session's scratch folder: designer/shots/) (with phone/ and kbd/ subfolders); the numbers below are filename prefixes. I changed nothing in the repository (git status is clean) and started no server.

## 1. Verdict
The redesign works as intended. Live filtering, state zoom, the summary strip, the county summary and the checklist all behave, and on a desktop the Findings report comes close to financial-press standard. Trust still breaks on the map: it cannot tell "filtered out" from "no data" from "lowest value", it hides decline, and in dark mode it draws roads over its own data. On a phone the screener opens on a wall of form fields and the report's charts clip. The screener and the report are still two sites sharing a header.

## 2. Findings

**1. The map does not show what the filters did.**
- The default filter dims 2,145 of 3,144 counties to #e3e8eb. That colour is 1.07:1 against both the "No data" swatch and the lowest class (04, 36-light).
- The legend has no "filtered out" entry. A dimmed county still gets a normal tooltip (Big Horn County, WY; 07) and opens its profile on tap.
- The default filter is styled as if the user set it, and Reset restores it rather than clearing it.
- **Fix** (map.js:134-135, 181-222):
  - Fill filtered-out counties with a flat neutral (#ecebe6, no class tint) and hatch no-data counties.
  - Add legend rows "Filtered out (2,145)" and "No data".
  - Draw a thin outline on matches while a filter is active.
  - Add a tooltip line such as "Fails: population under 50,000".
  - Offer two buttons: "Reset to defaults" and "Clear all".

**2. First screen and occlusion.**
- At 390 px the whole first screen is controls. The map starts at 914 px and results at 1,419 px.
- A shared #c= link lands 1.7 screens above its profile, because the page does not scroll on first render (phone/50-screener-00; app.js:225).
- At 1440 px the legend hides most of Washington State, Seattle included (04 vs 05).
- On a phone:
  - The table shows two columns with the % sign clipped and no cue that it scrolls sideways.
  - The summary tiles wrap with stray borders (style.css:283).
  - "Download CSV" breaks onto two lines.
- **Fix:**
  - Below 900 px, collapse the filters into a "Filters · 1 active" disclosure placed after the map.
  - Scroll to the profile on load.
  - Put the desktop legend bottom-left, over open Pacific; on phones, make it a strip above the map.
  - Add `white-space: nowrap` to buttons and a fade at the right edge of scrolling tables.

**3. The colour scales hide decline and saturate.**
- Growth measures use the one-hue blue ramp. Half of counties lost population, yet decline and growth are all light blues.
- Value growth's lightest class spans −60% to +2%, and the population legend's middle break reads "+0%" (70, 12).
- Tracts use the national county scale. 72% of Travis tracts and 67% of Texas tracts land in the darkest class, and the roughly 30% that are low-reliability look like the rest (21).
- In dark mode, map.js:105 puts the data below 24 road, rail and building layers of the basemap. Highways cross the fills and place labels smudge (37). The lowest class sits at 1.5:1 against filtered-out counties (36-dark).
- **Fix:**
  - Use a diverging orange/blue palette for the four growth measures, with a forced break at 0.
  - Offer an option to colour tracts on their own state's scale, labelled as such, and hatch low-reliability tracts.
  - In dark mode, draw the data above the road layers.

**4. The profile trend charts overstate change and are too small.**
- Each of the four charts has its own y-axis, none starting at zero, so Travis's +70% home value and +29% income look equally steep (22).
- The charts are drawn 320 units wide but shown at 248 px, so the 10px tick labels print at about 7.8 px, at 3.5:1 contrast (charts.js:42).
- The axes read 2012…2024, while every other label on the site says 2008–12…2020–24.
- The growth tiles carry no time period.
- Adding comparison counties changes only the charts, never the eight tiles investors actually compare (24).
- **Fix:**
  - Replace the four charts with one indexed "% change since 2008–12" chart, the same chart type as Finding 7, drawn at container width as report-charts.js does.
  - Add a period line to the growth tiles.
  - Show compared counties as extra columns in a table of the tile figures.

**5. Keyboard, touch and contrast.**
- Keyboard:
  - Opening a profile from a table row, or closing it, drops focus to `<body>`.
  - The map's focus ring is invisible because `.map-card { overflow: hidden }` clips it (kbd/kbd-18-crop; style.css:216).
  - A focused row shows only a partial outline (kbd/kbd-row-focus).
  - All 200 rows are separate tab stops, and there is no skip link.
- Touch:
  - The ⚠ details live only in `title` text (screener.js:71-76), so keyboard and touch users cannot reach them, and the hint still says "hover" (index.html:79).
  - One tap on the phone map opens a profile, scrolls away and leaves the tooltip stuck on screen (kbd/phone-after-tap2).
- Findings page: 74 of its 87 tab stops are chart marks, 51 of them in one chart. The scatter and line charts have none, and no chart has a data table.
- Contrast: muted text (--text-muted) is 3.5:1 on cards and 3.2:1 on the report's paper; input borders are 1.75:1 (1.48:1 in dark).
- **Fix:**
  - Move focus to the profile heading (`tabindex=-1`) on open, and back to the row on close.
  - Draw the focus ring on `.map-card:focus-within`.
  - Make ⚠ a button that opens a popover.
  - On touch, first tap previews and second tap opens.
  - Give each Findings chart one tab stop, with arrow keys inside.
  - Set --text-muted to #6b6963 (at least 4.8:1 everywhere) and input borders to #8e8c84, or #6a6964 in dark (at least 3.2:1).

**6. A map failure takes down the whole tool.**
- With WebGL unavailable, or the map library's CDN blocked, no table appears and the filters do nothing (85, 84).
- The message shows raw JSON and blames "the data", although the data loaded (app.js:169-182, 265-271).
- **Fix:**
  - Build the table first.
  - If the map fails, say "The map can't run in this browser; the table and filters still work."
  - Self-host MapLibre.

**7. The Findings report against the editorial standard.**
- The frame is right: rules above figures, kickers, serif headlines, direct labels and source lines (34-dark-figs-sheet). The edges are not.
- At 390 px (phone/61-phone-fig-5, -6, -4):
  - The log-scale chart's axis title is clipped at both ends.
  - The bar labels that define each group ("+22%", "−2%") are cut off.
  - Scatter labels collide and hide dots.
- In the state strip chart, the upper labels' leader lines strike through the lower labels (45; report-charts.js:183-187).
- One source line serves every chart (findings.js:23-25). It names the Building Permits Survey on charts that don't use it, and only the 2020–24 survey on charts built from 2008–12 data.
- Headlines run 13–24 words, and each chart sits behind a paragraph of 86–134 words.
- There is no web font, so the serif differs by platform.
- **Fix:**
  - Shorten axis titles, and put the bar sub-labels under the bar labels on narrow screens.
  - Draw all leader lines before the labels.
  - Give each chart its own source line, generated by the build.
  - Keep headlines to 12 words or fewer, with one standfirst sentence above the chart and the detail below it.
  - Self-host one serif font.

**8. Two products sharing a header.**
- Each page's nav lists only the other two pages, with no mark for the current one.
- The logo appears only on the screener (index.html:14-19 vs findings.html:13).
- The datelines disagree ("2020–24 … Built" vs "2020–2024 … Updated").
- Dark mode turns the navy bar to #131313, so the shared colour disappears.
- Above all, nothing links across at the point of interest:
  - No finding opens the screener view it describes.
  - County labels in the charts are not links.
  - The sidebar's yield note does not point to Finding 1.
- **Fix:**
  - One three-item nav with `aria-current`.
  - An "Explore in the screener" link on each finding (prepared hash URLs, checked at build).
  - County labels linked to their profile (#c=).
  - Metric notes linked to the relevant finding.
  - A contents list of the eight headlines at the top of the report.

## 3. Next steps, most valuable first
1. **Map honesty pass** (findings 1 and 3).
   - Helps every investor shortlisting from the map: what passes, what fails, what lacks data, and where places are shrinking.
   - Effort M; no dependencies.
   - Risk: a busier legend. Cap it at two extra rows and test for colour-blindness.
2. **Phone layout and touch** (findings 2 and 5).
   - Filters collapsed after the map, deep links that scroll to the profile, tap-to-preview, a legend inside the map card, three-column results.
   - Helps phone visitors, including anyone opening a shared county link, decide whether a place merits a look.
   - Effort M.
   - Risk: two layouts to test. Keep one DOM and switch with CSS.
3. **Join the report and the screener** (finding 8).
   - Helps readers act on a finding, and helps screener users read yield and tax rate correctly before ranking by them.
   - Effort S; depends on stable hash parameters.
   - Risk: links rot. Add them to the build checks.
4. **Accessibility pass** (finding 5), including data tables in Findings.
   - Helps keyboard, screen-reader, low-vision and touch users with every decision.
   - Effort M.
   - Risk: low. Test with a screen reader.
5. **Profile comparison redesign** (finding 4).
   - Helps investors choose among two to four shortlisted counties.
   - Effort M.
   - Risk: an indexed chart hides levels. Keep the levels in the table.
6. **Let the screener run without the map, and self-host MapLibre** (finding 6; this covers the listed CDN item).
   - Effort S.
   - Risk: low.
7. **Findings polish** (finding 7).
   - Builds credibility with press and policy readers.
   - Effort M.
   - Risk: font weight. Use two weights, about 60 KB.
8. **Presentation for the rental-tax table, if the panel builds it.**
   - Show owner and landlord rates side by side in the tax tile and as a map toggle, with states lacking a rule marked "unknown" rather than left blank.
   - Effort M; depends on the table.
   - Risk: false precision. Label it an estimate.

I would not do three of the listed items:
- **A separate policy-maker view:** it splits the product further; extend Findings instead.
- **A one-metro zoning layer:** it reads as missing data everywhere else; publish it as a finding.
- **Tract trends:** the 2020 boundary redraw leaves no honest way to chart them.

## 4. What works well
- Live filtering, state zoom, and a clear empty state with the CSV button disabled (10b).
- The summary strip at 1440 px.
- The plain county summary and "Check before you act" list, with each warning shown once.
- The profile's table view and keyboard-navigable charts.
- Reliability warnings in tract tooltips (26).
- A clean fallback when the basemap is missing (81).
- Findings at 1440 px in both themes, and a readable Methods column.

## 5. For other specialists
- **Code:** navigating by hash while a filter box has focus leaves an unapplied value on screen (app.js:113; 32 shows "6 %" beside "1 active").
- **Code:** the tract-load error message never clears (app.js:216-217).
- **Investor/economist:** the first view ranks Apache County, AZ and low-rate Alabama counties first by owner-occupier rate, the measure the first review said mis-ranks places for investors.
- **Economist:** Finding 2's body says "more than five times apart" under a "6.4×" headline.
