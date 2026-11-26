import {
  pipe,
  none,
  some,
  fromNullable,
  chainOption,
  mapOption,
  type Option,
} from "plgg";
import type {
  Point,
  Point3,
} from "plgg-board/index";
import {
  epsilon,
  side,
  span,
  withNext,
  type Pair,
} from "plgg-board/geometry";
import type { Face } from "plgg-board/bsp";

export type Bounds = Readonly<{
  left: number;
  right: number;
  top: number;
  bottom: number;
}>;
const nowhere: Bounds = {
  left: Infinity,
  right: -Infinity,
  top: Infinity,
  bottom: -Infinity,
};
export const bounds = (
  points: readonly Point[],
): Bounds =>
  points.reduce(
    (b: Bounds, p): Bounds => ({
      left: Math.min(b.left, p.x),
      right: Math.max(b.right, p.x),
      top: Math.min(b.top, p.y),
      bottom: Math.max(b.bottom, p.y),
    }),
    nowhere,
  );
export const overlaps = (
  a: Bounds,
  b: Bounds,
): boolean =>
  a.right >= b.left &&
  a.left <= b.right &&
  a.bottom >= b.top &&
  a.top <= b.bottom;
export const segmentBounds = (
  a: Point,
  b: Point,
): Bounds => ({
  left: Math.min(a.x, b.x),
  right: Math.max(a.x, b.x),
  top: Math.min(a.y, b.y),
  bottom: Math.max(a.y, b.y),
});

/** A screen half-plane: `x·X + y·Y + c ≥ 0` is inside. */
export type Plane = Readonly<{
  x: number;
  y: number;
  c: number;
}>;
export const planeAt = (
  e: Plane,
  p: Point,
): number => e.x * p.x + e.y * p.y + e.c;

/** A visible face on the screen: its outline, the
 * half-planes that bound it, and its depth as an affine
 * function of the screen position. */
export type Surface = Readonly<{
  face: Face;
  points: readonly Point3[];
  planes: readonly Plane[];
  dx: number;
  dy: number;
  c: number;
  box: Bounds;
}>;

const planeThrough = (
  x: number,
  y: number,
  p: Point,
): Plane => ({ x, y, c: -x * p.x - y * p.y });

const edgePlane =
  (sign: number) =>
  ([p, q]: Pair<Point3>): Plane =>
    planeThrough(
      sign * (p.y - q.y),
      sign * (q.x - p.x),
      p,
    );

const sloped = (
  face: Face,
  points: readonly Point3[],
  a: Point3,
  dx: number,
  dy: number,
  sign: number,
): Surface => ({
  face,
  points,
  planes: withNext(points).map(edgePlane(sign)),
  dx,
  dy,
  c: a.z - dx * a.x - dy * a.y,
  box: bounds(points),
});

const spanned = (
  face: Face,
  points: readonly Point3[],
  a: Point3,
  b: Point3,
  c: Point3,
  area: number,
): Surface =>
  sloped(
    face,
    points,
    a,
    ((b.z - a.z) * (c.y - a.y) -
      (c.z - a.z) * (b.y - a.y)) /
      area,
    ((b.x - a.x) * (c.z - a.z) -
      (c.x - a.x) * (b.z - a.z)) /
      area,
    Math.sign(area),
  );

const farthest = (
  points: readonly Point3[],
  a: Point3,
  b: Point3,
): Point3 =>
  points.reduce(
    (best, p) =>
      Math.abs(side(a, b, p)) >
      Math.abs(side(a, b, best))
        ? p
        : best,
    a,
  );

const through = (
  face: Face,
  points: readonly Point3[],
  a: Point3,
  b: Point3,
  c: Point3,
): Surface =>
  spanned(face, points, a, b, c, side(a, b, c));

/** The surface of a projected face; none when the loop
 * has no edge to stand on. */
export const surface = (
  face: Face,
  points: readonly Point3[],
): Option<Surface> =>
  pipe(
    fromNullable(points[0]),
    chainOption((a: Point3) =>
      pipe(
        fromNullable(points[1]),
        mapOption((b: Point3) =>
          through(
            face,
            points,
            a,
            b,
            farthest(points, a, b),
          ),
        ),
      ),
    ),
  );

export const inside = (
  s: Surface,
  p: Point,
): boolean =>
  s.planes.every(
    (e) => planeAt(e, p) >= -epsilon,
  );
export const depth = (
  s: Surface,
  p: Point,
): number => s.dx * p.x + s.dy * p.y + s.c;

/** A stretch of a segment, as parameters 0…1. */
export type Interval = Readonly<{
  lo: number;
  hi: number;
}>;
const open = (i: Interval): Option<Interval> =>
  i.lo >= i.hi ? none() : some(i);
