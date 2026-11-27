import {
  pipe,
  ok,
  err,
  matchOption,
  chainResult,
  mapResult,
  type Result,
} from "plgg";
import type { Point3 } from "plgg-board";
import type {
  FlowNode,
  Graph,
  Scenery,
} from "./model";
import type { Axis } from "plgg-flow/classify";
import {
  all,
  along,
  divisions,
  ink,
  lettering,
  measureOf,
  measureWords,
  pencil,
  shown,
  strokes,
  trace,
  valueOn,
  type Better,
  type Measure,
  type Segment,
  type Told,
} from "plgg-flow/plot";
import { hueOf, thinned } from "plgg-flow/area";

/**
 * THE RADAR: several measures at once, one shape a thing.
 *
 * Every axis is a spoke; every node is the outline its
 * values draw across the spokes. OUTWARD IS BETTER on
 * every spoke — a measure that is better when lower is
 * turned round — so the larger a shape, the better the
 * thing, and where one shape reaches past another is
 * where it wins. The shapes stand one behind another in
 * depth; seen head-on they lie over each other, as the
 * chart is usually drawn.
 *
 *   layout radar
 *   axis 速さ 0..10 higher
 *   axis 費用 0..100 lower
 *   axis 品質 0..10 higher
 *   node 案A 速さ=8 費用=40 品質=6
 */
export type Radar = Readonly<{
  spokes: readonly Measure[];
  /** How many shapes there were when it was read: one
   * alone is seen head-on. */
  count: number;
}>;

/** World units: how far a spoke reaches, and from one
 * shape back to the next. */
const reach = 170;
const apart = 64;

const things = (
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  nodes.filter((n) => !n.group);

/** The radar a set of axis lines describes over a set of
 * nodes; a refusal says which line is wrong. */
export const asRadar = (
  axes: readonly Axis[],
  nodes: readonly FlowNode[],
): Result<Radar, string> =>
  axes.length < 3
    ? err(
        "layout radar には数値の軸が 3 つ以上必要です（軸 1 つが、中心から伸びる 1 本になります）",
      )
    : pipe(
        all(axes.map(measureOf(nodes))),
        mapResult((told: readonly Told[]) =>
          told.map((t: Told) => t.measure),
        ),
        chainResult(
          (
            spokes: readonly Measure[],
          ): Result<Radar, string> =>
            ok({
              spokes,
              count: things(nodes).length,
            }),
        ),
      );

/** How far out a value stands on its spoke: 0 at the
 * centre, 1 at the rim — and the rim is the better end. */
const outward = (m: Measure, v: number): number =>
  pipe(
    m.better,
    matchOption(
      () => along(m, v),
      (b: Better) =>
        b === "lower"
          ? 1 - along(m, v)
          : along(m, v),
    ),
    (t: number) => Math.min(1, Math.max(0, t)),
  );
/** The value a spoke shows at a share of its length. */
const valueAt = (m: Measure, t: number): number =>
  pipe(
    m.better,
    matchOption(
      () => m.lo + (m.hi - m.lo) * t,
      (b: Better) =>
        b === "lower"
          ? m.hi - (m.hi - m.lo) * t
          : m.lo + (m.hi - m.lo) * t,
    ),
  );
/** The direction of spoke `i` of `n`: the first straight
 * up, the rest clockwise (the screen's y runs down). */
const turn = (i: number, n: number): number =>
  -Math.PI / 2 + (2 * Math.PI * i) / n;
const onSpoke = (
  i: number,
  n: number,
  t: number,
  z: number,
): Point3 => ({
  x: Math.cos(turn(i, n)) * reach * t,
  y: Math.sin(turn(i, n)) * reach * t,
  z,
});
/** How deep the `j`-th of `count` shapes stands: the
 * first at the back, so the last written is nearest. */
const depthOf = (
  j: number,
  count: number,
): number => (j - (count - 1) / 2) * apart;

/** The corners of a node's shape, spoke by spoke; a
 * value it does not have stands at the centre. */
const corners = (
  radar: Radar,
  node: FlowNode,
  z: number,
): readonly Point3[] =>
  radar.spokes.map((m, i, spokes) =>
    onSpoke(
      i,
      spokes.length,
      pipe(
        valueOn(m.attribute)(node),
        matchOption(
          () => 0,
          (v: number) => outward(m, v),
        ),
      ),
      z,
    ),
  );

/** The side of the mark a shape is held by. */
const dot = 6;
/** The graph with every node a mark at the first corner
 * of its shape, each shape at its own depth. */
export const radarGraph = (
  radar: Radar,
  graph: Graph,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map((node) =>
    node.group
      ? node
      : {
          ...node,
          width: dot,
          height: dot,
          depth: dot / 2,
          bare: true,
          unnamed: true,
          position: pipe(
            corners(
              radar,
              node,
              depthOf(
                things(graph.nodes).indexOf(node),
                things(graph.nodes).length,
              ),
            ).slice(0, 1),
            (first: readonly Point3[]) =>
              first.reduce(
                (_: Point3, p: Point3) => p,
                node.position,
              ),
          ),
        },
  ),
});

