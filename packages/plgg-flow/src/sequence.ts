import {
  pipe,
  ok,
  err,
  none,
  some,
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
  strokes,
  type Segment,
} from "plgg-flow/plot";

/**
 * THE SEQUENCE: who tells whom what, in the order told.
 *
 * Every node is a participant, standing in a row with a
 * lifeline dropping from it; every connection is a
 * message, drawn across at its turn, top to bottom. An
 * axis, when one is written, sets participants apart in
 * DEPTH by an attribute — the tiers of a system, the
 * sides of a boundary — so a message that crosses from
 * one to another is seen crossing.
 *
 *   layout sequence
 *   axis 層 利用者側 サーバー側
 *   node 画面 層=利用者側
 *   node API 層=サーバー側
 *   画面 -> API "注文する"
 */
export type Sequence = Readonly<{
  depth: Option<Axis>;
}>;

/** World units between lifelines, between messages, and
 * between depths. */
const gap = 208;
const step = 56;
const apart = 176;
/** From a participant down to its first message. */
const lead = 80;

export const asSequence = (
  axes: readonly Axis[],
): Result<Sequence, string> =>
  axes.length > 1
    ? err(
        "layout sequence の軸は 1 つまでです（奥行きを分ける属性）",
      )
    : ok({ depth: fromNullable(axes[0]) });

const participants = (
  nodes: readonly FlowNode[],
): readonly FlowNode[] =>
  nodes.filter((n) => !n.group);
/** The place of `i` among `count` things `width` apart,
 * centred on zero. */
const centred = (
  i: number,
  count: number,
  width: number,
): number => (i - (count - 1) / 2) * width;

/** How deep a participant stands: the place of its
 * value on the depth axis; the front when it has none. */
const depthOf = (
  sequence: Sequence,
  node: FlowNode,
): number =>
  pipe(
    sequence.depth,
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

/** The height everything hangs from, so the whole is
 * centred. */
const top = (messages: number): number =>
  -(lead + messages * step) / 2;
const standing = (
  sequence: Sequence,
  graph: Graph,
): ReadonlyMap<string, Point3> =>
  new Map(
    participants(graph.nodes).map(
      (n, i, all): readonly [string, Point3] => [
        n.id,
        {
          x: centred(i, all.length, gap),
          y: top(graph.edges.length),
          z: depthOf(sequence, n),
        },
      ],
    ),
  );
const turn = (
  messages: number,
  k: number,
): number => top(messages) + lead + k * step;

/** A message across, at its turn; one to oneself loops
 * out and back. */
const across = (
  from: Point3,
  to: Point3,
  y: number,
  same: boolean,
): readonly Point3[] =>
  same
    ? [
        { ...from, y },
        { ...from, x: from.x + 48, y },
        { ...from, x: from.x + 48, y: y + 20 },
        { ...from, y: y + 20 },
      ]
    : [
        { ...from, y },
        { ...to, y },
      ];
const told =
  (
    places: ReadonlyMap<string, Point3>,
    messages: number,
  ) =>
  (edge: Edge, k: number): Edge =>
    pipe(
      fromNullable(places.get(edge.source)),
      chainOption((from: Point3) =>
        pipe(
          fromNullable(places.get(edge.target)),
          mapOption(
            (to: Point3): Edge => ({
              ...edge,
              path: across(
                from,
                to,
                turn(messages, k),
                edge.source === edge.target,
              ),
            }),
          ),
        ),
      ),
      getOr(edge),
    );
const stood =
  (places: ReadonlyMap<string, Point3>) =>
  (node: FlowNode): FlowNode =>
    pipe(
      fromNullable(places.get(node.id)),
      matchOption(
        () => node,
        (position: Point3): FlowNode => ({
          ...node,
          position,
        }),
      ),
    );
const laid = (
  graph: Graph,
  places: ReadonlyMap<string, Point3>,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map(stood(places)),
  edges: graph.edges.map(
    told(places, graph.edges.length),
  ),
});
/** The graph with participants in their row and every
 * message drawn across at its turn. */
export const sequenceGraph = (
  sequence: Sequence,
  graph: Graph,
): Graph =>
  laid(graph, standing(sequence, graph));

/** How far down the lifelines run: one step past the
 * last message a participant's row implies. */
const foot = (
  nodes: readonly FlowNode[],
  messages: number,
): number =>
  Math.min(
    ...participants(nodes).map(
      (n) => n.position.y,
    ),
    0,
  ) +
  lead +
  messages * step;
const lifelines = (
  nodes: readonly FlowNode[],
  messages: number,
): readonly Segment[] =>
  participants(nodes).map(
    (n): Segment => [
      { ...n.position, y: n.position.y + 20 },
      { ...n.position, y: foot(nodes, messages) },
    ],
  );
const leftmost = (
  nodes: readonly FlowNode[],
): number =>
  Math.min(
    ...participants(nodes).map(
      (n) => n.position.x,
    ),
    0,
  );
/** The name of each depth, beside the row it holds. */
const depths = (
  sequence: Sequence,
  nodes: readonly FlowNode[],
): readonly Scenery[] =>
  pipe(
    sequence.depth,
    matchOption(
      (): readonly Scenery[] => [],
      (axis: Axis) =>
        axis.values.map((value, i) =>
          lettering(
            {
              x: leftmost(nodes) - gap * 0.75,
              y: Math.min(
                ...participants(nodes).map(
                  (n) => n.position.y,
                ),
                0,
              ),
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
/** Everything drawn around a sequence: the lifelines,
 * and the names of the depths. */
export const sequenceScenery = (
  sequence: Sequence,
  nodes: readonly FlowNode[],
  messages: number,
): readonly Scenery[] => [
  ...strokes(
    pencil,
    true,
    lifelines(nodes, messages),
  ),
  ...depths(sequence, nodes),
];

/** Points that bound a sequence, so that fitting the
 * view keeps its lifelines on the sheet. */
export const sequenceExtent = (
  nodes: readonly FlowNode[],
  messages: number,
): readonly Point3[] =>
  participants(nodes).flatMap((n) => [
    {
      ...n.position,
      x: leftmost(nodes) - gap * 1.1,
    },
    {
      ...n.position,
      x: n.position.x - gap / 2,
      y: n.position.y - 30,
    },
    {
      ...n.position,
      x: n.position.x + gap / 2,
      y: foot(nodes, messages) + 20,
    },
  ]);

/** The lines of the DSL that say a sequence. */
export const sequenceLines = (
  sequence: Sequence,
): readonly (readonly string[])[] => [
  ["layout", "sequence"],
  ...pipe(
    sequence.depth,
    matchOption(
      (): readonly (readonly string[])[] => [],
      (axis: Axis) => [
        ["axis", axis.attribute, ...axis.values],
      ],
    ),
  ),
];
/** Whether participants stand at more than one depth. */
export const sequenceDeep = (
  sequence: Sequence,
): boolean =>
  pipe(
    sequence.depth,
    matchOption(
      () => false,
      (axis: Axis) => axis.values.length > 1,
    ),
  );
