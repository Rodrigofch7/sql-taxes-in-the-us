#!/usr/bin/env python
"""Export the marts and boundaries the web app reads into web/data/.

Usage:
    python code/export_web.py      # after code/build_db.py and fetch_geometry.py

Produces:
  web/data/{state_latest,county_latest,county_trend}.json
  web/data/tracts/tract_latest_<state fips>.json
  web/data/geo/*.geojson
  web/data/findings.json           the written findings, numbers filled in
  web/data/meta.json               years covered and build date, for the footer

Tables are written as {"columns": [...], "rows": [[...], ...]}: a third of the
size of one object per row, and the app turns them back into objects on load.
"""
import datetime
import glob
import json
import math
import os
import shutil

import duckdb

from findings import render_findings

DB_PATH = "data/processed/acs.duckdb"
GEO_DIR = "data/processed/geo"
OUT_DIR = "web/data"

MARTS = ["state_latest", "county_latest", "county_trend"]

# Six significant digits is far finer than the survey's own precision.
SIGNIFICANT_DIGITS = 6


def compact(value):
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return float(f"{value:.{SIGNIFICANT_DIGITS}g}")
    return value


def write_table(con, sql, path):
    cursor = con.execute(sql)
    columns = [d[0] for d in cursor.description]
    rows = [[compact(v) for v in row] for row in cursor.fetchall()]
    with open(path, "w") as f:
        json.dump({"columns": columns, "rows": rows}, f, separators=(",", ":"))
    return len(rows)


def main():
    con = duckdb.connect(DB_PATH, read_only=True)

    geo_files = sorted(glob.glob(f"{GEO_DIR}/*.geojson"))
    if not geo_files:
        raise FileNotFoundError(f"no GeoJSON in {GEO_DIR}; run code/fetch_geometry.py")

    # Before touching the output: a finding that no longer holds stops the export.
    findings = render_findings(con)

    # Everything here is generated, so start clean: no stale files survive.
    shutil.rmtree(OUT_DIR, ignore_errors=True)
    os.makedirs(f"{OUT_DIR}/geo")
    os.makedirs(f"{OUT_DIR}/tracts")

    for mart in MARTS:
        path = f"{OUT_DIR}/{mart}.json"
        n = write_table(con, f"SELECT * FROM {mart}", path)
        print(f"   {path}: {n:,} rows, {os.path.getsize(path) / 1e6:.1f} MB")

    # The app loads tracts one state at a time.
    states = [r[0] for r in con.execute(
        "SELECT DISTINCT state_fips FROM tract_latest ORDER BY 1").fetchall()]
    for state_fips in states:
        write_table(
            con,
            f"SELECT * EXCLUDE (state_fips) FROM tract_latest WHERE state_fips = '{state_fips}'",
            f"{OUT_DIR}/tracts/tract_latest_{state_fips}.json",
        )
    print(f"   {OUT_DIR}/tracts: {len(states)} files")

    with open(f"{OUT_DIR}/findings.json", "w") as f:
        json.dump(findings, f, ensure_ascii=False, indent=1)
    print(f"   {OUT_DIR}/findings.json: {len(findings)} findings")

    for src in geo_files:
        shutil.copy(src, f"{OUT_DIR}/geo/")
    print(f"   {OUT_DIR}/geo: {len(geo_files)} files")

    latest, first = con.execute("SELECT max(year), min(year) FROM acs_county").fetchone()
    permit_first, permit_last = con.execute(
        "SELECT min(year), max(year) FROM permits_county WHERE year BETWEEN ? AND ?",
        [latest - 4, latest],
    ).fetchone()
    meta = {
        "latest_year": latest,
        "first_year": first,
        "acs_years": [r[0] for r in con.execute(
            "SELECT DISTINCT year FROM acs_county ORDER BY 1").fetchall()],
        "permit_years": [permit_first, permit_last],
        "built": datetime.date.today().isoformat(),
    }
    with open(f"{OUT_DIR}/meta.json", "w") as f:
        json.dump(meta, f, indent=2)
    print(f"   {OUT_DIR}/meta.json")


if __name__ == "__main__":
    main()
