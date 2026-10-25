"""Sanity checks on the built database.

Usage:
    python code/build_db.py
    pytest
"""
import re
import sys
from pathlib import Path

import duckdb
import pytest

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data/processed/acs.duckdb"
METRICS_JS = ROOT / "web/metrics.js"

if not DB_PATH.exists():
    pytest.skip("database not built; run code/build_db.py", allow_module_level=True)


@pytest.fixture(scope="module")
def con():
    con = duckdb.connect(str(DB_PATH), read_only=True)
    yield con
    con.close()


def scalar(con, sql):
    return con.execute(sql).fetchone()[0]


def test_one_row_per_county_and_tract(con):
    for mart in ["state_latest", "county_latest", "tract_latest"]:
        assert scalar(con, f"SELECT count(*) - count(DISTINCT geoid) FROM {mart}") == 0


def test_scope_is_50_states_and_dc(con):
    assert scalar(con, "SELECT count(*) FROM state_latest") == 51
    assert scalar(con, "SELECT count(DISTINCT state_fips) FROM county_latest") == 51
    assert scalar(con, "SELECT count(DISTINCT state_fips) FROM tract_latest") == 51


@pytest.mark.parametrize("view", ["county", "tract"])
def test_topcoded_medians_are_flagged(con, view):
    unflagged = scalar(con, f"""
        SELECT count(*) FROM {view}
        WHERE (median_real_estate_taxes_paid >= 10001 AND NOT tax_topcoded)
           OR (median_home_value >= 2000001 AND NOT value_topcoded)
           OR (median_rent >= 3501 AND NOT rent_topcoded)
    """)
    assert unflagged == 0
    # No county median reaches the value or rent cap, so only the tract run
    # exercises those two flags. Make sure it really does.
    if view == "tract":
        for year in (2012, 2024):
            assert scalar(con, f"SELECT count(*) FROM tract WHERE year = {year} AND value_topcoded") > 100
            assert scalar(con, f"SELECT count(*) FROM tract WHERE year = {year} AND rent_topcoded") > 100
    # The cap was lower before 2015: a $1,000,001 median in 2012 is top-coded.
    assert scalar(con, f"""
        SELECT count(*) FROM {view}
        WHERE year = 2012 AND median_home_value >= 1000001 AND NOT value_topcoded
    """) == 0


def test_aggregate_rate_is_plausible(con):
    lo, hi = con.execute(
        "SELECT min(effective_tax_rate_agg), max(effective_tax_rate_agg) FROM county_latest"
    ).fetchone()
    assert lo > 0
    assert hi < 0.05


def test_aggregate_rate_survives_the_topcode(con):
    """Counties whose median tax sits at the cap must still be told apart."""
    n, distinct = con.execute("""
        SELECT count(*), count(DISTINCT round(mean_real_estate_taxes_paid))
        FROM county_latest WHERE tax_topcoded
    """).fetchone()
    assert n > 1
    assert distinct == n


def test_state_rates_match_published_ordering(con):
    """New Jersey and Illinois lead every published ranking; Hawaii is last."""
    ranked = [r[0] for r in con.execute(
        "SELECT name FROM state_latest ORDER BY effective_tax_rate_agg DESC"
    ).fetchall()]
    assert set(ranked[:2]) == {"New Jersey", "Illinois"}
    assert ranked[-1] == "Hawaii"


def test_connecticut_is_kept_and_flagged(con):
    assert scalar(con, "SELECT count(*) FROM county_latest WHERE state_fips = '09'") > 0
    assert scalar(con, """
        SELECT bool_and(trend_unavailable) FROM county_latest WHERE state_fips = '09'
    """)
    assert scalar(con, """
        SELECT bool_and(trend_unavailable) FROM county_trend WHERE geoid LIKE '09%'
    """)
    assert scalar(con, """
        SELECT count(*) FROM county_latest
        WHERE trend_unavailable AND real_home_value_growth IS NOT NULL
    """) == 0


def test_most_counties_have_a_trend(con):
    share = scalar(con, "SELECT avg(trend_unavailable::INT) FROM county_latest")
    assert share < 0.01


def test_percentiles_are_bounded_and_null_safe(con):
    lo, hi, bad = con.execute("""
        SELECT min(pctl_us_tax_rate), max(pctl_us_tax_rate),
               count(*) FILTER (WHERE effective_tax_rate_agg IS NULL
                                AND pctl_us_tax_rate IS NOT NULL)
        FROM county_latest
    """).fetchone()
    assert (lo, hi, bad) == (0, 1, 0)


def test_permits_cover_most_counties(con):
    share = scalar(con, "SELECT avg((permits_per_1000_units IS NOT NULL)::INT) FROM county_latest")
    assert share > 0.9


def test_shares_are_between_zero_and_one(con):
    for col in ["poverty_rate", "renter_share", "vacancy_rate", "multifamily_permit_share"]:
        lo, hi = con.execute(f"SELECT min({col}), max({col}) FROM county_latest").fetchone()
        assert 0 <= lo and hi <= 1, col


# ---- inputs ----------------------------------------------------------------

def test_every_level_covers_the_same_years(con):
    years = [
        tuple(r[0] for r in con.execute(f"SELECT DISTINCT year FROM acs_{level} ORDER BY 1").fetchall())
        for level in ["state", "county", "tract"]
    ]
    assert years[0] == years[1] == years[2]
    assert len(years[0]) >= 2


