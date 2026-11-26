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
  ink,
  lettering,
  pencil,
  shown,
} from "plgg-flow/plot";

/**
 * THE SANKEY: how much goes where.
 *
 * Every connection carries a quantity and is drawn as a
 * band that wide; every node is as tall as what passes
 * through it. Nodes stand in columns, each one step
 * further along than whatever feeds it. The first axis
 * names the attribute on the connections that says how
 * much; a second, when written, sets nodes apart in
 * DEPTH — so a quantity that crosses from one side to
 * another is seen crossing.
 *
 *   layout sankey
 *   axis 量
 *   収入 -> 人件費 量=60
 *   収入 -> 設備 量=25
 */
export type Sankey = Readonly<{
  quantity: string;
  depth: Option<Axis>;
}>;

/** World units: from column to column, between nodes of
 * a column, between depths, the width of a node, and
 * the height the fullest column is drawn at. */
const stride = 220;
const gap = 28;
const apart = 180;
const wide = 18;
const tall = 260;

const finite = (n: number): Option<number> =>
  Number.isFinite(n) && n >= 0 ? some(n) : none();
/** How much a connection carries, when it says. */
const carried =
  (quantity: string) =>
  (edge: Edge): Option<number> =>
    pipe(
      fromNullable(edge.data),
      chainOption((data: JsonObject) =>
        fromNullable(data[quantity]),
      ),
      chainOption(
        (v: JsonValue): Option<number> =>
          typeof v === "number"
            ? finite(v)
            : typeof v === "string" &&
                v.trim() !== ""
              ? finite(Number(v))
              : none(),
      ),
    );
const amount = (s: Sankey, edge: Edge): number =>
  pipe(carried(s.quantity)(edge), getOr(0));

/** The sankey a set of axis lines describes over a
 * graph; a refusal names the connection that does not
 * say how much. */
export const asSankey = (
  axes: readonly Axis[],
  graph: Graph,
): Result<Sankey, string> =>
  axes.length > 2
    ? err(
        "layout sankey の軸は 2 つまでです（量の属性と、奥行きを分ける属性）",
      )
    : pipe(
        fromNullable(axes[0]),
        matchOption(
          (): Result<Sankey, string> =>
            err(
              "layout sankey には、接続の量を表す属性の軸が必要です（例: axis 量）",
            ),
          (quantity: Axis) =>
            pipe(
              fromNullable(
                graph.edges.find(
                  (e) =>
                    !isSome(
                      carried(quantity.attribute)(
                        e,
                      ),
                    ),
                ),
              ),
              matchOption(
                (): Result<Sankey, string> =>
                  ok({
                    quantity: quantity.attribute,
                    depth: fromNullable(axes[1]),
                  }),
                (e: Edge) =>
                  err(
                    e.source +
                      " -> " +
                      e.target +
                      " に " +
                      quantity.attribute +
                      " の数値がありません",
                  ),
              ),
            ),
        ),
      );

