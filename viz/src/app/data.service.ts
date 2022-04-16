import { Injectable } from "@angular/core";
import { OhlcData, SingleValueData, Time } from "lightweight-charts";
import { Subject } from "rxjs";
import { ema } from "indicatorts";

export interface INZDataRow {
  time: string; // e.g. 2021-12-01
  aply: number; // daily new applications
  aply_people: number; // daily new people included in the applications
  appr: number; // daily new case approvals
  appr_people: number; // daily new people granted visa
  decl: number; // declined due to failed creteria
}

export type INZDataField = keyof INZDataRow;

export type INZTransformedDataFields =
  | "CumulativeApp"
  | "DailyApp"
  | "CumulativePpl"
  | "DailyPpl"
  | "CumulativeAppr"
  | "DailyAppr"
  | "CumulativeApprPpl";

export type INZTransformedDataMap = {
  [key in INZTransformedDataFields]: SingleValueData[];
};

@Injectable({
  providedIn: "root",
})
export class DataService {
  inzData: INZDataRow[] = [];
  inzData$ = new Subject<INZDataRow[]>();

  inzTransformedData = {} as INZTransformedDataMap;
  inzTransformedData$ = new Subject<INZTransformedDataMap>();

  static readonly PUBLIC_HOLIDAY_DATES = new Set([
    // 2021
    "2021-12-25", // Christmas Day
    "2021-12-26", // Boxing Day
    // 2022
    "2022-01-01", // New Year’s Day
    "2022-01-02", // Day after New Year’s Day
    "2022-02-07", // Waitangi Day
    "2022-04-15", // Good Friday
    "2022-04-18", // Easter Monday
    "2022-04-25", // Anzac Dat
    "2022-06-06", // Queen’s Birthday
    "2022-06-24", // Matariki
    "2022-10-24", // Labour Day
    "2022-12-25", // Christmas Day
    "2022-12-26", // Boxing Day
    // 2023
    "2023-01-01", // New Year’s Day
    "2023-01-02", // Day after New Year’s Day
    "2023-02-06", // Waitangi Day
    "2023-04-07", // Good Friday
    "2023-04-10", // Easter Monday
    "2023-04-25", // Anzac Day
    "2023-06-05", // Queen’s Birthday
    "2023-07-14", // Matariki
    "2023-10-23", // Labour Day
    "2023-12-25", // Christmas Day
    "2023-12-26", // Boxing Day
  ]);
  static readonly WeekendDayIndexes = new Set([
    0, // Sunday
    6, // Saturday
  ]);

  constructor() {
    this.loadData();
  }

  private async loadData() {
    fetch("/assets/2021rv.json")
      .then((response) => {
        response.json().then((data) => {
          this.inzData = data;
          this.preprocessData();
          this.finishProcessing();
        });
      })
      .catch((error) => {
        alert("Error loading data, please retry later.");
      });
  }

  private preprocessData() {
    // ORDER BY TIME ASC
    this.inzData.sort(
      (row1, row2) =>
        new Date(row1.time).getTime() - new Date(row2.time).getTime()
    );
  }

  private finishProcessing() {
    this.inzData$.next(this.inzData);
    this.inzTransformedData$.next({
      // "raw": this.inzData,
      CumulativeApp: DataService.getCumulativeApplicationSeries(this.inzData),
      DailyApp: DataService.getDailyApplicationSeries(this.inzData),

      CumulativePpl: DataService.getCumulativeApplicantSeries(this.inzData),
      DailyPpl: DataService.getDailyApplicantSeries(this.inzData),

      CumulativeAppr: DataService.getCumulativeApprovalApplicationSeries(
        this.inzData
      ),
      DailyAppr: DataService.getDailyApprovalApplicationSeries(this.inzData),
      CumulativeApprPpl: DataService.getCumulativeApprovalPeopleSeries(
        this.inzData
      ),
    });
  }

  private static selectFields(
    inputSeries: INZDataRow[],
    fieldNames: string[]
  ): SingleValueData[] {
    const ret = [];
    for (const row of inputSeries) {
      const selectedRow = {} as SingleValueData;

      selectedRow.time = row.time as string;

      for (const fieldName of fieldNames as INZDataField[]) {
        if (fieldName == "time") {
          continue;
        }
        selectedRow["value"] = row[fieldName];
      }
      ret.push(selectedRow);
    }
    return ret;
  }

