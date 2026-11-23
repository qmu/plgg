import type { Point, Point3 } from "plgg-board";
import type { Edge } from "./model";
import type { Side } from "./nodeBody";
import type { Wire } from "./wiring";
import {
  move,
  bezier,
  pt,
  required,
  distance,
} from "plgg-flow/wireGeometry";
// Shared tangents keep adjacent cubic spans smooth at each via point.
export const throughKnots = (
  knots: readonly Point[],
  source: Side,
  target: Side,
) => {
  const gentle: Point[] = [required(knots[0])];
  for (let i = 1; i < knots.length; i++) {
    const left = required(knots[i - 1]),
      right = required(knots[i]);
    const arm = distance(left, right) / 3;
    const tangent = (
      p: Point,
      prev: Point,
      next: Point,
      scale: number,
    ) => {
      const d = distance(prev, next) || 1;
      return pt(
        p.x + (scale * (next.x - prev.x)) / d,
        p.y + (scale * (next.y - prev.y)) / d,
      );
    };
    const prev = knots[i - 2],
      next = knots[i + 1];
    gentle.push(
      ...bezier(
        left,
        prev
          ? tangent(left, prev, right, arm)
          : move(left, source, arm),
        next
          ? tangent(right, left, next, -arm)
          : move(right, target, arm),
        right,
      ).slice(1),
    );
  }
  return gentle;
};
export const materialize = (
  edge: Edge,
  s: Point3 & { side: Side },
  t: Point3 & { side: Side },
  path: Point[],
  corners: number,
  dense = true,
): Wire => {
  const points: Point3[] = [s];
  const total = path.reduce(
    (sum, p, i) =>
      sum +
      (i
        ? distance(p, required(path[i - 1]))
        : 0),
    0,
  );
  let length = 0;
  if (edge.waypoints?.length)
    points.push(
      { ...move(s, s.side, 14), z: s.z },
      ...edge.waypoints,
      { ...move(t, t.side, 14), z: t.z },
      t,
    );
  else {
    for (let j = 1; j < path.length; j++) {
      const a = required(path[j - 1]),
        b = required(path[j]),
        d = distance(a, b),
        steps = dense
          ? Math.ceil(d / 12)
          : Number(d > 0);
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        points.push({
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          z:
            s.z +
            (t.z - s.z) *
              (total > 28
                ? Math.min(
                    1,
                    Math.max(
                      0,
                      (length + d * f - 14) /
                        (total - 28),
                    ),
                  )
                : (length + d * f) /
                  (total || 1)),
        });
      }
      length += d;
    }
    if (points.length === 1) points.push(t);
    points[points.length - 1] = t;
  }
  return {
    edge,
    sourceSide: s.side,
    targetSide: t.side,
    source: s,
    target: t,
    arrow: {
      at: t,
      toward: { ...move(t, t.side, -1), z: t.z },
    },

    points,
    corners,
  };
};
