import type {
  Point3,
  Point,
} from "plgg-board/index";
import type { Bounds } from "plgg-board/visibility";
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
