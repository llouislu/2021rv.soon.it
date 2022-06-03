import re
from pprint import pprint
from datetime import datetime
import time
import json
import logging
import sys

import requests
from poppler import load_from_data
import schedule


URL = "https://www.immigration.govt.nz/documents/other-resources/2021-resident-visa-processing.pdf"

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
        if r.status_code == 200:
            for chunk in r.iter_content(1024):
                chunks.append(chunk)
    except Exception as e:
        logger.error(f"download failed")
    else:
        return b"".join(chunks)


def pdf_to_text(pdf_bytes: bytes) -> str:
    pdf_document = load_from_data(pdf_bytes)
    logger.info(f"PDF metadata - {pdf_document.infos()}")
    page_texts = []
    for page_idx in range(0, pdf_document.pages):
        page = pdf_document.create_page(page_idx)
        page_texts.append(page.text())

    return "\n".join(page_texts)


def update_inz() -> dict:
    pdf_file_bytes = download()
    # with open("test.pdf", "wb") as f:
    #     f.write(pdf_file_bytes)

    pdf_text = pdf_to_text(pdf_file_bytes)

    rows = []
    dict_rows = []
    logger.debug("showing first and last 20 rows of parsed PDF")
    lines = pdf_text.split("\n")
    for line_no, line in enumerate(lines, 1):
        if line_no <= 20 or (len(lines) + 1 - 20 <= line_no <= len(lines) + 1):
            logger.debug(f"L{line_no}\t{line}")

        line = line.strip()
        line = line.replace(",", "")
        if not detect_table_data_row(line):
            continue

        row = parse_table_row(line)
        rows.append(row)

        time, aply, aply_people, appr, appr_people, decl = row
        dict_rows.append(
            {
                "time": time,
                "aply": aply,
                "aply_people": aply_people,
                "appr": appr,
                "appr_people": appr_people,
                "decl": decl,
            }
        )

    logger.info(f"got rows - {rows}")
    logger.info(f"converted to dict rows - {dict_rows}")
    return dict_rows


def worker():
    logger.info(f"updating inz at {datetime.now()}")
    json_dict = update_inz()
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
