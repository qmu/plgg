import { nodeSize } from "plgg-flow/nodeSize";
import {
  moveExpandingParents,
  subtree,
} from "plgg-flow/hierarchy";
import type { Point, Point3 } from "plgg-board";
import type { Graph } from "./model";
export type Movement = Readonly<{
  axis?: keyof Point3;
  bounds?: Readonly<{ min: Point3; max: Point3 }>;
  avoidOverlap?: boolean;
  magnet?: number;
}>;
/** Constrain a rigid translation; descendants share the same final delta. */
export const constrainedDelta = (
  graph: Graph,
  moving: ReadonlySet<string>,
  anchor: string,
  raw: Point3,
  rules: Movement,
): Point3 => {
  const nodes = graph.nodes.filter((n) =>
      moving.has(n.id),
    ),
    others = graph.nodes.filter(
      (n) => !moving.has(n.id) && !n.hidden,
    );
  const d = { ...raw },
    root = nodes.find((n) => n.id === anchor);
  if (rules.magnet && root) {
    for (const axis of [
      "x",
      "y",
    ] satisfies (keyof Point3)[]) {
      const target =
        root.position[axis] + d[axis];
      let closest = rules.magnet,
        correction = 0;
      for (const n of others) {
        const diff = n.position[axis] - target;
        if (Math.abs(diff) < closest) {
          closest = Math.abs(diff);
          correction = diff;
        }
      }
      d[axis] += correction;
    }
  }
  const parents = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  for (const axis of [
    "x",
    "y",
    "z",
  ] satisfies (keyof Point3)[]) {
    if (rules.axis && axis !== rules.axis) {
      d[axis] = 0;
      continue;
    }
    let min = -Infinity,
      max = Infinity;
    for (const n of nodes) {
      const half =
        axis === "x"
          ? nodeSize(n).width / 2
          : axis === "y"
            ? nodeSize(n).height / 2
            : 0;
      if (rules.bounds) {
        min = Math.max(
          min,
          rules.bounds.min[axis] -
            n.position[axis] +
            half,
        );
        max = Math.min(
          max,
          rules.bounds.max[axis] -
            n.position[axis] -
            half,
        );
      }
      if (
        axis === "z" ||
        n.extent !== "parent" ||
        n.parent === undefined ||
        moving.has(n.parent)
      )
        continue;
      const parent = parents.get(n.parent);
      if (
        !parent ||
        (n.expandParent && !parent.locked)
      )
        continue;
      const room =
        (axis === "x"
          ? nodeSize(parent).width
          : nodeSize(parent).height) /
          2 -
        half;
      const offset =
        parent.position[axis] - n.position[axis];
      min = Math.max(min, offset - room);
      max = Math.min(max, offset + room);
    }
    d[axis] =
      min > max
        ? 0
        : Math.max(min, Math.min(max, d[axis]));
  }
  if (rules.avoidOverlap)
    for (const n of nodes)
      for (const target of others) {
        if (
          target.group ||
          n.group ||
          target.parent !== n.parent
        )
          continue;
        const distance = (delta: Point3) =>
          Math.max(
            Math.abs(
              n.position.x +
                delta.x -
                target.position.x,
            ) -
              (nodeSize(n).width +
                nodeSize(target).width) /
                2,
            Math.abs(
              n.position.y +
                delta.y -
                target.position.y,
            ) -
              (nodeSize(n).height +
                nodeSize(target).height) /
                2,
            Math.abs(
              n.position.z +
                delta.z -
                target.position.z,
            ) - 18,
          );
        if (
          distance(d) <
          Math.min(
            0,
            distance({ x: 0, y: 0, z: 0 }),
          )
        )
          return { x: 0, y: 0, z: 0 };
      }
  return d;
};
/** Even/odd hit test of a projected point against a closed selection stroke. */
export const insideLasso = (
  point: Point,
  vertices: readonly Point[],
): boolean => {
  let inside = false;
  for (
    let i = 0, j = vertices.length - 1;
    i < vertices.length;
    j = i++
  ) {
    const a = vertices[i],
      b = vertices[j];
    if (!a || !b) continue;
    if (
      a.y > point.y !== b.y > point.y &&
      point.x <
        ((b.x - a.x) * (point.y - a.y)) /
          (b.y - a.y) +
          a.x
    )
      inside = !inside;
  }
  return inside;
};

export const moveWithinConstraints = (
  graph: Graph,
  roots: readonly string[],
  delta: Point3,
  rules: Movement = {},
) =>
  moveExpandingParents(
    graph.nodes,
    roots,
    constrainedDelta(
      graph,
      subtree(graph.nodes, roots),
      roots[0] ?? "",
      delta,
      rules,
    ),
  );
