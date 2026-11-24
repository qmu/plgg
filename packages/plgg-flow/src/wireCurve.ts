import type { Point } from "plgg-board";
import type { Edge } from "./model";
import type { Socket } from "plgg-flow/wireBase";
import {
  materialize,
  throughKnots,
} from "plgg-flow/wirePath";
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
  normal,
  gap,
  crossesItself,
  required,
} from "plgg-flow/wireGeometry";

const tangentModes = [
  "bisector",
  "axis",
  "source arc",
  "target arc",
  "right",
  "bottom",
  "left",
  "top",
] satisfies (
  | Socket["side"]
  | "bisector"
  | "axis"
  | "source arc"
  | "target arc"
)[];

// Remove the least significant searched corner until two remain.
const simplifySearch = (
  corners: Point[],
  s: Point,
  t: Point,
) => {
  while (corners.length > 2) {
    let smallest = Infinity,
      index = 0;
    corners.forEach((p, i) => {
      const a = corners[i - 1] ?? s,
        b = corners[i + 1] ?? t;
      const loss =
        distance(a, p) +
        distance(p, b) -
        distance(a, b);
      if (loss < smallest) {
        smallest = loss;
        index = i;
      }
    });
    corners.splice(index, 1);
  }
  return corners;
};
// Rank clear detours by changes of bend, local curvature and total turning.
const shapeCost = (path: Point[]) => {
  let positive = 0,
    negative = 0,
    last = 0,
    extra = 0,
    turn = 0,
    curvature = 0;
  for (let i = 2; i < path.length; i++) {
    const a = required(path[i - 2]),
      b = required(path[i - 1]),
      c = required(path[i]);
    const x = b.x - a.x,
      y = b.y - a.y,
      dx = c.x - b.x,
      dy = c.y - b.y;
    const angle = Math.atan2(
      x * dy - y * dx,
      x * dx + y * dy,
    );
    curvature = Math.max(
      curvature,
      (Math.abs(angle) * 2) /
        (Math.hypot(x, y) + Math.hypot(dx, dy) ||
          1),
    );
    if (angle > 0) positive += angle;
    else negative -= angle;
    if (Math.sign(turn) !== Math.sign(angle))
      turn = 0;
    turn += angle;
    if (
      Math.abs(turn) > 0.02 &&
      last !== Math.sign(turn)
    ) {
      if (last) extra++;
      last = Math.sign(turn);
    }
  }
  return (
    100 * Math.max(0, extra - 1) +
    100 * Math.max(0, curvature * 8 - 0.78) +
    positive +
    negative
  );
};
export const curvePath = (
  edge: Edge,
  s: Socket,
  t: Socket,
  boxes: Box[],
  clearance: number,
  rank: number,
  count: number,
  reciprocal: boolean,
) => {
  const span = distance(s, t);
  const arm = Math.max(
    24,
    Math.min(160, 0.45 * span),
  );
  const p1 = move(s, s.side, arm),
    p2 = move(t, t.side, arm);
  const plain = bezier(
    s,
    p1,
    p2,
    t,
    Math.max(
      40,
      Math.ceil(
        Math.max(arm, distance(p1, p2)) / 4,
      ),
    ),
  );
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
        (!rise && reciprocal ? 1 : 1.7) * pitch,
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
  const own = (q: Box) =>
    q.id === edge.source || q.id === edge.target;
  const blocked = boxes.filter((q) => {
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
  const cornersAt = (padding: number) =>
    blocked.flatMap((q) => {
      const b = inflate(q, padding);
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
        .filter(
          (p) =>
            sign * (signed(p) - signed(center)) <
            0,
        )
        .sort(
          (a, b) =>
            Math.abs(signed(a)) -
            Math.abs(signed(b)),
        );
    });
  const candidates = cornersAt(
    Math.max(10, clearance),
  );
  const walls = boxes.map((q) =>
    own(q)
      ? q
      : inflate(
          q,
          Math.min(
            Math.max(10, clearance) - 0.001,
            pointGap(s, q),
            pointGap(t, q),
          ),
        ),
  );
  // Fit a single cubic through the corner when its two socket-normal
  // handles can reach it. Its derivative already agrees on both sides.
  let best:
    | ReturnType<typeof materialize>
    | undefined;
  let least = Infinity;
  const ownBoxes = boxes.filter(own);
  const envelope = {
    id: "",
    l: Math.min(
      s.x,
      t.x,
      ...ownBoxes.map((q) => q.l),
    ),
    r: Math.max(
      s.x,
      t.x,
      ...ownBoxes.map((q) => q.r),
    ),
    t: Math.min(
      s.y,
      t.y,
      ...ownBoxes.map((q) => q.t),
    ),
    b: Math.max(
      s.y,
      t.y,
      ...ownBoxes.map((q) => q.b),
    ),
  };
  const margin =
    Math.min(
      envelope.r - envelope.l,
      envelope.b - envelope.t,
    ) > 150
      ? 30
      : 90;
  type Span = [Point, Point, Point, Point];
  const consider = (
    spans: Span[],
    vias: number,
    buffer: Box[],
  ) => {
    const sample = (steps?: number) => {
      const path: Point[] = [s];
      for (const [a, b, c, d] of spans)
        path.push(
          ...bezier(a, b, c, d, steps).slice(1),
        );
      return path;
    };
    const probe = sample(12);
    if (!free(probe, buffer)) return;
    let excess = 0;
    for (const p of probe)
      excess = Math.max(
        excess,
        pointGap(p, envelope) - margin,
      );
    const cost = shapeCost(probe) + excess * 2;
    if (cost >= least || crossesItself(probe))
      return;
    const path = sample();
    if (
      !free(path, buffer) ||
      crossesItself(path)
    )
      return;
    const finalCost =
      shapeCost(path) + excess * 2;
    if (finalCost < least) {
      best = materialize(edge, s, t, path, vias);
      least = finalCost;
    }
  };
  const fitted = (via: Point, buffer: Box[]) => {
    const a = normal[s.side],
      b = normal[t.side];
    const horizontal = a.x !== 0;
    const parallel = horizontal === (b.x !== 0);
    const axis = horizontal ? "y" : "x";
    let lo = 0,
      hi = 1;
    if (parallel) {
      const rise = t[axis] - s[axis];
      if (!rise) return undefined;
      const fraction =
        (via[axis] - s[axis]) / rise;
      if (fraction <= 0 || fraction >= 1)
        return undefined;
      for (let i = 0; i < 24; i++) {
        const f = (lo + hi) / 2;
        if (f * f * (3 - 2 * f) < fraction)
          lo = f;
        else hi = f;
      }
    }
    for (const f of parallel
      ? [(lo + hi) / 2]
      : Array.from(
          { length: 31 },
          (_, i) => (((15 + i) % 31) + 1) / 32,
        )) {
      const h = f * f * (3 - 2 * f),
        u = 3 * f * (1 - f) ** 2,
        v = 3 * f * f * (1 - f);
      const x = via.x - s.x - dx * h,
        y = via.y - s.y - dy * h;
      const dot = x * a.x + y * a.y;
      const sign = a.x * b.x + a.y * b.y;
      let first = dot / u,
        second = (x * b.x + y * b.y) / v;
      if (parallel) {
        const delta =
          (dot - arm * (u + sign * v)) /
          (u * u + v * v);
        first = arm + u * delta;
        second = arm + sign * v * delta;
        if (first < 12) {
          first = 12;
          second = (dot - u * first) / (sign * v);
        }
        if (second < 12) {
          second = 12;
          first = (dot - sign * v * second) / u;
        }
      }
      if (
        Math.min(first, second) < 4 ||
        Math.max(first, second) > span * 3
      )
        continue;
      consider(
        [
          [
            s,
            move(s, s.side, first),
            move(t, t.side, second),
            t,
          ],
        ],
        1,
        buffer,
      );
      if (least < 10) return best;
    }
    return undefined;
  };
  const tryCorners = (
    corners: Point[],
    buffer: Box[],
  ) => {
    for (const p of corners) {
      const wire = fitted(p, buffer);
      if (wire) return wire;
    }

    const trial = (
      vias: Point[],
      mode: (typeof tangentModes)[number],
      scale: number,
    ) => {
      const knots = [s, ...vias, t];
      const tangents = knots.map((p, i) => {
        const a = knots[i - 1],
          b = knots[i + 1];
        if (!a) return normal[s.side];
        if (!b)
          return pt(
            -normal[t.side].x,
            -normal[t.side].y,
          );
        const l = distance(a, p) || 1,
          r = distance(p, b) || 1;
        const x =
            (p.x - a.x) / l + (b.x - p.x) / r,
          y = (p.y - a.y) / l + (b.y - p.y) / r;
        if (
          mode === "right" ||
          mode === "left" ||
          mode === "top" ||
          mode === "bottom"
        )
          return normal[mode];
        if (
          mode === "source arc" ||
          mode === "target arc"
        ) {
          const start = normal[s.side],
            end = normal[t.side];
          const chord =
            mode === "source arc"
              ? Math.atan2(p.y - a.y, p.x - a.x)
              : Math.atan2(b.y - p.y, b.x - p.x);
          const angle =
            2 * chord -
            (mode === "source arc"
              ? Math.atan2(start.y, start.x)
              : Math.atan2(-end.y, -end.x));
          return pt(
            Math.cos(angle),
            Math.sin(angle),
          );
        }
        if (mode === "axis")
          return Math.abs(x) > Math.abs(y)
            ? pt(Math.sign(x), 0)
            : pt(0, Math.sign(y));
        const d = Math.hypot(x, y) || 1;
        return pt(x / d, y / d);
      });
      const spans: Span[] = [];
      for (let i = 1; i < knots.length; i++) {
        const a = required(knots[i - 1]),
          b = required(knots[i]);
        const l = distance(a, b) * scale,
          u = required(tangents[i - 1]),
          v = required(tangents[i]);
        const den = u.x * v.y - u.y * v.x;
        const reachA =
          ((b.x - a.x) * v.y -
            (b.y - a.y) * v.x) /
          den;
        const reachB =
          (u.x * (b.y - a.y) -
            u.y * (b.x - a.x)) /
          den;
        // Keep a convex span inside its endpoint tangent triangle.
        const armA =
          reachA > 0 && reachB > 0
            ? Math.min(l, reachA * 0.85)
            : l;
        const armB =
          reachA > 0 && reachB > 0
            ? Math.min(l, reachB * 0.85)
            : l;
        spans.push([
          a,
          pt(a.x + u.x * armA, a.y + u.y * armA),
          pt(b.x - v.x * armB, b.y - v.y * armB),
          b,
        ]);
      }
      consider(spans, vias.length, buffer);
    };
    for (const p of corners) {
      for (const scale of [0.33, 0.16, 0.55]) {
        for (const mode of tangentModes)
          trial([p], mode, scale);
        if (least < 10) return best;
      }
    }
    if (least < 10) return best;
    for (const [i, p] of corners.entries())
      for (const q of corners.slice(i + 1)) {
        if (distance(p, q) < 1) continue;
        const order =
          along(p) < along(q) ? [p, q] : [q, p];
        trial(order, "bisector", 1 / 3);
        trial(order, "axis", 1 / 3);
        if (blocked.some(own)) {
          order.reverse();
          trial(order, "bisector", 1 / 3);
          trial(order, "axis", 1 / 3);
        }
      }
    return least < 10 ? best : undefined;
  };
  const levelBlocked =
    vertical(s.side) === vertical(t.side) &&
    s.side !== t.side &&
    !rise;
  const simple = tryCorners(candidates, walls);
  if (simple) return simple;
  if (levelBlocked && best) return best;
  const near = tryCorners(
    cornersAt(10),
    boxes.map((q) =>
      own(q)
        ? q
        : inflate(
            q,
            Math.min(
              8,
              pointGap(s, q),
              pointGap(t, q),
            ),
          ),
    ),
  );
  if (near) return near;
  const u = move(s, s.side, 14),
    v = move(t, t.side, 14);
  const route =
    search(u, v, walls, false) ??
    search(u, v, boxes, false) ??
    [];
  const choices = [
    ...route.slice(1, -1),
    ...cornersAt(10),
    ...[s, t].map((p) => {
      const axis = vertical(p.side) ? "y" : "x",
        dir = normal[p.side][axis];
      const extent = Math.max(
        dir * p[axis],
        ...ownBoxes.map((q) =>
          axis === "x"
            ? Math.max(dir * q.l, dir * q.r)
            : Math.max(dir * q.t, dir * q.b),
        ),
      );
      return {
        ...p,
        [axis]:
          dir *
          (extent + Math.max(18, clearance)),
      };
    }),
    ...candidates,
    ...blocked.flatMap((q) => {
      const b = inflate(
        q,
        Math.max(12, clearance),
      );
      return [
        pt(b.l, b.t),
        pt(b.l, b.b),
        pt(b.r, b.t),
        pt(b.r, b.b),
      ];
    }),
    u,
    v,
  ];
  const fallback = choices.filter(
    (p, i) =>
      choices.findIndex(
        (q) => distance(p, q) < 0.001,
      ) === i,
  );
  return (
    tryCorners(fallback, boxes) ??
    best ??
    materialize(
      edge,
      s,
      t,
      throughKnots(
        [
          s,
          ...simplifySearch(
            route.slice(1, -1),
            s,
            t,
          ),
          t,
        ],
        s.side,
        t.side,
      ),
      Math.min(2, route.slice(1, -1).length),
    )
  );
};
