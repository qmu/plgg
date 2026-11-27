import {
  pipe,
  isSome,
  chainOption,
  mapOption,
  matchOption,
  fromNullable,
  getOr,
  none,
  some,
  err,
  mapResult,
  type Option,
  type Result,
} from "plgg";
import type { Point3 } from "plgg-board";
import type {
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
  along,
  lettering,
  ink,
  strokes,
  pencil,
  trace,
  valueOn,
} from "plgg-flow/plot";
import {
  acrossAt,
  acrossNames,
  bars,
  crown,
  deepAt,
  halfAcross,
  halfDeep,
  fieldLines,
  fieldOf,
  floor,
  ground,
  indexOn,
  level,
  rows,
  ruling,
  scale,
  barsExtent,
  type Bars,
} from "plgg-flow/bars";

/**
 * THE AREA: one quantity, followed along an order.
 *
 * It reads the same lines the bars do. The first axis is
 * the quantity; the second is the order it is followed
 * along — months, steps, sizes; a third, when written,
 * names the SERIES, each drawn as its own filled outline,
 * one behind another in depth. A series hides what stands
 * behind and below it, so which is ahead, where, and when
 * it is overtaken is seen as a range of ridges.
 *
 *   layout area
 *   axis 売上 0..100 higher
 *   axis 月 1月 2月 3月
 *   axis 地域 東 西
 *   node 東1 月=1月 地域=東 売上=40
 */
export type Area = Bars &
  Readonly<{
    /** Each node is a whole series, its values written
     * in one list. */
    listed: boolean;
  }>;

/** The attribute a listed series is set apart by. */
const seriesWord = "系列";
/** The values a node lists on an attribute, when it
 * lists more than one:  売上=22,30,41 */
const listOn =
  (attribute: string) =>
  (node: FlowNode): Option<readonly string[]> =>
    pipe(
      fromNullable(node.data),
      chainOption((data: JsonObject) =>
        fromNullable(data[attribute]),
      ),
      chainOption(
        (
          v: JsonValue,
        ): Option<readonly string[]> =>
          String(v).includes(",")
            ? some(String(v).split(","))
            : none(),
      ),
    );
/** The order a list is followed along: as written, or
 * counted from one when it was not. */
const counted = (
  across: Axis,
  nodes: readonly FlowNode[],
  quantity: string,
): Axis =>
  across.values.length > 0
    ? across
    : {
        ...across,
        values: Array.from(
          {
            length: Math.max(
              0,
              ...nodes.map((n) =>
                pipe(
                  listOn(quantity)(n),
                  matchOption(
                    () => 0,
                    (l: readonly string[]) =>
                      l.length,
                  ),
                ),
              ),
            ),
          },
          (_, k) => String(k + 1),
        ),
      };
/** A node as the values it stands for: itself, or — when
 * it lists a series — one for each value of the list. */
const spread =
  (quantity: string, across: Axis) =>
  (node: FlowNode): readonly FlowNode[] =>
    pipe(
      listOn(quantity)(node),
      matchOption(
        (): readonly FlowNode[] => [node],
        (list: readonly string[]) =>
          list.map(
            (v, k): FlowNode => ({
              ...node,
              id: node.id + "#" + (k + 1),
              data: {
                ...node.data,
                [quantity]: v.trim(),
                [across.attribute]: pipe(
                  fromNullable(across.values[k]),
                  getOr(String(k + 1)),
                ),
                [seriesWord]: node.id,
              },
            }),
          ),
      ),
    );
