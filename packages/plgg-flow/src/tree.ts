import {
  pipe,
  ok,
  err,
  fromNullable,
  chainOption,
  matchOption,
  isSome,
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
import {
  ink,
  lettering,
  shown,
  valueOn,
} from "plgg-flow/plot";

/**
 * THE TREE: what a whole is made of, level under level.
 *
 * A connection says "this is made of that": its source
 * is the parent, its target the child. A parent stands
 * over its children, AS WIDE AS THEY ARE TOGETHER — so a
 * level reads across as the shares of the level above.
 * With an amount named, a leaf is as wide as its amount
 * and a parent is the sum of what is under it; without
 * one, every leaf counts the same. Each level stands a
 * step nearer the eye, so the tree turned is a flight of
 * terraces.
 *
 *   layout tree
 *   axis 人数
 *   会社 -> 開発
 *   会社 -> 営業
 *   node 開発 人数=12
 *   node 営業 人数=8
 */
export type Tree = Readonly<{
  /** The amount a leaf is as wide as, when one is
   * named. */
  amount: Option<Axis>;
}>;

/** World units: how wide the whole tree is, how far
 * from a level to the next, how tall a box is, and the
 * gap kept between neighbours. */
const wide = 760;
const drop = 96;
const tall = 36;
const gap = 8;
const step = 44;

const things = (
  graph: Graph,
): readonly FlowNode[] =>
  graph.nodes.filter((n) => !n.group);
/** A node's children, in the order their connections
 * were written. */
const childrenOf = (
  graph: Graph,
  id: string,
): readonly FlowNode[] =>
  graph.edges
    .filter((e) => e.source === id)
    .flatMap((e) =>
      things(graph).filter(
        (n) => n.id === e.target,
      ),
    );
const roots = (
  graph: Graph,
): readonly FlowNode[] =>
  things(graph).filter(
    (n) =>
      !graph.edges.some(
        (e) =>
          e.target === n.id && e.source !== n.id,
      ),
  );
/** Everything under a set of nodes, themselves with
 * them; a node already met is not entered again. */
const under = (
  graph: Graph,
  from: readonly FlowNode[],
  met: readonly string[],
): readonly string[] =>
  from.reduce(
    (seen: readonly string[], n: FlowNode) =>
      seen.includes(n.id)
        ? seen
        : under(graph, childrenOf(graph, n.id), [
            ...seen,
            n.id,
          ]),
    met,
  );

/** The tree a set of axis lines describes over a graph;
 * a refusal says what is wrong. */
export const asTree = (
  axes: readonly Axis[],
  graph: Graph,
): Result<Tree, string> =>
  axes.length > 1
    ? err(
        "layout tree の軸は 1 つまでです（葉の幅にする量）",
      )
    : pipe(
        fromNullable(
          things(graph).filter(
            (n) =>
              graph.edges.filter(
                (e) => e.target === n.id,
              ).length > 1,
          )[0],
        ),
        matchOption(
          (): Result<Tree, string> =>
            pipe(
              fromNullable(
                things(graph).filter(
                  (n) =>
                    !under(
                      graph,
                      roots(graph),
                      [],
                    ).includes(n.id),
                )[0],
              ),
              matchOption(
                (): Result<Tree, string> =>
                  ok({
                    amount: fromNullable(axes[0]),
                  }),
                (lost: FlowNode) =>
                  err(
                    "layout tree: " +
                      lost.id +
                      " をたどると元に戻ります（親子は輪にできません）",
                  ),
              ),
            ),
          (shared: FlowNode) =>
            err(
              "layout tree: " +
                shared.id +
                " に親が 2 つあります（親は 1 つまでです）",
            ),
        ),
      );

/** What a node counts for: a leaf its amount — or one,
 * with no amount named — and a parent what is under it. */
const weight = (
  tree: Tree,
  graph: Graph,
  node: FlowNode,
): number =>
  childrenOf(graph, node.id).length === 0
    ? pipe(
        tree.amount,
        chainOption((a: Axis) =>
          valueOn(a.attribute)(node),
        ),
        matchOption(
          () => (isSome(tree.amount) ? 0 : 1),
          (v: number) => Math.max(0, v),
        ),
      )
    : childrenOf(graph, node.id).reduce(
        (sum: number, c: FlowNode) =>
          sum + weight(tree, graph, c),
        0,
      );
const whole = (
  tree: Tree,
  graph: Graph,
): number =>
  roots(graph).reduce(
    (sum: number, n: FlowNode) =>
      sum + weight(tree, graph, n),
    0,
  );
/** Where a node stands among its siblings: which level,
 * and how much of the whole lies to its left. */
type Stand = Readonly<{
  node: FlowNode;
  level: number;
  before: number;
}>;
const stands = (
  tree: Tree,
  graph: Graph,
  siblings: readonly FlowNode[],
  level: number,
  before: number,
): readonly Stand[] =>
  siblings.flatMap((node, i) =>
    pipe(
      before +
        siblings
          .slice(0, i)
          .reduce(
            (sum: number, s: FlowNode) =>
              sum + weight(tree, graph, s),
            0,
          ),
      (left: number): readonly Stand[] => [
        { node, level, before: left },
        ...stands(
          tree,
          graph,
          childrenOf(graph, node.id),
          level + 1,
          left,
        ),
      ],
    ),
  );
const every = (
  tree: Tree,
  graph: Graph,
): readonly Stand[] =>
  stands(tree, graph, roots(graph), 0, 0);
const unit = (
  tree: Tree,
  graph: Graph,
): number =>
  whole(tree, graph) === 0
    ? 0
    : wide / whole(tree, graph);
const deepest = (
  tree: Tree,
  graph: Graph,
): number =>
  Math.max(
    0,
    ...every(tree, graph).map((s) => s.level),
  );
const centreOf = (
  tree: Tree,
  graph: Graph,
  s: Stand,
): Point3 => ({
  x:
    -wide / 2 +
    (s.before + weight(tree, graph, s.node) / 2) *
      unit(tree, graph),
  y: (s.level - deepest(tree, graph) / 2) * drop,
  z: (s.level - deepest(tree, graph) / 2) * step,
});

/** The graph with every node under its parent, as wide
 * as what it counts for. */
export const treeGraph = (
  tree: Tree,
  graph: Graph,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map((node) =>
    pipe(
      fromNullable(
        every(tree, graph).filter(
          (s) => s.node.id === node.id,
        )[0],
      ),
      matchOption(
        (): FlowNode => node,
        (s: Stand): FlowNode => ({
          ...node,
          width: Math.max(
            6,
            weight(tree, graph, node) *
              unit(tree, graph) -
              gap,
          ),
          height: tall,
          bare: true,
          unnamed: true,
          position: centreOf(tree, graph, s),
        }),
      ),
    ),
  ),
});

