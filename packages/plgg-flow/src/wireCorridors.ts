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

// A balanced tree rejects whole strips of distant obstacles.
export const boundsIndex = <T extends Bounds>(
  entries: readonly T[],
) => {
  const sorted = entries
    .map((box, i) => ({ box, i }))
    .sort((a, b) => a.box.l - b.box.l);
  type Branch = {
    bounds: Bounds;
    start: number;
    end: number;
    children: Branch[];
  };
  const build = (
    start: number,
    end: number,
  ): Branch => {
    const middle = Math.floor((start + end) / 2);
    const children =
      end - start > 6
        ? [
            build(start, middle),
            build(middle, end),
          ]
        : [];
    const boxes = children.length
      ? children.map((c) => c.bounds)
      : sorted
          .slice(start, end)
          .map((c) => c.box);
    return {
      start,
      end,
      children,
      bounds: {
        l: Math.min(...boxes.map((q) => q.l)),
        r: Math.max(...boxes.map((q) => q.r)),
        t: Math.min(...boxes.map((q) => q.t)),
        b: Math.max(...boxes.map((q) => q.b)),
      },
    };
  };
  const root = build(0, sorted.length);
  return (area: Bounds) => {
    const hits: typeof sorted = [];
    const visit = (branch: Branch) => {
      if (!intersects(branch.bounds, area))
        return;
      if (branch.children.length)
        branch.children.forEach(visit);
      else
        for (
          let i = branch.start;
          i < branch.end;
          i++
        ) {
          const item = sorted[i];
          if (item && intersects(item.box, area))
            hits.push(item);
        }
    };
    visit(root);
    return hits
      .sort((a, b) => a.i - b.i)
      .map((c) => c.box);
  };
};
