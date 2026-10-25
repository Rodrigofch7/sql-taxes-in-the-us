import os
import re
import sys
import logging

import requests
import pandas as pd
import pyarrow.parquet as pq
from tqdm import tqdm
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from dotenv import load_dotenv

# =========================
# CONFIG
# =========================

load_dotenv()

API_KEY = os.getenv("CENSUS_API_KEY")

YEARS = [2012, 2016, 2020, 2024]

BASE_URL = "https://api.census.gov/data"
DATASET = "acs/acs5"

# Skip a (level, year) if its parquet already exists AND already holds every
# variable below. Makes the run resumable after a Ctrl+C without re-downloading
# everything, while files from an older, shorter VARIABLES list get refreshed.
SKIP_EXISTING = True

# Every code was checked against variables.html for 2012, 2016, 2020 and 2024.
VARIABLES = {
    "B19013_001E": "median_household_income",
    "B19301_001E": "per_capita_income",
    "B25077_001E": "median_home_value",
    "B25064_001E": "median_rent",           # gross rent: includes utilities
    "B25058_001E": "median_contract_rent",  # what the landlord is paid
    "B25103_001E": "median_real_estate_taxes_paid",  # see note below
    "B17001_002E": "poverty_count",
    # denominators
    "B17001_001E": "poverty_universe",
    "B01003_001E": "population",
    "B25001_001E": "housing_units",
    "B25002_003E": "vacant_units",
    "B25003_001E": "occupied_units",
    "B25003_002E": "owner_occupied_units",
    "B25003_003E": "renter_occupied_units",
    "B25004_002E": "vacant_for_rent_units",
    "B25004_003E": "rented_not_occupied_units",
    # Aggregates over owner-occupied units. The medians above are top-coded
    # ($10,001 for taxes, $2,000,001 for value); these are not, so
    # aggregate taxes / aggregate value gives a rate that survives the cap.
    "B25090_001E": "aggregate_real_estate_taxes_paid",
    "B25082_001E": "aggregate_home_value",
    # margins of error (90% confidence) for the headline medians
    "B19013_001M": "median_household_income_moe",
    "B25077_001M": "median_home_value_moe",
    "B25064_001M": "median_rent_moe",
    "B25058_001M": "median_contract_rent_moe",
    "B25103_001M": "median_real_estate_taxes_paid_moe",
}

# NOTE on taxes: your original used B25118_001E, which is "Tenure by Household
# Income" (a total count), not property taxes. The median real estate taxes
# paid variable is B25103_001E. Double-check against
# https://api.census.gov/data/<year>/acs/acs5/variables.html before trusting it.

# Valid state FIPS: 50 states + DC. The gaps (03, 07, 14, 43, 52) are
# unassigned codes — iterating over them is what produced your "204" errors.
STATE_FIPS = [
    "01", "02", "04", "05", "06", "08", "09", "10", "11", "12", "13", "15",
    "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27",
    "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39",
    "40", "41", "42", "44", "45", "46", "47", "48", "49", "50", "51", "53",
    "54", "55", "56",
    # Add "72" for Puerto Rico if you want it.
]

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("census")


# =========================
# REQUEST HELPERS
# =========================

def make_session():
    """Session with connection pooling + automatic retry on transient errors.

    This is what fixes the real failures (connection resets, 5xx, rate limits)
    that crashed your run mid-tract.
    """
    session = requests.Session()
    retry = Retry(
        total=5,
        backoff_factor=0.5,  # 0.5s, 1s, 2s, 4s, 8s
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retry, pool_maxsize=10)
    session.mount("https://", adapter)
    return session


def redact_key(url):
    return re.sub(r"key=[^&]+", "key=***", url)


def build_url(year):
    return f"{BASE_URL}/{year}/{DATASET}"