const listedIn = (
  quantity: string,
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  bars(nodes).filter((n) =>
    isSome(listOn(quantity)(n)),
  );
/** The values an area is drawn from. */
const valuesOf = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  a.listed
    ? bars(nodes).flatMap(
        spread(a.measure.attribute, a.across),
      )
    : bars(nodes);

const asListed = (
  quantity: Axis,
  across: Axis,
  nodes: readonly FlowNode[],
): Result<Area, string> =>
  pipe(
    fieldOf("area")(
      [
        quantity,
        counted(
          across,
          nodes,
          quantity.attribute,
        ),
        {
          attribute: seriesWord,
          values: listedIn(
            quantity.attribute,
            nodes,
          ).map((n) => n.id),
        },
      ],
      bars(nodes).flatMap(
        spread(
          quantity.attribute,
          counted(
            across,
            nodes,
            quantity.attribute,
          ),
        ),
      ),
    ),
    mapResult(
      (b: Bars): Area => ({ ...b, listed: true }),
    ),
  );
/** The area a set of axis lines describes over a set of
 * nodes; a refusal says which line or node is wrong. A
 * node may be one value, placed by its attributes, or a
 * whole series, its values in one list. */
export const asArea = (
  axes: readonly Axis[],
  nodes: readonly FlowNode[],
): Result<Area, string> =>
  pipe(
    fromNullable(axes[0]),
    chainOption((quantity: Axis) =>
      pipe(
        fromNullable(axes[1]),
        chainOption(
          (
            across: Axis,
          ): Option<Result<Area, string>> =>
            listedIn(quantity.attribute, nodes)
              .length === 0
              ? none()
              : some(
                  axes.length > 2
                    ? err(
                        "系列を 1 行で書くときは、3 つ目の軸は要りません（node がそのまま系列になります）",
                      )
                    : asListed(
                        quantity,
                        across,
                        nodes,
                      ),
                ),
        ),
      ),
    ),
    getOr<Result<Area, string>>(
      pipe(
        fieldOf("area")(axes, nodes),
        mapResult(
          (b: Bars): Area => ({
            ...b,
            listed: false,
          }),
        ),
      ),
    ),
  );

/** The side of the mark a value is pointed at by. */
const dot = 6;

/** How high a value stands above the floor. */
const heightOf = (a: Area, v: number): number =>
  level(
    Math.min(1, Math.max(0, along(a.measure, v))),
  );
const rowOf =
  (a: Area) =>
  (node: FlowNode): number =>
    pipe(
      a.deep,
      chainOption((d: Axis) => indexOn(d)(node)),
      getOr(0),
    );

const marked =
  (a: Area) =>
  (node: FlowNode): FlowNode =>
    pipe(
      valueOn(a.measure.attribute)(node),
      chainOption((v: number) =>
        pipe(
          indexOn(a.across)(node),
          mapOption(
            (i: number): FlowNode => ({
              ...node,
              width: dot,
              height: dot,
              depth: dot / 2,
              bare: true,
              unnamed: true,
              position: {
                x: acrossAt(a, i),
                y: heightOf(a, v),
                z: deepAt(a, rowOf(a)(node)),
              },
            }),
          ),
        ),
      ),
      getOr(node),
    );
/** Where a listed series is held by: its last value. */
const held =
  (a: Area) =>
  (node: FlowNode): FlowNode =>
    pipe(
      fromNullable(
        spread(
          a.measure.attribute,
          a.across,
        )(node)
          .map(marked(a))
          .filter((n) => n.bare === true)
          .slice(-1)[0],
      ),
      matchOption(
        () => node,
        (last: FlowNode): FlowNode => ({
          ...node,
          width: dot,
          height: dot,
          depth: dot / 2,
          bare: true,
          unnamed: true,
          position: last.position,
        }),
      ),
    );
/** The graph with every node a mark where its value
 * stands: along the order, up by the quantity, back by
 * its series. */
export const areaGraph = (
  a: Area,
  graph: Graph,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map(
    a.listed ? held(a) : marked(a),
  ),
});

/** The marks of one series, in the order of the second
 * axis. */
const series = (
  a: Area,
  nodes: readonly FlowNode[],
  j: number,
): readonly Point3[] =>
  valuesOf(a, nodes)
    .map(marked(a))
    .filter(
      (n) =>
        rowOf(a)(n) === j &&
        isSome(indexOn(a.across)(n)) &&
        isSome(valueOn(a.measure.attribute)(n)),
    )
    .map((n) => n.position)
    .sort((p: Point3, q: Point3) => p.x - q.x);
