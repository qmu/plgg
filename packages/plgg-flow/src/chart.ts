import {
  pipe,
  box,
  pattern,
  match,
  isSome,
  none,
  some,
  mapResult,
  type Box,
  type Option,
  type Result,
} from "plgg";
import type { Point3 } from "plgg-board";
import type { Graph, Scenery } from "./model";
import type { Axis } from "plgg-flow/classify";
import {
  asPlot,
  plotExtent,
  plotGraph,
  plotLines,
  plotScenery,
  type Plot,
} from "plgg-flow/plot";
import {
  asBars,
  barsDeep,
  barsExtent,
  barsGraph,
  barsLines,
  barsScenery,
  type Bars,
} from "plgg-flow/bars";
import {
  asSequence,
  sequenceDeep,
  sequenceExtent,
  sequenceGraph,
  sequenceLines,
  sequenceScenery,
  type Sequence,
} from "plgg-flow/sequence";
import {
  asTimeline,
  timelineDeep,
  timelineExtent,
  timelineGraph,
  timelineLines,
  timelineScenery,
  type Timeline,
} from "plgg-flow/timeline";

/**
 * A CHART: a way of laying a graph out in which WHERE a
 * node stands says something about it — its values, its
 * turn, its time. Each kind reads the same `axis` lines
 * in its own way, places the nodes, and draws what is
 * needed around them to read the placing.
 *
 * - a {@link Plot} places nodes by their numbers;
 * - a {@link Sequence} places messages by their turn;
 * - a {@link Timeline} places nodes by their time;
 * - {@link Bars} raise nodes as tall as their value.
 */
export type Chart =
  | Box<"Plot", Plot>
  | Box<"Sequence", Sequence>
  | Box<"Timeline", Timeline>
  | Box<"Bars", Bars>;

const plot$ = () => pattern("Plot")();
const sequence$ = () => pattern("Sequence")();
const timeline$ = () => pattern("Timeline")();
const bars$ = () => pattern("Bars")();

/** The names `layout` knows a chart by. */
const kinds: readonly string[] = [
  "plot",
  "sequence",
  "timeline",
  "bars",
];
export const isChartKind = (
  word: string,
): boolean => kinds.includes(word);

/** The chart of a kind that the axis lines describe over
 * a graph; none when the word names no chart. */
export const asChart = (
  kind: string,
  axes: readonly Axis[],
  roles: ReadonlyMap<string, string>,
  graph: Graph,
): Option<Result<Chart, string>> =>
  kind === "plot"
    ? some(
        pipe(
          asPlot(axes, roles, graph.nodes),
          mapResult(
            (p: Plot): Chart => box("Plot")(p),
          ),
        ),
      )
    : kind === "sequence"
      ? some(
          pipe(
            asSequence(axes),
            mapResult(
              (s: Sequence): Chart =>
                box("Sequence")(s),
            ),
          ),
        )
      : kind === "timeline"
        ? some(
            pipe(
              asTimeline(axes, graph.nodes),
              mapResult(
                (t: Timeline): Chart =>
                  box("Timeline")(t),
              ),
            ),
          )
        : kind === "bars"
          ? some(
              pipe(
                asBars(axes, graph.nodes),
                mapResult(
                  (b: Bars): Chart =>
                    box("Bars")(b),
                ),
              ),
            )
          : none();

/** The graph laid out as the chart says. */
export const chartGraph = (
  chart: Chart,
  graph: Graph,
): Graph =>
  match(chart)(
    [
      plot$(),
      ({ content }): Graph =>
        plotGraph(content, graph),
    ],
    [
      sequence$(),
      ({ content }): Graph =>
        sequenceGraph(content, graph),
    ],
    [
      timeline$(),
      ({ content }): Graph =>
        timelineGraph(content, graph),
    ],
    [
      bars$(),
      ({ content }): Graph =>
        barsGraph(content, graph),
    ],
  );

