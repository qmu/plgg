import {
  pipe,
  ok,
  err,
  none,
  some,
  isSome,
  fromNullable,
  chainOption,
  mapOption,
  matchOption,
  getOr,
  chainResult,
  mapResult,
  type Option,
  type Result,
} from "plgg";
import type { Point3 } from "plgg-board";
import type {
  Edge,
  FlowNode,
  Graph,
  Scenery,
} from "./model";
import type { Axis } from "plgg-flow/classify";
import type {
  JsonObject,
  JsonValue,
} from "plgg-flow/metadata";
import {
  all,
  divisions,
  ink,
  lettering,
  pencil,
  rangeOf,
  shown,
  spanned,
  strokes,
  trace,
  valueOn,
  type Range,
  type Segment,
} from "plgg-flow/plot";

/**
 * THE TIMELINE: what runs when, and what waits for what.
 *
 * The first axis is time. Every node is a stretch of it
 * — `週=2..8` — drawn as a bar as long as it lasts, one
 * bar a row, in the order written; a connection says one
 * waits for another. A second axis, when written, sets
 * the bars apart in DEPTH by an attribute — who does the
 * work, which stream it belongs to — so each lane reads
 * as a plane of its own.
 *
 *   layout timeline
 *   axis 週 0..12
 *   axis 担当 設計 開発
 *   node 設計書 週=0..3 担当=設計
 *   node 実装 週=3..9 担当=開発
 *   設計書 -> 実装
 */
export type Timeline = Readonly<{
  attribute: string;
  lo: number;
  hi: number;
  /** Whether the range was written, or taken from the
   * stretches. */
  written: boolean;
  lane: Option<Axis>;
}>;

/** World units: the length of the whole of time, the
 * height of a row, and between lanes. */
const length = 640;
const row = 48;
const apart = 240;

/** A node's stretch of time: `2..8`, or a single moment. */
const stretchOf =
  (attribute: string) =>
  (node: FlowNode): Option<Range> =>
    pipe(
      fromNullable(node.data),
      chainOption((data: JsonObject) =>
        fromNullable(data[attribute]),
      ),
      chainOption(
        (v: JsonValue): Option<Range> =>
          pipe(
            rangeOf(String(v)),
            matchOption(
              () =>
                pipe(
                  valueOn(attribute)(node),
                  mapOption(
                    (at: number): Range => ({
                      lo: at,
                      hi: at,
                    }),
                  ),
                ),
              (r: Range): Option<Range> =>
                some(r),
            ),
          ),
      ),
    );
