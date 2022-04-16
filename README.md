# Charting 2021 Resident Visa Processing

[https://2021rv.soon.it](https://2021rv.soon.it)

[![Daily Date Update Check](https://github.com/llouislu/2021rv.soon.it/workflows/daily-data-updates/badge.svg)](https://github.com/llouislu/2021rv.soon.it/actions/workflows/daily-data-update.yml)
[![Code Build Check](https://github.com/llouislu/2021rv.soon.it/workflows/full-build/badge.svg)](https://github.com/llouislu/2021rv.soon.it/actions/workflows/code-build.yml)

# Development

## Prerequisites

- docker
- docker-compose
- Bash or similar shell

## Code Structure

- `inz_data_scraper` downloads and parses 2021RV processing data
- `data` is a placeholder for data
- `viz` visualizes the data on web

## Run Base Dev Environment

```bash
docker-compose up
```

This runs the scraper and the visualization frontend in dev mode. You can access the dev server at http://127.0.0.1:4200

## Build Website for Production

```bash
./viz_build_prod.sh
```

This builds the visualization for production.

## Enter `viz` console

```bash
./viz_console.sh
```

This prompts an interactive shell from the `viz` docker container.
