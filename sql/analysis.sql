-- =====================================================================
-- analysis.sql  —  property-tax analysis over ACS 2012 / 2016 / 2020 / 2024
--
-- Run after building the DB:
--     duckdb data/processed/acs.duckdb
--     .read sql/analysis.sql        -- or paste queries one at a time
--
-- Key metrics:
--   median_real_estate_taxes_paid  = the typical homeowner's annual tax bill
--   mean_real_estate_taxes_paid    = the average bill (not top-coded)
--   effective_tax_rate_agg         = aggregate taxes / aggregate home value
--   effective_property_tax_rate    = median taxes / median home value
--   tax_to_income_ratio            = taxes / household income  (burden)
--
-- The ACS caps the median tax at $10,001, so the highest-tax places all tie on
-- it. Rankings below use the mean bill and the aggregate rate instead.
--
-- NOTE: dollars are NOMINAL unless a column says real. See the last query to
-- compare 2012 and 2024 in real terms.
-- =====================================================================


-- Q1 ── Counties with the highest average tax bill (2024) -------------------
SELECT name,
       ROUND(mean_real_estate_taxes_paid)          AS mean_taxes,
       ROUND(median_real_estate_taxes_paid)        AS median_taxes,
       tax_topcoded,
       ROUND(median_home_value)                    AS home_value,
       ROUND(100 * effective_tax_rate_agg, 2)      AS eff_rate_pct
FROM county
WHERE year = 2024
  AND mean_real_estate_taxes_paid IS NOT NULL
ORDER BY mean_real_estate_taxes_paid DESC
LIMIT 20;


-- Q2 ── Counties with the lowest typical tax bill (2024) --------------------
SELECT name,
       ROUND(median_real_estate_taxes_paid)        AS taxes,
       ROUND(median_home_value)                    AS home_value
FROM county
WHERE year = 2024
  AND median_real_estate_taxes_paid > 0
ORDER BY median_real_estate_taxes_paid ASC
LIMIT 20;


-- Q3 ── Highest EFFECTIVE tax rate (taxes as % of home value), 2024 ---------
-- Ranks very differently from raw dollars: high-value areas can have low rates.
SELECT name,
       ROUND(100 * effective_tax_rate_agg, 2)      AS eff_rate_pct,
       ROUND(mean_real_estate_taxes_paid)          AS mean_taxes,
       ROUND(median_home_value)                    AS home_value
FROM county
WHERE year = 2024
  AND effective_tax_rate_agg IS NOT NULL
ORDER BY effective_tax_rate_agg DESC
LIMIT 20;


-- Q4 ── Lowest effective tax rate, 2024 ------------------------------------
SELECT name,
       ROUND(100 * effective_tax_rate_agg, 2)      AS eff_rate_pct,
       ROUND(median_home_value)                    AS home_value
FROM county
WHERE year = 2024
  AND effective_tax_rate_agg > 0
ORDER BY effective_tax_rate_agg ASC
LIMIT 20;


-- Q5 ── State ranking: typical bill and effective rate, 2024 ---------------
SELECT name AS state,
       ROUND(median_real_estate_taxes_paid)        AS taxes,
       ROUND(100 * effective_tax_rate_agg, 2)      AS eff_rate_pct
FROM state
WHERE year = 2024
ORDER BY median_real_estate_taxes_paid DESC;


-- Q6 ── Fastest-RISING county tax bills, 2012 -> 2024 ----------------------
WITH y2012 AS (
    SELECT geoid, name, median_real_estate_taxes_paid AS t
    FROM county WHERE year = 2012
),
y2024 AS (
    SELECT geoid, median_real_estate_taxes_paid AS t
    FROM county WHERE year = 2024
)
SELECT a.name,
       ROUND(a.t)                              AS taxes_2012,
       ROUND(b.t)                              AS taxes_2024,
       ROUND(b.t - a.t)                        AS abs_change,
       ROUND(100 * (b.t - a.t) / NULLIF(a.t, 0), 1) AS pct_change
FROM y2012 a
JOIN y2024 b USING (geoid)
WHERE a.t > 0 AND b.t IS NOT NULL
ORDER BY pct_change DESC
LIMIT 20;


-- Q7 ── Fastest-FALLING county tax bills, 2012 -> 2024 ---------------------
WITH y2012 AS (
    SELECT geoid, name, median_real_estate_taxes_paid AS t
    FROM county WHERE year = 2012
),
y2024 AS (
    SELECT geoid, median_real_estate_taxes_paid AS t
    FROM county WHERE year = 2024
)
SELECT a.name,
       ROUND(a.t)                              AS taxes_2012,
       ROUND(b.t)                              AS taxes_2024,
       ROUND(100 * (b.t - a.t) / NULLIF(a.t, 0), 1) AS pct_change
FROM y2012 a
JOIN y2024 b USING (geoid)
WHERE a.t > 0 AND b.t IS NOT NULL
ORDER BY pct_change ASC
LIMIT 20;


-- Q8 ── Heaviest burden: taxes as a share of household income, 2024 --------
SELECT name,
       ROUND(100 * tax_to_income_ratio, 2) AS tax_pct_of_income,
       ROUND(median_real_estate_taxes_paid) AS taxes,
       ROUND(median_household_income)       AS income
