#!/usr/bin/env python
"""Download annual-average CPI-U and save it as a small checked-in CSV.

Usage:
    python code/fetch_cpi.py

Produces data/metadata/cpi_u_annual.csv (year, cpi). ACS 5-year dollar figures
are already expressed in dollars of the vintage's final year, so deflating a
2012 vintage by the 2012 index is the right adjustment.

Source: BLS CPI-U, all items, US city average, not seasonally adjusted
(series CUUR0000SA0), fetched through FRED as CPIAUCNS.
"""
import io
import os

import pandas as pd

from fetch_census_data import log, make_session

URL = "https://fred.stlouisfed.org/graph/fredgraph.csv"
# From 2004 so every five-year ACS window back to 2008-2012 is covered.
PARAMS = {"id": "CPIAUCNS", "fq": "Annual", "fam": "avg", "cosd": "2004-01-01"}
OUT_PATH = "data/metadata/cpi_u_annual.csv"


def main():
    r = make_session().get(URL, params=PARAMS, timeout=60)
    r.raise_for_status()

    df = pd.read_csv(io.StringIO(r.text))
    df.columns = ["date", "cpi"]
    df["year"] = pd.to_datetime(df["date"]).dt.year
    df["cpi"] = pd.to_numeric(df["cpi"], errors="coerce")
    # The current, unfinished year comes back blank.
    df = df.dropna(subset=["cpi"])[["year", "cpi"]]

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    df.to_csv(OUT_PATH, index=False)
    log.info("saved %s (%d years, %d-%d)", OUT_PATH, len(df), df.year.min(), df.year.max())


if __name__ == "__main__":
    main()
