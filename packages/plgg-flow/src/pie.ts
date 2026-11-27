import {
  pipe,
  ok,
  err,
  fromNullable,
  chainOption,
  matchOption,
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
  ink,
  lettering,
  shown,
} from "plgg-flow/plot";
import { hueOf } from "plgg-flow/area";

/**
 * THE PIE: what share of a whole each thing is.
 *
 * Every node is a slice, as wide as its amount is of the
 * total. A node may list several amounts — one for each
 * round: a year, a plan, a place — and then there is a
 * disc a round, side by side, so a slice is followed from
 * one disc to the next. A DISC IS AS LARGE AS ITS TOTAL
 * (its area, not its width), so the wholes are compared
 * as well as the shares.
 *
 *   layout pie
 *   axis 売上
 *   axis 年 2024 2025
 *   node 食品 売上=40,52
 *   node 衣料 売上=30,25
 */
export type Pie = Readonly<{
  /** The amount, as its line was written. */
  quantity: Axis;
  /** What the rounds are called, when it was said. */
  rounds: Option<Axis>;
  /** How many discs there were when it was read. */
  count: number;
}>;

/** World units: the largest disc's radius, and from the
 * centre of one disc to the next. */
const reach = 130;
const apart = 330;

const things = (
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  nodes.filter((n) => !n.group);

/** The amounts a node lists, as written. */
const written =
  (attribute: string) =>
  (node: FlowNode): readonly string[] =>
    pipe(
      fromNullable(node.data),
      chainOption((data: JsonObject) =>
        fromNullable(data[attribute]),
      ),
      matchOption(
        (): readonly string[] => [],
        (v: JsonValue) =>
          String(v)
            .split(",")
            .map((word) => word.trim()),
      ),
    );
/** A node's amount in a round; nothing counts as none. */
const amount = (
  pie: Pie,
  node: FlowNode,
  round: number,
): number =>
  pipe(
    fromNullable(
      written(pie.quantity.attribute)(node)[
        round
      ],
    ),
    matchOption(
      () => 0,
      (word: string) => Number(word),
    ),
  );
const sound = (word: string): boolean =>
  word !== "" &&
  Number.isFinite(Number(word)) &&
  Number(word) >= 0;

const pieOf = (
  quantity: Axis,
  rounds: Option<Axis>,
  nodes: readonly FlowNode[],
): Result<Pie, string> =>
  pipe(
    fromNullable(
      things(nodes).filter((n) =>
        written(quantity.attribute)(n).some(
          (word) => !sound(word),
        ),
      )[0],
    ),
    matchOption(
      (): Result<Pie, string> =>
        things(nodes).every(
          (n) =>
            written(quantity.attribute)(n)
              .length === 0,
        )
          ? err(
              "layout pie: どの node にも " +
                quantity.attribute +
                " の値がありません（node 食品 " +
                quantity.attribute +
                "=40 のように書きます）",
            )
          : ok({
              quantity,
              rounds,
              count: Math.max(
                1,
                ...things(nodes).map(
                  (n) =>
                    written(quantity.attribute)(n)
                      .length,
                ),
              ),
            }),
      (wrong: FlowNode): Result<Pie, string> =>
        err(
          "node " +
            wrong.id +
            " の " +
            quantity.attribute +
            " は 0 以上の数で書いてください",
        ),
    ),
  );

/** The pie a set of axis lines describes over a set of
 * nodes; a refusal says which line or node is wrong. */
export const asPie = (
  axes: readonly Axis[],
  nodes: readonly FlowNode[],
): Result<Pie, string> =>
  axes.length > 2
    ? err(
        "layout pie の軸は 2 つまでです（量と、円を分ける軸）",
      )
    : pipe(
        fromNullable(axes[0]),
        matchOption(
          (): Result<Pie, string> =>
            err(
              "layout pie には量の軸が 1 つ必要です（axis 売上 のように書きます）",
            ),
          (quantity: Axis) =>
            pieOf(
              quantity,
              fromNullable(axes[1]),
              nodes,
            ),
        ),
      );

/** The whole of a round. */
const total = (
  pie: Pie,
  nodes: readonly FlowNode[],
  round: number,
): number =>
  things(nodes).reduce(
    (sum: number, n: FlowNode) =>
      sum + amount(pie, n, round),
    0,
  );
const rounds = (pie: Pie): readonly number[] =>
  Array.from(
    { length: pie.count },
    (_: unknown, k: number) => k,
  );
const largest = (
  pie: Pie,
  nodes: readonly FlowNode[],
): number =>
  Math.max(
    0,
    ...rounds(pie).map((k) =>
      total(pie, nodes, k),
    ),
  );
/** A disc's radius: its AREA is its share of the
 * largest whole. */
const radius = (
  pie: Pie,
  nodes: readonly FlowNode[],
  round: number,
): number =>
  largest(pie, nodes) === 0
    ? reach
    : reach *
      Math.sqrt(
        total(pie, nodes, round) /
          largest(pie, nodes),
      );
const centre = (
  pie: Pie,
  round: number,
): number =>
  (round - (pie.count - 1) / 2) * apart;

/** The share of the whole that comes before the `j`-th
 * thing, and the share it is, in a round. */
const before = (
  pie: Pie,
  nodes: readonly FlowNode[],
  round: number,
  j: number,
): number =>
  total(pie, nodes, round) === 0
    ? 0
    : things(nodes)
        .slice(0, j)
        .reduce(
          (sum: number, n: FlowNode) =>
            sum + amount(pie, n, round),
          0,
        ) / total(pie, nodes, round);
const share = (
  pie: Pie,
  nodes: readonly FlowNode[],
  round: number,
  node: FlowNode,
): number =>
  total(pie, nodes, round) === 0
    ? 0
    : amount(pie, node, round) /
      total(pie, nodes, round);

/** The point a share of the way round a disc: from
 * straight up, clockwise (the screen's y runs down). */
const around = (
  pie: Pie,
  round: number,
  turn: number,
  out: number,
): Point3 => ({
  x:
    centre(pie, round) +
    Math.cos(-Math.PI / 2 + 2 * Math.PI * turn) *
      out,
  y:
    Math.sin(-Math.PI / 2 + 2 * Math.PI * turn) *
    out,
  z: 0,
});
/** The rim of a slice, in steps fine enough to read as
 * a curve. */
const rim = (
  pie: Pie,
  round: number,
  from: number,
  wide: number,
  out: number,
): readonly Point3[] =>
  Array.from(
    {
      length:
        Math.max(1, Math.ceil(wide * 72)) + 1,
    },
    (_: unknown, i: number) =>
      around(
        pie,
        round,
        from +
          (wide * i) /
            Math.max(1, Math.ceil(wide * 72)),
        out,
      ),
  );
/** A slice as sheets: three-cornered pieces from the
 * centre to the rim. */
const pieces = (
  hub: Point3,
  edge: readonly Point3[],
): readonly (readonly Point3[])[] =>
  edge.flatMap((p, i) =>
    edge
      .slice(i + 1, i + 2)
      .map((q): readonly Point3[] => [hub, p, q]),
  );
const slice = (
  pie: Pie,
  nodes: readonly FlowNode[],
  round: number,
  j: number,
  node: FlowNode,
): readonly Scenery[] =>
  share(pie, nodes, round, node) === 0
    ? []
    : [
        ...pieces(
          around(pie, round, 0, 0),
          rim(
            pie,
            round,
            before(pie, nodes, round, j),
            share(pie, nodes, round, node),
            radius(pie, nodes, round),
          ),
        )
          .slice(0, 1)
          .map(
            (first): Scenery => ({
              kind: "plane",
              layer: "sorted",
              tone: "transparent",
              width: 0,
              points: first,
              patches: pieces(
                around(pie, round, 0, 0),
                rim(
                  pie,
                  round,
                  before(pie, nodes, round, j),
                  share(pie, nodes, round, node),
                  radius(pie, nodes, round),
                ),
              ).slice(1),
              fill: hueOf(j),
              tint: hueOf(j),
              opacity: 0.82,
            }),
          ),
        {
          kind: "line",
          layer: "sorted",
          tone: ink,
          width: 1,
          points: [
            around(pie, round, 0, 0),
            ...rim(
              pie,
              round,
              before(pie, nodes, round, j),
              share(pie, nodes, round, node),
              radius(pie, nodes, round),
            ),
            around(pie, round, 0, 0),
          ],
        },
        lettering(
          around(
            pie,
            round,
            before(pie, nodes, round, j) +
              share(pie, nodes, round, node) / 2,
            radius(pie, nodes, round) + 34,
          ),
          { x: 0, y: 4 },
          Math.round(
            share(pie, nodes, round, node) * 100,
          ) + "%",
          600,
          ink,
        ),
      ];

/** Under each disc: what round it is, and its whole. */
const captions = (
  pie: Pie,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  rounds(pie).map((k) =>
    lettering(
      { x: centre(pie, k), y: reach + 76, z: 0 },
      { x: 0, y: 4 },
      pipe(
        pie.rounds,
        chainOption((a: Axis) =>
          fromNullable(a.values[k]),
        ),
        matchOption(
          () =>
            pie.count > 1 ? k + 1 + " " : "",
          (name: string) => name + " ",
        ),
      ) +
        "計 " +
        shown(total(pie, nodes, k)),
      600,
      ink,
    ),
  );
const edge = (pie: Pie): number =>
  centre(pie, pie.count - 1) + reach;
/** The name of each thing, in its colour, down the side. */
const names = (
  pie: Pie,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  things(nodes).map((node, j) =>
    lettering(
      {
        x: edge(pie) + 110,
        y: -reach + 20 + j * 40,
        z: 0,
      },
      { x: 0, y: 4 },
      "■ " + node.label,
      600,
      hueOf(j),
    ),
  );

/** Everything drawn around a pie: each round's slices
 * with their shares, what each disc is, and whose slice
 * is whose. */
export const pieScenery = (
  pie: Pie,
  nodes: readonly FlowNode[],
): readonly Scenery[] => [
  ...rounds(pie).flatMap((k) =>
    things(nodes).flatMap((node, j) =>
      slice(pie, nodes, k, j, node),
    ),
  ),
  ...captions(pie, nodes),
  ...names(pie, nodes),
];

/** The side of the mark a slice is held by. */
const dot = 6;
/** The graph with every node a mark in the middle of its
 * slice of the first disc. */
export const pieGraph = (
  pie: Pie,
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
          position: around(
            pie,
            0,
            before(
              pie,
              graph.nodes,
              0,
              things(graph.nodes).indexOf(node),
            ) +
              share(pie, graph.nodes, 0, node) /
                2,
            share(pie, graph.nodes, 0, node) === 0
              ? 0
              : radius(pie, graph.nodes, 0) * 0.6,
          ),
        },
  ),
});

/** Points that bound a pie with room for its names. */
export const pieExtent = (
  pie: Pie,
): readonly Point3[] => [
  {
    x: centre(pie, 0) - reach * 1.4,
    y: -reach * 1.4,
    z: 0,
  },
  {
    x: edge(pie) + 220,
    y: reach * 1.8,
    z: 0,
  },
];
/** The lines of the DSL that say a pie. */
export const pieLines = (
  pie: Pie,
): readonly (readonly string[])[] => [
  ["layout", "pie"],
  [
    "axis",
    pie.quantity.attribute,
    ...pie.quantity.values,
  ],
  ...pipe(
    pie.rounds,
    matchOption(
      (): readonly (readonly string[])[] => [],
      (a: Axis) => [
        ["axis", a.attribute, ...a.values],
      ],
    ),
  ),
];
/** A pie is flat: it is seen head-on. */
export const pieDeep = (_: Pie): boolean => false;