FROM county
WHERE year = 2024
  AND tax_to_income_ratio IS NOT NULL
ORDER BY tax_to_income_ratio DESC
LIMIT 20;


-- Q9 ── Biggest rank movers among counties, by tax bill (2012 vs 2024) -----
-- Rank 1 = highest taxes that year; positive rank_change = climbed the table.
WITH ranked AS (
    SELECT geoid, name, year,
           RANK() OVER (PARTITION BY year
                        ORDER BY median_real_estate_taxes_paid DESC) AS rnk
    FROM county
    WHERE year IN (2012, 2024)
      AND median_real_estate_taxes_paid IS NOT NULL
)
SELECT r12.name,
       r12.rnk AS rank_2012,
       r24.rnk AS rank_2024,
       r12.rnk - r24.rnk AS rank_change
FROM ranked r12
JOIN ranked r24 USING (geoid)
WHERE r12.year = 2012 AND r24.year = 2024
ORDER BY abs(r12.rnk - r24.rnk) DESC
LIMIT 20;


-- Q10 ── Where home values outran (or lagged) the tax bill, 2012 -> 2024 ----
-- gap_pct > 0 : home values grew faster than taxes (assessment lag).
-- gap_pct < 0 : taxes grew faster than the underlying value.
WITH chg AS (
    SELECT a.name,
           100 * (b.hv - a.hv) / NULLIF(a.hv, 0) AS home_value_growth,
           100 * (b.tx - a.tx) / NULLIF(a.tx, 0) AS tax_growth
    FROM (SELECT geoid, name, median_home_value hv, median_real_estate_taxes_paid tx
          FROM county WHERE year = 2012) a
    JOIN (SELECT geoid, median_home_value hv, median_real_estate_taxes_paid tx
          FROM county WHERE year = 2024) b USING (geoid)
    WHERE a.hv > 0 AND a.tx > 0
)
SELECT name,
       ROUND(home_value_growth, 1) AS home_value_growth_pct,
       ROUND(tax_growth, 1)        AS tax_growth_pct,
       ROUND(home_value_growth - tax_growth, 1) AS gap_pct
FROM chg
ORDER BY gap_pct DESC
LIMIT 20;


-- Q11 ── The single highest-tax county within each state, 2024 -------------
SELECT state_fips,
       name,
       ROUND(median_real_estate_taxes_paid) AS taxes
FROM county
WHERE year = 2024
  AND median_real_estate_taxes_paid IS NOT NULL
QUALIFY ROW_NUMBER() OVER (PARTITION BY state_fips
                           ORDER BY median_real_estate_taxes_paid DESC) = 1
ORDER BY taxes DESC;


-- Q12 ── Most UNEQUAL states: spread of tract-level tax rates, 2024 --------
-- Coefficient of variation across census tracts within each state.
SELECT state_fips,
       COUNT(*)                                      AS tracts,
       ROUND(100 * median(effective_property_tax_rate), 2) AS median_eff_rate_pct,
       ROUND(stddev_samp(effective_property_tax_rate)
             / NULLIF(avg(effective_property_tax_rate), 0), 3) AS coeff_of_variation
FROM tract
WHERE year = 2024
  AND effective_property_tax_rate IS NOT NULL
  AND median_home_value > 0
GROUP BY state_fips
HAVING COUNT(*) > 50
ORDER BY coeff_of_variation DESC
LIMIT 20;


-- Q13 ── National trend: county-level medians over time ---------------------
SELECT year,
       ROUND(median(median_real_estate_taxes_paid))        AS median_county_tax,
       ROUND(median(median_home_value))                    AS median_county_home_value,
       ROUND(100 * median(effective_property_tax_rate), 2) AS median_eff_rate_pct
FROM county
WHERE median_real_estate_taxes_paid IS NOT NULL
GROUP BY year
ORDER BY year;


-- Q14 ── Wide view: each state's tax bill across all four years -------------
PIVOT state
    ON year
    USING ROUND(first(median_real_estate_taxes_paid))
    GROUP BY name
ORDER BY name;


-- Q15 ── Fastest-rising county tax bills in REAL dollars, 2012 -> 2024 -----
-- Uses the mean bill (not top-coded), deflated with CPI-U to 2024 dollars.
-- Connecticut is absent: its counties were replaced by planning regions in
-- 2022, so no 2012 geoid matches a 2024 one.
SELECT a.name,
       ROUND(a.mean_real_estate_taxes_paid)       AS taxes_2012_nominal,
       ROUND(a.real_mean_real_estate_taxes_paid)  AS taxes_2012_in_2024usd,
       ROUND(b.mean_real_estate_taxes_paid)       AS taxes_2024,
       ROUND(100 * (b.real_mean_real_estate_taxes_paid
                    / NULLIF(a.real_mean_real_estate_taxes_paid, 0) - 1), 1) AS real_pct_change
FROM (SELECT * FROM county WHERE year = 2012) a
JOIN (SELECT * FROM county WHERE year = 2024) b USING (geoid)
WHERE a.mean_real_estate_taxes_paid > 0
ORDER BY real_pct_change DESC
LIMIT 20;