/** The depth the web is drawn at: behind every shape. */
const back = (count: number): number =>
  depthOf(0, count) - (count > 1 ? apart / 2 : 0);
const front = (count: number): number =>
  depthOf(Math.max(0, count - 1), count);
/** A closed run of points as segments. */
const closed = (
  points: readonly Point3[],
): readonly Segment[] =>
  points.flatMap((p, i) =>
    points
      .slice((i + 1) % points.length)
      .slice(0, 1)
      .map((q): Segment => [p, q]),
  );
/** The web: a ring at each division, and the spokes. */
const web = (
  radar: Radar,
  count: number,
): readonly Segment[] => [
  ...divisions
    .slice(1)
    .flatMap((t) =>
      closed(
        radar.spokes.map((_, i, spokes) =>
          onSpoke(
            i,
            spokes.length,
            t,
            back(count),
          ),
        ),
      ),
    ),
  ...radar.spokes.map(
    (_, i, spokes): Segment => [
      onSpoke(i, spokes.length, 0, back(count)),
      onSpoke(i, spokes.length, 1, back(count)),
    ],
  ),
];
/** The name of each spoke at its rim, with the value the
 * rim stands for — the better end. */
const spokeNames = (
  radar: Radar,
  count: number,
): readonly Scenery[] =>
  radar.spokes.map((m, i, spokes) =>
    lettering(
      onSpoke(
        i,
        spokes.length,
        1.16,
        back(count),
      ),
      { x: 0, y: 4 },
      m.attribute + " " + shown(valueAt(m, 1)),
      600,
      ink,
    ),
  );
/** A shape as sheets: a fan of three-cornered pieces
 * from the centre, each plain however the outline bends. */
const fan = (
  points: readonly Point3[],
  z: number,
): readonly (readonly Point3[])[] =>
  closed(points).map(
    ([p, q]): readonly Point3[] => [
      { x: 0, y: 0, z },
      p,
      q,
    ],
  );
const shape = (
  points: readonly Point3[],
  z: number,
  hue: string,
): readonly Scenery[] => [
  ...fan(points, z)
    .slice(0, 1)
    .map(
      (first): Scenery => ({
        kind: "plane",
        layer: "sorted",
        tone: "transparent",
        width: 0,
        points: first,
        patches: fan(points, z).slice(1),
        fill: thinned(hue),
        tint: thinned(hue),
        opacity: 0.38,
      }),
    ),
  {
    kind: "line",
    layer: "sorted",
    tone: hue,
    width: 2,
    points: points.concat(points.slice(0, 1)),
  },
];
const shapes = (
  radar: Radar,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  things(nodes).flatMap((node, j, every) =>
    shape(
      corners(
        radar,
        node,
        depthOf(j, every.length),
      ),
      depthOf(j, every.length),
      hueOf(j),
    ),
  );
/** The name of each thing, in its colour, down the side. */
const names = (
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  things(nodes).map((node, j, every) =>
    lettering(
      {
        x: reach * 1.5,
        y: -reach + j * 22,
        z: front(every.length),
      },
      { x: 0, y: 4 },
      "■ " + node.label,
      600,
      hueOf(j),
    ),
  );

/** Everything drawn around a radar: the web, the names
 * of the spokes, each thing's shape, and whose is whose. */
export const radarScenery = (
  radar: Radar,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...strokes(
    trace,
    false,
    web(radar, things(nodes).length),
  ),
  ...strokes(pencil, false, [
    ...closed(
      radar.spokes.map((_, i, spokes) =>
        onSpoke(
          i,
          spokes.length,
          1,
          back(things(nodes).length),
        ),
      ),
    ),
  ]),
  ...shapes(radar, nodes),
  ...spokeNames(radar, things(nodes).length),
  ...names(nodes),
];

/** Points that bound a radar with room for its names. */
export const radarExtent = (
  radar: Radar,
): readonly Point3[] =>
  [back(radar.count), front(radar.count)].flatMap(
    (z) => [
      { x: -reach * 1.5, y: -reach * 1.3, z },
      { x: reach * 2.1, y: reach * 1.3, z },
    ],
  );
/** The lines of the DSL that say a radar. */
export const radarLines = (
  radar: Radar,
): readonly (readonly string[])[] => [
  ["layout", "radar"],
  ...radar.spokes.map((m) => [
    "axis",
    m.attribute,
    ...measureWords(m),
  ]),
];
/** A radar is first seen head-on, its shapes lying over
 * each other so each is read against the same web;
 * turned, they come apart in depth. */
export const radarDeep = (_: Radar): boolean =>
  false;
