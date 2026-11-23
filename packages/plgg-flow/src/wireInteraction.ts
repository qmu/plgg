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
    let worst = tolerance,
      split = lo;
    for (let k = lo + 1; k < hi; k++) {
      const gap = chordGap(
        required(points[k]),
        a,
        b,
      );
      if (gap > worst) {
        worst = gap;
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
const buildProfile = (wire: Wire) => {
  const path = outline(wire.points);
  return {
    l: Math.min(...path.map((p) => p.x)),
    r: Math.max(...path.map((p) => p.x)),
    t: Math.min(...path.map((p) => p.y)),
    b: Math.max(...path.map((p) => p.y)),
    length: path.reduce(
      (sum, p, i) =>
        sum +
        (i
          ? distance(p, required(path[i - 1]))
          : 0),
      0,
    ),
    turn: path.reduce((sum, p, i) => {
      const a = path[i - 1],
        b = path[i + 1];
      if (!a || !b) return sum;
      const dx = p.x - a.x,
        dy = p.y - a.y,
        x = b.x - p.x,
        y = b.y - p.y;
      return (
        sum +
        Math.abs(
          Math.atan2(
            dx * y - dy * x,
            dx * x + dy * y,
          ),
        )
      );
    }, 0),
    wire,
    path,
    segments: path.slice(1).map((b, i) => {
      const a = required(path[i]),
        d = distance(a, b) || 1;
      return {
        a,
        b,
        i: i + 1,
        x: (b.x - a.x) / d,
        y: (b.y - a.y) / d,
        d,
        l: Math.min(a.x, b.x),
        r: Math.max(a.x, b.x),
        t: Math.min(a.y, b.y),
        bottom: Math.max(a.y, b.y),
      };
    }),
  };
};
const contours = new WeakMap<
  Wire,
  ReturnType<typeof buildProfile>
>();
export const profile = (wire: Wire) => {
  const hit = contours.get(wire);
  if (hit) return hit;
  const result = buildProfile(wire);
  contours.set(wire, result);
  return result;
};
type Contour = ReturnType<typeof profile>;
const chordBlocks = new WeakMap<
  Contour,
  {
    l: number;
    r: number;
    t: number;
    b: number;
    chords: Contour["segments"];
  }[]
>();
const blocksFor = (p: Contour) => {
  const hit = chordBlocks.get(p);
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
  chordBlocks.set(p, blocks);
  return blocks;
};
const measureConflict = (
  u: ReturnType<typeof profile>,
  v: ReturnType<typeof profile>,
  limit = Infinity,
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
  const value = () =>
    intersections * (shared.length ? 45 : 3) +
    Math.max(0, intersections - 1) * 38 +
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
          for (const q of shared) {
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
        contact += band(3.2);
        near += band(6.2);
      }
    }
    if (limit !== Infinity && value() >= limit)
      return limit;
  }
  return value();
};

// Repaired lanes often compare the same unchanged pair on consecutive frames.
const penalties = new WeakMap<
  Contour,
  WeakMap<Contour, number>
>();
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
  let peers = penalties.get(a);
  const old = peers?.get(b);
  if (old !== undefined) {
    if (old >= 0) return old;
    if (-old >= limit) return limit;
  }
  const value = measureConflict(a, b, limit);
  if (!peers) {
    peers = new WeakMap();
    penalties.set(a, peers);
  }
  peers.set(b, value >= limit ? -limit : value);
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
