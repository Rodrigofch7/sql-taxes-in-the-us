#!/usr/bin/env python
"""Load the raw downloads into a DuckDB database with clean column names.

Usage:
    python code/build_db.py

Produces data/processed/acs.duckdb containing:
  - base tables   acs_state / acs_county / acs_tract   (raw measures, renamed)
                  permits_county, cpi
  - views         state / county / tract               (+ derived metrics and
                                                         flags, sql/schema.sql)
  - marts         state_latest / county_latest / county_trend / tract_latest
                                                        (what the web app reads,
                                                         sql/marts.sql)
"""
import glob
import os

import duckdb

from fetch_census_data import VARIABLES

RAW_DIR = "data/raw"
DB_PATH = "data/processed/acs.duckdb"
PERMITS_PATH = f"{RAW_DIR}/permits_county.parquet"
CPI_PATH = "data/metadata/cpi_u_annual.csv"
COUNTY_CHANGES_PATH = "data/metadata/county_changes.csv"
SQL_FILES = ["sql/schema.sql", "sql/marts.sql"]

# identity columns the API returns at each geographic level
GEO_COLS = {
    "state":  ["state"],
    "county": ["state", "county"],
    "tract":  ["state", "county", "tract"],
}


def columns_of(con, path):
    rows = con.execute("DESCRIBE SELECT * FROM read_parquet(?)", [path]).fetchall()
    return {r[0] for r in rows}


def build_level(con, level):
    files = sorted(glob.glob(f"{RAW_DIR}/acs_{level}_*.parquet"))
    if not files:
        raise FileNotFoundError(f"no parquet files for {level}; run code/fetch_census_data.py")

    # Checked file by file: one stale file would otherwise load as NULLs.
    for path in files:
        missing = set(VARIABLES) - columns_of(con, path)
        if missing:
            raise ValueError(
                f"{path} lacks {sorted(missing)}; rerun code/fetch_census_data.py"
            )

    select = ["NAME AS name"]

    geo = GEO_COLS[level]
    select.append(f"({' || '.join(geo)}) AS geoid")
    select.append("state AS state_fips")
    if "county" in geo:
        select.append("county AS county_fips")
    if "tract" in geo:
        select.append("tract AS tract_fips")
    select.append("CAST(year AS INTEGER) AS year")

    for code, name in VARIABLES.items():
        select.append(f"{code} AS {name}")

    file_list = "[" + ", ".join(f"'{f}'" for f in files) + "]"
    table = f"acs_{level}"
    con.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
    con.execute(
        f"""
        CREATE TABLE {table} AS
        SELECT
            {',\n            '.join(select)}
        FROM read_parquet({file_list}, union_by_name => true)
        """
    )
    n = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
    print(f"   acs_{level}: {n:,} rows")


def build_reference(con):
    con.execute(
        "CREATE OR REPLACE TABLE permits_county AS SELECT * FROM read_parquet(?)",
        [PERMITS_PATH],
    )
    con.execute(
        "CREATE OR REPLACE TABLE cpi AS "
        "SELECT CAST(year AS INTEGER) AS year, cpi FROM read_csv(?)",
        [CPI_PATH],
    )
    con.execute(
        "CREATE OR REPLACE TABLE county_changes AS "
        "SELECT * FROM read_csv(?, all_varchar => true)",
        [COUNTY_CHANGES_PATH],
    )
    for table in ["permits_county", "cpi", "county_changes"]:
        n = con.execute(f"SELECT count(*) FROM {table}").fetchone()[0]
        print(f"   {table}: {n:,} rows")


def check_inputs(con):
    """Stop before building marts on inputs that would give wrong numbers quietly."""
    years = {
        level: tuple(r[0] for r in con.execute(
            f"SELECT DISTINCT year FROM acs_{level} ORDER BY 1").fetchall())
        for level in GEO_COLS
    }
    if len(set(years.values())) != 1:
        raise ValueError(f"ACS levels cover different years: {years}; refetch the missing files")

    # Each ACS year needs its own CPI and the four before it (see schema.sql).
    needed = {y - back for y in years["county"] for back in range(5)}
    have = {r[0] for r in con.execute("SELECT year FROM cpi").fetchall()}
    if needed - have:
        raise ValueError(f"CPI is missing {sorted(needed - have)}; rerun code/fetch_cpi.py")


def main():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    con = duckdb.connect(DB_PATH)

    for level in ["state", "county", "tract"]:
        print(f">> {level}")
        build_level(con, level)

    print(">> reference tables")
    build_reference(con)
    check_inputs(con)

    for path in SQL_FILES:
        with open(path) as f:
            con.execute(f.read())
        print(f">> applied {path}")

    # Flush tables AND views from the WAL into the main database file. Without
    # this, views created after the big tract load stay WAL-only and an older
    # duckdb CLI reopening the file won't see them.
    con.execute("CHECKPOINT")
    con.close()
    print(f"done -> {DB_PATH}")


if __name__ == "__main__":
    main()
