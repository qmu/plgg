import {
  pipe,
  none,
  some,
  chainOption,
  matchOption,
  type Option,
} from "plgg";
import {
  clip,
  side,
  withNext,
  type Pair,
} from "plgg-board/geometry";
import type {
  Drawing,
  Fill,
} from "plgg-board/drawing";
import type { Interval } from "plgg-board/visibility";
import type { Point3 } from "plgg-board/index";

type Loop = readonly Point3[];

const area = (points: Loop): number =>
  withNext(points).reduce(
    (sum, [p, q]) => sum + p.x * q.y - q.x * p.y,
    0,
  ) / 2;

/** A painted face with its screen box and signed area. */
type Patch = Fill &
  Readonly<{
    left: number;
    right: number;
    top: number;
    bottom: number;
    area: number;
  }>;
const patch = (f: Fill): Patch => ({
  ...f,
  left: Math.min(...f.points.map((p) => p.x)),
  right: Math.max(...f.points.map((p) => p.x)),
  top: Math.min(...f.points.map((p) => p.y)),
  bottom: Math.max(...f.points.map((p) => p.y)),
  area: area(f.points),
});

const apart = (f: Patch, g: Patch): boolean =>
  f.id === g.id ||
  f.left >= g.right ||
  g.left >= f.right ||
  f.top >= g.bottom ||
  g.top >= f.bottom ||
  !g.area;

/** One piece being cut by a convex face, edge by edge:
 * what is still inside, what has fallen outside, and
 * whether the piece turned out not to be touched. */
type Carving = Readonly<{
  inside: Loop;
  outside: readonly Loop[];
  untouched: boolean;
}>;
const kept = (
  s: Carving,
  part: Loop,
  inside: Loop,
): Carving => ({
  inside,
  outside:
    part.length >= 3
      ? [...s.outside, part]
      : s.outside,
  untouched: inside.length < 3,
});
const carveEdge =
  (sign: number) =>
  (s: Carving, [a, b]: Pair<Point3>): Carving =>
    s.untouched
      ? s
      : kept(
          s,
          clip(
            s.inside,
            (p) => -(sign * side(a, b, p)),
          ),
          clip(
            s.inside,
            (p) => sign * side(a, b, p),
          ),
        );
const settled =
  (piece: Loop) =>
  (s: Carving): readonly Loop[] =>
    s.untouched ? [piece] : s.outside;
/** What is left of a piece once a later face is painted
 * over it. */
const carve =
  (g: Patch) =>
  (piece: Loop): readonly Loop[] =>
    pipe(
      withNext(g.points).reduce(
        carveEdge(Math.sign(g.area)),
        {
          inside: piece,
          outside: [],
          untouched: false,
        },
      ),
      settled(piece),
    );

const uncovered = (
  f: Patch,
  later: readonly Patch[],
): readonly Loop[] =>
  later.reduce(
    (pieces: readonly Loop[], g) =>
      pieces.length === 0 || apart(f, g)
        ? pieces
        : pieces.flatMap(carve(g)),
    [f.points],
  );

type Share = Readonly<{
  id: string;
  area: number;
  covered: number;
}>;
const share = (
  f: Patch,
  later: readonly Patch[],
): Share => ({
  id: f.id,
  area: Math.abs(f.area),
  covered: Math.max(
    0,
    Math.abs(f.area) -
      uncovered(f, later).reduce(
        (s, p) => s + Math.abs(area(p)),
        0,
      ),
  ),
});
const fraction =
  (shares: readonly Share[]) => (id: string) =>
    pipe(
      shares
        .filter((s) => s.id === id)
        .reduce(
          (t, s) => ({
            area: t.area + s.area,
            covered: t.covered + s.covered,
          }),
          { area: 0, covered: 0 },
        ),
      (t) => ({
        id,
        fraction: t.covered / t.area,
      }),
    );
const fractions = (
  shares: readonly Share[],
): readonly Readonly<{
  id: string;
  fraction: number;
}>[] =>
  [...new Set(shares.map((s) => s.id))].map(
    fraction(shares),
  );
const shares = (
  faces: readonly Patch[],
): readonly Share[] =>
  faces.flatMap((f, i) =>
    f.area ? [share(f, faces.slice(i + 1))] : [],
  );

/** How much of each item is painted over by what comes
 * after it. BSP emits convex faces back to front, and
 * later faces are subtracted in that order, so two
 * foreground cards never double-count a pixel. */
export const coveredFractions = (
  drawing: Drawing,
): readonly Readonly<{
  id: string;
  fraction: number;
}>[] =>
  fractions(shares(drawing.fills.map(patch)));

const within = (i: Interval): Option<Interval> =>
  i.lo >= i.hi ? none() : some(i);
const crossed = (
  i: Interval,
  start: number,
  end: number,
): Option<Interval> =>
  start <= 0 && end <= 0
    ? none()
    : within({
        lo:
          start < 0
            ? Math.max(
                i.lo,
                start / (start - end),
              )
            : i.lo,
        hi:
          end < 0
            ? Math.min(
                i.hi,
                start / (start - end),
              )
            : i.hi,
      });
const crossEdge =
  (sign: number, from: Point3, to: Point3) =>
  (
    state: Option<Interval>,
    [a, b]: Pair<Point3>,
  ): Option<Interval> =>
    pipe(
      state,
      chainOption((i: Interval) =>
        crossed(
          i,
          sign * side(a, b, from),
          sign * side(a, b, to),
        ),
      ),
    );

/** Whether a screen-space wire passes over a visible
 * face, irrespective of which is nearer. */
export const crossesFill = (
  from: Point3,
  to: Point3,
  polygon: readonly Point3[],
): boolean =>
  pipe(
    withNext(polygon).reduce(
      crossEdge(
        Math.sign(area(polygon)),
        from,
        to,
      ),
      some({ lo: 0, hi: 1 }),
    ),
    matchOption(
      () => false,
      (i: Interval) => i.hi > i.lo,
    ),
  );
