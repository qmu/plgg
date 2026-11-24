import type {
  Point,
  Point3,
} from "plgg-board/index";
import {
  epsilon,
  side,
} from "plgg-board/geometry";
import type { Face } from "plgg-board/bsp";
export type Bounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
export const bounds = (
  points: readonly Point[],
): Bounds => {
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  for (const p of points) {
    left = Math.min(left, p.x);
    right = Math.max(right, p.x);
    top = Math.min(top, p.y);
    bottom = Math.max(bottom, p.y);
  }
  return { left, right, top, bottom };
};
export const overlaps = (a: Bounds, b: Bounds) =>
  a.right >= b.left &&
  a.left <= b.right &&
  a.bottom >= b.top &&
  a.top <= b.bottom;
export const segmentBounds = (
  a: Point,
  b: Point,
) => ({
  left: Math.min(a.x, b.x),
  right: Math.max(a.x, b.x),
  top: Math.min(a.y, b.y),
  bottom: Math.max(a.y, b.y),
});
export type Surface = ReturnType<typeof surface>;
export const surface = (
  face: Face,
  points: Point3[],
) => {
  const a = points[0]!,
    b = points[1]!;
  const c = points.reduce(
    (best, p) =>
      Math.abs(side(a, b, p)) >
      Math.abs(side(a, b, best))
        ? p
        : best,
    a,
  );
  const area = side(a, b, c),
    sign = Math.sign(area);
  const dx =
    ((b.z - a.z) * (c.y - a.y) -
      (c.z - a.z) * (b.y - a.y)) /
    area;
  const dy =
    ((b.x - a.x) * (c.z - a.z) -
      (c.x - a.x) * (b.z - a.z)) /
    area;
  const planes = points.map((p, i) => {
    const q = points[(i + 1) % points.length]!;
    const x = sign * (p.y - q.y),
      y = sign * (q.x - p.x);
    return { x, y, c: -x * p.x - y * p.y };
  });
  return {
    face,
    points,
    planes,
    dx,
    dy,
    c: a.z - dx * a.x - dy * a.y,
    box: bounds(points),
  };
};
export const inside = (s: Surface, p: Point) =>
  s.planes.every(
    (e) =>
      e.x * p.x + e.y * p.y + e.c >= -epsilon,
  );
export const depth = (s: Surface, p: Point) =>
  s.dx * p.x + s.dy * p.y + s.c;
export type Interval = { lo: number; hi: number };
export const hidden = (
  a: Point3,
  b: Point3,
  s: Surface,
): Interval | undefined => {
  let lo = 0,
    hi = 1;
  const za = depth(s, a) - a.z - epsilon,
    zb = depth(s, b) - b.z - epsilon;
  if (za <= 0 && zb <= 0) return;
  if (za <= 0) lo = za / (za - zb);
  else if (zb <= 0) hi = za / (za - zb);
  for (const e of s.planes) {
    const u = e.x * a.x + e.y * a.y + e.c,
      v = e.x * b.x + e.y * b.y + e.c;
    if (u < 0 && v < 0) return;
    if (u < 0) lo = Math.max(lo, u / (u - v));
    else if (v < 0)
      hi = Math.min(hi, u / (u - v));
    if (lo >= hi) return;
  }
  return { lo, hi };
};
// Bounded screen grid keeps long or nearly edge-on geometry inexpensive.
export const grid = <T extends { box: Bounds }>(
  items: T[],
) => {
  const cells: T[][] = Array.from(
      { length: 256 },
      () => [],
    ),
    seen = new Map<T, number>();
  let serial = 0;
  const left = Math.min(
      ...items.map((i) => i.box.left),
    ),
    top = Math.min(
      ...items.map((i) => i.box.top),
    );
  const sx =
      16 /
      (Math.max(
        ...items.map((i) => i.box.right),
      ) - left || 1),
    sy =
      16 /
      (Math.max(
        ...items.map((i) => i.box.bottom),
      ) - top || 1);
  const index = (v: number) =>
    Math.max(0, Math.min(15, Math.floor(v)));
  const visit = (
    b: Bounds,
    fn: (cell: T[]) => void,
  ) => {
    const x0 = index((b.left - left) * sx),
      x1 = index((b.right - left) * sx),
      y1 = index((b.bottom - top) * sy);
    for (
      let y = index((b.top - top) * sy);
      y <= y1;
      y++
    )
      for (let x = x0; x <= x1; x++)
        fn(cells[y * 16 + x]!);
  };
  for (const item of items)
    visit(item.box, (c) => c.push(item));
  return (box: Bounds, fn: (item: T) => void) => {
    serial++;
    visit(box, (cell) => {
      for (const item of cell)
        if (seen.get(item) !== serial) {
          seen.set(item, serial);
          if (overlaps(box, item.box)) fn(item);
        }
    });
  };
};
