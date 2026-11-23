import type { Point } from "plgg-board";
import type { Box } from "./wireGeometry";

export type Bounds = Omit<Box, "id">;
export const corridor = (
  points: readonly Point[],
  margin: number,
): Bounds => {
  let l = Infinity,
    r = -Infinity,
    t = Infinity,
    b = -Infinity;
  for (const p of points) {
    l = Math.min(l, p.x);
    r = Math.max(r, p.x);
    t = Math.min(t, p.y);
    b = Math.max(b, p.y);
  }
  return {
    l: l - margin,
    r: r + margin,
    t: t - margin,
    b: b + margin,
  };
};
export const intersects = (
  a: Bounds,
  b: Bounds,
) =>
  a.l <= b.r &&
  a.r >= b.l &&
  a.t <= b.b &&
  a.b >= b.t;

// A connected chain of overlapping corridors can share a lane.
export const components = <
  T extends { bounds: Bounds },
>(
  entries: readonly T[],
) => {
  const remaining = new Set(entries);
  const result: T[][] = [];
  for (const first of remaining) {
    remaining.delete(first);
    const group = [first];
    for (const current of group) {
      for (const next of remaining) {
        if (
          !intersects(current.bounds, next.bounds)
        )
          continue;
        remaining.delete(next);
        group.push(next);
      }
    }
    result.push(group);
  }
  return result;
};
