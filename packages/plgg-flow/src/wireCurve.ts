import {
  outline,
  chordGap,
} from "plgg-flow/wireInteraction";
import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import type { Edge } from "./model";
import type { Socket } from "plgg-flow/wireBase";
import { materialize } from "plgg-flow/wirePath";
import { search } from "plgg-flow/wireSearch";
import {
  type Box,
  bezier,
  distance,
  move,
  pointGap,
  inflate,
  pt,
  free,
  vertical,
  simplify,
  crossesItself,
  gap,
  required,
} from "plgg-flow/wireGeometry";

export const canonical = (
  s: Socket,
  t: Socket,
  steps?: number,
) => {
  const span = distance(s, t);
  const projection = (socket: Socket) =>
    Math.abs(
      vertical(socket.side)
        ? t.y - s.y
        : t.x - s.x,
    );
  const arm =
    s.side === t.side
      ? 24 + 0.13 * span
      : Math.max(
          24,
          Math.min(
            160,
            0.5 *
              Math.max(
                projection(s),
                projection(t),
              ),
          ),
        );
  const p1 = move(s, s.side, arm),
    p2 = move(t, t.side, arm);
  const plain = bezier(
    s,
    p1,
    p2,
    t,
    steps ??
      Math.max(
        40,
        Math.ceil(
          Math.max(arm, distance(p1, p2)) / 4,
        ),
      ),
  );
  return { plain, p1, p2 };
};
// Sample both shapes along their runs so a long straight segment cannot
// hide a larger deviation between its endpoints.
const follows = (
  path: readonly Point[],
  guide: readonly Point[],
) =>
  path.every((p, i) => {
    const a = path[i - 1] ?? p;
    const steps = Math.max(
      1,
      Math.ceil(distance(a, p) / 4),
    );
    for (let j = 1; j <= steps; j++) {
      const q = pt(
        a.x + ((p.x - a.x) * j) / steps,
        a.y + ((p.y - a.y) * j) / steps,
      );
      if (
        !guide.some(
          (end, k) =>
            k > 0 &&
            chordGap(q, guide[k - 1]!, end) < 20,
        )
      )
        return false;
    }
    return true;
  });