/** One slice of a series: the ground under two marks
 * that follow one another, up to the line between them.
 * A series is laid as its slices so that each is a plain
 * four-sided sheet. */
const slice = (
  p: Point3,
  q: Point3,
): readonly Point3[] => [
  { ...p, y: floor },
  p,
  q,
  { ...q, y: floor },
];
const slices = (
  points: readonly Point3[],
): readonly (readonly Point3[])[] =>
  points
    .slice(1)
    .flatMap((q, i) =>
      points
        .slice(i, i + 1)
        .map((p) => slice(p, q)),
    );
/** The colours series are told apart by, each as it
 * reads on a light sheet and on a dark one; past the
 * last, they come round again. */
const hues: readonly string[] = [
  "light-dark(#2f6fde,#6ea8ff)",
  "light-dark(#d9730d,#ffab57)",
  "light-dark(#1f9d63,#5fd39a)",
  "light-dark(#7a52cc,#b392f0)",
  "light-dark(#cf3d3d,#ff7b72)",
  "light-dark(#138a8a,#56d4dd)",
];
const hueOf = (j: number): string =>
  pipe(
    fromNullable(hues[j % hues.length]),
    getOr(ink),
  );
/** A hue thinned into the sheet, for the body of a
 * series. */
const thinned = (hue: string): string =>
  "color-mix(in srgb," +
  hue +
  " 34%,light-dark(#ffffff,#1f1f1f))";
/** The filled outline of one series, when it has two
 * marks to run between. */
const filled = (
  points: readonly Point3[],
  hue: string,
): readonly Scenery[] =>
  slices(points)
    .slice(0, 1)
    .map(
      (first): Scenery => ({
        kind: "plane",
        layer: "sorted",
        tone: thinned(hue),
        width: 0.5,
        points: first,
        patches: slices(points).slice(1),
        fill: thinned(hue),
        tint: thinned(hue),
        opacity: 1,
      }),
    );
/** The line a series draws along its top. */
const ridge = (
  points: readonly Point3[],
  hue: string,
): readonly Scenery[] =>
  points.length < 2
    ? []
    : [
        {
          kind: "line",
          layer: "sorted",
          tone: hue,
          width: 2,
          points,
        },
      ];
const ranges = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  Array.from({ length: rows(a) }, (_, j) =>
    series(a, nodes, j),
  ).flatMap((points, j) => [
    ...filled(points, hueOf(j)),
    ...ridge(points, hueOf(j)),
  ]);
/** The name of each series beside it, in its colour. */
const seriesNames = (
  a: Area,
): readonly Scenery[] =>
  pipe(
    a.deep,
    matchOption(
      (): readonly Scenery[] => [],
      (d: Axis) => [
        ...d.values.map((name, j) =>
          lettering(
            {
              x: halfAcross(a),
              y: floor,
              z: deepAt(a, j),
            },
            { x: 30, y: 4 },
            "■ " + name,
            600,
            hueOf(j),
          ),
        ),
        lettering(
          {
            x: halfAcross(a),
            y: floor,
            z: halfDeep(a),
          },
          { x: 44, y: 26 },
          d.attribute,
          600,
          ink,
        ),
      ],
    ),
  );

/** Everything drawn around an area: the ground, the
 * ruling, the scale, the names, and each series as a
 * filled outline. */
export const areaScenery = (
  a: Area,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...strokes(trace, false, ruling(a)),
  ...strokes(pencil, false, ground(a)),
  ...ranges(a, nodes),
  ...scale(a),
  ...acrossNames(a),
  ...seriesNames(a),
  ...crown(a, valuesOf(a, nodes).map(marked(a))),
];

/** Points that bound the area with room for the scale
 * and the names. */
export const areaExtent = barsExtent;
/** The lines of the DSL that say the area. */
export const areaLines = (
  a: Area,
): readonly (readonly string[])[] =>
  fieldLines("area")(
    a.listed ? { ...a, deep: none() } : a,
  );
/** Whether the series stand one behind another. */
export const areaDeep = (a: Area): boolean =>
  isSome(a.deep);