const standing = (
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  nodes.filter((n) => !n.group);
type Steps = ReadonlyMap<string, number>;
const stepOf = (
  steps: Steps,
  id: string,
): number =>
  pipe(fromNullable(steps.get(id)), getOr(0));
/** One pass: every node at least one step past whatever
 * feeds it, never past the number of nodes (a loop
 * would otherwise run for ever). */
const advanced = (
  edges: readonly Edge[],
  limit: number,
  steps: Steps,
): Steps =>
  edges.reduce(
    (found: Steps, e: Edge): Steps =>
      e.source === e.target ||
      stepOf(found, e.target) >
        stepOf(found, e.source) ||
      stepOf(found, e.source) + 1 > limit
        ? found
        : new Map([
            ...found,
            [
              e.target,
              stepOf(found, e.source) + 1,
            ],
          ]),
    steps,
  );
/** The column of every node: as many steps along as its
 * longest way in. */
const columns = (graph: Graph): Steps =>
  standing(graph.nodes).reduce(
    (steps: Steps): Steps =>
      advanced(
        graph.edges,
        standing(graph.nodes).length - 1,
        steps,
      ),
    new Map(),
  );

const sum = (values: readonly number[]): number =>
  values.reduce((a, b) => a + b, 0);
const into = (
  graph: Graph,
  id: string,
): readonly Edge[] =>
  graph.edges.filter((e) => e.target === id);
const outOf = (
  graph: Graph,
  id: string,
): readonly Edge[] =>
  graph.edges.filter((e) => e.source === id);
/** What passes through a node: the larger of what comes
 * in and what goes out. */
const through = (
  s: Sankey,
  graph: Graph,
  id: string,
): number =>
  Math.max(
    sum(into(graph, id).map((e) => amount(s, e))),
    sum(
      outOf(graph, id).map((e) => amount(s, e)),
    ),
  );
const inColumn = (
  graph: Graph,
  steps: Steps,
  column: number,
): readonly FlowNode[] =>
  standing(graph.nodes).filter(
    (n) => stepOf(steps, n.id) === column,
  );
const last = (steps: Steps): number =>
  Math.max(0, ...steps.values());
const columnsOf = (
  steps: Steps,
): readonly number[] =>
  Array.from(
    { length: last(steps) + 1 },
    (_, i) => i,
  );
/** World units per unit of quantity: the fullest column
 * is as tall as the chart. */
const unit = (
  s: Sankey,
  graph: Graph,
  steps: Steps,
): number =>
  tall /
  Math.max(
    1e-9,
    ...columnsOf(steps).map((c) =>
      sum(
        inColumn(graph, steps, c).map((n) =>
          through(s, graph, n.id),
        ),
      ),
    ),
  );
const heightOf = (
  s: Sankey,
  graph: Graph,
  steps: Steps,
  id: string,
): number =>
  Math.max(
    4,
    through(s, graph, id) * unit(s, graph, steps),
  );
/** The height of a column with the gaps between its
 * nodes. */
const columnHeight = (
  s: Sankey,
  graph: Graph,
  steps: Steps,
  column: number,
): number =>
  sum(
    inColumn(graph, steps, column).map(
      (n) =>
        heightOf(s, graph, steps, n.id) + gap,
    ),
  ) - gap;
/** The top of a node: under everything above it in its
 * column, the column centred. */
const topOf = (
  s: Sankey,
  graph: Graph,
  steps: Steps,
  node: FlowNode,
): number =>
  -columnHeight(
    s,
    graph,
    steps,
    stepOf(steps, node.id),
  ) /
    2 +
  sum(
    inColumn(graph, steps, stepOf(steps, node.id))
      .slice(
        0,
        inColumn(
          graph,
          steps,
          stepOf(steps, node.id),
        ).indexOf(node),
      )
      .map(
        (n) =>
          heightOf(s, graph, steps, n.id) + gap,
      ),
  );
const centred = (
  i: number,
  count: number,
  width: number,
): number => (i - (count - 1) / 2) * width;
const depthOf = (
  s: Sankey,
  node: FlowNode,
): number =>
  pipe(
    s.depth,
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
                  centred(
                    axis.values.indexOf(
                      String(v),
                    ),
                    axis.values.length,
                    apart,
                  ),
                ),
        ),
      ),
    ),
    getOr(0),
  );

const stood =
  (s: Sankey, graph: Graph, steps: Steps) =>
  (node: FlowNode): FlowNode =>
    node.group
      ? node
      : {
          ...node,
          width: wide,
          height: heightOf(
            s,
            graph,
            steps,
            node.id,
          ),
          depth: wide / 2,
          bare: true,
          position: {
            x: centred(
              stepOf(steps, node.id),
              last(steps) + 1,
              stride,
            ),
            y:
              topOf(s, graph, steps, node) +
              heightOf(s, graph, steps, node.id) /
                2,
            z: depthOf(s, node),
          },
        };

/** The band of a connection: where it leaves its source
 * and where it enters its target, each a span down the
 * node's flank under the bands before it. */
type Band = Readonly<{
  edge: Edge;
  from: Point3;
  to: Point3;
  width: number;
}>;
const flank = (
  node: FlowNode,
  side: number,
  before: number,
): Point3 => ({
  x: node.position.x + (side * wide) / 2,
  y:
    node.position.y -
    pipe(fromNullable(node.height), getOr(0)) /
      2 +
    before,
  z: node.position.z,
});
const bands = (
  s: Sankey,
  placed: Graph,
  scale: number,
): readonly Band[] =>
  placed.edges.flatMap((edge) =>
    pipe(
      fromNullable(
        placed.nodes.find(
          (n) => n.id === edge.source,
        ),
      ),
      chainOption((source: FlowNode) =>
        pipe(
          fromNullable(
            placed.nodes.find(
              (n) => n.id === edge.target,
            ),
          ),
          mapOption(
            (target: FlowNode): Band => ({
              edge,
              width: amount(s, edge) * scale,
              from: flank(
                source,
                1,
                sum(
                  outOf(placed, source.id)
                    .slice(
                      0,
                      outOf(
                        placed,
                        source.id,
                      ).indexOf(edge),
                    )
                    .map(
                      (e) => amount(s, e) * scale,
                    ),
                ),
              ),
              to: flank(
                target,
                -1,
                sum(
                  into(placed, target.id)
                    .slice(
                      0,
                      into(
                        placed,
                        target.id,
                      ).indexOf(edge),
                    )
                    .map(
                      (e) => amount(s, e) * scale,
                    ),
                ),
              ),
            }),
          ),
        ),
      ),
      matchOption(
        (): readonly Band[] => [],
        (band: Band) => [band],
      ),
    ),
  );
const midway = (
  p: Point3,
  width: number,
): Point3 => ({
  ...p,
  y: p.y + width / 2,
});
/** Each connection drawn along the middle of its band. */
const threaded =
  (found: readonly Band[]) =>
  (edge: Edge): Edge =>
    pipe(
      fromNullable(
        found.find((b) => b.edge === edge),
      ),
      matchOption(
        () => edge,
        (b: Band): Edge => ({
          ...edge,
          path: [
            midway(b.from, b.width),
            midway(b.to, b.width),
          ],
        }),
      ),
    );