export const fanCubic = (
  wire: Wire,
  s: Socket,
  t: Socket,
  boxes: Box[],
) => {
  const { plain, p1, p2 } = canonical(s, t);
  if (
    !follows(wire.points, plain) ||
    !follows(plain, wire.points)
  )
    return wire;
  // Moving a handle by d moves the midpoint by 3d/8. Try the
  // smallest adjustment first, keeping both socket tangents fixed.
  for (const d of [8, 16, 24, 32, 40, 48]) {
    for (const [left, right] of [
      [d, 0],
      [-d, 0],
      [0, d],
      [0, -d],
      [d, d],
      [-d, -d],
      [d, -d],
      [-d, d],
    ] satisfies [number, number][]) {
      const a = move(
        s,
        s.side,
        Math.max(8, distance(s, p1) + left),
      );
      const b = move(
        t,
        t.side,
        Math.max(8, distance(t, p2) + right),
      );
      const path = bezier(
        s,
        a,
        b,
        t,
        plain.length - 1,
      );
      if (
        !blockers(wire.edge, path, boxes)
          .length &&
        !crossesItself(path)
      )
        return {
          ...materialize(
            wire.edge,
            s,
            t,
            path,
            0,
            false,
          ),
          controls: [
            { ...a, z: s.z },
            { ...b, z: t.z },
          ],
        };
    }
  }
  return wire;
};
export const blockers = (
  edge: Edge,
  plain: Point[],
  boxes: Box[],
) => {
  const own = (q: Box) =>
    q.id === edge.source || q.id === edge.target;
  return boxes.filter((q) => {
    if (own(q))
      return plain.some(
        (p, i) =>
          i > (plain.length - 1) / 8 &&
          i < ((plain.length - 1) * 7) / 8 &&
          pointGap(p, q) < 4,
      );
    if (free(plain, [inflate(q, 10)]))
      return false;
    return plain.some(
      (p, i) =>
        i > 0 &&
        gap(required(plain[i - 1]), p, q) < 10,
    );
  });
};
export const curvePath = (
  edge: Edge,
  s: Socket,
  t: Socket,
  boxes: Box[],
  rank: number,
  count: number,
  reciprocal: boolean,
) => {
  const span = distance(s, t);
  const { plain, p1, p2 } = canonical(s, t);
  const make = (path: Point[], vias: number) =>
    materialize(edge, s, t, path, vias, false);
  const dx = t.x - s.x,
    dy = t.y - s.y;
  const upright = vertical(s.side);
  const rise = upright ? dx : dy;
  if (count > 1 && span >= 50) {
    const direction = Math.sign(
      (upright ? dy : dx) || (upright ? dx : dy),
    );
    const nx =
        ((upright ? dy : -dy) * direction) / span,
      ny =
        ((upright ? -dx : dx) * direction) / span;
    const center = (count - 1) / 2;
    const pitch = reciprocal
      ? 2.9 +
        7.1 * Math.min(1, Math.abs(rise) / 24)
      : 10;
    // Retain uniform pitch and the parabolic lens in both travel directions.
    const offset =
      (rank - center) *
      Math.min(
        14 / center,
        (s.side === t.side ||
        (!rise && reciprocal)
          ? 1
          : 1.7) * pitch,
      );
    const facing =
      s.side !== t.side &&
      upright === vertical(t.side);
    const chordLens =
      facing && (!rise || count >= 3);
    const steps = chordLens
      ? Math.ceil(span / 4)
      : plain.length - 1;
    const path = Array.from(
      { length: steps + 1 },
      (_, i) => {
        const f = i / steps,
          bow = 4 * f * (1 - f);
        const base = chordLens
          ? pt(s.x + dx * f, s.y + dy * f)
          : required(plain[i]);
        // At staggered sockets the two shoulders follow the socket normals.
        const height =
          offset *
          (chordLens
            ? reciprocal
              ? Math.pow(bow, 0.15)
              : bow
            : bow * bow);
        return pt(
          base.x + nx * height,
          base.y + ny * height,
        );
      },
    );
    if (free(path, boxes)) return make(path, 0);
  }
  const blocked = blockers(edge, plain, boxes);
  if (!blocked.length)
    return {
      ...make(plain, 0),
      controls: [
        { ...p1, z: s.z },
        { ...p2, z: t.z },
      ],
    };
  const signed = (p: Point) =>
    (dx * (p.y - s.y) - dy * (p.x - s.x)) /
    (span || 1);
  const along = (p: Point) =>
    dx * (p.x - s.x) + dy * (p.y - s.y);
  const u = move(s, s.side, 16),
    v = move(t, t.side, 16);
  const candidates = boxes
    .filter(
      (q) =>
        blocked.includes(q) || gap(u, v, q) < 12,
    )
    .flatMap((q) => {
      const b = inflate(q, 12);
      const center = pt(
        (q.l + q.r) / 2,
        (q.t + q.b) / 2,
      );
      const sign =
        Math.sign(signed(center)) ||
        ((q.id <
        (edge.source < edge.target
          ? edge.source
          : edge.target)
          ? 1
          : -1) *
          (dx || dy) >=
        0
          ? 1
          : -1);
      return [
        pt(b.l, b.t),
        pt(b.r, b.t),
        pt(b.l, b.b),
        pt(b.r, b.b),
      ]
        .filter((p) => sign * signed(p) < 0)
        .sort(
          (a, b) =>
            Math.abs(signed(a)) -
            Math.abs(signed(b)),
        );
    });

  const walls = boxes.map((q) =>
    q.id === edge.source || q.id === edge.target
      ? q
      : inflate(q, 10),
  );
  let best: Point[] | undefined;
  let length = Infinity,
    leastBends = Infinity;
  const consider = (vias: Point[]) => {
    const run = [u, ...vias, v];
    if (
      run.some(
        (p, i) =>
          i > 0 &&
          along(p) < along(required(run[i - 1])),
      )
    )
      return;
    const path = fillet([s, ...run, t]);
    if (!free(path, walls) || crossesItself(path))
      return;
    const cost = path.reduce(
      (n, p, i) =>
        n +
        (i
          ? distance(p, required(path[i - 1]))
          : 0),
      0,
    );
    const bends = extraBends([s, ...run, t]);
    if (
      bends < leastBends ||
      (bends === leastBends && cost < length)
    ) {
      leastBends = bends;
      best = path;
      length = cost;
    }
  };
  consider([]);
  if (best)
    return materialize(edge, s, t, best, 0);
  for (const p of candidates) consider([p]);
  if (best)
    return materialize(edge, s, t, best, 1);
  for (const p of candidates)
    for (const q of candidates)
      if (p !== q && along(q) >= along(p))
        consider([p, q]);
  if (best)
    return materialize(edge, s, t, best, 2);
  // The arc cuts inside a searched corner. Reserve space for its trim.
  const own = boxes.filter(
    (q) =>
      q.id === edge.source ||
      q.id === edge.target,
  );
  const envelope = {
    id: "",
    l: Math.min(s.x, t.x, ...own.map((q) => q.l)),
    r: Math.max(s.x, t.x, ...own.map((q) => q.r)),
    t: Math.min(s.y, t.y, ...own.map((q) => q.t)),
    b: Math.max(s.y, t.y, ...own.map((q) => q.b)),
  };
  const margin =
    Math.min(
      envelope.r - envelope.l,
      envelope.b - envelope.t,
    ) > 150
      ? 30
      : 90;
  let fallback;
  let bestGap = -Infinity;
  for (const direction of [
    pt(dx, dy),
    false,
  ] satisfies (Point | false)[]) {
    for (const padding of [
      12, 20, 32, 48, 6, 2, 0,
    ]) {
      const rim = boxes.map((q) =>
        inflate(
          q,
          Math.min(
            padding,
            pointGap(u, q),
            pointGap(v, q),
          ),
        ),
      );
      const route = search(
        u,
        v,
        rim,
        false,
        direction,
        undefined,
        padding,
      );
      if (!route) continue;
      const knots = outline(simplify(route), 8);
      const path = fillet([s, ...knots, t]);
      if (crossesItself(path)) continue;
      const wire = materialize(
        edge,
        s,
        t,
        path,
        knots.length - 2,
      );
      if (free(path, walls)) {
        const bends =
          Number(
            path.some(
              (p) =>
                pointGap(p, envelope) > margin,
            ),
          ) *
            100 +
          extraBends([s, ...knots, t]);
        if (!bends) return wire;
        if (bends < leastBends) {
          leastBends = bends;
          fallback = wire;
        }
        continue;
      }
      if (leastBends < Infinity) continue;
      // Narrow passages can force less than ten units of clearance.
      // Keep the best searched passage even if its rounded rim comes close.
      let gap = Infinity;
      for (const p of wire.points)
        for (const q of boxes) {
          if (
            (q.id === edge.source &&
              distance(p, s) < 20) ||
            (q.id === edge.target &&
              distance(p, t) < 20)
          )
            continue;
          gap = Math.min(
            gap,
            Math.max(
              q.l - p.x,
              p.x - q.r,
              q.t - p.y,
              p.y - q.b,
            ),
          );
        }
      if (gap > bestGap) {
        bestGap = gap;
        fallback = wire;
      }
    }
    if (leastBends < Infinity) break;
  }
  return (
    fallback ??
    materialize(
      edge,
      s,
      t,
      fillet([s, u, v, t]),
      0,
    )
  );
};

