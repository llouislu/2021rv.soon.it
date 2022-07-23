import { SeriesMarker, Time } from "lightweight-charts";

export const TIMELINE_MARKERS: SeriesMarker<Time>[] = [
  {
    time: "2021-12-01" as Time,
    position: "aboveBar",
    color: "orange",
    shape: "arrowDown",
    text: "Phase 1 Open",
  },
  {
    time: "2022-02-21" as Time,
    position: "aboveBar",
    color: "orange",
    shape: "arrowDown",
    text: "Phase 1.5 Open",
  },
  {
    time: "2022-03-01" as Time,
    position: "aboveBar",
    color: "orange",
    shape: "arrowDown",
    text: "Phase 2 Open",
  },
  {
    time: "2022-04-01" as Time,
    position: "aboveBar",
    color: "orange",
    shape: "arrowDown",
    text: "Phase 2 Processes",
  },
  {
    time: "2022-08-01" as Time,
    position: "aboveBar",
    color: "orangered",
    shape: "arrowDown",
    text: "Application Closed",
  },
];

export const CHART_HEIGHT: number = 400;
