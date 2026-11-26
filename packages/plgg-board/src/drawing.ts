import {
  pipe,
  none,
  some,
  fromNullable,
  chainOption,
  matchOption,
  type Option,
} from "plgg";
import {
  mix,
  withNext,
} from "plgg-board/geometry";
import type {
  Point3,
  Point,
} from "plgg-board/index";
import {
  grid,
  segmentBounds,
  type Interval,
  type Bounds,
} from "plgg-board/visibility";
export type Tone = "up" | "lit" | "shade";
export type Fill = Readonly<{
  id: string;
  style: string;
  tone: Tone;
  points: readonly Point3[];
}>;
export type Ink = Readonly<{
  id: string;
  style: string;
  kind:
    | "silhouette"
    | "crease"
    | "hidden"
    | "line";
  outline?: boolean;
  points: readonly [Point3, Point3];
}>;
export type Matrix = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type DrawMark = Readonly<{
  id: string;
  style: string;
  kind: "hole" | "gap" | "mark";
  point: Point3;
  matrix: Matrix;
  covered: boolean;
  receiver?: string;
  strokeIndex?: number;
}>;
export type DrawLabel = Readonly<{
  clear?: boolean;
  id: string;
  style: string;
  text: string;
  point: Point3;
  matrix: Matrix;
  box: Bounds;
  covered: boolean;
}>;
export type Shadow = Readonly<{
  id: string;
  style: string;
  receiver: string;
  points: readonly Point3[];
}>;
export type Drawing = Readonly<{
  fills: readonly Fill[];
  strokes: readonly Ink[];
  marks: readonly DrawMark[];
  labels: readonly DrawLabel[];
  shadows: readonly Shadow[];
}>;

/** The first that answers. */
const otherwise =
  <T>(next: () => Option<T>) =>
  (first: Option<T>): Option<T> =>
    pipe(
      first,
      matchOption(next, (v: T) => some(v)),
    );

const labelAt = (
  d: Drawing,
  p: Point,
): Option<string> =>
  pipe(
    fromNullable(
      [...d.labels]
        .reverse()
        .find(
          (l) =>
            !l.covered &&
            p.x >= l.box.left &&
            p.x <= l.box.right &&
            p.y >= l.box.top &&
            p.y <= l.box.bottom,
        ),
    ),
    chainOption((l: DrawLabel) => some(l.id)),
  );

/** The nearest thing found so far under the pointer. */
type Nearest = Readonly<{
  depth: number;
  id: Option<string>;
}>;
const markHit = (
  [a, b, c, e, x, y]: Matrix,
  p: Point,
  det: number,
): boolean =>
  Math.abs(det) >= 1e-8 &&
  ((e * (p.x - x) - c * (p.y - y)) / det) ** 2 +
    ((a * (p.y - y) - b * (p.x - x)) / det) **
      2 <=
    4;
const overMark =
  (p: Point) =>
  (best: Nearest, m: DrawMark): Nearest =>
    !m.covered &&
    m.kind !== "gap" &&
    m.point.z >= best.depth &&
    markHit(
      m.matrix,
      p,
      m.matrix[0] * m.matrix[3] -
        m.matrix[1] * m.matrix[2],
    )
      ? { depth: m.point.z, id: some(m.id) }
      : best;
/** How far along a→b the foot of the pointer falls. */
const along = (
  a: Point3,
  b: Point3,
  p: Point,
): number =>
  Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * (b.x - a.x) +
        (p.y - a.y) * (b.y - a.y)) /
        ((b.x - a.x) * (b.x - a.x) +
          (b.y - a.y) * (b.y - a.y) || 1),
    ),
  );
const strokeHit = (
  best: Nearest,
  s: Ink,
  [a, b]: readonly [Point3, Point3],
  p: Point,
  t: number,
): Nearest =>
  a.z + t * (b.z - a.z) > best.depth &&
  Math.hypot(
    p.x - a.x - t * (b.x - a.x),
    p.y - a.y - t * (b.y - a.y),
  ) <= 1
    ? {
        depth: a.z + t * (b.z - a.z),
        id: some(s.id),
      }
    : best;