// A line joining two circular fillets adds no turning of its own.
export const extraBends = (
  points: readonly Point[],
) => {
  let previous = 0,
    turn = 0,
    flips = 0;
  for (let i = 2; i < points.length; i++) {
    const a = required(points[i - 2]),
      b = required(points[i - 1]),
      c = required(points[i]);
    const x = b.x - a.x,
      y = b.y - a.y,
      u = c.x - b.x,
      v = c.y - b.y;
    const angle = Math.atan2(
      x * v - y * u,
      x * u + y * v,
    );
    if (Math.abs(angle) < 1e-8) continue;
    turn =
      Math.sign(turn) === Math.sign(angle)
        ? turn + angle
        : angle;
    if (Math.abs(turn) < 0.12) continue;
    const sign = Math.sign(turn);
    if (previous && previous !== sign) flips++;
    previous = sign;
  }
  return Math.max(0, flips - 1);
};

const fillet = (knots: Point[]) => {
  const path = simplify(knots);
  const arcs = path.slice(1, -1).map((b, i) => {
    const a = required(path[i]),
      c = required(path[i + 2]);
    const u = distance(a, b),
      v = distance(b, c);
    const x = (b.x - a.x) / u,
      y = (b.y - a.y) / u,
      tx = (c.x - b.x) / v,
      ty = (c.y - b.y) / v;
    const turn = Math.atan2(
      x * ty - y * tx,
      x * tx + y * ty,
    );
    const radius = Math.min(40, u / 2, v / 2);
    return {
      b,
      x,
      y,
      u,
      v,
      turn,
      radius,
      trim: radius * Math.tan(Math.abs(turn) / 2),
    };
  });
  const out = [required(path[0])];
  for (const [i, arc] of arcs.entries()) {
    const { b, x, y, turn } = arc;
    if (Math.abs(turn) < 1e-8) {
      out.push(b);
      continue;
    }
    // The tangent setback equals radius times tan(turn / 2). Fit neighbouring fillets
    // to their shared run only when their full radii would intersect.
    const fit = Math.min(
      1,
      arc.u /
        (arc.trim + (arcs[i - 1]?.trim ?? 0)),
      arc.v /
        (arc.trim + (arcs[i + 1]?.trim ?? 0)),
    );
    const radius = arc.radius * fit,
      trim = arc.trim * fit,
      sign = Math.sign(turn);
    const center = pt(
      b.x - trim * x - sign * y * radius,
      b.y - trim * y + sign * x * radius,
    );
    const start = Math.atan2(-sign * x, sign * y);
    const steps = Math.max(
      2,
      Math.ceil((Math.abs(turn) * radius) / 2),
    );
    for (let j = 0; j <= steps; j++) {
      const angle = start + (turn * j) / steps;
      out.push(
        pt(
          center.x + radius * Math.cos(angle),
          center.y + radius * Math.sin(angle),
        ),
      );
    }
  }
  out.push(required(path[path.length - 1]));
  return out;
};
