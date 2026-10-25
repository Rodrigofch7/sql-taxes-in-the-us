#!/usr/bin/env python
"""Download Census cartographic boundary files and write web-sized GeoJSON.

Usage:
    python code/fetch_geometry.py

Produces, under data/processed/geo/:
  - counties.geojson            every county in the 50 states + DC
  - tracts_<state fips>.geojson one file per state, loaded on drill-down

Boundaries are the 2024 vintage, matching the latest ACS year, so every geoid
in the 2024 tables has a shape.
"""
import os

import geopandas as gpd
from tqdm import tqdm

from fetch_census_data import STATE_FIPS, log, make_session

BASE_URL = "https://www2.census.gov/geo/tiger/GENZ2024/shp"
RAW_DIR = "data/raw/geo"
OUT_DIR = "data/processed/geo"

# name -> (zip file, simplification tolerance in degrees)
LAYERS = {
    "county": ("cb_2024_us_county_5m.zip", 0.01),
    "tract": ("cb_2024_us_tract_500k.zip", 0.001),
}

# ~11 m at the equator; plenty for a choropleth and a third of the bytes.
COORDINATE_PRECISION = 4


def download(session, filename):
    path = os.path.join(RAW_DIR, filename)
    if os.path.exists(path):
        log.info("skip %s (already exists)", filename)
        return path
    os.makedirs(RAW_DIR, exist_ok=True)
    log.info("downloading %s", filename)
    r = session.get(f"{BASE_URL}/{filename}", timeout=300)
    r.raise_for_status()
    with open(path, "wb") as f:
        f.write(r.content)
    return path


def load(path, tolerance):
    gdf = gpd.read_file(path)
    gdf = gdf[gdf["STATEFP"].isin(STATE_FIPS)]
    gdf = gdf[["GEOID", "STATEFP", "geometry"]].rename(
        columns={"GEOID": "geoid", "STATEFP": "state_fips"}
    )
    # Coverage simplification keeps shared borders shared, so neighbours don't
    # pull apart into slivers the way per-polygon simplification leaves them.
    gdf["geometry"] = gdf.geometry.simplify_coverage(tolerance)
    return gdf.to_crs(4326)


def write(gdf, name):
    path = os.path.join(OUT_DIR, f"{name}.geojson")
    if os.path.exists(path):
        os.remove(path)
    gdf.to_file(path, driver="GeoJSON", COORDINATE_PRECISION=COORDINATE_PRECISION)
    return path


def main():
    session = make_session()
    os.makedirs(OUT_DIR, exist_ok=True)

    counties = load(download(session, LAYERS["county"][0]), LAYERS["county"][1])
    path = write(counties, "counties")
    log.info("saved %s (%d counties)", path, len(counties))

    tracts = load(download(session, LAYERS["tract"][0]), LAYERS["tract"][1])
    for state_fips, group in tqdm(tracts.groupby("state_fips"), desc="tracts"):
        write(group, f"tracts_{state_fips}")
    log.info("saved %d tract files (%d tracts)", tracts["state_fips"].nunique(), len(tracts))


if __name__ == "__main__":
    main()
