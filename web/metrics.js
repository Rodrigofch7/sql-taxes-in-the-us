// Metric definitions shared by the map, the screener and the profile.
//   fmt        how to print a value (see format())
//   tract      false when the metric only exists for counties
//   lowFirst   true when an investor reads a lower number as the better one,
//              so sorting starts from the bottom
//   note       one-line definition, shown under the metric picker.
//              {from} and {to} are replaced with the survey periods.

export const METRICS = {
  effective_tax_rate_agg: {
    label: "Owner-occupier tax rate", short: "Tax rate", fmt: "pct2", lowFirst: true,
    note: "Real estate taxes paid by owner-occupiers ÷ the value of their homes. A rental or newly bought home often pays more, in some states two to three times this rate.",
  },
  mean_real_estate_taxes_paid: {
    label: "Owner-occupier tax bill", short: "Avg tax bill", fmt: "usd", lowFirst: true,
    note: "Total real estate taxes paid ÷ owner-occupied homes, per year.",
  },
  gross_rent_yield: {
    label: "Gross rent yield", short: "Gross yield", fmt: "pct1",
    note: "12 × median contract rent ÷ median home value. High values mostly mark cheap, often shrinking markets, so read it next to population growth and rental vacancy.",
  },
  net_of_tax_yield: {
    label: "Gross yield minus owner tax rate", short: "Yield less tax", fmt: "pct1",
    note: "Gross rent yield minus the owner-occupier tax rate. Not a net yield: it leaves out insurance, vacancy, upkeep and the higher tax a rental may pay.",
  },
  rental_vacancy_rate: {
    label: "Rental vacancy rate", short: "Rental vacancy", fmt: "pct1", lowFirst: true,
    note: "Homes sitting empty and for rent ÷ all rental homes. Seasonal and second homes are not counted.",
  },
  price_to_income: {
    label: "Price-to-income ratio", short: "Price / income", fmt: "ratio", lowFirst: true,
    note: "Median home value ÷ median income of all households, renters included.",
  },
  rent_to_income: {
    label: "Rent as share of income", short: "Rent / income", fmt: "pct1", lowFirst: true,
    note: "12 × median gross rent ÷ median income of all households. Renters earn less than this on average, so their true burden is higher.",
  },
  median_home_value: {
    label: "Median home value", short: "Home value", fmt: "usd",
    note: "Median value of owner-occupied homes, as reported by owners, averaged over {to}. It lags today's prices.",
  },
  median_contract_rent: {
    label: "Median rent", short: "Rent", fmt: "usd",
    note: "Median monthly contract rent, averaged over {to}. It lags today's rents.",
  },
  median_household_income: {
    label: "Median household income", short: "Income", fmt: "usd",
    note: "Median household income over the past 12 months.",
  },
  real_home_value_growth: {
    label: "Home value growth, after inflation", short: "Value growth", fmt: "pct0s", tract: false,
    note: "Total change in median home value between {from} and {to}, after inflation. Not an annual rate. The starting period includes the housing bust, so part of the growth in hard-hit places is recovery.",
  },
  real_rent_growth: {
    label: "Rent growth, after inflation", short: "Rent growth", fmt: "pct0s", tract: false,
    note: "Total change in median gross rent between {from} and {to}, after inflation. Not an annual rate.",
  },
  real_tax_growth: {
    label: "Tax bill growth, after inflation", short: "Tax growth", fmt: "pct0s", tract: false, lowFirst: true,
    note: "Total change in the average owner-occupier tax bill between {from} and {to}, after inflation.",
  },
  population_growth: {
    label: "Population growth", short: "Pop. growth", fmt: "pct0s", tract: false,
    note: "Total change in population between {from} and {to}.",
  },
  permits_per_1000_units: {
    label: "Homes permitted per 1,000 existing", short: "Permits / 1,000", fmt: "num1", tract: false,
    note: "Homes authorised by building permit per year, per 1,000 existing homes. It shows where building is happening, which follows demand at least as much as rules. For a landlord it also means competing supply.",
  },
  multifamily_permit_share: {
    label: "Share of permits in 5+ unit buildings", short: "Multifamily share", fmt: "pct0", tract: false,
    note: "Permitted homes in buildings of five or more ÷ all permitted homes.",
  },
  renter_share: {
    label: "Renter share", short: "Renters", fmt: "pct0",
    note: "Renter-occupied homes ÷ occupied homes.",
  },
  vacancy_rate: {
    label: "All vacant homes", short: "All vacancy", fmt: "pct1", lowFirst: true,
    note: "Vacant homes ÷ all homes. Includes seasonal and second homes, so it is high in resort areas. Use rental vacancy to judge tenant demand.",
  },
  poverty_rate: {
    label: "Poverty rate", short: "Poverty", fmt: "pct1", lowFirst: true,
    note: "People below the poverty line ÷ people for whom poverty status is known.",
  },
  population: {
    label: "Population", short: "Population", fmt: "int",
    note: "Total residents.",
  },
};

