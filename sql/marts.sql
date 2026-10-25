-- =====================================================================
-- marts.sql  —  the tables the web app reads
-- Run automatically by code/build_db.py after schema.sql. Safe to re-run.
--
--   state_latest    one row per state, latest ACS year
--   county_latest   one row per county, latest ACS year, with permits,
--                   growth since the first ACS year, and percentile ranks
--   county_trend    one row per (county, ACS year) for the trend charts
--   tract_latest    one row per tract, latest ACS year only
--
-- Scope is the 50 states + DC. Puerto Rico is left out: it has no tract or
-- permit data here and its property tax system is not comparable.
--
-- Tract trends are deliberately absent. Tract boundaries were redrawn in 2020,
-- so a 2012 tract and a 2024 tract with the same geoid can be different land.
-- =====================================================================

-- Permits over the five years ending in the latest ACS year, to line up with
-- the 5-year ACS window. Averaged over the years a county actually appears in,
-- which permit_years records: Connecticut's planning regions only enter the
-- permits survey in 2023, and a few small counties drop in and out of it.
CREATE OR REPLACE TABLE permits_recent AS
WITH p AS (
    SELECT geoid, year,
           units_1 + units_2 + units_3_4 + units_5plus AS units_total,
           units_5plus
    FROM permits_county
    WHERE year BETWEEN (SELECT max(year) - 4 FROM acs_county)
                   AND (SELECT max(year) FROM acs_county)
)
SELECT geoid,
       count(*)                                        AS permit_years,
       avg(units_total)                                AS permits_per_year,
       sum(units_5plus) / NULLIF(sum(units_total), 0)  AS multifamily_permit_share
FROM p
GROUP BY geoid;


CREATE OR REPLACE TABLE state_latest AS
SELECT * EXCLUDE (year), year
FROM state
WHERE year = (SELECT max(year) FROM acs_state)
  AND state_fips <> '72'
ORDER BY geoid;


CREATE OR REPLACE TABLE county_trend AS
SELECT geoid, year,
       population,
       median_home_value,
       median_rent,
       median_household_income,
       mean_real_estate_taxes_paid,
       real_median_home_value,
       real_median_rent,
       real_median_household_income,
       real_mean_real_estate_taxes_paid,
       effective_tax_rate_agg,
       gross_rent_yield,
       net_of_tax_yield,
       price_to_income,
       tax_topcoded, value_topcoded, rent_topcoded, low_reliability,
       -- No trend when the county did not exist under this geoid in the first
       -- ACS year (all of Connecticut, two Alaska areas split in 2019), or
       -- when it kept its code but its boundaries moved (county_changes).
       min(year) OVER (PARTITION BY geoid)
               > (SELECT min(year) FROM acs_county)
           OR geoid IN (SELECT geoid FROM county_changes
                        WHERE kind = 'boundary')  AS trend_unavailable
FROM county_bridged
WHERE geoid IN (SELECT geoid FROM acs_county
                WHERE year = (SELECT max(year) FROM acs_county))
  AND state_fips <> '72'
ORDER BY geoid, year;


