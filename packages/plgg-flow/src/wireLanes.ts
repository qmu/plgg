import type { Point } from "plgg-board";
import type { Edge } from "./model";
import type { Wire } from "./wiring";
import {
  required,
  pt,
  distance,
} from "plgg-flow/wireGeometry";
// Index short segments so distant wires never enter the lane cost.
const equallySpaced = (
  points: readonly Point[],
  stride: number,
) => {
  const out = [required(points[0])];
  let next = stride;
  for (let i = 1; i < points.length; i++) {
    const a = required(points[i - 1]),
      b = required(points[i]),
      dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy);
    while (next < d) {
      const f = next / d;
      out.push(pt(a.x + dx * f, a.y + dy * f));
      next += stride;
    }
    next -= d;
  }
  out.push(required(points[points.length - 1]));
  return out;
};
export const laneIndex = () => {
  type Segment = {
    a: Point;
    vx: number;
    vy: number;
    inverse: number;
    l: number;
    r: number;
    top: number;
    bottom: number;
    edge: Edge;
    s: Point;
    t: Point;
    id: number;
  };
  const sampled = new WeakMap<
    readonly Point[],
    Point[]
  >();
  const trackFor = (path: readonly Point[]) => {
    const cached = sampled.get(path);
    if (cached) return cached;
    const result = equallySpaced(path, 6);
    sampled.set(path, result);
    return result;
  };
  const footprints = new Map<Edge, Set<number>>();
  const cells = new Map<number, Segment[]>();
  const tileSize = 16;
  const tiles = (
    a: Point,
    b: Point,
    margin: number,
    visit: (key: number) => void,
  ) => {
    for (
      let x = Math.floor(
        (Math.min(a.x, b.x) - margin) / tileSize,
      );
      x <=
      Math.floor(
        (Math.max(a.x, b.x) + margin) / tileSize,
      );
      x++
    )
      for (
        let y = Math.floor(
          (Math.min(a.y, b.y) - margin) /
            tileSize,
        );
        y <=
        Math.floor(
          (Math.max(a.y, b.y) + margin) /
            tileSize,
        );
        y++
      )
        visit(x * 65537 + y);
  };
  let serial = 0;
  const insert = (wire: Wire) => {
    const old = footprints.get(wire.edge);
    if (old)
      for (const k of old) {
        const cell = cells.get(k);
        if (cell)
          cells.set(
            k,
            cell.filter(
              (seg) => seg.edge !== wire.edge,
            ),
          );
      }
    const keys = new Set<number>();
    footprints.set(wire.edge, keys);
    const id = serial++;
    const track = trackFor(wire.points);
    track.forEach((b, i) => {
      const a = track[i - 1];
      if (!a) return;
      const vx = b.x - a.x,
        vy = b.y - a.y,
        den = vx * vx + vy * vy;
      if (!den) return;
      const seg = {
        a,
        vx,
        vy,
        inverse: 1 / den,
        l: Math.min(a.x, b.x) - 6,
        r: Math.max(a.x, b.x) + 6,
        top: Math.min(a.y, b.y) - 6,
        bottom: Math.max(a.y, b.y) + 6,
        edge: wire.edge,
        s: wire.source,
        t: wire.target,
        id,
      };
      tiles(a, b, 4, (k) => {
        keys.add(k);
        const cell = cells.get(k);
        if (cell) cell.push(seg);
        else cells.set(k, [seg]);
      });
    });
  };
  const score = (
    raw: Point[],
    edge: Edge,
    s: Point,
    t: Point,
    limit = Infinity,
  ) => {
    const path =
      raw.length > 2 ? trackFor(raw) : raw;
    let cost = 0,
      conflicts = 0,
      turn = 0,
      kink = 0,
      prevDx = 0,
      prevDy = 0;
    const runs: number[] = [],
      hits: number[] = [];
    let overlap = 0;
    for (let i = 1; i < path.length; i++) {
      if (cost >= limit)
        return {
          turn,
          kink,
          conflicts,
          overlap,
          cost: Infinity,
          clear: false,
        };
      const a = required(path[i - 1]),
        b = required(path[i]),
        dx = b.x - a.x,
        dy = b.y - a.y,
        d = Math.hypot(dx, dy);
      if (d < 0.001) continue;
      cost += d * 0.04;
      if (prevDx || prevDy) {
        const ang = Math.abs(
          Math.atan2(
            prevDx * dy - prevDy * dx,
            prevDx * dx + prevDy * dy,
          ),
        );
        turn += ang;
        kink = Math.max(kink, ang);
      }
      prevDx = dx;
      prevDy = dy;
      const n =
        raw.length > 2 ? 1 : Math.ceil(d / 6);
      for (let j = 1; j <= n; j++) {
        const f = j / n,
          x = a.x + dx * f,
          y = a.y + dy * f,
          px = x - dx / n,
          py = y - dy / n;
        const list = cells.get(
          Math.floor(x / tileSize) * 65537 +
            Math.floor(y / tileSize),
        );
        if (!list) continue;
        let previous = -1;
        for (const seg of list) {
          if (seg.edge === edge) continue;
          const { a: c, vx, vy, id } = seg;
          if (
            x < seg.l ||
            x > seg.r ||
            y < seg.top ||
            y > seg.bottom
          )
            continue;
          const h = Math.max(
            0,
            Math.min(
              1,
              ((x - c.x) * vx + (y - c.y) * vy) *
                seg.inverse,
            ),
          );
          const dist =
            (x - c.x - h * vx) ** 2 +
            (y - c.y - h * vy) ** 2;
          if (
            dist < 10 &&
            (x - s.x) ** 2 + (y - s.y) ** 2 >
              460 &&
            (x - t.x) ** 2 + (y - t.y) ** 2 >
              460 &&
            (x - seg.s.x) ** 2 +
              (y - seg.s.y) ** 2 >
              460 &&
            (x - seg.t.x) ** 2 +
              (y - seg.t.y) ** 2 >
              460 &&
            id !== previous
          ) {
            const old = runs[id] ?? 0,
              run = old + d / n;
            cost +=
              (run - old) * 0.6 +
              (Math.max(0, run - 14) -
                Math.max(0, old - 14)) *
                550;
            runs[id] = run;
            overlap = Math.max(overlap, run);
            previous = id;
          }
          const den2 = dx * vy - dy * vx;
          if (!den2) continue;
          const cx = c.x - px,
            cy = c.y - py;
          const line = (cx * vy - cy * vx) / den2,
            other = (cx * dy - cy * dx) / den2;
          if (
            line > 1e-7 &&
            line < 1 / n - 1e-7 &&
            other > 1e-7 &&
            other < 1 - 1e-7
          ) {
            // Resampling a curved approach can cut a chord across the shared stem.
            const cx = px + line * dx,
              cy = py + line * dy;
            if (
              (((s.x === seg.s.x &&
                s.y === seg.s.y) ||
                (s.x === seg.t.x &&
                  s.y === seg.t.y)) &&
                (cx - s.x) ** 2 +
                  (cy - s.y) ** 2 <=
                  196) ||
              (((t.x === seg.s.x &&
                t.y === seg.s.y) ||
                (t.x === seg.t.x &&
                  t.y === seg.t.y)) &&
                (cx - t.x) ** 2 +
                  (cy - t.y) ** 2 <=
                  196)
            )
              continue;
            const count = hits[id] ?? 0;
            hits[id] = count + 1;
            const sibling =
              seg.edge.source === edge.source ||
              seg.edge.target === edge.target;
            if (
              count === 1 ||
              (!count && sibling)
            )
              conflicts++;
            cost += count || sibling ? 300 : 8;
          }
        }
      }
    }
    return {
      turn,
      kink,
      conflicts,
      overlap,
      cost:
        cost +
        turn * 3 +
        (edge.route === "step"
          ? 0
          : Math.max(0, kink - 0.55) * 450) +
        Math.max(0, turn - 6.5) * 400,
      clear:
        (edge.route === "step" || kink < 0.7) &&
        turn < 6.8 &&
        overlap < 15 &&
        !conflicts &&
        cost < 120 + distance(s, t) * 0.04,
    };
  };
  const toll = (
    a: Point,
    b: Point,
    edge: Edge,
  ) => {
    const dx = b.x - a.x,
      dy = b.y - a.y,
      d = Math.hypot(dx, dy),
      n = Math.max(1, Math.ceil(d / 8));
    let total = 0;
    for (let i = 1; i <= n; i++) {
      const x = a.x + (dx * i) / n,
        y = a.y + (dy * i) / n;
      const cell = cells.get(
        Math.floor(x / tileSize) * 65537 +
          Math.floor(y / tileSize),
      );
      if (!cell) continue;
      let crowd = 0;
      for (const seg of cell) {
        if (
          x < seg.l ||
          x > seg.r ||
          y < seg.top ||
          y > seg.bottom
        )
          continue;
        const h = Math.max(
          0,
          Math.min(
            1,
            ((x - seg.a.x) * seg.vx +
              (y - seg.a.y) * seg.vy) *
              seg.inverse,
          ),
        );
        if (
          (x - seg.a.x - h * seg.vx) ** 2 +
            (y - seg.a.y - h * seg.vy) ** 2 >
          20
        )
          continue;
        const cosine =
          (Math.abs(dx * seg.vx + dy * seg.vy) *
            Math.sqrt(seg.inverse)) /
          d;
        crowd = Math.max(
          crowd,
          cosine > 0.9
            ? 180
            : seg.edge.source === edge.source ||
                seg.edge.target === edge.target
              ? 120
              : 12,
        );
      }
      total += crowd;
    }
    return total;
  };
  return { insert, score, toll };
};
