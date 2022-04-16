import { Component, Input, OnInit } from "@angular/core";
import {
  BarPrices,
  createChart,
  ISeriesApi,
  MouseEventParams,
  OhlcData,
} from "lightweight-charts";
import { CHART_HEIGHT } from "../app.constant";
import {
  DataService,
  INZDataRow,
  INZTransformedDataMap,
} from "../data.service";

export interface MaConfig {
  windowSize: number;
  color: string;
}

@Component({
  selector: "app-candlechart",
  templateUrl: "./candlechart.component.html",
  styleUrls: ["./candlechart.component.css"],
})
export class CandlechartComponent implements OnInit {
  @Input() chartId: string = "chartId";

  @Input() title: string = "Case Approval Momentum (productive calendar)";
  @Input() interval: number = 5; // unit: day
  @Input() ma: string = "9:blue,12:green,26:orange"; // moving average config

  // legend
  isHover: boolean = false;
  ohlc: BarPrices | null = null;

  get o(): number {
    return this.ohlc?.open as number;
  }

  get h(): number {
    return this.ohlc?.high as number;
  }

  get l(): number {
    return this.ohlc?.low as number;
  }

  get c(): number {
    return this.ohlc?.close as number;
  }

  constructor(private dataService: DataService) {}

  ngOnInit(): void {
    this.dataService.inzData$.subscribe((inzData) => {
      this.draw(inzData);
    });
  }

  setLegendText(
    param: MouseEventParams,
    ohlcSeries: ISeriesApi<"Candlestick">
  ): void {
    if (param.time) {
      this.isHover = true;
      this.ohlc = param.seriesPrices.get(ohlcSeries) as BarPrices;
    } else {
      this.isHover = false;
    }
  }

  draw(data: INZDataRow[]) {
    const chartElement = document.getElementById(this.chartId) as HTMLElement;
    const height = Math.max(chartElement.clientHeight, CHART_HEIGHT);
    const width = chartElement.clientWidth;
    const chart = createChart(chartElement, {
      height: height,
      width: width,
    });

    chart.timeScale().fitContent();

    // ohlc
    const ohlcSeries = chart.addCandlestickSeries();
    const ohlc = DataService.getDailyApprovalApplicationCandles(
      data,
      this.interval
    );
    ohlcSeries.setData(ohlc);

    chart.subscribeCrosshairMove((param) => {
      this.setLegendText(param, ohlcSeries);
    });

    // moving averages
    if (this.ma.length > 0) {
      this.ma
        .split(",")
        .map((maConfig) => {
          const config = maConfig.split(":");
          return {
            windowSize: parseInt(config[0]),
            color: config[1],
          } as MaConfig;
        })
        .map((maConfig) => {
          const maSeries = DataService.getEMA(
            maConfig.windowSize,
            DataService.filterOutValueZero(
              DataService.getDailyApprovalApplicationSeries(data)
            )
          );

          const maLine = chart.addLineSeries({
            color: maConfig.color,
            lineWidth: 2,
            title: `EMA${maConfig.windowSize}`,
          });
          maLine.setData(maSeries);
        });
    }
  }
}
