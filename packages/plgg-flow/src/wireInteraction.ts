import {
  boundsIndex,
  type Bounds,
} from "plgg-flow/wireCorridors";
import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import {
  distance,
  required,
  crossing,
} from "plgg-flow/wireGeometry";

export const chordGap = (
  p: Point,
  a: Point,
  b: Point,
) => {
  const x = b.x - a.x,
    y = b.y - a.y;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p.x - a.x) * x + (p.y - a.y) * y) /
        (x * x + y * y || 1),
    ),
  );
  const dx = p.x - a.x - t * x,
    dy = p.y - a.y - t * y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Short chords retain bends while avoiding comparisons along straight samples.
export const outline = (
  points: readonly Point[],
  tolerance = 0.45,
) => {
  const result = [required(points[0])];
  const span = (lo: number, hi: number) => {
    const a = required(points[lo]),
      b = required(points[hi]);
    const dx = b.x - a.x,
      dy = b.y - a.y,
      length = dx * dx + dy * dy || 1;
    let worst = tolerance * tolerance,
      split = lo;
    for (let k = lo + 1; k < hi; k++) {
      const p = required(points[k]),
        x = p.x - a.x,
        y = p.y - a.y;
      const t = Math.max(
        0,
        Math.min(1, (x * dx + y * dy) / length),
      );
      const rx = x - t * dx,
        ry = y - t * dy,
        d = rx * rx + ry * ry;
      if (d > worst) {
        worst = d;
        split = k;
      }
    }
    if (split > lo) {
      span(lo, split);
      span(split, hi);
    } else result.push(b);
  };
  span(0, points.length - 1);
  return result;
};
const geometryOf = (
  points: Wire["points"],
  tolerance: number,
) => {
  const path = outline(points, tolerance);
  const first = required(path[0]);
  let l = first.x,
    r = l,
    t = first.y,
    b = t,
    length = 0,
    turn = 0;
  const segments = [];
  for (let i = 1; i < path.length; i++) {
    const a = required(path[i - 1]),
      end = required(path[i]),
      dx = end.x - a.x,
      dy = end.y - a.y,
      d = Math.sqrt(dx * dx + dy * dy);
    l = Math.min(l, end.x);
    r = Math.max(r, end.x);
    t = Math.min(t, end.y);
    b = Math.max(b, end.y);
    length += d;
    const next = path[i + 1];
    if (next) {
      const x = next.x - end.x,
        y = next.y - end.y;
      turn += Math.abs(
        Math.atan2(
          dx * y - dy * x,
          dx * x + dy * y,
        ),
      );
    }
    segments.push({
      a,
      b: end,
      i,
      x: dx / (d || 1),
      y: dy / (d || 1),
      d: d || 1,
      l: Math.min(a.x, end.x),
      r: Math.max(a.x, end.x),
      t: Math.min(a.y, end.y),
      bottom: Math.max(a.y, end.y),
    });
  }
  return {
    l,
    r,
    t,
    b,
    length,
    turn,
    path,
    segments,
  };
};
type Geometry = ReturnType<typeof geometryOf>;
const geometries = new WeakMap<
  Wire["points"],
  Geometry
>();
const stepGeometries = new WeakMap<
  Wire["points"],
  Geometry
>();
const contours = new WeakMap<
  Wire,
  Geometry & { wire: Wire }
>();
export const profile = (wire: Wire) => {
  const hit = contours.get(wire);
  if (hit) return hit;
  // Straight step runs keep their track at unit tolerance through a fillet.
  const step = wire.edge.route === "step";
  const store = step
    ? stepGeometries
    : geometries;
  let geometry = store.get(wire.points);
  if (!geometry) {
    geometry = geometryOf(
      wire.points,
      step ? 1 : 0.45,
    );
    store.set(wire.points, geometry);
  }
  const result = { ...geometry, wire };
  contours.set(wire, result);
  return result;
};
type Contour = ReturnType<typeof profile>;
const chordBlocks = new WeakMap<
  Geometry["segments"],
  {
    l: number;
    r: number;
    t: number;
    b: number;
    chords: Contour["segments"];
  }[]
