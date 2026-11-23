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
  return Math.hypot(
    p.x - a.x - t * x,
    p.y - a.y - t * y,
  );
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
export const profile = (wire: Wire) => {
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
export const conflict = (
  u: ReturnType<typeof profile>,
  v: ReturnType<typeof profile>,
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
  for (const a of u.segments)
    for (const b of v.segments) {
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
  return (
    intersections * (shared.length ? 45 : 3) +
    Math.max(0, intersections - 1) * 38 +
    Math.max(0, contact - 11) * 10 +
    Math.max(0, near - 85) * 0.3 +
    contact * 0.12
  );
};
