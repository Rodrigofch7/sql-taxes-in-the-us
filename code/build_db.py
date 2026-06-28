#!/usr/bin/env python
"""Load raw ACS parquet files into a DuckDB database with clean column names.

Usage:
    uv add duckdb          # one-time
    python code/build_db.py

Produces data/processed/acs.duckdb containing:
  - base tables   acs_state / acs_county / acs_tract   (raw measures, renamed)
  - views         state / county / tract               (+ derived rate columns,
                                                         created by sql/schema.sql)
"""
import glob
import os

import duckdb

RAW_DIR = "data/raw"
DB_PATH = "data/processed/acs.duckdb"
SCHEMA_SQL = "sql/schema.sql"

# raw Census code -> friendly column name
MEASURES = {
    "B19013_001E": "median_household_income",
    "B19301_001E": "per_capita_income",
    "B25077_001E": "median_home_value",
    "B25064_001E": "median_rent",
    "B17001_002E": "poverty_count",
}
# "median real estate taxes paid" lives under different codes depending on which
# version of the fetch script produced the file. Detect whichever is present.
TAX_CANDIDATES = ["B25103_001E", "B25118_001E"]

# identity columns the API returns at each geographic level
GEO_COLS = {
    "state":  ["state"],
    "county": ["state", "county"],
    "tract":  ["state", "county", "tract"],
}


def columns_across_files(con, files):
    cols = set()
    for fp in files:
        rows = con.execute("DESCRIBE SELECT * FROM read_parquet(?)", [fp]).fetchall()
        cols.update(r[0] for r in rows)
    return cols


def build_level(con, level):
    files = sorted(glob.glob(f"{RAW_DIR}/acs_{level}_*.parquet"))
    if not files:
        print(f"   !! no parquet files for {level}, skipping")
        return

    cols = columns_across_files(con, files)

    select = ["NAME AS name"]

    geo = GEO_COLS[level]
    select.append(f"({' || '.join(geo)}) AS geoid")
    select.append("state AS state_fips")
    if "county" in geo:
        select.append("county AS county_fips")
    if "tract" in geo:
        select.append("tract AS tract_fips")
    select.append("CAST(year AS INTEGER) AS year")

    for code, name in MEASURES.items():
        if code in cols:
            select.append(f"{code} AS {name}")

    tax_present = [c for c in TAX_CANDIDATES if c in cols]
    if len(tax_present) == 1:
        select.append(f"{tax_present[0]} AS median_real_estate_taxes_paid")
    elif len(tax_present) >= 2:
        select.append(
            f"COALESCE({', '.join(tax_present)}) AS median_real_estate_taxes_paid"
        )
    else:
        print(f"   !! no tax column found for {level}")

    file_list = "[" + ", ".join(f"'{f}'" for f in files) + "]"
    table = f"acs_{level}"
    con.execute(f"DROP TABLE IF EXISTS {table}")
    con.execute(
        f"""
        CREATE TABLE {table} AS
        SELECT
            {',\n            '.join(select)}
        FROM read_parquet({file_list}, union_by_name => true)
        """
    )
    n = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
    print(f"   acs_{level}: {n:,} rows  (tax col: {tax_present or 'MISSING'})")


def main():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = duckdb.connect(DB_PATH)

    for level in ["state", "county", "tract"]:
        print(f">> {level}")
        build_level(con, level)

    if os.path.exists(SCHEMA_SQL):
        with open(SCHEMA_SQL) as f:
            con.execute(f.read())
        views = [r[0] for r in con.execute(
            "SELECT view_name FROM duckdb_views() WHERE NOT internal ORDER BY 1"
        ).fetchall()]
        print(f">> applied {SCHEMA_SQL} (views: {', '.join(views) or 'NONE'})")
    else:
        print(f">> {SCHEMA_SQL} not found — base tables only")

    # Flush tables AND views from the WAL into the main database file. Without
    # this, views created after the big tract load stay WAL-only and an older
    # duckdb CLI reopening the file won't see them.
    con.execute("CHECKPOINT")
    con.close()
    print(f"done -> {DB_PATH}")


if __name__ == "__main__":
    main()