const scaleOf = (
  s: Sankey,
  graph: Graph,
): number => unit(s, graph, columns(graph));
const laid = (
  s: Sankey,
  graph: Graph,
  steps: Steps,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map(stood(s, graph, steps)),
});
const wired = (
  s: Sankey,
  placed: Graph,
  scale: number,
): Graph => ({
  ...placed,
  edges: placed.edges.map(
    threaded(bands(s, placed, scale)),
  ),
});
/** The graph with every node in its column, as tall as
 * what passes through it, and every connection along
 * the middle of its band. */
export const sankeyGraph = (
  s: Sankey,
  graph: Graph,
): Graph =>
  wired(
    s,
    laid(s, graph, columns(graph)),
    scaleOf(s, graph),
  );

/** A band as lines laid side by side across its
 * width — both edges and the ruling between them — so
 * its width reads the same on any paper. */
const ruled = (b: Band): number =>
  Math.max(1, Math.round(b.width / 5));
const lowered = (
  b: Band,
  k: number,
): readonly Point3[] => [
  {
    ...b.from,
    y: b.from.y + (b.width * k) / ruled(b),
  },
  {
    ...b.to,
    y: b.to.y + (b.width * k) / ruled(b),
  },
];
const sheet = (b: Band): Scenery => ({
  kind: "line",
  layer: "behind",
  tone: pencil,
  width: 1,
  points: lowered(b, 0),
  strokes: Array.from(
    { length: ruled(b) },
    (_, k) => lowered(b, k + 1),
  ),
});
/** How much passes through each node, written under it. */
const amounts = (
  s: Sankey,
  graph: Graph,
): readonly Scenery[] =>
  standing(graph.nodes).map((n) =>
    lettering(
      {
        ...n.position,
        y:
          n.position.y +
          pipe(fromNullable(n.height), getOr(0)) /
            2,
        // clear of the body, or the body hides it
        z: n.position.z + wide / 2 + 2,
      },
      { x: 0, y: 14 },
      shown(through(s, graph, n.id)),
      400,
      pencil,
    ),
  );
const leftmost = (
  nodes: readonly FlowNode[],
): number =>
  Math.min(
    0,
    ...standing(nodes).map((n) => n.position.x),
  );
const highest = (
  nodes: readonly FlowNode[],
): number =>
  Math.min(
    0,
    ...standing(nodes).map(
      (n) =>
        n.position.y -
        pipe(fromNullable(n.height), getOr(0)) /
          2,
    ),
  );
/** The name of each depth, beside the row it holds. */
const depths = (
  s: Sankey,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  pipe(
    s.depth,
    matchOption(
      (): readonly Scenery[] => [],
      (axis: Axis) =>
        axis.values.map((value, i) =>
          lettering(
            {
              x: leftmost(nodes) - stride * 0.5,
              y: 0,
              z: centred(
                i,
                axis.values.length,
                apart,
              ),
            },
            { x: 0, y: 4 },
            value,
            600,
            ink,
          ),
        ),
    ),
  );
/** Everything drawn around a sankey: the bands, how
 * much passes through each node, and the names of the
 * depths. */
export const sankeyScenery = (
  s: Sankey,
  graph: Graph,
): readonly Scenery[] => [
  ...bands(s, graph, scaleOf(s, graph)).map(
    sheet,
  ),
  ...amounts(s, graph),
  ...depths(s, graph.nodes),
  lettering(
    {
      x: leftmost(graph.nodes),
      y: highest(graph.nodes),
      z: 0,
    },
    { x: 0, y: -34 },
    "帯の太さ: " + s.quantity,
    400,
    pencil,
  ),
];

/** Points that bound a sankey with room for its names. */
export const sankeyExtent = (
  graph: Graph,
): readonly Point3[] =>
  standing(graph.nodes).flatMap((n) => [
    {
      ...n.position,
      x: n.position.x - stride * 0.7,
      y: highest(graph.nodes) - 56,
    },
    {
      ...n.position,
      x: n.position.x + stride * 0.4,
      y:
        n.position.y +
        pipe(fromNullable(n.height), getOr(0)) /
          2 +
        36,
    },
  ]);

/** The lines of the DSL that say a sankey. */
export const sankeyLines = (
  s: Sankey,
): readonly (readonly string[])[] => [
  ["layout", "sankey"],
  ["axis", s.quantity],
  ...pipe(
    s.depth,
    matchOption(
      (): readonly (readonly string[])[] => [],
      (axis: Axis) => [
        ["axis", axis.attribute, ...axis.values],
      ],
    ),
  ),
];
/** Whether nodes stand at more than one depth. */
export const sankeyDeep = (s: Sankey): boolean =>
  pipe(
    s.depth,
    matchOption(
      () => false,
      (axis: Axis) => axis.values.length > 1,
    ),
  );
