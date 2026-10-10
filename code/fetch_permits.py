#!/usr/bin/env python
"""Download the Census Building Permits Survey (BPS) annual county files.

Usage:
    python code/fetch_permits.py

Produces data/raw/permits_county.parquet: one row per (county, year) with the
number of housing units authorised by permit, split by building size.

Permits are the national stand-in for zoning here: they show how much housing a
county actually lets get built, not what its rules say.
"""
import io
import os

import pandas as pd
from tqdm import tqdm

from fetch_census_data import STATE_FIPS, log, make_session

YEARS = range(2012, 2025)

BASE_URL = "https://www2.census.gov/econ/bps/County"
OUT_PATH = "data/raw/permits_county.parquet"

# The file has two header rows and then, per building size, Bldgs/Units/Value
# three times over: first the totals with imputation for non-reporting permit
# offices, then the same again for reported-only. We keep the imputed totals,
# which is what the Census publishes as the county estimate.
SIZES = ["1", "2", "3_4", "5plus"]
COLUMNS = (
    ["year", "state_fips", "county_fips", "region", "division", "county_name"]
    + [f"{kind}_{size}" for size in SIZES for kind in ("bldgs", "units", "value")]
    + [f"{kind}_{size}_rep" for size in SIZES for kind in ("bldgs", "units", "value")]
)
UNIT_COLS = [f"units_{size}" for size in SIZES]


def fetch_year(session, year):
    r = session.get(f"{BASE_URL}/co{year}a.txt", timeout=60)
    r.raise_for_status()

    # The file is read by column position, so make sure the layout is the one
    # COLUMNS describes before trusting any number in it.
    lines = r.text.splitlines()
    data_width = len(lines[3].split(","))
    if not lines[0].startswith("Survey,FIPS,FIPS") or data_width != len(COLUMNS):
        raise ValueError(
            f"{year}: permits file layout changed "
            f"({data_width} columns, expected {len(COLUMNS)}; header {lines[0][:40]!r})"
        )

    df = pd.read_csv(
        io.StringIO(r.text),
        skiprows=2,
        header=None,
        names=COLUMNS,
        dtype={"state_fips": str, "county_fips": str},
        skip_blank_lines=True,
        index_col=False,
    )
    df = df[df["state_fips"].isin(STATE_FIPS)].copy()
    df["year"] = year
    df["geoid"] = df["state_fips"] + df["county_fips"]
    for col in UNIT_COLS:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    return df[["geoid", "state_fips", "county_fips", "year"] + UNIT_COLS]


def main():
    session = make_session()
    frames = [fetch_year(session, year) for year in tqdm(YEARS, desc="permits")]
    df = pd.concat(frames, ignore_index=True)

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_parquet(OUT_PATH, index=False)
    log.info("saved %s (%d rows)", OUT_PATH, len(df))


if __name__ == "__main__":
    main()
