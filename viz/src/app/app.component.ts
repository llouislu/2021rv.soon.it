import { AfterViewChecked, Component } from "@angular/core";
import { Color, ScaleType } from "@swimlane/ngx-charts";
import { DataService, INZTransformedDataMap } from "./data.service";
import { TIMELINE_MARKERS } from "./app.constant";
import { Time } from "lightweight-charts";

export interface Summary {
  name: string;
  value: number;
}

export interface StackedAreaChartItem {
  name: string;
  series: Summary[];
}

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.css"],
})
export class AppComponent {
  readonly DEFAULT_LINE_OPTIONS = {
    lastPriceAnimation: 1,
  };
  title = "2021 Resident Visa Processing Tracker - Unofficial";
  app = "app";
  appr = "appr";

  copyRightYear: number = new Date().getFullYear();

  // last update date
  lastUpdateDate: string | null = null;

  // card
  caseApplied: number | null = null;
  casePending: number | null = null;
  caseApproved: number | null = null;
  peopleApplied: number | null = null;
  peoplePending: number | null = null;
  peopleApproved: number | null = null;

  // cardSummary: { [name: string]: number } = {};
  cardColor: string = "#232837";
  colorScheme: Color = {
    domain: ["#26a69a", "#ef5350"],
    group: ScaleType.Ordinal,
    selectable: false,
    name: "2021RV Progress Summary",
  };

  // timeline

  timelineEvents = TIMELINE_MARKERS;
  toTimelineDate(time: Time): string {
    return this.convertTimeToLocaleDateString(time);
  }
  convertTimeToLocaleDateString(time: Time): string {
    return new Date(time as string).toLocaleDateString();
  }

  // stacked area chart
  pendingVsApproval: StackedAreaChartItem[] = [];

  constructor(private dataService: DataService) {
    dataService.inzTransformedData$.subscribe((inzTransformedData) => {
      this.drawUI(inzTransformedData);
    });
  }

  private drawUI(inzTransformedData: INZTransformedDataMap): void {
    this.upateLastUpdateDate(inzTransformedData);
    this.drawCard(inzTransformedData);
    this.drawStackedAreaChart(inzTransformedData);
  }

  private upateLastUpdateDate(inzTransformedData: INZTransformedDataMap): void {
    const dailyApp = inzTransformedData.DailyApp;
    this.lastUpdateDate = new Date(
      dailyApp[dailyApp.length - 1].time as string
    ).toLocaleDateString();
  }

  private drawCard(inzTransformedData: INZTransformedDataMap): void {
    // on cases
    const cumulativeApp = inzTransformedData.CumulativeApp;
    const caseApplied = cumulativeApp[cumulativeApp.length - 1].value;
    const cumulativeAppr = inzTransformedData.CumulativeAppr;
    const caseApproved = cumulativeAppr[cumulativeAppr.length - 1].value;
    this.caseApplied = caseApplied;
    this.casePending = ((caseApplied - caseApproved) / caseApplied) * 100;
    this.caseApproved = (caseApproved / caseApplied) * 100;

    // on people
    const cumulativePpl = inzTransformedData.CumulativePpl;
    const peopleApplied = cumulativePpl[cumulativePpl.length - 1].value;
    this.peopleApplied = peopleApplied;

    const cumulativeApprPpl = inzTransformedData.CumulativeApprPpl;
    const peopleApproved =
      cumulativeApprPpl[cumulativeApprPpl.length - 1].value;
    this.peopleApproved = (peopleApproved / peopleApplied) * 100;
    this.peoplePending = 100 - (peopleApproved / peopleApplied) * 100;
  }

  private drawStackedAreaChart(
    inzTransformedData: INZTransformedDataMap
  ): void {
    this.pendingVsApproval = [];
    const caseApplySeries = inzTransformedData.CumulativeApp;
    const caseApprovalSeries = inzTransformedData.CumulativeAppr;

    if (caseApplySeries.length != caseApprovalSeries.length) {
      throw new Error("data error");
    }

    const pendings = {} as StackedAreaChartItem;
    pendings.name = "Case Pending (%)";
    pendings.series = [];

    const approvals = {} as StackedAreaChartItem;
    approvals.name = "Case Approved (%)";
    approvals.series = [];

    for (let index = 0; index < caseApplySeries.length; index++) {
      const pendingToDate =
        caseApplySeries[index].value - caseApprovalSeries[index].value;

      const casePendingRatio =
        (pendingToDate / caseApplySeries[index].value) * 100;
      pendings.series.push({
        name: this.convertTimeToLocaleDateString(caseApplySeries[index].time),
        value: casePendingRatio,
      });

      approvals.series.push({
        name: this.convertTimeToLocaleDateString(
          caseApprovalSeries[index].time
        ),
        value: 100 - casePendingRatio,
      });
    }

    this.pendingVsApproval = [approvals, pendings];
  }

  ngOnInit() {}

  cardValueFormatter(o: Summary): string {
    if (o.value >= 0 && o.value <= 1) {
      return `${(100 * o.value).toFixed(2)} %`;
    }
    return `${new Intl.NumberFormat("en-NZ").format(o.value)}`;
  }
}
