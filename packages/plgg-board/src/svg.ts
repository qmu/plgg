import {
  pipe,
  fromNullable,
  getOr,
  matchOption,
} from "plgg";
import type {
  Point,
  Point3,
} from "plgg-board/index";
import type {
  Drawing,
  DrawLabel,
  DrawMark,
  Ink,
} from "plgg-board/drawing";
import { mix, span } from "plgg-board/geometry";
import {
  bounds,
  type Bounds,
} from "plgg-board/visibility";
const escape = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const path = (points: readonly Point[]): string =>
  "M" +
  points.map((p) => p.x + " " + p.y).join("L");

/** A pen moving along a stroke: where it is, and what
 * it has drawn. */
type Pen = Readonly<{
  cursor: number;
  d: string;
}>;
const gapped =
  (a: Point3, b: Point3, len: number) =>
  (pen: Pen, t: number): Pen => ({
    cursor: Math.max(pen.cursor, t + 2 / len),
    d:
      t - 2 / len > pen.cursor
        ? pen.d +
          path([
            mix(a, b, pen.cursor),
            mix(a, b, t - 2 / len),
          ])
        : pen.d,
  });
const finished =
  (a: Point3, b: Point3) =>
  (pen: Pen): string =>
    pen.cursor < 1
      ? pen.d + path([mix(a, b, pen.cursor), b])
      : pen.d;
const broken = (
  [a, b]: readonly [Point3, Point3],
  cuts: readonly Point3[],
  len: number,
): string =>
  finished(
    a,
    b,
  )(
    cuts
      .map(
        (p) =>
          Math.hypot(p.x - a.x, p.y - a.y) / len,
      )
      .sort((u, v) => u - v)
      .reduce(gapped(a, b, len), {
        cursor: 0,
        d: "",
      }),
  );
const centreline = (
  s: Ink,
  cuts: readonly Point3[],
): string =>
  cuts.length === 0
    ? path(s.points)
    : broken(
        s.points,
        cuts,
        Math.hypot(
          s.points[1].x - s.points[0].x,
          s.points[1].y - s.points[0].y,
        ),
      );
/** The crossing gaps of each stroke that has any. */
const gapsOf = (
  marks: readonly DrawMark[],
): ReadonlyMap<number, readonly Point3[]> =>
  new Map(
    [
      ...new Set(
        marks.flatMap((m) =>
          pipe(
            fromNullable(m.strokeIndex),
            matchOption(
              (): readonly number[] => [],
              (i: number): readonly number[] => [
                i,
              ],
            ),
          ),
        ),
      ),
    ].map((index) => [
      index,
      marks
        .filter((m) => m.strokeIndex === index)
        .map((m) => m.point),
    ]),
  );
const drawn =
  (
    strokes: readonly Ink[],
    gaps: ReadonlyMap<number, readonly Point3[]>,
  ) =>
  (index: number): string =>
    strokes
      .slice(index, index + 1)
      .map((s) =>
        centreline(
          s,
          pipe(
            fromNullable(gaps.get(index)),
            getOr<readonly Point3[]>([]),
          ),
        ),
      )
      .join("");

/** SVG centrelines with the engine's crossing gaps cut
 * from the farther stroke. */
export const strokePath = (
  drawing: Drawing,
): ((index: number) => string) =>
  drawn(drawing.strokes, gapsOf(drawing.marks));

const shape = (
  id: string,
  style: string,
  kind: string,
  d: string,
): string =>
  '<path data-id="' +
  escape(id) +
  '" class="' +
  escape(style + " " + kind) +
  '" d="' +
  d +
  '"/>';

const alike = (a: Ink, b: Ink): boolean =>
  a.id === b.id &&
  a.style === b.style &&
  a.kind === b.kind;
/** Where a run of strokes of one item begins. */
const heads = (
  strokes: readonly Ink[],
): readonly number[] =>
  strokes.flatMap((s, i) =>
    strokes
      .slice(Math.max(0, i - 1), i)
      .some((prev) => alike(prev, s))
      ? []
      : [i],
  );
/** Consecutive strokes of one item, as one path each. */
const batches = (
  strokes: readonly Ink[],
  stroke: (index: number) => string,
  starts: readonly number[],
): readonly string[] =>
  starts.flatMap((start, n) =>
    [...starts.slice(n + 1), strokes.length]
      .slice(0, 1)
      .flatMap((end) =>
        strokes.slice(start, start + 1).map((s) =>
          shape(
            s.id,
            s.style,
            s.kind,
            span(start, end - 1)
              .map(stroke)
              .join(""),
          ),
        ),
      ),
  );

const dot = (m: DrawMark): string =>
  '<circle data-id="' +
  escape(m.id) +
  '" class="' +
  escape(m.style + " " + m.kind) +
  '" transform="matrix(' +
  m.matrix.join(" ") +
  ')" r="2"/>';
const words = (l: DrawLabel): string =>
  '<text data-id="' +
  escape(l.id) +
  '" class="' +
  escape(
    l.style +
      (l.covered ? " covered" : " visible"),
  ) +
  '" transform="matrix(' +
  l.matrix.join(" ") +
  ')">' +
  escape(l.text) +
  "</text>";

const extent = (drawing: Drawing): Bounds =>
  bounds([
    ...drawing.fills.flatMap((f) => f.points),
    ...drawing.strokes.flatMap((s) => s.points),
    ...drawing.marks.map((m) => m.point),
    ...drawing.labels.flatMap((l) => [
      { x: l.box.left, y: l.box.top },
      { x: l.box.right, y: l.box.bottom },
    ]),
  ]);
const viewBox = (
  box: Bounds,
): readonly number[] =>
  Number.isFinite(box.left)
    ? [
        box.left - 3,
        box.top - 3,
        box.right - box.left + 6,
        box.bottom - box.top + 6,
      ]
    : [0, 0, 1, 1];

const body = (drawing: Drawing): string =>
  [
    ...drawing.fills.map((f) =>
      shape(
        f.id,
        f.style,
        f.tone,
        path(f.points) + "Z",
      ),
    ),
    ...drawing.shadows.map((s) =>
      shape(
        s.id,
        s.style,
        "shadow",
        path(s.points) + "Z",
      ),
    ),
    ...batches(
      drawing.strokes,
      strokePath(drawing),
      heads(drawing.strokes),
    ),
    ...drawing.marks
      .filter(
        (m) => !m.covered && m.kind !== "gap",
      )
      .map(dot),
    ...drawing.labels.map(words),
  ].join("");

export const toSvg = (
  drawing: Drawing,
  styles: Readonly<Record<string, string>> = {},
): string =>
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' +
  viewBox(extent(drawing)).join(" ") +
  '"><style>' +
  escape(
    Object.entries(styles)
      .map(
        ([name, css]) =>
          "." + name + "{" + css + "}",
      )
      .join(""),
  ) +
  "</style>" +
  body(drawing) +
  "</svg>";