const overStroke =
  (p: Point) =>
  (best: Nearest, s: Ink): Nearest =>
    s.kind === "line"
      ? strokeHit(
          best,
          s,
          s.points,
          p,
          along(s.points[0], s.points[1], p),
        )
      : best;
const inkAt = (
  d: Drawing,
  p: Point,
): Option<string> =>
  d.strokes.reduce(
    overStroke(p),
    d.marks.reduce(overMark(p), {
      depth: -Infinity,
      id: none(),
    }),
  ).id;

const turns = (
  f: Fill,
  p: Point,
): readonly number[] =>
  withNext(f.points).map(
    ([a, b]) =>
      (b.x - a.x) * (p.y - a.y) -
      (b.y - a.y) * (p.x - a.x),
  );
const within = (
  crosses: readonly number[],
): boolean =>
  crosses.some((c) => c > 1e-8) !==
  crosses.some((c) => c < -1e-8);
const fillAt = (
  d: Drawing,
  p: Point,
): Option<string> =>
  pipe(
    fromNullable(
      [...d.fills]
        .reverse()
        .find((f) => within(turns(f, p))),
    ),
    chainOption((f: Fill) => some(f.id)),
  );

/** What is under a screen point: a label first, then
 * the nearest mark or wire, then the topmost face. */
export const pick = (
  d: Drawing,
  p: Point,
): Option<string> =>
  pipe(
    labelAt(d, p),
    otherwise(() => inkAt(d, p)),
    otherwise(() => fillAt(d, p)),
  );

/** A label's cleared area. */
type Clearance = Readonly<{
  id: string;
  box: Bounds;
}>;
const clearance = (l: DrawLabel): Clearance => ({
  id: l.id,
  box: {
    left: l.box.left - 2,
    right: l.box.right + 2,
    top: l.box.top - 2,
    bottom: l.box.bottom + 2,
  },
});

const whole: Interval = { lo: 0, hi: 1 };
/** Narrow the stretch inside a box along one axis. */
const slab = (
  state: Option<Interval>,
  start: number,
  delta: number,
  min: number,
  max: number,
): Option<Interval> =>
  pipe(
    state,
    chainOption(
      (i: Interval): Option<Interval> =>
        delta
          ? some({
              lo: Math.max(
                i.lo,
                Math.min(
                  (min - start) / delta,
                  (max - start) / delta,
                ),
              ),
              hi: Math.min(
                i.hi,
                Math.max(
                  (min - start) / delta,
                  (max - start) / delta,
                ),
              ),
            })
          : start < min || start > max
            ? none()
            : some(i),
    ),
  );
/** The stretch of a→b inside a box, if any. */
const boxed = (
  a: Point3,
  b: Point3,
  box: Bounds,
): readonly Interval[] =>
  pipe(
    slab(
      slab(
        some(whole),
        a.x,
        b.x - a.x,
        box.left,
        box.right,
      ),
      a.y,
      b.y - a.y,
      box.top,
      box.bottom,
    ),
    matchOption(
      (): readonly Interval[] => [],
      (i: Interval): readonly Interval[] =>
        i.lo < i.hi ? [i] : [],
    ),
  );

/** A sweep along a stroke: where it has reached, and
 * the stretches left standing. */
type Sweep = Readonly<{
  cursor: number;
  kept: readonly Interval[];
}>;
const sweep = (
  s: Sweep,
  cut: Interval,
): Sweep => ({
  cursor: Math.max(s.cursor, cut.hi),
  kept:
    cut.lo > s.cursor
      ? [...s.kept, { lo: s.cursor, hi: cut.lo }]
      : s.kept,
});
const standing = (
  s: Sweep,
): readonly Interval[] =>
  s.cursor < 1
    ? [...s.kept, { lo: s.cursor, hi: 1 }]
    : s.kept;
