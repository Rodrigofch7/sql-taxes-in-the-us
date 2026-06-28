-- =====================================================================
-- schema.sql  —  derived convenience views over the raw ACS tables
-- Run automatically by code/build_db.py. Safe to re-run (CREATE OR REPLACE).
--
-- Base tables (acs_state / acs_county / acs_tract) columns:
--   name, geoid, state_fips, [county_fips], [tract_fips], year,
--   median_household_income, per_capita_income, median_home_value,
--   median_rent, median_real_estate_taxes_paid, poverty_count
--
-- The views below add two derived metrics used all over analysis.sql:
--   effective_property_tax_rate = taxes paid / home value   (the "real" rate)
--   tax_to_income_ratio         = taxes paid / household income
-- =====================================================================

CREATE OR REPLACE VIEW state AS
SELECT *,
       median_real_estate_taxes_paid::DOUBLE
           / NULLIF(median_home_value, 0)       AS effective_property_tax_rate,
       median_real_estate_taxes_paid::DOUBLE
           / NULLIF(median_household_income, 0)  AS tax_to_income_ratio
FROM acs_state;

CREATE OR REPLACE VIEW county AS
SELECT *,
       median_real_estate_taxes_paid::DOUBLE
           / NULLIF(median_home_value, 0)       AS effective_property_tax_rate,
       median_real_estate_taxes_paid::DOUBLE
           / NULLIF(median_household_income, 0)  AS tax_to_income_ratio
FROM acs_county;

CREATE OR REPLACE VIEW tract AS
SELECT *,
       median_real_estate_taxes_paid::DOUBLE
           / NULLIF(median_home_value, 0)       AS effective_property_tax_rate,
       median_real_estate_taxes_paid::DOUBLE
           / NULLIF(median_household_income, 0)  AS tax_to_income_ratio
FROM acs_tract;