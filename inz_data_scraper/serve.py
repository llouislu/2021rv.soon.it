import re
from pprint import pprint
from datetime import datetime
import time
import json
import logging
import sys
from typing import TypedDict

import requests
from bs4 import BeautifulSoup
import pandas as pd
import schedule


URL = "https://www.immigration.govt.nz/new-zealand-visas/waiting-for-a-visa/how-long-it-takes-to-process-your-visa-application/2021-resident-visa-processing-times"

logging.basicConfig(
    level=logging.DEBUG,
    format="%(levelname)s:%(asctime)s:%(name)s:L%(lineno)s:%(funcName)s():%(message)s ",
)
logger = logging.getLogger(__name__)

date_pattern = re.compile(r"(\w{3} \w{3} \d{1,2})")


class CurrentYear:
    value = 2022


class DataRecord(TypedDict):
    aply: int
    aply_people: int
    appr: int
    appr_people: int
    decl: int
    time: str  # YYYY-MM-DD


def detect_table_data_row(row):
    for weekday in ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]:
        if row.startswith(weekday):
            return True
    return False


def parse_date_string(date_string, year_) -> datetime:
    date_object = datetime.strptime(date_string, "%a %b %d")
    date_object = date_object.replace(year=year_)
    return date_object


def parse_table_row(row):
    matched = date_pattern.search(row)
    if not matched:
        exit(f"error parsing date in '{row}'")
    date_ = matched.group(0)

    # get rid of date
    row = row.replace(date_, "")

    # clean spaces on both sides
    row = row.strip()

    # get numbers in columns
    row = row.split()

    # replace empty cell with `null`
    row = [0 if number == "." else int(number) for number in row]

    if date_ == "Fri Dec 31" and row[0] == 14 and row[1] == 36:
        CurrentYear.value = 2021

    date_obj = parse_date_string(date_, CurrentYear.value)
    YYYY_MM_DD = date_obj.strftime("%Y-%m-%d")
    return [YYYY_MM_DD] + row


def download() -> bytes:
    chunks = []
    try:
        r = requests.get(URL)
    except Exception as e:
        logger.error(f"download failed")
    else:
        return r.text


def find_data_table(html_str: str) -> dict:
    COLUMN_MAP = {
        "Total applications received": "aply",
        "Total number of people included": "aply_people",
        "Applications approved and visas issued": "appr",
        "People approved and issued visas": "appr_people",
        "Declined applications": "decl",
    }

    bs = BeautifulSoup(html_str, features="html.parser")
    table: str = str(bs.find("table").extract())

    # get first table
    dfs = pd.read_html(table)
    df = dfs[0]

    items = df.to_dict(
        orient="split"
    )  # split: dict like {‘index’ -> [index], ‘columns’ -> [columns], ‘data’ -> [values]}

    ret = {}
    for item in items["data"]:
        column_name = COLUMN_MAP.get(item[0])
        ret[column_name] = item[1]
    return ret


def find_date_of_update(html_str: str) -> datetime:
    pattern = re.compile(
        r"<p>Data valid to approximately (\d{2}:\d{2}, \d+ \w+ \d{4}).</p>"
    )
    matches = pattern.findall(html_str)
    if not matches:
        raise ValueError("no date of update found.")
    return datetime.strptime(matches[0], r"%H:%M, %d %B %Y")


def http_get_last_2021rv_json() -> str:
    r = requests.get(
        "https://raw.githubusercontent.com/llouislu/2021rv.soon.it/gh-pages/assets/2021rv.json"
    )
    return r.text


def update_inz() -> list[DataRecord]:
    html_str = download()
    row = find_data_table(html_str)
    date_of_update: datetime = find_date_of_update(html_str)

    logger.debug(row)
    row["time"] = str(date_of_update.date())  # YYYY-MM-DD

    # get old data
    original_json_str = http_get_last_2021rv_json()
    logger.debug(original_json_str)
    original_json_dict: list(dict) = json.loads(original_json_str)
    logger.debug("original data from website")
    original_df = pd.read_json(original_json_str)

    # calculate increments from totals on web
    if row["time"] == str(original_df["time"].max()):
        logger.info("data not updated - skip update")
        return original_json_dict

    new_row = {}
    for col, val in row.items():
        if col == "time":
            new_row[col] = val
            continue
        new_row[col] = int(val) - int(original_df[col].sum())  # avoid pandas int64
    updated_json_dict = []
    updated_json_dict.append(new_row)
    updated_json_dict.extend(original_json_dict)

    updated_json_dict.sort(
        reverse=True, key=lambda e: datetime.strptime(e["time"], r"%Y-%m-%d")
    )

    logger.debug("updated data")
    logger.debug(updated_json_dict)

    return updated_json_dict


def worker():
    logger.info(f"updating inz at {datetime.now()}")
    json_dict = update_inz()
    logger.info("writing new data json.")
    json.dump(json_dict, open("/data/2021rv.json", "w"))
    logger.info(f"updated inz at {datetime.now()}")


def main(argv):
    logger.info("Running immediate update")
    worker()
    logger.info("Has run immediate update")

    if len(argv) > 1 and argv[1] in ["--one-off", "-1"]:
        exit(0)

    schedule.every().day.at("05:00").do(worker)  # UTC Time!!!
    logger.info(f"has set up scheudled runs: {schedule.get_jobs()}")

    while True:
        schedule.run_pending()
        time.sleep(1)


if __name__ == "__main__":
    logger.info("started")
    main(sys.argv)