  private static sumToDate(inputSeries: SingleValueData[]): SingleValueData[] {
    const ret = [];

    let sum = 0;
    const rows = inputSeries as SingleValueData[];
    for (const row of rows) {
      sum += row.value;
      row.value = sum;
      ret.push(row);
    }

    return ret;
  }

  private static filterOutHolidays(
    inputSeries: SingleValueData[]
  ): SingleValueData[] {
    return inputSeries.filter((row) =>
      DataService.PUBLIC_HOLIDAY_DATES.has(row.time as string)
    );
  }

  private static filterOutWeekendDays(
    inputSeries: SingleValueData[]
  ): SingleValueData[] {
    return inputSeries.filter((row) =>
      this.WeekendDayIndexes.has(new Date(row.time as string).getDay())
    );
  }

  static filterOutValueZero(inputSeries: SingleValueData[]): SingleValueData[] {
    return inputSeries.filter((row) => !(row.value == 0));
  }

  private static resampleToOHLC(
    inputSeries: SingleValueData[],
    intervalOfDays: number
  ): OhlcData[] {
    const OHLCs = [];
    for (let index = 0; index < inputSeries.length; index += intervalOfDays) {
      const thisCandle = inputSeries.slice(index, index + intervalOfDays);

      const values = thisCandle.map((row) => row.value);

      const time = thisCandle[0].time;
      const high = Math.max(...values);
      const low = Math.min(...values);
      const open = values[0];
      const close = values[values.length - 1];

      OHLCs.push({
        time: time,
        open: open,
        high: high,
        low: low,
        close: close,
      } as OhlcData);
    }

    return OHLCs;
  }

  // Util
  static getDate(time: Time, dataRows: INZDataRow[]): INZDataRow | null {
    const row = dataRows.find((row) => {
      row.time == time;
    });
    if (row === undefined) {
      return null;
    }
    return row;
  }

  static getEMA(
    windowSize: number,
    dataRows: SingleValueData[]
  ): SingleValueData[] {
    const values = dataRows.map((r) => r.value);
    const smaArray = ema(windowSize, values);
    const ret = [] as SingleValueData[];

    if (smaArray.length != dataRows.length) {
      throw new Error("EMA calculation error.");
      return ret;
    }

    for (let index = 0; index < dataRows.length; index++) {
      if (index < windowSize - 1) {
        continue;
      }
      ret.push({
        time: dataRows[index].time,
        value: smaArray[index],
      });
    }

    return ret;
  }

  // applications
  static getDailyApplicationSeries(dataRows: INZDataRow[]): SingleValueData[] {
    return DataService.selectFields(dataRows, ["aply"]);
  }

  static getCumulativeApplicationSeries(
    dataRows: INZDataRow[]
  ): SingleValueData[] {
    return DataService.sumToDate(
      DataService.getDailyApplicationSeries(dataRows)
    );
  }

  // applicants
  static getDailyApplicantSeries(dataRows: INZDataRow[]): SingleValueData[] {
    return DataService.selectFields(dataRows, ["aply_people"]);
  }

  static getCumulativeApplicantSeries(
    dataRows: INZDataRow[]
  ): SingleValueData[] {
    return DataService.sumToDate(DataService.getDailyApplicantSeries(dataRows));
  }

  // approval
  static getDailyApprovalApplicationSeries(
    dataRows: INZDataRow[]
  ): SingleValueData[] {
    return DataService.selectFields(dataRows, ["appr"]);
  }

  static getDailyApprovalPeopleSeries(
    dataRows: INZDataRow[]
  ): SingleValueData[] {
    return DataService.selectFields(dataRows, ["appr_people"]);
  }

  static getCumulativeApprovalApplicationSeries(
    dataRows: INZDataRow[]
  ): SingleValueData[] {
    return DataService.sumToDate(
      DataService.getDailyApprovalApplicationSeries(dataRows)
    );
  }

  static getDailyApprovalApplicationCandles(
    inzDataRows: INZDataRow[],
    intervalOfDays: number
  ) {
    const series = DataService.getDailyApprovalApplicationSeries(inzDataRows);
    const nonZeroSeries = DataService.filterOutValueZero(series);
    return DataService.resampleToOHLC(nonZeroSeries, intervalOfDays);
  }

  static getCumulativeApprovalPeopleSeries(dataRows: INZDataRow[]) {
    return DataService.sumToDate(
      DataService.getDailyApprovalPeopleSeries(dataRows)
    );
  }
}
