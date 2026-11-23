import type { Graph } from "./model";
import type { Point } from "plgg-board";
import type { Port } from "./connections";
import type {
  Wire,
  WiringOptions,
} from "./wiring";
import {
  frame,
  required,
  pt,
  distance,
  obstacles,
  gap,
  cross,
  crossing,
  rounded,
  simplify,
  bezier,
  type Box,
} from "plgg-flow/wireGeometry";
const plainTurn = (s: Point, t: Point) =>
  2 *
  Math.atan2(
    1.5 * Math.abs(t.y - s.y),
    Math.max(1, 0.825 * (t.x - s.x)),
  );
const measure = (
  path: Point[],
  boxes: Box[],
  clearance: number,
  corners: number,
  allowance: number,
  exactClearance = false,
) => {
  path = simplify(path);
  const xs = path.map((p) => p.x),
    ys = path.map((p) => p.y);
  const l = Math.min(...xs),
    r = Math.max(...xs),
    t = Math.min(...ys),
    b = Math.max(...ys);
  let length = 0,
    turn = 0,
    angle: number | undefined;
  for (let i = 1; i < path.length; i++) {
    const a = required(path[i - 1]),
      b = required(path[i]);
    length += distance(a, b);
    const next = Math.atan2(b.y - a.y, b.x - a.x);
    if (angle !== undefined)
      turn += Math.abs(
        Math.atan2(
          Math.sin(next - angle),
          Math.cos(next - angle),
        ),
      );
    angle = next;
  }
  let cost =
      length +
      25 *
        (corners ||
          Math.max(0, turn - allowance)),
    minClearance = Infinity,
    hits = 0;
  const near = new Set<Box>();
  for (const box of boxes) {
    if (
      !exactClearance &&
      (box.l > r + clearance ||
        box.r < l - clearance ||
        box.t > b + clearance ||
        box.b < t - clearance)
    )
      continue;
    let closest = Infinity;
    for (let i = 1; i < path.length; i++)
      closest = Math.min(
        closest,
        gap(
          required(path[i - 1]),
          required(path[i]),
          box,
        ),
      );
    minClearance = Math.min(
      minClearance,
      closest,
    );
    if (!closest) {
      cost = Infinity;
      hits++;
    }
    if (!closest || closest < clearance) {
      near.add(box);
      cost += 16 * (clearance - closest) ** 2;
    }
  }
  // In narrow gaps both walls influence the preferred centre line.
  for (const upper of boxes) {
    if (
      upper.r < l ||
      upper.l > r ||
      upper.b > b ||
      upper.b < t - 4 * clearance
    )
      continue;
    for (const lower of boxes) {
      const height = lower.t - upper.b,
        x =
          (Math.max(upper.l, lower.l) +
            Math.min(upper.r, lower.r)) /
          2;
      if (
        height <= 0 ||
        height >= 4 * clearance ||
        upper.r <= lower.l ||
        lower.r <= upper.l
      )
        continue;
      for (let i = 1; i < path.length; i++) {
        const a = required(path[i - 1]),
          b = required(path[i]);
        if (a.x >= x || b.x < x) continue;
        const y =
          a.y +
          ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
        if (y >= upper.b && y <= lower.t)
          cost +=
            12 *
            Math.abs(y - upper.b - height / 2);
      }
    }
  }
  return {
    path,
    l,
    r,
    t,
    b,
    length,
    cost,
    near,
    hits,
    minClearance,
    corners,
  };
};
type Candidate = ReturnType<typeof measure>;
const interaction = (
  p: Candidate,
  q: Candidate,
  clearance: number,
) => {
  let crossings = 0,
    overlap = 0,
    proximity = 0;
  if (
    !(
      p.l > q.r + clearance ||
      q.l > p.r + clearance ||
      p.t > q.b + clearance ||
      q.t > p.b + clearance
    )
  ) {
    for (let i = 1; i < p.path.length; i++) {
      const a = required(p.path[i - 1]),
        b = required(p.path[i]);
      const len = distance(a, b),
        ux = (b.x - a.x) / len,
        uy = (b.y - a.y) / len;
      for (let j = 1; j < q.path.length; j++) {
        const c = required(q.path[j - 1]),
          d = required(q.path[j]);
        if (
          Math.max(a.x, b.x) + clearance <
            Math.min(c.x, d.x) ||
          Math.max(c.x, d.x) + clearance <
            Math.min(a.x, b.x) ||
          Math.max(a.y, b.y) + clearance <
            Math.min(c.y, d.y) ||
          Math.max(c.y, d.y) + clearance <
            Math.min(a.y, b.y)
        )
          continue;
        if (crossing(p.path, i, q.path, j))
          crossings++;
        if (
          Math.abs(
            cross(ux, uy, d.x - c.x, d.y - c.y),
          ) > 1e-6
        )
          continue;
        const sep = Math.abs(
          cross(ux, uy, c.x - a.x, c.y - a.y),
        );
        if (sep >= clearance && sep >= 4)
          continue;
        const start =
            (c.x - a.x) * ux + (c.y - a.y) * uy,
          end =
            (d.x - a.x) * ux + (d.y - a.y) * uy;
        const run =
          Math.min(len, Math.max(start, end)) -
          Math.max(0, Math.min(start, end));
        if (run > 0) {
          if (sep < 4 && run > 12) overlap += run;
          proximity +=
            run *
            Math.max(
              0,
              1 - sep / (clearance || 1),
            ) **
              2 *
            (sep < 4 ? 30 : 0.25);
        }
      }
    }
  }
  return {
    crossings,
    overlap,
    cost: 60 * crossings + proximity,
  };
};
export const wireMetrics = (
  graph: Graph,
  wires: readonly Wire[],
  options: WiringOptions = {},
) => {
  const clearance = options.clearance ?? 18,
    boxes = obstacles(graph),
    tracks: Candidate[] = [];
  let crossings = 0,
    overlap = 0,
    nodeHits = 0,
    cost = 0,
    wander = 0,
    backtrack = 0,
    detour = 0,
    maxCorners = 0,
    minClearance = Infinity,
    minPortGap = Infinity;
  const ends = new Map<string, Point[]>();
  for (const w of wires) {
    const { local } = frame(w.sourceSide);
    const s = local(w.source),
      t = local(w.target),
      c = measure(
        [...w.points],
        boxes.filter(
          (b) =>
            b.id !== w.edge.source &&
            b.id !== w.edge.target,
        ),
        clearance,
        w.corners,
        plainTurn(s, t),
        true,
      );
    cost += c.cost;
    maxCorners = Math.max(maxCorners, w.corners);
    nodeHits += c.hits;
    minClearance = Math.min(
      minClearance,
      c.minClearance,
    );
    const trim = (
      p: Candidate,
      first: boolean,
      last: boolean,
    ) => {
      const path = [...p.path];
      const cut = () => {
        let left = 14;
        while (left > 0 && path.length > 1) {
          const a = required(path[0]),
            b = required(path[1]),
            d = distance(a, b);
          if (d <= left) {
            path.shift();
            left -= d;
          } else {
            path[0] = pt(
              a.x + ((b.x - a.x) * left) / d,
              a.y + ((b.y - a.y) * left) / d,
            );
            break;
          }
        }
      };
      if (first) cut();
      if (last) {
        path.reverse();
        cut();
        path.reverse();
      }
      return { ...p, path };
    };
    for (const [i, q] of tracks.entries()) {
      const other = required(wires[i]);
      const shared = (p: Point, v: Wire) =>
        distance(p, v.source) < 1e-6 ||
        distance(p, v.target) < 1e-6;
      const actual =
        distance(required(c.path[0]), w.source) <
          1e-6 &&
        distance(
          required(q.path[0]),
          other.source,
        ) < 1e-6;
      const m = actual
        ? interaction(
            trim(
              c,
              shared(w.source, other),
              shared(w.target, other),
            ),
            trim(
              q,
              shared(other.source, w),
              shared(other.target, w),
            ),
            clearance,
          )
        : interaction(c, q, clearance);
      crossings += m.crossings;
      overlap += m.overlap;
      cost += m.cost;
    }
    tracks.push(c);
    for (const side of [
      "source",
      "target",
    ] satisfies Port["direction"][]) {
      const key = JSON.stringify([
          side === "source"
            ? w.sourceSide
            : w.targetSide,
          w.edge[side],
        ]),
        group = ends.get(key) ?? [];
      for (const p of group)
        minPortGap = Math.min(
          minPortGap,
          distance(p, w[side]),
        );
      group.push(w[side]);
      ends.set(key, group);
    }
    if (t.x > s.x) {
      wander = Math.max(
        wander,
        c.length /
          (t.x - s.x + Math.abs(t.y - s.y)),
      );
      let peak = s.x;
      for (const p of c.path.map(local)) {
        peak = Math.max(peak, p.x);
        backtrack = Math.max(
          backtrack,
          peak - p.x,
        );
      }
      const plain =
        w.edge.route === "step"
          ? rounded(
              [
                s,
                pt((s.x + t.x) / 2, s.y),
                pt((s.x + t.x) / 2, t.y),
                t,
              ],
              options.radius ?? 10,
            )
          : w.edge.route === "straight"
            ? [s, t]
            : bezier(
                s,
                pt(s.x + (t.x - s.x) * 0.45, s.y),
                pt(t.x - (t.x - s.x) * 0.45, t.y),
                t,
              );
      detour = Math.max(
        detour,
        c.length /
          measure(plain, [], clearance, 0, 0)
            .length,
      );
    }
  }
  return {
    crossings,
    overlap,
    nodeHits,
    cost,
    wander,
    backtrack,
    detour,
    maxCorners,
    minClearance,
    minPortGap,
  };
};