// Screener filters: one bound each, in the direction an investor screens for.
//   default   applied on first load and on reset; the user can clear it
export const FILTERS = [
  { key: "pop_min", col: "population", op: ">=", label: "Population at least", unit: "", scale: 1, step: 10000, default: 50000 },
  { key: "tax_max", col: "effective_tax_rate_agg", op: "<=", label: "Tax rate at most", unit: "%", scale: 0.01, step: 0.1 },
  { key: "yield_min", col: "gross_rent_yield", op: ">=", label: "Gross yield at least", unit: "%", scale: 0.01, step: 0.5 },
  { key: "rvac_max", col: "rental_vacancy_rate", op: "<=", label: "Rental vacancy at most", unit: "%", scale: 0.01, step: 1 },
  { key: "pti_max", col: "price_to_income", op: "<=", label: "Price / income at most", unit: "×", scale: 1, step: 0.5 },
  { key: "popg_min", col: "population_growth", op: ">=", label: "Population growth at least", unit: "%", scale: 0.01, step: 5 },
  { key: "growth_min", col: "real_home_value_growth", op: ">=", label: "Value growth at least", unit: "%", scale: 0.01, step: 5 },
  { key: "rentg_min", col: "real_rent_growth", op: ">=", label: "Rent growth at least", unit: "%", scale: 0.01, step: 5 },
  { key: "permits_min", col: "permits_per_1000_units", op: ">=", label: "Permits / 1,000 at least", unit: "", scale: 1, step: 1 },
];

export const DEFAULT_FILTERS = Object.fromEntries(
  FILTERS.filter((f) => f.default !== undefined).map((f) => [f.key, f.default])
);

export const TABLE_COLUMNS = [
  "effective_tax_rate_agg",
  "gross_rent_yield",
  "rental_vacancy_rate",
  "price_to_income",
  "real_home_value_growth",
  "population_growth",
  "permits_per_1000_units",
  "population",
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const int = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export function format(value, fmt) {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  switch (fmt) {
    case "pct2": return (100 * value).toFixed(2) + "%";
    case "pct1": return (100 * value).toFixed(1) + "%";
    case "pct0": return Math.round(100 * value) + "%";
    case "pct0s": return (value > 0 ? "+" : "") + Math.round(100 * value) + "%";
    case "ratio": return value.toFixed(1) + "×";
    case "num1": return value.toFixed(1);
    case "usd": return usd.format(value);
    case "usdk": return "$" + compact.format(value);
    case "int": return int.format(value);
    case "compact": return compact.format(value);
    default: return String(value);
  }
}

export function formatMetric(row, key) {
  return format(row?.[key], METRICS[key].fmt);
}

// "2008–12" for the five-year survey period ending in `year`.
export const period = (year) => `${year - 4}–${String(year).slice(2)}`;

// Human-readable data-quality warnings for a county or tract row.
// A warning is only reported where it actually touches the metric being shown.
const VALUE_BASED = ["median_home_value", "gross_rent_yield", "net_of_tax_yield", "price_to_income", "real_home_value_growth"];
const RENT_BASED = ["median_contract_rent", "gross_rent_yield", "net_of_tax_yield", "rent_to_income", "real_rent_growth"];
const SAMPLE_BASED = [
  ...new Set([...VALUE_BASED, ...RENT_BASED]),
  "effective_tax_rate_agg", "mean_real_estate_taxes_paid", "real_tax_growth", "rental_vacancy_rate",
];
const PERMIT_BASED = ["permits_per_1000_units", "multifamily_permit_share"];

// Above this, rent is being divided by the value of a different kind of home,
// typically cheap owned mobile homes next to ordinary rented apartments.
const MISMATCH_YIELD = 0.25;

export function flagsFor(row, key) {
  const flags = [];
  if (!row) return flags;
  const touches = (keys) => !key || keys.includes(key);
  if (row.value_topcoded && touches(VALUE_BASED)) {
    flags.push("Home value is at the Census cap of $2,000,001; the true median is higher.");
  }
  if (row.value_bottomcoded && touches(VALUE_BASED)) {
    flags.push("Home value is at the Census floor of $9,999; ratios that use it are not shown.");
  }
  if (row.rent_topcoded && touches(RENT_BASED)) {
    flags.push("Rent is at the Census cap of $3,501; the true median is higher.");
  }
  if (row.rent_bottomcoded && touches(RENT_BASED)) {
    flags.push("Rent is at the Census floor of $99; ratios that use it are not shown.");
  }
  if (row.gross_rent_yield > MISMATCH_YIELD && touches(["gross_rent_yield", "net_of_tax_yield"])) {
    flags.push("Owned and rented homes here are very different stock, so this yield describes neither.");
  }
  if (row.low_reliability && touches(SAMPLE_BASED)) {
    flags.push("Low reliability: few homes stand behind this figure, or its margin of error is wide or missing.");
  }
  if (row.permit_years != null && row.permit_years < 5 && touches(PERMIT_BASED)) {
    flags.push(`Based on ${row.permit_years} of 5 years of permit data.`);
  }
  return flags;
}
