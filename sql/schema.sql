-- =====================================================================
-- schema.sql  —  derived convenience views over the raw ACS tables
-- Run automatically by code/build_db.py. Safe to re-run (CREATE OR REPLACE).
--
-- Base tables (acs_state / acs_county / acs_tract) hold the columns named in
-- VARIABLES in code/fetch_census_data.py, plus:
--   name, geoid, state_fips, [county_fips], [tract_fips], year
--
-- The views state / county / tract add, on top of every base column:
--
--   Tax (what owner-occupiers report paying; see the note at the bottom)
--     effective_property_tax_rate  median taxes / median home value
--     effective_tax_rate_agg       aggregate taxes / aggregate home value
--     mean_real_estate_taxes_paid  aggregate taxes / owner-occupied units
--     tax_to_income_ratio          median taxes / median household income
--   Investor
--     gross_rent_yield             12 x median contract rent / median home value
--     net_of_tax_yield             gross_rent_yield - effective_tax_rate_agg
--     price_to_income              median home value / median household income
--     rent_to_income               12 x median gross rent / median household income
--     rental_vacancy_rate          for-rent units / all rental units
--   Context
--     poverty_rate, renter_share, vacancy_rate
--   Data quality
--     tax_topcoded, value_topcoded, rent_topcoded      median sits at the ACS cap
--     value_bottomcoded, rent_bottomcoded              median sits at the ACS floor
--     low_reliability              see the definition in the SELECT below
--   Real dollars (latest ACS year, CPI-U)
--     real_median_home_value, real_median_rent, real_median_household_income,
--     real_mean_real_estate_taxes_paid
--
-- Prefer the *_agg rate and the mean tax bill for ranking: the medians are
-- capped at $10,001 (taxes) and $2,000,001 (value), which flattens exactly the
-- places at the top of the table.
--
-- All tax figures are what current owner-occupiers report paying. They include
-- homestead exemptions and assessment caps, so they understate the bill on a
-- newly bought or rented-out property, by a different amount in each state.
-- =====================================================================