CREATE OR REPLACE TABLE county_latest AS
WITH latest AS (
    SELECT * FROM county
    WHERE year = (SELECT max(year) FROM acs_county)
      AND state_fips <> '72'
),
first AS (
    SELECT * FROM county_bridged
    WHERE year = (SELECT min(year) FROM acs_county)
      AND geoid NOT IN (SELECT geoid FROM county_changes WHERE kind = 'boundary')
),
joined AS (
    SELECT l.geoid,
           l.name,
           split_part(l.name, ', ', 1) AS county_name,
           split_part(l.name, ', ', 2) AS state_name,
           l.state_fips,
           l.year,
           f.year AS trend_from_year,
           f.geoid IS NULL AS trend_unavailable,

           l.population,
           l.housing_units,
           l.median_household_income,
           l.median_home_value,
           l.median_rent,
           l.median_contract_rent,
           l.median_real_estate_taxes_paid,
           l.mean_real_estate_taxes_paid,

           l.effective_tax_rate_agg,
           l.effective_property_tax_rate,
           l.tax_to_income_ratio,
           l.gross_rent_yield,
           l.net_of_tax_yield,
           l.price_to_income,
           l.rent_to_income,
           l.poverty_rate,
           l.renter_share,
           l.vacancy_rate,
           l.rental_vacancy_rate,

           -- total real change from the first ACS year to the latest
           l.real_median_home_value
               / NULLIF(f.real_median_home_value, 0) - 1           AS real_home_value_growth,
           l.real_median_rent
               / NULLIF(f.real_median_rent, 0) - 1                 AS real_rent_growth,
           l.real_mean_real_estate_taxes_paid
               / NULLIF(f.real_mean_real_estate_taxes_paid, 0) - 1 AS real_tax_growth,
           l.real_median_household_income
               / NULLIF(f.real_median_household_income, 0) - 1     AS real_income_growth,
           l.population / NULLIF(f.population, 0) - 1              AS population_growth,

           p.permit_years,
           p.permits_per_year,
           1000 * p.permits_per_year / NULLIF(l.housing_units, 0)  AS permits_per_1000_units,
           p.multifamily_permit_share,

           l.tax_topcoded, l.value_topcoded, l.rent_topcoded,
           l.value_bottomcoded, l.rent_bottomcoded, l.low_reliability
    FROM latest l
    LEFT JOIN first f USING (geoid)
    LEFT JOIN permits_recent p USING (geoid)
)
SELECT *,
       -- Percentile ranks, 0 = lowest in the group, 1 = highest. NULL metrics
       -- are ranked in their own partition so they stay NULL.
       CASE WHEN effective_tax_rate_agg IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY effective_tax_rate_agg IS NULL
           ORDER BY effective_tax_rate_agg) END                  AS pctl_us_tax_rate,
       CASE WHEN effective_tax_rate_agg IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY state_fips, effective_tax_rate_agg IS NULL
           ORDER BY effective_tax_rate_agg) END                  AS pctl_state_tax_rate,
       CASE WHEN gross_rent_yield IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY gross_rent_yield IS NULL
           ORDER BY gross_rent_yield) END                        AS pctl_us_yield,
       CASE WHEN gross_rent_yield IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY state_fips, gross_rent_yield IS NULL
           ORDER BY gross_rent_yield) END                        AS pctl_state_yield,
       CASE WHEN price_to_income IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY price_to_income IS NULL
           ORDER BY price_to_income) END                         AS pctl_us_price_to_income,
       CASE WHEN price_to_income IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY state_fips, price_to_income IS NULL
           ORDER BY price_to_income) END                         AS pctl_state_price_to_income,
       CASE WHEN permits_per_1000_units IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY permits_per_1000_units IS NULL
           ORDER BY permits_per_1000_units) END                  AS pctl_us_permits,
       CASE WHEN permits_per_1000_units IS NOT NULL THEN percent_rank() OVER (
           PARTITION BY state_fips, permits_per_1000_units IS NULL
           ORDER BY permits_per_1000_units) END                  AS pctl_state_permits
FROM joined
ORDER BY geoid;


CREATE OR REPLACE TABLE tract_latest AS
SELECT geoid,
       state_fips || county_fips AS county_geoid,
       state_fips,
       name,
       population,
       housing_units,
       median_household_income,
       median_home_value,
       median_rent,
       median_contract_rent,
       median_real_estate_taxes_paid,
       mean_real_estate_taxes_paid,
       effective_tax_rate_agg,
       effective_property_tax_rate,
       tax_to_income_ratio,
       gross_rent_yield,
       net_of_tax_yield,
       price_to_income,
       rent_to_income,
       poverty_rate,
       renter_share,
       vacancy_rate,
       rental_vacancy_rate,
       tax_topcoded, value_topcoded, rent_topcoded,
       value_bottomcoded, rent_bottomcoded, low_reliability
FROM tract
WHERE year = (SELECT max(year) FROM acs_tract)
ORDER BY geoid;