/** What is drawn around the nodes to read the placing. */
export const chartScenery = (
  chart: Chart,
  graph: Graph,
): readonly Scenery[] =>
  match(chart)(
    [
      plot$(),
      ({ content }): readonly Scenery[] =>
        plotScenery(content, graph.nodes),
    ],
    [
      sequence$(),
      ({ content }): readonly Scenery[] =>
        sequenceScenery(
          content,
          graph.nodes,
          graph.edges.length,
        ),
    ],
    [
      timeline$(),
      ({ content }): readonly Scenery[] =>
        timelineScenery(content, graph.nodes),
    ],
    [
      bars$(),
      ({ content }): readonly Scenery[] =>
        barsScenery(content, graph.nodes),
    ],
  );

/** Points that bound the chart beyond its nodes, so that
 * fitting the view keeps its scales on the sheet. */
export const chartExtent = (
  chart: Chart,
  graph: Graph,
): readonly Point3[] =>
  match(chart)(
    [
      plot$(),
      ({ content }): readonly Point3[] =>
        plotExtent(content),
    ],
    [
      sequence$(),
      (): readonly Point3[] =>
        sequenceExtent(
          graph.nodes,
          graph.edges.length,
        ),
    ],
    [
      timeline$(),
      ({ content }): readonly Point3[] =>
        timelineExtent(content, graph.nodes),
    ],
    [
      bars$(),
      ({ content }): readonly Point3[] =>
        barsExtent(content),
    ],
  );

/** The lines of the DSL that say the chart, as words. */
export const chartLines = (
  chart: Chart,
): readonly (readonly string[])[] =>
  match(chart)(
    [
      plot$(),
      ({
        content,
      }): readonly (readonly string[])[] =>
        plotLines(content),
    ],
    [
      sequence$(),
      ({
        content,
      }): readonly (readonly string[])[] =>
        sequenceLines(content),
    ],
    [
      timeline$(),
      ({
        content,
      }): readonly (readonly string[])[] =>
        timelineLines(content),
    ],
    [
      bars$(),
      ({
        content,
      }): readonly (readonly string[])[] =>
        barsLines(content),
    ],
  );

/** The angle a chart is best first seen from: head-on
 * when it is flat; turned and from ABOVE when it has
 * depth (a negative pitch looks down: what is nearer,
 * the larger z, is drawn lower). */
export const chartCamera = (
  chart: Chart,
): Readonly<{ yaw: number; pitch: number }> =>
  match(chart)(
    [
      plot$(),
      ({
        content,
      }): Readonly<{
        yaw: number;
        pitch: number;
      }> =>
        isSome(content.z)
          ? { yaw: -0.5, pitch: -0.36 }
          : { yaw: 0, pitch: 0 },
    ],
    [
      sequence$(),
      ({
        content,
      }): Readonly<{
        yaw: number;
        pitch: number;
      }> =>
        sequenceDeep(content)
          ? { yaw: -0.3, pitch: -0.24 }
          : { yaw: 0, pitch: 0 },
    ],
    [
      timeline$(),
      ({
        content,
      }): Readonly<{
        yaw: number;
        pitch: number;
      }> =>
        timelineDeep(content)
          ? { yaw: -0.42, pitch: -0.3 }
          : { yaw: 0, pitch: 0 },
    ],
    [
      bars$(),
      ({
        content,
      }): Readonly<{
        yaw: number;
        pitch: number;
      }> =>
        barsDeep(content)
          ? { yaw: -0.5, pitch: -0.36 }
          : { yaw: 0, pitch: 0 },
    ],
  );

/** Whether the chart gives nodes their width. */
export const chartSizes = (
  chart: Chart,
): boolean =>
  match(chart)(
    [plot$(), (): boolean => true],
    [sequence$(), (): boolean => false],
    [timeline$(), (): boolean => true],
    [bars$(), (): boolean => true],
  );
