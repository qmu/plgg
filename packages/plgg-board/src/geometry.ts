import type {
  Point,
  Point3,
} from "plgg-board/index";
export const epsilon = 1e-8;
export const dot = (
  a: Point3,
  b: Point3,
): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const sub = (
  a: Point3,
  b: Point3,
): Point3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const shift = (
  p: Point3,
  d: Point3,
  t: number,
): Point3 => ({
  x: p.x + t * d.x,
  y: p.y + t * d.y,
  z: p.z + t * d.z,
});
export const mix = (
  a: Point3,
  b: Point3,
  t: number,
): Point3 => ({
  x: a.x + t * (b.x - a.x),
  y: a.y + t * (b.y - a.y),
  z: a.z + t * (b.z - a.z),
});
export const cross = (
  a: Point3,
  b: Point3,
): Point3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const over = (p: Point3, n: number): Point3 => ({
  x: p.x / n,
  y: p.y / n,
  z: p.z / n,
});
export const unit = (p: Point3): Point3 =>
  over(p, Math.hypot(p.x, p.y, p.z) || 1);
export const side = (
  a: Point,
  b: Point,
  p: Point,
): number =>
  (b.x - a.x) * (p.y - a.y) -
  (b.y - a.y) * (p.x - a.x);

/** Two neighbours on a closed loop. */
export type Pair<T> = readonly [T, T];

/** Each element with the one BEFORE it; the first with
 * the last. The loop is closed, the order is kept. */
export const withPrev = <T>(
  xs: readonly T[],
): readonly Pair<T>[] =>
  [...xs.slice(-1), ...xs.slice(0, -1)].flatMap(
    (prev, i) =>
      xs
        .slice(i, i + 1)
        .map((x): Pair<T> => [prev, x]),
  );

/** Each element with the one AFTER it; the last with
 * the first. */
export const withNext = <T>(
  xs: readonly T[],
): readonly Pair<T>[] =>
  [...xs.slice(1), ...xs.slice(0, 1)].flatMap(
    (next, i) =>
      xs
        .slice(i, i + 1)
        .map((x): Pair<T> => [x, next]),
  );

/** The whole numbers from `lo` to `hi`, both included. */
export const span = (
  lo: number,
  hi: number,
): readonly number[] =>
  Array.from(
    { length: Math.max(0, hi - lo + 1) },
    (_, i) => lo + i,
  );

/** A walk round a loop against one plane: the point
 * just left, how far it was from the plane, and what
 * has been kept. */
type Clipping = Readonly<{
  a: Point3;
  da: number;
  out: readonly Point3[];
}>;
const stepped = (
  s: Clipping,
  b: Point3,
  db: number,
): Clipping => ({
  a: b,
  da: db,
  out:
    s.da * db < 0
      ? db >= 0
        ? [
            ...s.out,
            mix(s.a, b, s.da / (s.da - db)),
            b,
          ]
        : [
            ...s.out,
            mix(s.a, b, s.da / (s.da - db)),
          ]
      : db >= 0
        ? [...s.out, b]
        : s.out,
});

/** The part of a loop on the non-negative side of
 * `distance` (Sutherland–Hodgman, one plane). */
export const clip = (
  points: readonly Point3[],
  distance: (p: Point3) => number,
): readonly Point3[] =>
  points
    .slice(-1)
    .flatMap(
      (last) =>
        points.reduce(
          (s: Clipping, b) =>
            stepped(s, b, distance(b)),
          {
            a: last,
            da: distance(last),
            out: [],
          },
        ).out,
    );