>();
const blocksFor = (p: Contour) => {
  const hit = chordBlocks.get(p.segments);
  if (hit) return hit;
  const blocks = [];
  for (let j = 0; j < p.segments.length; j += 6) {
    const chords = p.segments.slice(j, j + 6);
    blocks.push({
      l: Math.min(...chords.map((c) => c.l)),
      r: Math.max(...chords.map((c) => c.r)),
      t: Math.min(...chords.map((c) => c.t)),
      b: Math.max(...chords.map((c) => c.bottom)),
      chords,
    });
  }
  chordBlocks.set(p.segments, blocks);
  return blocks;
};
export const measureConflict = (
  u: ReturnType<typeof profile>,
  v: ReturnType<typeof profile>,
  limit = Infinity,
  curvePair = false,
) => {
  if (
    u.l > v.r + 6 ||
    v.l > u.r + 6 ||
    u.t > v.b + 6 ||
    v.t > u.b + 6
  )
    return 0;
  const shared = [
    u.wire.source,
    u.wire.target,
  ].filter((p) =>
    [v.wire.source, v.wire.target].some(
      (q) => distance(p, q) < 1,
    ),
  );
  let intersections = 0,
    contact = 0,
    near = 0;
  const blocks = blocksFor(v);
  // Siblings can leave the same node through different sockets.
  const sibling =
    shared.length ||
    u.wire.edge.source === v.wire.edge.source ||
    u.wire.edge.target === v.wire.edge.target;
  const value = () =>
    intersections * (sibling ? 45 : 3) +
    Math.max(0, intersections - 1) * 90 +
    Math.max(0, contact - 11) * 10 +
    Math.max(0, near - 85) * 0.3 +
    contact * 0.12;
  for (const a of u.segments) {
    if (
      a.l > v.r + 7 ||
      a.r < v.l - 7 ||
      a.t > v.b + 7 ||
      a.bottom < v.t - 7
    )
      continue;
    for (const block of blocks) {
      if (
        a.l > block.r + 7 ||
        a.r < block.l - 7 ||
        a.t > block.b + 7 ||
        a.bottom < block.t - 7
      )
        continue;
      for (const b of block.chords) {
        if (
          a.l > b.r + 7 ||
          b.l > a.r + 7 ||
          a.t > b.bottom + 7 ||
          b.t > a.bottom + 7
        )
          continue;
        const dx = b.a.x - a.a.x,
          dy = b.a.y - a.a.y;
        const det = a.x * b.y - a.y * b.x;
        if (
          Math.abs(det) > 0.001 &&
          crossing(u.path, a.i, v.path, b.i)
        ) {
          const at = (dx * b.y - dy * b.x) / det;
          if (
            !shared.some(
              (p) =>
                Math.hypot(
                  a.a.x + a.x * at - p.x,
                  a.a.y + a.y * at - p.y,
                ) < 26,
            )
          )
            intersections++;
        }
        // Clip each chord against the peer's lane, then exclude the common stem.
        const dot = a.x * b.x + a.y * b.y,
          along = dx * b.x + dy * b.y,
          across = dx * b.y - dy * b.x;
        let lo = 0,
          hi = a.d;
        if (Math.abs(dot) > 1e-8) {
          const t0 = along / dot,
            t1 = (along + b.d) / dot;
          lo = Math.max(lo, Math.min(t0, t1));
          hi = Math.min(hi, Math.max(t0, t1));
        } else if (along > 0 || along < -b.d)
          continue;
        if (hi <= lo) continue;
        const band = (width: number) => {
          let l = lo,
            h = hi;
          if (Math.abs(det) > 1e-8) {
            const t0 = (across - width) / det,
              t1 = (across + width) / det;
            l = Math.max(l, Math.min(t0, t1));
            h = Math.min(h, Math.max(t0, t1));
          } else if (Math.abs(across) >= width)
            return 0;
          if (h <= l) return 0;
          let extent = h - l;
          for (const q of curvePair
            ? []
            : shared) {
            const x = q.x - a.a.x,
              y = q.y - a.a.y,
              center = x * a.x + y * a.y,
              side = x * a.y - y * a.x;
            if (Math.abs(side) >= 21) continue;
            const reach = Math.sqrt(
              441 - side * side,
            );
            extent -= Math.max(
              0,
              Math.min(h, center + reach) -
                Math.max(l, center - reach),
            );
          }
          return Math.max(0, extent);
        };
        contact += band(curvePair ? 2.5 : 3.2);
        if (!curvePair) near += band(6.2);
      }
    }
    if (limit !== Infinity && value() >= limit)
      return limit;
  }
  return curvePair
    ? intersections +
        Number(
          contact >=
            0.4 * Math.min(u.length, v.length),
        ) *
          100
    : value();
};

// Repaired lanes often compare the same unchanged pair on consecutive frames.
type Penalties = WeakMap<
  Geometry["segments"],
  WeakMap<Geometry["segments"], number>
>;
const relatedPenalties: Penalties = new WeakMap();
const otherPenalties: Penalties = new WeakMap();
export const conflict = (
  a: Contour,
  b: Contour,
  limit = Infinity,
) => {
  if (
    a.l > b.r + 6 ||
    a.r < b.l - 6 ||
    a.t > b.b + 6 ||
    a.b < b.t - 6
  )
    return 0;
  const penalties =
    a.wire.edge.source === b.wire.edge.source ||
    a.wire.edge.target === b.wire.edge.target
      ? relatedPenalties
      : otherPenalties;
  let peers = penalties.get(a.segments);
  const old = peers?.get(b.segments);
  if (old !== undefined) {
    if (old >= 0) return old;
    if (-old >= limit) return limit;
  }
  const value = measureConflict(a, b, limit);
  if (!peers) {
    peers = new WeakMap();
    penalties.set(a.segments, peers);
  }
  peers.set(
    b.segments,
    value >= limit ? -limit : value,
  );
  return value;
};
// Keep candidates local while allowing accepted repairs to change their extent.
export const neighbourIndex = (
  items: Bounds[],
) => {
  const envelope = (p: Bounds, i: number) => ({
    l: p.l - 16,
    r: p.r + 16,
    t: p.t - 16,
    b: p.b + 16,
    i,
  });
  const regions = items.map(envelope);
  let query = boundsIndex(regions);
  return {
    query: (p: Bounds) =>
      query({
        l: p.l - 7,
        r: p.r + 7,
        t: p.t - 7,
        b: p.b + 7,
      }),
    update: (i: number, p: Bounds) => {
      const r = required(regions[i]);
      if (
        p.l >= r.l &&
        p.r <= r.r &&
        p.t >= r.t &&
        p.b <= r.b
      )
        return;
      regions[i] = envelope(p, i);
      query = boundsIndex(regions);
    },
  };
};