/** What is left of a stroke once the cleared areas of
 * other items' labels are cut out of it. */
const remaining = (
  query: (box: Bounds) => readonly Clearance[],
  s: Ink,
): readonly Interval[] =>
  standing(
    query(segmentBounds(s.points[0], s.points[1]))
      .flatMap((l) =>
        l.id === s.id
          ? []
          : boxed(
              s.points[0],
              s.points[1],
              l.box,
            ),
      )
      .sort((u, v) => u.lo - v.lo)
      .reduce(sweep, { cursor: 0, kept: [] }),
  );

/** One standing stretch of one original stroke. */
type Piece = Readonly<{
  stroke: Ink;
  index: number;
  k: number;
  at: Interval;
}>;
const pieces = (
  query: (box: Bounds) => readonly Clearance[],
  strokes: readonly Ink[],
): readonly Piece[] =>
  strokes.flatMap((stroke, index) =>
    remaining(query, stroke).map((at, k) => ({
      stroke,
      index,
      k,
      at,
    })),
  );
const inked = (p: Piece): Ink =>
  p.at.lo === 0 && p.at.hi === 1
    ? p.stroke
    : {
        ...p.stroke,
        points: [
          mix(
            p.stroke.points[0],
            p.stroke.points[1],
            p.at.lo,
          ),
          mix(
            p.stroke.points[0],
            p.stroke.points[1],
            p.at.hi,
          ),
        ],
      };

/** Where a gap mark sits along its stroke. */
const parameter = (
  [a, b]: readonly [Point3, Point3],
  m: DrawMark,
): number =>
  Math.abs(b.x - a.x) > Math.abs(b.y - a.y)
    ? (m.point.x - a.x) / (b.x - a.x)
    : (m.point.y - a.y) / (b.y - a.y);
/** A gap mark follows the stretch it sits on to that
 * stretch's new place; a mark whose stretch is gone
 * goes with it. */
const moved = (
  all: readonly Piece[],
  m: DrawMark,
  index: number,
  stroke: Ink,
): readonly DrawMark[] =>
  all
    .flatMap((p, position) =>
      p.index === index &&
      parameter(stroke.points, m) >= p.at.lo &&
      parameter(stroke.points, m) <= p.at.hi
        ? [position]
        : [],
    )
    .slice(-1)
    .map((position) => ({
      ...m,
      strokeIndex: position,
    }));
const remark =
  (
    strokes: readonly Ink[],
    all: readonly Piece[],
  ) =>
  (m: DrawMark): readonly DrawMark[] =>
    pipe(
      fromNullable(m.strokeIndex),
      chainOption((index: number) =>
        pipe(
          fromNullable(strokes[index]),
          chainOption((stroke: Ink) =>
            some(moved(all, m, index, stroke)),
          ),
        ),
      ),
      matchOption(
        (): readonly DrawMark[] => [m],
        (ms: readonly DrawMark[]) => ms,
      ),
    );

const recut = (
  drawing: Drawing,
  all: readonly Piece[],
): Drawing => ({
  ...drawing,
  strokes: all.map(inked),
  marks: drawing.marks.flatMap(
    remark(drawing.strokes, all),
  ),
});

const clearedOf = (
  drawing: Drawing,
  labels: readonly Clearance[],
): Drawing =>
  labels.length === 0
    ? drawing
    : recut(
        drawing,
        pieces(grid(labels), drawing.strokes),
      );

/** The drawing with every stroke cut where it would run
 * through the cleared area of another item's label. */
export const clearLabelStrokes = (
  drawing: Drawing,
  painted: readonly DrawLabel[] = drawing.labels,
): Drawing =>
  clearedOf(
    drawing,
    painted.filter((l) => l.clear).map(clearance),
  );
