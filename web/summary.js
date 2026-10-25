// A plain-language summary of one county, assembled from its numbers.
// Sentences are templates, so they are always current and never invented.
// They describe; they do not judge a place as a good or bad buy.
import { format, period } from "./metrics.js";

// "higher than 87% of US counties" / "lower than 70% of US counties"
function rank(pctl) {
  if (pctl == null) return null;
  const share = Math.round(100 * pctl);
  if (share >= 45 && share <= 55) return "about the middle of US counties";
  return share > 55 ? `higher than ${share}% of US counties` : `lower than ${100 - share}% of US counties`;
}

// "rose 12%" / "fell 4%" / "was flat"
function change(value, [up, down]) {
  if (value == null) return null;
  const pct = Math.round(100 * Math.abs(value));
  if (pct === 0) return "was flat";
  return `${value > 0 ? up : down} ${pct}%`;
}

const compare = (value, reference) => {
  if (value == null || reference == null) return null;
  const gap = value / reference - 1;
  return Math.abs(gap) < 0.05 ? "close to" : gap > 0 ? "above" : "below";
};

export function summarise(county, stateRow, meta) {
  const sentences = [];
  const state = county.state_name;

  if (county.effective_tax_rate_agg != null) {
    const place = rank(county.pctl_us_tax_rate);
    sentences.push(
      `Owner-occupiers here pay ${format(county.effective_tax_rate_agg, "pct2")} of their home's value ` +
      `in property tax each year, about ${format(county.mean_real_estate_taxes_paid, "usd")} on average` +
      (place ? `, ${place}.` : ".") +
      " A landlord or new buyer may pay more."
    );
  }

  if (county.gross_rent_yield != null) {
    // Washington DC is its own state; comparing it with itself says nothing.
    const wholeState = stateRow?.population === county.population;
    const versus = wholeState ? null : compare(county.gross_rent_yield, stateRow?.gross_rent_yield);
    let sentence = `Gross rent yield is ${format(county.gross_rent_yield, "pct1")}`;
    if (versus) sentence += `, ${versus} the ${format(stateRow.gross_rent_yield, "pct1")} for ${state} as a whole`;
    if (county.rental_vacancy_rate != null) {
      sentence += `, and ${format(county.rental_vacancy_rate, "pct1")} of rental homes are empty and for rent`;
    }
    sentences.push(sentence + ".");
  }

  if (county.price_to_income != null) {
    sentences.push(
      `The median home costs ${format(county.price_to_income, "ratio").replace("×", "")} times ` +
      `the median household income.`
    );
  }

  if (!county.trend_unavailable) {
    const people = change(county.population_growth, ["grew", "fell"]);
    const values = change(county.real_home_value_growth, ["rose", "fell"]);
    const rents = change(county.real_rent_growth, ["rose", "fell"]);
    const parts = [];
    if (people) parts.push(`the population ${people}`);
    if (values) parts.push(`home values ${values}`);
    if (rents) parts.push(`rents ${rents}`);
    if (parts.length) {
      const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts[0];
      sentences.push(
        `Between ${period(meta.first_year)} and ${period(meta.latest_year)}, ${list}` +
        (values || rents ? ", with money figures adjusted for inflation." : ".")
      );
    }
  }

  if (county.permits_per_1000_units != null) {
    const place = rank(county.pctl_us_permits);
    sentences.push(
      `About ${format(county.permits_per_1000_units, "num1")} new homes are permitted each year ` +
      `for every 1,000 existing` + (place ? `, ${place}.` : ".")
    );
  }

  return sentences;
}
