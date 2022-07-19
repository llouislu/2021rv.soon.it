import re
from pprint import pprint
from datetime import datetime
import time
import json
import logging
import sys

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
        "Week ending": "time",
        "Total applications received": "aply",
        "Total number of people included": "aply_people",
        "Applications approved and visas\xa0issued": "appr",  # farrk this white space
        "People approved and issued visas": "appr_people",
        "Declined Failed Instructions": "decl",
    }

    bs = BeautifulSoup(html_str, features="html.parser")
    table: str = str(bs.find("table").extract())

    # get first table
    dfs = pd.read_html(table)
    df = dfs[0]

    # skip first row of total statistics
    df.drop(df.index[0], inplace=True)
    df.head()

    # rename table columns
    logger.debug(df.columns)
    logger.debug("renaming columns")
    df.rename(columns=COLUMN_MAP, inplace=True)
    logger.debug(df.columns)

    # convert date type
    df["time"] = df["time"].apply(pd.to_datetime, errors="raise", format=r"%d %B %Y")

    # sort by date descendingly
    df.sort_values(by="time", ascending=False, inplace=True)

    # re-format date to YYYY-MM-DD
    df["time"] = df["time"].dt.strftime(r"%Y-%m-%d")

    # to convert a list of table rows and output a dict
    # https://stackoverflow.com/a/29815523
    return df.T.to_dict().values()


def update_inz() -> dict:
    html_str = download()
    rows = find_data_table(html_str)

    logger.debug(rows)

    dict_rows = []

    for row in rows:
        if row["time"].lower() == "total":
            continue

        dict_rows.append(row)

    return dict_rows


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