const narrowed = (
  i: Interval,
  u: number,
  v: number,
): Option<Interval> =>
  u < 0 && v < 0
    ? none()
    : open(
        u < 0
          ? {
              lo: Math.max(i.lo, u / (u - v)),
              hi: i.hi,
            }
          : v < 0
            ? {
                lo: i.lo,
                hi: Math.min(i.hi, u / (u - v)),
              }
            : i,
      );
const behind = (
  za: number,
  zb: number,
): Option<Interval> =>
  za <= 0 && zb <= 0
    ? none()
    : some(
        za <= 0
          ? { lo: za / (za - zb), hi: 1 }
          : zb <= 0
            ? { lo: 0, hi: za / (za - zb) }
            : { lo: 0, hi: 1 },
      );

/** The stretch of the segment a→b that lies behind the
 * surface, if any. */
export const hidden = (
  a: Point3,
  b: Point3,
  s: Surface,
): Option<Interval> =>
  s.planes.reduce(
    (state: Option<Interval>, e) =>
      pipe(
        state,
        chainOption((i: Interval) =>
          narrowed(
            i,
            planeAt(e, a),
            planeAt(e, b),
          ),
        ),
      ),
    behind(
      depth(s, a) - a.z - epsilon,
      depth(s, b) - b.z - epsilon,
    ),
  );

/** What can be placed on the grid: anything with a box. */
type Boxed = Readonly<{ box: Bounds }>;
/** The cells a box reaches, as inclusive index ranges. */
type Cells = Readonly<{
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}>;
const cellIndex = (v: number): number =>
  Math.max(0, Math.min(15, Math.floor(v)));
const cellsOf =
  (
    left: number,
    top: number,
    sx: number,
    sy: number,
  ) =>
  (b: Bounds): Cells => ({
    x0: cellIndex((b.left - left) * sx),
    x1: cellIndex((b.right - left) * sx),
    y0: cellIndex((b.top - top) * sy),
    y1: cellIndex((b.bottom - top) * sy),
  });
const holds = (
  c: Cells,
  x: number,
  y: number,
): boolean =>
  x >= c.x0 &&
  x <= c.x1 &&
  y >= c.y0 &&
  y <= c.y1;

/** Every item of the cells a box reaches, each once, in
 * the order the grid holds them (row by row). */
const touching = <T>(
  table: readonly (readonly T[])[],
  c: Cells,
): readonly T[] => [
  ...new Set(
    span(c.y0, c.y1).flatMap((y) =>
      span(c.x0, c.x1).flatMap((x) =>
        table
          .slice(y * 16 + x, y * 16 + x + 1)
          .flat(),
      ),
    ),
  ),
];

const lookup =
  <T extends Boxed>(
    cells: (b: Bounds) => Cells,
    table: readonly (readonly T[])[],
  ) =>
  (box: Bounds): readonly T[] =>
    touching(table, cells(box)).filter((item) =>
      overlaps(box, item.box),
    );

const tabled = <T extends Boxed>(
  cells: (b: Bounds) => Cells,
  placed: readonly Readonly<{
    item: T;
    at: Cells;
  }>[],
): ((box: Bounds) => readonly T[]) =>
  lookup(
    cells,
    span(0, 255).map((n) =>
      placed
        .filter((p) =>
          holds(p.at, n % 16, Math.floor(n / 16)),
        )
        .map((p) => p.item),
    ),
  );

const gridOver = <T extends Boxed>(
  items: readonly T[],
  cells: (b: Bounds) => Cells,
): ((box: Bounds) => readonly T[]) =>
  tabled(
    cells,
    items.map((item) => ({
      item,
      at: cells(item.box),
    })),
  );

const scaled = <T extends Boxed>(
  items: readonly T[],
  left: number,
  top: number,
): ((box: Bounds) => readonly T[]) =>
  gridOver(
    items,
    cellsOf(
      left,
      top,
      16 /
        (Math.max(
          ...items.map((i) => i.box.right),
        ) - left || 1),
      16 /
        (Math.max(
          ...items.map((i) => i.box.bottom),
        ) - top || 1),
    ),
  );

/** A bounded 16×16 screen grid, so long or nearly
 * edge-on geometry stays inexpensive. It answers a box
 * with the items whose box overlaps it — each once, in
 * the order the grid holds them. */
export const grid = <T extends Boxed>(
  items: readonly T[],
): ((box: Bounds) => readonly T[]) =>
  scaled(
    items,
    Math.min(...items.map((i) => i.box.left)),
    Math.min(...items.map((i) => i.box.top)),
  );