/** Under each box: its name, and — when an amount is
 * named — what it counts for and its share of the whole. */
export const treeScenery = (
  tree: Tree,
  graph: Graph,
): readonly Scenery[] =>
  every(tree, graph).map((s) =>
    lettering(
      {
        ...centreOf(tree, graph, s),
        y:
          centreOf(tree, graph, s).y +
          tall / 2 +
          12,
      },
      { x: 0, y: 4 },
      s.node.label +
        (isSome(tree.amount)
          ? " " +
            shown(weight(tree, graph, s.node)) +
            (whole(tree, graph) > 0 && s.level > 0
              ? "（" +
                Math.round(
                  (weight(tree, graph, s.node) /
                    whole(tree, graph)) *
                    100,
                ) +
                "%）"
              : "")
          : ""),
      600,
      ink,
    ),
  );

/** Points that bound a tree with room for its names. */
export const treeExtent = (
  tree: Tree,
  graph: Graph,
): readonly Point3[] =>
  [-1, 1].map((side) => ({
    x: side * (wide / 2 + 30),
    y:
      side *
      ((deepest(tree, graph) / 2) * drop +
        tall +
        20),
    z: side * (deepest(tree, graph) / 2) * step,
  }));
/** The lines of the DSL that say a tree. */
export const treeLines = (
  tree: Tree,
): readonly (readonly string[])[] => [
  ["layout", "tree"],
  ...pipe(
    tree.amount,
    matchOption(
      (): readonly (readonly string[])[] => [],
      (a: Axis) => [
        ["axis", a.attribute, ...a.values],
      ],
    ),
  ),
];
/** A tree is first seen head-on, as it is usually drawn;
 * turned, its levels come apart as terraces. */
export const treeDeep = (_: Tree): boolean =>
  false;