const bars = (
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  nodes.filter((n) => !n.group);

const stretches = (
  attribute: string,
  nodes: readonly FlowNode[],
): Result<readonly Range[], string> =>
  all(
    bars(nodes).map((n) =>
      pipe(
        stretchOf(attribute)(n),
        matchOption(
          (): Result<Range, string> =>
            err(
              n.id +
                " に " +
                attribute +
                " の期間（例 2..8）がありません",
            ),
          (r: Range) => ok(r),
        ),
      ),
    ),
  );
/** The range an axis line wrote for time, if it did. */
const writtenRange = (
  axis: Axis,
): Result<Option<Range>, string> =>
  axis.values.length === 0
    ? ok(none())
    : pipe(
        fromNullable(axis.values[0]),
        chainOption(rangeOf),
        matchOption(
          (): Result<Option<Range>, string> =>
            err(
              "axis " +
                axis.attribute +
                " [開始..終了] と書きます",
            ),
          (r: Range) =>
            axis.values.length === 1
              ? ok(some(r))
              : err(
                  "axis " +
                    axis.attribute +
                    " [開始..終了] と書きます",
                ),
        ),
      );
const overTime = (
  axis: Axis,
  lane: Option<Axis>,
  written: Option<Range>,
  found: readonly Range[],
): Timeline =>
  pipe(
    written,
    matchOption(
      (): Timeline => ({
        attribute: axis.attribute,
        ...spanned(
          found.flatMap((r) => [r.lo, r.hi]),
        ),
        written: false,
        lane,
      }),
      (r: Range): Timeline => ({
        attribute: axis.attribute,
        ...r,
        written: true,
        lane,
      }),
    ),
  );
const timed = (
  axis: Axis,
  lane: Option<Axis>,
  nodes: readonly FlowNode[],
): Result<Timeline, string> =>
  pipe(
    writtenRange(axis),
    chainResult((written: Option<Range>) =>
      pipe(
        stretches(axis.attribute, nodes),
        mapResult((found: readonly Range[]) =>
          overTime(axis, lane, written, found),
        ),
      ),
    ),
  );
/** The timeline a set of axis lines describes over a
 * set of nodes. */
export const asTimeline = (
  axes: readonly Axis[],
  nodes: readonly FlowNode[],
): Result<Timeline, string> =>
  axes.length > 2
    ? err(
        "layout timeline の軸は 2 つまでです（時間と、分ける属性）",
      )
    : pipe(
        fromNullable(axes[0]),
        matchOption(
          (): Result<Timeline, string> =>
            err(
              "layout timeline には時間の軸が必要です",
            ),
          (time: Axis) =>
            timed(
              time,
              fromNullable(axes[1]),
              nodes,
            ),
        ),
      );

const centred = (
  i: number,
  count: number,
  width: number,
): number => (i - (count - 1) / 2) * width;
/** Where a moment falls along the length. */
const when = (t: Timeline, at: number): number =>
  ((at - t.lo) / (t.hi - t.lo) - 0.5) * length;

/** The lanes, front to back; one unnamed lane when none
 * is written. */
const laneNames = (
  t: Timeline,
): readonly string[] =>
  pipe(
    t.lane,
    matchOption(
      (): readonly string[] => [""],
      (axis: Axis) => axis.values,
    ),
  );
/** Which lane a bar lies in: the place of its value on
 * the lane axis; the first lane when it has none. */
const laneIndex = (
  t: Timeline,
  node: FlowNode,
): number =>
  pipe(
    t.lane,
    chainOption((axis: Axis) =>
      pipe(
        fromNullable(node.data),
        chainOption((data: JsonObject) =>
          fromNullable(data[axis.attribute]),
        ),
        chainOption(
          (v: JsonValue): Option<number> =>
            axis.values.indexOf(String(v)) < 0
              ? none()
              : some(
                  axis.values.indexOf(String(v)),
                ),
        ),
      ),
    ),
    getOr(0),
  );
const depthOf = (
  t: Timeline,
  lane: number,
): number =>
  centred(lane, laneNames(t).length, apart);
/** The bars of each lane, in the order written. */
const inLane = (
  t: Timeline,
  nodes: readonly FlowNode[],
  lane: number,
): readonly FlowNode[] =>
  bars(nodes).filter(
    (n) => laneIndex(t, n) === lane,
  );
/** The rows of the fullest lane: every sheet is as tall. */
const rows = (
  t: Timeline,
  nodes: readonly FlowNode[],
): number =>
  Math.max(
    1,
    ...laneNames(t).map(
      (_, lane) => inLane(t, nodes, lane).length,
    ),
  );
const height = (
  t: Timeline,
  nodes: readonly FlowNode[],
): number => rows(t, nodes) * row;

const barred =
  (t: Timeline, nodes: readonly FlowNode[]) =>
  (node: FlowNode): FlowNode =>
    pipe(
      stretchOf(t.attribute)(node),
      matchOption(
        () => node,
        (r: Range): FlowNode => ({
          ...node,
          width: Math.max(
            16,
            when(t, r.hi) - when(t, r.lo),
          ),
          position: {
            x:
              (when(t, r.lo) + when(t, r.hi)) / 2,
            y:
              -height(t, nodes) / 2 +
              row / 2 +
              inLane(
                t,
                nodes,
                laneIndex(t, node),
              ).indexOf(node) *
                row,
            z: depthOf(t, laneIndex(t, node)),
          },
        }),
      ),
    );
const halfWidth = (node: FlowNode): number =>
  pipe(fromNullable(node.width), getOr(0)) / 2;
/** A wait, drawn from the end of what is waited for to
 * the start of what waits. */
const waiting =
  (placed: ReadonlyMap<string, FlowNode>) =>
  (edge: Edge): Edge =>
    pipe(
      fromNullable(placed.get(edge.source)),
      chainOption((from: FlowNode) =>
        pipe(
          fromNullable(placed.get(edge.target)),
          mapOption(
            (to: FlowNode): Edge => ({
              ...edge,
              path: [
                {
                  ...from.position,
                  x:
                    from.position.x +
                    halfWidth(from),
                },
                {
                  ...to.position,
                  x:
                    to.position.x - halfWidth(to),
                },
              ],
            }),
          ),
        ),
      ),
      getOr(edge),
    );
const waited = (
  graph: Graph,
  nodes: readonly FlowNode[],
): Graph => ({
  ...graph,
  nodes,
  edges: graph.edges.map(
    waiting(
      new Map(
        nodes.map(
          (n): readonly [string, FlowNode] => [
            n.id,
            n,
          ],
        ),
      ),
    ),
  ),
});
/** The graph with every node a bar where and as long as
 * its stretch says — one bar a row, each lane a sheet of
 * its own — and every wait drawn end to start. */
export const timelineGraph = (
  t: Timeline,
  graph: Graph,
): Graph =>
  waited(
    graph,
    graph.nodes.map(barred(t, graph.nodes)),
  );

const corner = (
  t: Timeline,
  nodes: readonly FlowNode[],
  lane: number,
  across: number,
  down: number,
): Point3 => ({
  x: (across - 0.5) * length,
  y: (down - 0.5) * height(t, nodes),
  z: depthOf(t, lane),
});
/** A lane's sheet: its outline, and an upright line at
 * each division of time. */
const sheet = (
  t: Timeline,
  nodes: readonly FlowNode[],
  lane: number,
): readonly Segment[] => [
  [
    corner(t, nodes, lane, 0, 0),
    corner(t, nodes, lane, 1, 0),
  ],
  [
    corner(t, nodes, lane, 1, 0),
    corner(t, nodes, lane, 1, 1),
  ],
  [
    corner(t, nodes, lane, 1, 1),
    corner(t, nodes, lane, 0, 1),
  ],
  [
    corner(t, nodes, lane, 0, 1),
    corner(t, nodes, lane, 0, 0),
  ],
  ...divisions
    .slice(1, -1)
    .map(
      (d): Segment => [
        corner(t, nodes, lane, d, 0),
        corner(t, nodes, lane, d, 1),
      ],
    ),
];
/** The scale of time, along the top of the front sheet. */
const scale = (
  t: Timeline,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...divisions.map((d) =>
    lettering(
      corner(t, nodes, 0, d, 0),
      { x: 0, y: -10 },
      shown(t.lo + (t.hi - t.lo) * d),
      400,
      pencil,
    ),
  ),
  lettering(
    corner(t, nodes, 0, 0, 0),
    { x: -36, y: -10 },
    t.attribute,
    600,
    ink,
  ),
];
/** The name of each lane, at the foot of its sheet. */
const laneLabels = (
  t: Timeline,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  laneNames(t).flatMap((value, lane) =>
    value === ""
      ? []
      : [
          lettering(
            corner(t, nodes, lane, 1, 1),
            { x: 28, y: -4 },
            value,
            600,
            ink,
          ),
        ],
  );
/** Everything drawn around the bars: a sheet for each
 * lane ruled by time, the scale, and the lanes' names. */
export const timelineScenery = (
  t: Timeline,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...strokes(
    trace,
    false,
    laneNames(t).flatMap((_, lane) =>
      sheet(t, nodes, lane),
    ),
  ),
  ...scale(t, nodes),
  ...laneLabels(t, nodes),
];

/** Points that bound a timeline with room for its scale. */
export const timelineExtent = (
  t: Timeline,
  nodes: readonly FlowNode[],
): readonly Point3[] =>
  laneNames(t).flatMap((_, lane) => [
    corner(t, nodes, lane, -0.12, -0.2),
    corner(t, nodes, lane, 1.14, 1.1),
  ]);

/** The lines of the DSL that say a timeline. */
export const timelineLines = (
  t: Timeline,
): readonly (readonly string[])[] => [
  ["layout", "timeline"],
  [
    "axis",
    t.attribute,
    ...(t.written
      ? [shown(t.lo) + ".." + shown(t.hi)]
      : []),
  ],
  ...pipe(
    t.lane,
    matchOption(
      (): readonly (readonly string[])[] => [],
      (axis: Axis) => [
        ["axis", axis.attribute, ...axis.values],
      ],
    ),
  ),
];
/** Whether the bars lie in more than one lane. */
export const timelineDeep = (
  t: Timeline,
): boolean =>
  isSome(t.lane) &&
  t.lane.content.values.length > 1;
