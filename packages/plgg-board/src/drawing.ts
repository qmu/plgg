import { mix } from "plgg-board/geometry";
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
export type Fill = {
  id: string;
  style: string;
  tone: Tone;
  points: Point3[];
};
export type Ink = {
  id: string;
  style: string;
  kind:
    | "silhouette"
    | "crease"
    | "hidden"
    | "line";
  outline?: boolean;
  points: [Point3, Point3];
};
export type Matrix = [
  number,
  number,
  number,
  number,
  number,
  number,
];
export type DrawMark = {
  id: string;
  style: string;
  kind: "hole" | "gap" | "mark";
  point: Point3;
  matrix: Matrix;
  covered: boolean;
  receiver?: string;
  strokeIndex?: number;
};
export type DrawLabel = {
  clear?: boolean;
  id: string;
  style: string;
  text: string;
  point: Point3;
  matrix: Matrix;
  box: Bounds;
  covered: boolean;
};
export type Shadow = {
  id: string;
  style: string;
  receiver: string;
  points: Point3[];
};
export type Drawing = {
  fills: Fill[];
  strokes: Ink[];
  marks: DrawMark[];
  labels: DrawLabel[];
  shadows: Shadow[];
};
export const pick = (
  d: Drawing,
  p: Point,
): string | undefined => {
  const label = d.labels
    .slice()
    .reverse()
    .find(
      (l) =>
        !l.covered &&
        p.x >= l.box.left &&
        p.x <= l.box.right &&
        p.y >= l.box.top &&
        p.y <= l.box.bottom,
    );
  if (label) return label.id;
  let best = -Infinity,
    id: string | undefined;
  for (const m of d.marks) {
    if (m.covered || m.kind === "gap") continue;
    const [a, b, c, e, x, y] = m.matrix,
      det = a * e - b * c;
    if (Math.abs(det) < 1e-8) continue;
    const u =
        (e * (p.x - x) - c * (p.y - y)) / det,
      v = (a * (p.y - y) - b * (p.x - x)) / det;
    if (u * u + v * v <= 4 && m.point.z >= best) {
      id = m.id;
      best = m.point.z;
    }
  }
  for (const s of d.strokes) {
    if (s.kind !== "line") continue;
    const [a, b] = s.points,
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) /
            (dx * dx + dy * dy || 1),
        ),
      );
    const z = a.z + t * (b.z - a.z);
    if (
      z > best &&
      Math.hypot(
        p.x - a.x - t * dx,
        p.y - a.y - t * dy,
      ) <= 1
    ) {
      id = s.id;
      best = z;
    }
  }
  if (id !== undefined) return id;
  for (let i = d.fills.length - 1; i >= 0; i--) {
    const f = d.fills[i]!;
    let pos = false,
      neg = false;
    for (let j = 0; j < f.points.length; j++) {
      const a = f.points[j]!,
        b = f.points[(j + 1) % f.points.length]!;
      const cross =
        (b.x - a.x) * (p.y - a.y) -
        (b.y - a.y) * (p.x - a.x);
      pos ||= cross > 1e-8;
      neg ||= cross < -1e-8;
      if (pos && neg) break;
    }
    if (pos !== neg) return f.id;
  }
  return undefined;
};

export const clearLabelStrokes = (
  drawing: Drawing,
  painted: readonly DrawLabel[] = drawing.labels,
) => {
  const labels = painted
    .filter((l) => l.clear)
    .map(({ id, box: b }) => ({
      id,
      box: {
        left: b.left - 2,
        right: b.right + 2,
        top: b.top - 2,
        bottom: b.bottom + 2,
      },
    }));
  if (!labels.length) return;
  const query = grid(labels);
  const gaps = new Map<number, DrawMark[]>();
  for (const mark of drawing.marks) {
    if (mark.strokeIndex === undefined) continue;
    const list = gaps.get(mark.strokeIndex) ?? [];
    list.push(mark);
    gaps.set(mark.strokeIndex, list);
  }
  const strokes: Ink[] = [];
  const removed = new Set<DrawMark>();
  for (const [
    index,
    s,
  ] of drawing.strokes.entries()) {
    const [a, b] = s.points,
      dx = b.x - a.x,
      dy = b.y - a.y;
    const cuts: Interval[] = [];
    query(segmentBounds(a, b), ({ id, box }) => {
      if (id === s.id) return;
      let lo = 0,
        hi = 1;
      for (const [start, delta, min, max] of [
        [a.x, dx, box.left, box.right],
        [a.y, dy, box.top, box.bottom],
      ] satisfies [
        number,
        number,
        number,
        number,
      ][]) {
        if (!delta) {
          if (start < min || start > max) return;
          continue;
        }
        const u = (min - start) / delta,
          v = (max - start) / delta;
        lo = Math.max(lo, Math.min(u, v));
        hi = Math.min(hi, Math.max(u, v));
      }
      if (lo < hi) cuts.push({ lo, hi });
    });
    const marks = gaps.get(index);
    const emit = (lo: number, hi: number) => {
      for (const m of marks ?? []) {
        const t =
          Math.abs(dx) > Math.abs(dy)
            ? (m.point.x - a.x) / dx
            : (m.point.y - a.y) / dy;
        if (t >= lo && t <= hi) {
          m.strokeIndex = strokes.length;
          removed.delete(m);
        }
      }
      strokes.push(
        lo === 0 && hi === 1
          ? s
          : {
              ...s,
              points: [
                mix(a, b, lo),
                mix(a, b, hi),
              ],
            },
      );
    };
    for (const m of marks ?? []) removed.add(m);
    let cursor = 0;
    for (const { lo, hi } of cuts.sort(
      (u, v) => u.lo - v.lo,
    )) {
      if (lo > cursor) emit(cursor, lo);
      cursor = Math.max(cursor, hi);
    }
    if (cursor < 1) emit(cursor, 1);
  }
  drawing.strokes = strokes;
  if (removed.size)
    drawing.marks = drawing.marks.filter(
      (m) => !removed.has(m),
    );
};
