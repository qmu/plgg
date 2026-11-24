import type { Point } from "plgg-board";
import type { Socket } from "./wireBase";
import {
  distance,
  free,
  normal,
  move,
  crossesItself,
  pt,
  simplify,
  type Box,
} from "plgg-flow/wireGeometry";

// Coordinates in the frame of the chord. A box cuts each normal
// in an interval; the dent must pass the outside of that interval.
type Sample = { x: number; y: number };
const envelope = (
  points: Sample[],
  sign: number,
) => {
  const hull: Sample[] = [];
  for (const c of points) {
    while (hull.length >= 2) {
      const a = hull[hull.length - 2]!,
        b = hull[hull.length - 1]!;
      if (
        sign *
          ((b.x - a.x) * (c.y - b.y) -
            (b.y - a.y) * (c.x - b.x)) >
        1e-8
      )
        break;
      hull.pop();
    }
    hull.push(c);
  }
  return hull;
};
export const chordDent = (
  s: Socket,
  t: Socket,
  plain: Point[],
  boxes: Box[],
  walls: Box[],
  smooth: (
    knots: Point[],
    radius?: number,
  ) => Point[],
  bends: (points: readonly Point[]) => number,
  axial = false,
  flank = 0,
) => {
  if (
    walls.some((q) =>
      [s, t].some(
        (p) =>
          p.x > q.l &&
          p.x < q.r &&
          p.y > q.t &&
          p.y < q.b,
      ),
    )
  )
    return;
  const chord = distance(s, t);
  if (chord < 24) return;
  const x = t.x - s.x,
    y = t.y - s.y;
  const dx = axial
      ? Math.abs(x) >= Math.abs(y)
        ? Math.sign(x)
        : 0
      : x / chord,
    dy = axial
      ? Math.abs(y) > Math.abs(x)
        ? Math.sign(y)
        : 0
      : y / chord;
  const span = x * dx + y * dy,
    offset = y * dx - x * dy;
  const local = (p: Point) =>
    pt(
      (p.x - s.x) * dx + (p.y - s.y) * dy,
      (p.y - s.y) * dx - (p.x - s.x) * dy,
    );
  const world = (p: Sample) =>
    pt(
      s.x + dx * p.x - dy * p.y,
      s.y + dy * p.x + dx * p.y,
    );
  let trace = plain.map(local);
  if (
    trace.some(
      (p, i) => i && p.x < trace[i - 1]!.x - 1e-6,
    )
  )
    trace = [pt(0, 0), pt(span, offset)];
  const corners = boxes.map((q) =>
    [
      pt(q.l, q.t),
      pt(q.r, q.t),
      pt(q.r, q.b),
      pt(q.l, q.b),
    ].map(local),
  );
  const cuts = new Set(
    Array.from(
      { length: 9 },
      (_, i) => (span * i) / 8,
    ),
  );
  for (const rim of corners)
    for (const p of rim)
      if (p.x > 0 && p.x < span) cuts.add(p.x);
  let index = 0;
  const desired = [...cuts]
    .sort((a, b) => a - b)
    .map((x) => {
      while (
        index + 2 < trace.length &&
        trace[index + 1]!.x < x
      )
        index++;
      const a = trace[index]!,
        b = trace[index + 1]!;
      let y =
        a.y +
        ((b.y - a.y) * (x - a.x)) /
          (b.x - a.x || 1);
      if (x === 0 || x === span)
        return pt(x, (offset * x) / span);
      for (const rim of corners) {
        const hits = rim.flatMap((p, i) => {
          const q = rim[(i + 1) % 4]!;
          if (
            x < Math.min(p.x, q.x) - 1e-7 ||
            x > Math.max(p.x, q.x) + 1e-7
          )
            return [];
          if (Math.abs(q.x - p.x) < 1e-8)
            return [p.y, q.y];
          return [
            p.y +
              ((q.y - p.y) * (x - p.x)) /
                (q.x - p.x),
          ];
        });
        if (!hits.length) continue;
        const lo = Math.min(...hits),
          hi = Math.max(...hits);
        const center =
          (rim[0]!.y +
            rim[2]!.y -
            ((rim[0]!.x + rim[2]!.x) * offset) /
              span) /
          2;
        y =
          (flank || Math.sign(center)) > 0
            ? Math.min(y, lo)
            : Math.max(y, hi);
      }
      return pt(x, y);
    });
  const visited = new Set<string>();
  for (const sign of [-1, 1])
    for (let j = 1; j < desired.length - 1; j++) {
      const hull = [
        ...envelope(
          desired.slice(0, j + 1),
          sign,
        ),
        ...envelope(
          desired.slice(j),
          -sign,
        ).slice(1),
      ];
      const knots = simplify(hull.map(world));
      knots[0] = s;
      knots[knots.length - 1] = t;
      if (knots.length < 2 || bends(knots))
        continue;
      const aligned = (
        end: Socket,
        other: Point,
      ) =>
        ((other.x - end.x) * normal[end.side].x +
          (other.y - end.y) *
            normal[end.side].y) /
        (distance(end, other) || 1);
      const signature = hull
        .map((p) => p.x)
        .join(",");
      if (visited.has(signature)) continue;
      visited.add(signature);
      for (const [left, right] of [
        [0, 0],
        [6, 0],
        [0, 6],
        [6, 6],
      ] satisfies [number, number][]) {
        const pathKnots = simplify([
          s,
          move(s, s.side, left),
          ...knots.slice(1, -1),
          move(t, t.side, right),
          t,
        ]);
        if (
          aligned(s, pathKnots[1]!) <
            (chord > 200 ? 0.67 : 0.05) ||
          aligned(
            t,
            pathKnots[pathKnots.length - 2]!,
          ) < (chord > 200 ? 0.67 : 0.05) ||
          bends(pathKnots)
        )
          continue;
        if (!free(pathKnots, walls)) continue;
        for (const radius of [40, 16, 8]) {
          const path = smooth(pathKnots, radius);
          if (
            !free(path, walls) ||
            crossesItself(path) ||
            bends(path)
          )
            continue;
          return path;
        }
      }
    }
  return;
};
