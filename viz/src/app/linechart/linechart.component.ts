import { Component, Input, OnInit } from "@angular/core";
import {
  BarPrice,
  BusinessDay,
  createChart,
  ISeriesApi,
  MouseEventParams,
  SeriesMarker,
  SingleValueData,
  Time,
  UTCTimestamp,
} from "lightweight-charts";
import { CHART_HEIGHT, TIMELINE_MARKERS } from "../app.constant";
import {
  DataService,
  INZDataRow,
  INZTransformedDataFields,
  INZTransformedDataMap,
} from "../data.service";

@Component({
  selector: "app-linechart",
  templateUrl: "./linechart.component.html",
  styleUrls: ["./linechart.component.css"],
})
export class LinechartComponent implements OnInit {
  readonly DEFAULT_LINE_OPTIONS = {
    lastPriceAnimation: 1,
  };

  @Input() chartId: string = "chartId";

  @Input() title: string = "Title";
  @Input() interval: number = 1; // unit: day
  @Input() yName: INZTransformedDataFields = "CumulativeApp";
  @Input() vName: INZTransformedDataFields = "DailyApp";

  // legend
  isHover: boolean = false;
  y: number | null = null; // y series value
  v: number | null = null; // histogram series value

  // marker defs
  readonly timelineMarkers: SeriesMarker<Time>[] = TIMELINE_MARKERS;
  static timelineMarkers: any;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.inzTransformedData$.subscribe((inzTransformedData) => {
      this.draw(inzTransformedData);
    });
  }

  setLegendText(
    param: MouseEventParams,
    volumeSeries: ISeriesApi<"Histogram">,
    ySeries: ISeriesApi<"Line">
  ): void {
    if (param.time) {
      this.isHover = true;
      this.v = param.seriesPrices.get(volumeSeries) as number;
      this.y = param.seriesPrices.get(ySeries) as number;
    } else {
      this.isHover = false;
    }
  }

  draw(data: INZTransformedDataMap) {
    const chartElement = document.getElementById(this.chartId) as HTMLElement;

    const height = Math.max(chartElement.clientHeight, CHART_HEIGHT);
    const width = chartElement.clientWidth;
    const chart = createChart(chartElement, {
      height: height,
      width: width,
    });

    chart.timeScale().fitContent();

    // volume bar - applications
    const volumeSeries = chart.addHistogramSeries({
      color: "#26a69a",
      priceFormat: {
        type: "price",
      },
      priceScaleId: "",
      scaleMargins: {
        top: 0.75,
        bottom: 0,
      },
    });
    volumeSeries.setData(data[`${this.vName}`]);

    // cumulative applications
    const appSeries = chart.addLineSeries(this.DEFAULT_LINE_OPTIONS);
    appSeries.setData(data[`${this.yName}`]);
    appSeries.setMarkers(this.milestoneMarkers);

    chart.subscribeCrosshairMove((param) => {
      this.setLegendText(param, volumeSeries, appSeries);
    });
  }

  private get milestoneMarkers(): SeriesMarker<Time>[] {
    const toBeAddedMarkers = this.timelineMarkers.filter((marker) => {
      const markerUTCTimeStamp = Date.parse(marker.time as string);
      const now = Date.now() as UTCTimestamp;
      if (markerUTCTimeStamp <= now) {
        return true;
      }
      return false;
    });
    return toBeAddedMarkers;
  }
}