def fetch(session, url, params):
    r = session.get(url, params=params, timeout=60)

    # 204 = no data for this geography (e.g. unassigned FIPS). Not an error.
    if r.status_code == 204:
        return None

    if r.status_code != 200:
        log.error("Request failed [%s]: %s", r.status_code, redact_key(r.url))
        log.error("Body: %s", r.text[:300])
        raise requests.HTTPError(f"{r.status_code} for {redact_key(r.url)}")

    try:
        return r.json()
    except ValueError:
        log.error("Invalid JSON from %s", redact_key(r.url))
        log.error("Body: %s", r.text[:300])
        raise


def to_df(data):
    if not data or len(data) < 2:
        return pd.DataFrame()
    return pd.DataFrame(data[1:], columns=data[0])


# =========================
# DOWNLOAD LOGIC
# =========================

def _base_params():
    return {"get": "NAME," + ",".join(VARIABLES.keys()), "key": API_KEY}


def download_state(session, url):
    params = {**_base_params(), "for": "state:*"}
    return to_df(fetch(session, url, params))


def download_county(session, url):
    params = {**_base_params(), "for": "county:*", "in": "state:*"}
    return to_df(fetch(session, url, params))


def download_tract(session, url):
    frames = []
    failed = []
    for state_fips in tqdm(STATE_FIPS, desc="tracts"):
        params = {
            **_base_params(),
            "for": "tract:*",
            "in": f"state:{state_fips}",
        }
        try:
            df = to_df(fetch(session, url, params))
            if not df.empty:
                frames.append(df)
        except requests.RequestException as e:
            log.warning("state %s failed after retries: %s", state_fips, e)
            failed.append(state_fips)

    # A file missing whole states would be saved, then skipped forever on the
    # next run. Better to save nothing and let the rerun retry this year.
    if failed:
        raise RuntimeError(f"tract download incomplete, failed states: {failed}")

    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


# =========================
# CLEANING
# =========================

def clean(df, year, level):
    if df.empty:
        return df

    df = df.copy()  # avoid SettingWithCopyWarning
    for col in VARIABLES:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
            # Census jam values (-666666666 etc.) are missing-data sentinels.
            # All our variables are non-negative, so mask any negative to NaN.
            df.loc[df[col] < 0, col] = pd.NA

    df["year"] = year
    df["geo_level"] = level
    return df


# =========================
# SAVE
# =========================

def output_path(level, year):
    return f"data/raw/acs_{level}_{year}.parquet"


def is_complete(path):
    """True if the parquet at `path` exists and has every column in VARIABLES."""
    if not os.path.exists(path):
        return False
    return set(VARIABLES) <= set(pq.read_schema(path).names)


def save(df, year, level):
    if df.empty:
        log.warning("nothing to save for %s %s (empty frame)", level, year)
        return
    os.makedirs("data/raw", exist_ok=True)
    path = output_path(level, year)
    df.to_parquet(path, index=False)
    log.info("saved %s (%d rows)", path, len(df))


# =========================
# MAIN PIPELINE
# =========================

def main():
    if not API_KEY:
        raise ValueError("Missing CENSUS_API_KEY in .env")

    session = make_session()
    failed = []

    for year in YEARS:
        url = build_url(year)
        log.info("===== YEAR %s =====", year)

        for level in ["state", "county", "tract"]:
            if SKIP_EXISTING and is_complete(output_path(level, year)):
                log.info("skip %s %s (already exists)", level, year)
                continue

            log.info("downloading %s", level)
            try:
                if level == "state":
                    df = download_state(session, url)
                elif level == "county":
                    df = download_county(session, url)
                else:
                    df = download_tract(session, url)

                df = clean(df, year, level)
                save(df, year, level)
            except Exception as e:
                # One bad (year, level) shouldn't kill the whole run.
                log.error("failed %s %s: %s", level, year, e)
                failed.append((level, year))

    # Finish the run, but don't let a build go ahead on missing files.
    if failed:
        log.error("incomplete: %s. Rerun to retry only these.", failed)
        sys.exit(1)


if __name__ == "__main__":
    main()