def test_row_counts_are_complete(con):
    """A partial download shows up as a year with too few places."""
    for level, low in [("state", 52), ("county", 3200), ("tract", 70000)]:
        fewest = scalar(con, f"SELECT min(n) FROM (SELECT count(*) n FROM acs_{level} GROUP BY year)")
        assert fewest >= low, level


def test_no_duplicate_rows(con):
    assert scalar(con, "SELECT count(*) - count(DISTINCT (geoid, year)) FROM county_trend") == 0
    # Only the years that feed the permit average need to be clean.
    assert scalar(con, """
        SELECT count(*) - count(DISTINCT (geoid, year)) FROM permits_county
        WHERE year > (SELECT max(year) - 5 FROM acs_county)
    """) == 0


def test_real_figures_exist_for_every_year(con):
    """A gap in the CPI table would turn a whole year's real figures NULL."""
    assert scalar(con, """
        SELECT count(*) FROM (
            SELECT year FROM county GROUP BY year
            HAVING count(real_median_home_value) = 0)
    """) == 0


# ---- floor values and reliability ------------------------------------------

@pytest.mark.parametrize("view", ["county", "tract"])
def test_floor_values_give_no_ratio(con, view):
    assert scalar(con, f"""
        SELECT count(*) FROM {view}
        WHERE median_home_value <= 9999
          AND (gross_rent_yield IS NOT NULL OR price_to_income IS NOT NULL
               OR NOT value_bottomcoded)
    """) == 0


def test_tract_yields_are_bounded(con):
    """Floor-coded values used to give yields near 200%.

    What remains above 50% is real but describes mismatched stock (cheap owned
    mobile homes beside ordinary apartments); the app warns on those.
    """
    assert scalar(con, "SELECT max(gross_rent_yield) FROM tract_latest") < 1.5
    assert scalar(con, "SELECT avg((gross_rent_yield > 0.5)::INT) FROM tract_latest") < 0.001


@pytest.mark.parametrize("median", ["median_home_value", "median_rent", "median_contract_rent"])
def test_median_without_margin_is_unreliable(con, median):
    n, unflagged = con.execute(f"""
        SELECT count(*), count(*) FILTER (WHERE NOT low_reliability) FROM tract
        WHERE {median} IS NOT NULL AND {median}_moe IS NULL
    """).fetchone()
    assert n > 0 and unflagged == 0


def test_capped_tax_median_does_not_mark_a_county_unreliable(con):
    """Large, well-sampled counties whose median tax is merely above the cap."""
    assert scalar(con, """
        SELECT count(*) FROM county_latest
        WHERE tax_topcoded AND population > 500000 AND NOT low_reliability
    """) > 0


def test_every_trendless_county_is_explained(con):
    """Connecticut aside, a county with no trend must appear in county_changes."""
    assert scalar(con, """
        SELECT count(*) FROM county_latest
        WHERE trend_unavailable AND state_fips <> '09'
          AND geoid NOT IN (SELECT geoid FROM county_changes WHERE kind IN ('boundary', 'split'))
    """) == 0


# ---- county changes --------------------------------------------------------

def test_redrawn_counties_have_no_trend(con):
    # Bedford County VA absorbed Bedford city in 2013: same code, different land.
    unavailable, growth = con.execute("""
        SELECT trend_unavailable, population_growth FROM county_latest WHERE geoid = '51019'
    """).fetchone()
    assert unavailable and growth is None


def test_renamed_counties_keep_their_trend(con):
    # Shannon County SD became Oglala Lakota County (46113 -> 46102), same area.
    unavailable, growth = con.execute("""
        SELECT trend_unavailable, population_growth FROM county_latest WHERE geoid = '46102'
    """).fetchone()
    assert not unavailable and growth is not None
    assert scalar(con, "SELECT count(*) FROM county_trend WHERE geoid = '46102'") == 4


# ---- contract between the data and the web app -----------------------------

def columns(con, table):
    return {r[0] for r in con.execute(f"DESCRIBE {table}").fetchall()}


def test_app_metrics_exist_in_the_data(con):
    """A renamed column would otherwise only show up as blank cells in the browser."""
    js = METRICS_JS.read_text()
    block = js[js.index("export const METRICS"):js.index("export const FILTERS")]
    metrics = dict(re.findall(r"^  (\w+): \{(.*?)^  \},", block, flags=re.S | re.M))
    assert len(metrics) > 10

    county, tract = columns(con, "county_latest"), columns(con, "tract_latest")
    assert set(metrics) <= county
    assert {key for key, body in metrics.items() if "tract: false" not in body} <= tract

    filter_columns = set(re.findall(r'col: "(\w+)"', js))
    assert filter_columns and filter_columns <= county


# ---- written findings ------------------------------------------------------

def test_every_written_finding_still_holds(con):
    """The Findings page must not state something the data no longer supports."""
    sys.path.insert(0, str(ROOT / "code"))
    from findings import render_findings

    findings = render_findings(con, ROOT / "data/metadata/findings.json")
    for finding in findings:
        chart = finding["chart"]
        text = finding["headline"] + finding["body"] + chart["title"] + chart.get("subtitle", "")
        assert "{" not in text, finding["id"]
        assert chart["rows"], finding["id"]
        # No chart may plot a missing value as if it were a number.
        for row in chart["rows"]:
            assert all(v is not None for k, v in row.items() if k in ("x", "y", "value", "lo", "hi")), finding["id"]