CREATE OR REPLACE MACRO acs_metrics(tbl) AS TABLE
WITH cpi_windows AS (
    SELECT year, cpi,
           avg(cpi) OVER (ORDER BY year ROWS BETWEEN 4 PRECEDING AND CURRENT ROW) AS window_cpi
    FROM cpi
),
base AS (
    SELECT a.*,
           (SELECT cpi FROM cpi
            WHERE year = (SELECT max(year) FROM acs_state)) / c.cpi AS real_factor,
           -- Rent, income and taxes in a 5-year file are already in dollars of
           -- its final year. Home values were NOT until the 2018-2022 release
           -- (Census ACS user note 2023-07): before that they are an average of
           -- nominal values over the window. Bring them to final-year dollars.
           CASE WHEN a.year < 2022 THEN c.cpi / c.window_cpi ELSE 1 END AS value_factor,
           -- ACS raised its top-codes with the 2015 data.
           CASE WHEN a.year <= 2014 THEN 1000001 ELSE 2000001 END AS value_cap,
           CASE WHEN a.year <= 2014 THEN 2001 ELSE 3501 END       AS rent_cap
    FROM query_table(tbl) a
    LEFT JOIN cpi_windows c USING (year)
),
adjusted AS (
    SELECT *,
           median_home_value * value_factor    AS home_value_adj,
           aggregate_home_value * value_factor AS aggregate_value_adj,
           COALESCE(median_home_value <= 9999, false)                    AS value_bottomcoded,
           COALESCE(least(median_rent, median_contract_rent) <= 99, false) AS rent_bottomcoded
    FROM base
)
SELECT * EXCLUDE (real_factor, value_factor, value_cap, rent_cap,
                  home_value_adj, aggregate_value_adj),

       -- tax
       median_real_estate_taxes_paid
           / NULLIF(home_value_adj, 0)           AS effective_property_tax_rate,
       aggregate_real_estate_taxes_paid
           / NULLIF(aggregate_value_adj, 0)      AS effective_tax_rate_agg,
       aggregate_real_estate_taxes_paid
           / NULLIF(owner_occupied_units, 0)     AS mean_real_estate_taxes_paid,
       median_real_estate_taxes_paid
           / NULLIF(median_household_income, 0)  AS tax_to_income_ratio,

       -- investor. A ratio built on a floor value is meaningless, so it is
       -- left NULL rather than shown as a 200% yield.
       CASE WHEN NOT (value_bottomcoded OR rent_bottomcoded)
            THEN 12 * median_contract_rent / NULLIF(home_value_adj, 0)
       END                                       AS gross_rent_yield,
       gross_rent_yield - effective_tax_rate_agg AS net_of_tax_yield,
       CASE WHEN NOT value_bottomcoded
            THEN home_value_adj / NULLIF(median_household_income, 0)
       END                                       AS price_to_income,
       12 * median_rent
           / NULLIF(median_household_income, 0)  AS rent_to_income,
       vacant_for_rent_units / NULLIF(
           renter_occupied_units + vacant_for_rent_units
               + rented_not_occupied_units, 0)   AS rental_vacancy_rate,

       -- context
       poverty_count / NULLIF(poverty_universe, 0)        AS poverty_rate,
       renter_occupied_units / NULLIF(occupied_units, 0)  AS renter_share,
       vacant_units / NULLIF(housing_units, 0)            AS vacancy_rate,

       -- data quality
       COALESCE(median_real_estate_taxes_paid >= 10001, false) AS tax_topcoded,
       COALESCE(median_home_value >= value_cap, false)         AS value_topcoded,
       COALESCE(greatest(median_rent, median_contract_rent)
                    >= rent_cap, false)                        AS rent_topcoded,
       -- Unreliable when any of these holds:
       --   a headline median has a coefficient of variation above 30%
       --     (MOE is a 90% interval, so MOE / 1.645 is the standard error);
       --   a home value or rent median is published without a margin of
       --     error, which is how the ACS marks a median that fell in an
       --     open-ended bracket. The tax median is left out of this rule on
       --     purpose: it lacks a margin exactly where it is capped, and the
       --     tax figures shown come from the uncapped aggregates;
       --   fewer than 100 rented or 100 owned homes stand behind the figures.
       COALESCE(greatest(
           median_home_value_moe / 1.645 / NULLIF(median_home_value, 0),
           median_rent_moe / 1.645 / NULLIF(median_rent, 0),
           median_contract_rent_moe / 1.645 / NULLIF(median_contract_rent, 0),
           median_real_estate_taxes_paid_moe / 1.645
               / NULLIF(median_real_estate_taxes_paid, 0)
       ) > 0.30, false)
           OR (median_home_value IS NOT NULL AND median_home_value_moe IS NULL)
           OR (median_contract_rent IS NOT NULL AND median_contract_rent_moe IS NULL)
           OR (median_rent IS NOT NULL AND median_rent_moe IS NULL)
           OR COALESCE(renter_occupied_units < 100, true)
           OR COALESCE(owner_occupied_units < 100, true)       AS low_reliability,

       -- real dollars
       home_value_adj * real_factor              AS real_median_home_value,
       median_rent * real_factor                 AS real_median_rent,
       median_household_income * real_factor     AS real_median_household_income,
       mean_real_estate_taxes_paid * real_factor AS real_mean_real_estate_taxes_paid
FROM adjusted;

CREATE OR REPLACE VIEW state  AS SELECT * FROM acs_metrics('acs_state');
CREATE OR REPLACE VIEW county AS SELECT * FROM acs_metrics('acs_county');
CREATE OR REPLACE VIEW tract  AS SELECT * FROM acs_metrics('acs_tract');

-- Counties under the code they carry today. Two counties were only renamed
-- and recoded, so their older rows are moved to the new code and keep a trend.
-- county_changes also lists 'boundary' rows (same code, different land; trend
-- dropped in marts.sql) and 'split' rows (new codes with no earlier data,
-- recorded for the record). Connecticut's 2022 switch to planning regions is
-- not listed row by row; it has no earlier data under the new codes either.
CREATE OR REPLACE VIEW county_bridged AS
SELECT c.* REPLACE (COALESCE(r.geoid, c.geoid) AS geoid)
FROM county c
LEFT JOIN county_changes r
       ON r.kind = 'recode' AND r.old_geoid = c.geoid;
