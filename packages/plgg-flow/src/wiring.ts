import { simplifyTrace } from "plgg-flow/polyline";
import type { Point, Point3 } from "plgg-board";
import type { Graph, Edge } from "./model";
import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import {
  search,
  laneSearch,
} from "plgg-flow/wireSearch";
import {
  type End,
  fanCorridors,
} from "plgg-flow/wireFan";
import { laneIndex } from "plgg-flow/wireLanes";
export type { Side } from "plgg-flow/nodeBody";
export { wireMetrics } from "plgg-flow/wireMetrics";
import {
  vertical,
  required,
  pt,
  distance,
  obstacles,
  pointGap,
  crossesItself,
  rounded,
  normal,
  move,
  facing,
  cuts,
  free,
  inflate,
  simplify,
  bezier,
  type Box,
} from "plgg-flow/wireGeometry";
export type WireStyle = "curve" | "step";
export type WiringOptions = Readonly<{
  clearance?: number;
  radius?: number;
}>;
export type Wire = Readonly<{
  edge: Edge;
  sourceSide: Side;
  targetSide: Side;
  source: Point3;
  target: Point3;
  points: readonly Point3[];
  corners: number;
}>;
// Smooth in arc length so short corner segments do not dominate the tangent.
const fair = (
  path: Point[],
  source: Side,
  target: Side,
  boxes: Box[],
) => {
  const first = required(path[0]),
    last = required(path[path.length - 1]);
  const u = move(first, source, 14),
    v = move(last, target, 14);
  const lens = [0];
  let length = 0,
    sharp = false;
  for (let i = 1; i < path.length; i++) {
    const a = required(path[i - 1]),
      b = required(path[i]);
    length += distance(a, b);
    lens.push(length);
    const c = path[i + 1];
    if (c) {
      const dx = b.x - a.x,
        dy = b.y - a.y,
        vx = c.x - b.x,
        vy = c.y - b.y;
      if (
        dx * vx + dy * vy <
        0.98 *
          Math.hypot(dx, dy) *
          Math.hypot(vx, vy)
      )
        sharp = true;
    }
  }
  if (!sharp || length < 55) return path;
  const span = length - 28,
    count = Math.ceil(span / 6);
  let idx = 1;
  const samples = Array.from(
    { length: count + 1 },
    (_, i) => {
      const at = 14 + (span * i) / count;
      while (
        idx + 1 < lens.length &&
        required(lens[idx]) < at
      )
        idx++;
      const a = required(path[idx - 1]),
        b = required(path[idx]),
        lo = required(lens[idx - 1]),
        f =
          (at - lo) /
          (required(lens[idx]) - lo || 1);
      return pt(
        a.x + (b.x - a.x) * f,
        a.y + (b.y - a.y) * f,
      );
    },
  );
  for (const radius of [5, 3]) {
    const smooth = samples.map((p, i) => {
      let x = 0,
        y = 0,
        sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const q =
            samples[
              Math.min(count, Math.max(0, i + k))
            ] ?? p,
          w = radius + 1 - Math.abs(k);
        x += q.x * w;
        y += q.y * w;
        sum += w;
      }
      return pt(x / sum, y / sum);
    });
    const k = Math.min(
        radius,
        Math.floor(count / 3),
      ),
      arm = Math.min(12, span / 8);
    const shoulder = (
      start: Point,
      side: Side,
      i: number,
      j: number,
    ) => {
      const p = required(smooth[i]),
        q = required(smooth[j]),
        d = distance(p, q) || 1;
      return bezier(
        start,
        move(start, side, arm),
        pt(
          p.x + ((p.x - q.x) * arm) / d,
          p.y + ((p.y - q.y) * arm) / d,
        ),
        p,
        6,
      );
    };
    const result = [
      first,
      ...shoulder(u, source, k, k + 1),
      ...smooth.slice(k + 1, count - k),
      ...shoulder(
        v,
        target,
        count - k,
        count - k - 1,
      ).reverse(),
      last,
    ];
    if (free(result, boxes)) return result;
  }
  return path;
};

const materialize = (
  edge: Edge,
  s: Point3 & { side: Side },
  t: Point3 & { side: Side },
  path: Point[],
  corners: number,
): Wire => {
  const points: Point3[] = [s];
  const total = path.reduce(
    (sum, p, i) =>
      sum +
      (i
        ? distance(p, required(path[i - 1]))
        : 0),
    0,
  );
  let length = 0;
  if (edge.waypoints?.length)
    points.push(
      { ...move(s, s.side, 14), z: s.z },
      ...edge.waypoints,
      { ...move(t, t.side, 14), z: t.z },
      t,
    );
  else {
    for (let j = 1; j < path.length; j++) {
      const a = required(path[j - 1]),
        b = required(path[j]),
        d = distance(a, b),
        steps = Math.ceil(d / 12);
      for (let k = 1; k <= steps; k++) {
        const f = k / steps;
        points.push({
          x: a.x + (b.x - a.x) * f,
          y: a.y + (b.y - a.y) * f,
          z:
            s.z +
            (t.z - s.z) *
              (total > 28
                ? Math.min(
                    1,
                    Math.max(
                      0,
                      (length + d * f - 14) /
                        (total - 28),
                    ),
                  )
                : (length + d * f) /
                  (total || 1)),
        });
      }
      length += d;
    }
    if (points.length === 1) points.push(t);
    points[points.length - 1] = t;
  }
  return {
    edge,
    sourceSide: s.side,
    targetSide: t.side,
    source: s,
    target: t,

    points,
    corners,
  };
};
type CachedRoutes = {
  clearance: number;
  radius: number;
  wires: Wire[];
};
const cache = new WeakMap<
  Graph["nodes"],
  WeakMap<Graph["edges"], CachedRoutes>
>();
export const wireGraph = (
  graph: Graph,
  options: WiringOptions = {},
): readonly Wire[] => {
  const clearance = Math.max(
      0,
      options.clearance ?? 18,
    ),
    radius = Math.max(0, options.radius ?? 10);
  const byEdges =
    cache.get(graph.nodes) ??
    new WeakMap<Graph["edges"], CachedRoutes>();
  const known = byEdges.get(graph.edges);
  if (
    known &&
    known.clearance === clearance &&
    known.radius === radius
  )
    return known.wires;
  const nodes = new Map(
      graph.nodes
        .filter((n) => !n.hidden)
        .map((n) => [n.id, n]),
    ),
    boxes = obstacles(graph);
  const limits = boxes.map((q) => {
    let l = Infinity,
      r = Infinity,
      t = Infinity,
      b = Infinity;
    for (const n of boxes) {
      if (n === q) continue;
      if (n.b >= q.t && n.t <= q.b) {
        if (n.r <= q.l)
          l = Math.min(l, (q.l - n.r) * 0.48);
        if (n.l >= q.r)
          r = Math.min(r, (n.l - q.r) * 0.48);
      }
      if (n.r >= q.l && n.l <= q.r) {
        if (n.b <= q.t)
          t = Math.min(t, (q.t - n.b) * 0.48);
        if (n.t >= q.b)
          b = Math.min(b, (n.t - q.b) * 0.48);
      }
    }
    return { l, r, t, b };
  });
  const edges = graph.edges.filter(
    (e) =>
      !e.hidden &&
      nodes.has(e.source) &&
      nodes.has(e.target),
  );
  // A displaced card does not change the orientation of an established row.
  const aligned = (axis: "x" | "y") => {
    const coords = [...nodes.values()]
      .map((n) => n.position[axis])
      .sort((a, b) => a - b);
    const centre =
      coords[Math.floor(coords.length / 2)] ?? 0;
    return (
      coords.length >= 4 &&
      coords.filter(
        (v) => Math.abs(v - centre) <= 8,
      ).length >=
        coords.length - 1
    );
  };
  const rowAxis = aligned("y")
    ? "y"
    : aligned("x")
      ? "x"
      : undefined;
  const ordered = [...nodes.values()].sort(
    (a, b) =>
      rowAxis === "x"
        ? a.position.y - b.position.y
        : a.position.x - b.position.x,
  );
  const ordinal = new Map(
    ordered.map((n, i) => [n.id, i]),
  );
  const degrees = new Map<string, number>();
  const means = new Map<string, Point>(),
    groups = new Map<string, End[]>(),
    parallels = new Map<string, Edge[]>();
  const key = (id: string, start: boolean) =>
    JSON.stringify([id, start]);
  for (const edge of edges) {
    const pair = JSON.stringify(
      [edge.source, edge.target].sort(),
    );
    const list = parallels.get(pair) ?? [];
    list.push(edge);
    parallels.set(pair, list);
    for (const start of [true, false]) {
      const n = required(
          nodes.get(
            start ? edge.source : edge.target,
          ),
        ),
        p = required(
          nodes.get(
            start ? edge.target : edge.source,
          ),
        );
      const dx = p.position.x - n.position.x,
        dy = p.position.y - n.position.y,
        d = Math.hypot(dx, dy) || 1,
        k = key(n.id, start),
        old = means.get(k) ?? pt(0, 0);
      degrees.set(k, (degrees.get(k) ?? 0) + 1);
      means.set(
        k,
        pt(old.x + dx / d, old.y + dy / d),
      );
    }
  }
  const end = (
    edge: Edge,
    start: boolean,
  ): End => {
    const node = required(
        nodes.get(
          start ? edge.source : edge.target,
        ),
      ),
      peer = required(
        nodes.get(
          start ? edge.target : edge.source,
        ),
      );
    const dx = peer.position.x - node.position.x,
      dy = peer.position.y - node.position.y,
      m = required(
        means.get(key(node.id, start)),
      );
    let side =
      node === peer
        ? start
          ? "right"
          : "top"
        : facing(m.x, m.y);
    if (
      node !== peer &&
      (Math.hypot(m.x, m.y) < 0.4 ||
        dx * normal[side].x +
          dy * normal[side].y <
          0.12 * Math.hypot(dx, dy))
    )
      side = facing(dx, dy);
    const other = required(
      means.get(key(peer.id, !start)),
    );
    if (
      node !== peer &&
      degrees.get(key(node.id, start)) === 1 &&
      (degrees.get(key(peer.id, !start)) ?? 0) > 1
    ) {
      const alt = facing(-other.x, -other.y);
      if (
        normal[alt].x * dx + normal[alt].y * dy >
        Math.hypot(dx, dy) * 0.35
      )
        side = alt;
    }
    if (node !== peer && rowAxis) {
      const along = rowAxis === "y" ? dx : dy;
      if (
        Math.abs(along) >
        0.2 * Math.hypot(dx, dy)
      )
        side =
          rowAxis === "y"
            ? facing(dx, 0)
            : facing(0, dy);
    }
    const socket = portPosition(node, side, 0);
    if (
      boxes.some(
        (q) =>
          q.id !== node.id &&
          cuts(socket, move(socket, side, 15), q),
      )
    ) {
      const choices = [
        "left",
        "right",
        "top",
        "bottom",
      ] satisfies Side[];
      const next = choices
        .filter(
          (k) =>
            dx * normal[k].x + dy * normal[k].y >=
            0,
        )
        .sort(
          (a, b) =>
            dx * (normal[b].x - normal[a].x) +
            dy * (normal[b].y - normal[a].y),
        )
        .find((k) => {
          const p = portPosition(node, k, 0);
          return !boxes.some(
            (q) =>
              q.id !== node.id &&
              cuts(p, move(p, k, 16), q),
          );
        });
      if (next) side = next;
    }
    const k = JSON.stringify([node.id, side]),
      list = groups.get(k) ?? [];
    const result = {
      node,
      peer,
      side,
      rank: 0,
      count: 1,
    };
    list.push(result);
    groups.set(k, list);
    return result;
  };
  const plans = edges.map((edge) => ({
    edge,
    a: end(edge, true),
    b: end(edge, false),
  }));
  for (const group of groups.values()) {
    const angle = (e: End) => {
      const dx =
          e.peer.position.x - e.node.position.x,
        dy =
          e.peer.position.y - e.node.position.y;
      return Math.atan2(
        vertical(e.side) ? dx : dy,
        dx * normal[e.side].x +
          dy * normal[e.side].y,
      );
    };
    group.sort((a, b) => angle(a) - angle(b));
    group.forEach((e, i) => {
      e.count = group.length;
      e.rank = i - (group.length - 1) / 2;
    });
  }
  // Nest collinear skips in channels, with shorter spans nearest the row.
  type Bus = { sign: number; lane: number };
  const buses = new Map<Edge, Bus>();
  const rows = new Map<string, typeof plans>();
  for (const plan of plans) {
    const { a, b } = plan,
      v = vertical(a.side),
      axis = v ? "x" : "y",
      along = v ? "y" : "x";
    if (
      a.side === b.side ||
      v !== vertical(b.side) ||
      (Math.abs(
        a.node.position[axis] -
          b.node.position[axis],
      ) > 12 &&
        rowAxis !== axis)
    )
      continue;
    const lo = Math.min(
        a.node.position[along],
        b.node.position[along],
      ),
      hi = Math.max(
        a.node.position[along],
        b.node.position[along],
      );
    if (
      !graph.nodes.some(
        (n) =>
          !n.hidden &&
          !n.group &&
          (Math.abs(
            n.position[axis] -
              (a.node.position[axis] +
                b.node.position[axis]) /
                2,
          ) <= 18 ||
            rowAxis === axis) &&
          n.position[along] > lo &&
          n.position[along] < hi,
      )
    )
      continue;
    const k =
        rowAxis === axis
          ? axis
          : axis +
            Math.round(
              (a.node.position[axis] +
                b.node.position[axis]) /
                32,
            ),
      row = rows.get(k) ?? [];
    row.push(plan);
    rows.set(k, row);
  }
  for (const row of rows.values()) {
    const span = (p: (typeof row)[number]) =>
      rowAxis
        ? Math.abs(
            required(ordinal.get(p.a.node.id)) -
              required(ordinal.get(p.b.node.id)),
          )
        : distance(
            p.a.node.position,
            p.b.node.position,
          );
    row.sort((p, q) => span(p) - span(q));
    const used: {
      lo: number;
      hi: number;
      sign: number;
      lane: number;
    }[] = [];
    for (const { edge, a, b } of row) {
      const axis = vertical(a.side) ? "y" : "x",
        lo = Math.min(
          a.node.position[axis],
          b.node.position[axis],
        ),
        hi = Math.max(
          a.node.position[axis],
          b.node.position[axis],
        );
      let best = Infinity,
        choice = { sign: -1, lane: 0 };
      for (const sign of [-1, 1]) {
        let lane = 0,
          crossings = 0;
        for (const q of used) {
          if (
            q.sign !== sign ||
            q.lo >= hi ||
            q.hi <= lo
          )
            continue;
          lane = Math.max(lane, q.lane + 1);
          if (
            (q.lo < lo && q.hi < hi) ||
            (q.lo > lo && q.hi > hi)
          )
            crossings++;
        }
        const cost = crossings * 8 + lane;
        if (cost < best) {
          best = cost;
          choice = { sign, lane };
        }
      }
      used.push({ lo, hi, ...choice });
      buses.set(edge, choice);
    }
  }

  const degree = (id: string) =>
    (degrees.get(key(id, true)) ?? 0) +
    (degrees.get(key(id, false)) ?? 0);
  const stars = new Set(nodes.keys());
  for (const edge of edges) {
    if (degree(edge.source) !== 1)
      stars.delete(edge.target);
    if (degree(edge.target) !== 1)
      stars.delete(edge.source);
  }
  const families = fanCorridors(
    plans,
    boxes,
    radius,
  );
  const lanes = laneIndex();
  const alternatives = new Map<
    Edge,
    { path: Point[]; corners: number }[]
  >();

  const order = new Map(
    edges.map((edge, i) => [edge, i]),
  );
  const wires = plans
    .slice()
    .sort(
      (p, q) =>
        Number(q.a.node === q.b.node) -
        Number(p.a.node === p.b.node),
    )
    .map(({ edge, a, b }) => {
      const index = required(order.get(edge));
      const s = {
          ...portPosition(a.node, a.side, 0),
          side: a.side,
        },
        t = {
          ...portPosition(b.node, b.side, 0),
          side: b.side,
        };
      const u = move(s, a.side, 14),
        v = move(t, b.side, 14);
      if (edge.waypoints?.length) {
        const manual = materialize(
          edge,
          s,
          t,
          [],
          0,
        );
        lanes.insert(manual);
        return manual;
      }
      const step = edge.route === "step",
        list = required(
          parallels.get(
            JSON.stringify(
              [edge.source, edge.target].sort(),
            ),
          ),
        ),
        lens =
          (list.indexOf(edge) -
            (list.length - 1) / 2) *
          12;
      const room = distance(u, v);
      const bus = buses.get(edge);
      const fan = (o: Point, e: End) => {
        const reach = Math.min(room * 0.14, 32);
        return move(
          o,
          e.side,
          reach,
          reach *
            Math.tan(
              e.rank *
                Math.min(0.42, 2.35 / e.count),
            ),
        );
      };
      let f = fan(u, a),
        g = fan(v, b);
      let best: Point[] = [];
      let bestCost = Infinity,
        bestCorners = 0,
        bestOverlap = Infinity,
        bestConflicts = Infinity;
      const legal = boxes.map((q) =>
        inflate(
          q,
          Math.min(
            clearance,
            pointGap(u, q),
            pointGap(v, q),
            q.id === a.node.id ||
              q.id === b.node.id
              ? 8
              : Infinity,
          ),
        ),
      );
      const buffer = boxes.map((q) =>
        q.id === a.node.id || q.id === b.node.id
          ? q
          : inflate(
              q,
              Math.min(
                7,
                pointGap(s, q),
                pointGap(t, q),
                pointGap(u, q),
                pointGap(v, q),
              ),
            ),
      );
      const fillet = (
        raw: Point[],
        radius: number,
      ) => {
        for (const fraction of [
          1, 0.7, 0.45, 0.25,
        ]) {
          const arc = rounded(
            raw,
            radius * fraction,
          );
          if (free(arc, buffer)) return arc;
        }
        return raw;
      };
      const choices: {
        path: Point[];
        corners: number;
      }[] = [];
      alternatives.set(edge, choices);
      const family = families.get(edge);
      const fanOnly =
        !bus &&
        family !== undefined &&
        Math.max(a.count, b.count) >= 5 &&
        Math.min(a.count, b.count) === 1;
      if (family && !bus) {
        choices.push({
          path: family,
          corners: 0,
        });
        const score = lanes.score(
          family,
          edge,
          s,
          t,
        );
        best = family;
        bestCost = score.cost;
        bestOverlap = score.overlap;
        bestConflicts = score.conflicts;
      }
      const bundled =
        fanOnly &&
        (bestOverlap <= 13 ||
          stars.has(a.node.id) ||
          stars.has(b.node.id));
      for (
        let trial = 0;
        trial < 5 &&
        !bundled &&
        !(
          family &&
          !bus &&
          bestOverlap <= 12 &&
          !bestConflicts
        );
        trial++
      ) {
        const variant =
          Math.ceil(trial / 2) *
          (trial % 2 ? 1 : -1);
        const pad = Math.max(
          7,
          clearance +
            (index % 5) * 3 +
            Math.abs(variant) * 7,
        );
        f = fan(u, a);
        g = fan(v, b);
        if (trial) {
          if (a.count === 1)
            f = move(f, a.side, 0, variant * 6);
          if (b.count === 1)
            g = move(g, b.side, 0, variant * 6);
        }

        const padded = boxes.map((q, i) => {
          const m = required(limits[i]),
            d = Math.min(
              q.id === a.node.id ||
                q.id === b.node.id
                ? 10
                : pad,
              pointGap(u, q),
              pointGap(v, q),
            );
          return {
            ...q,
            l: q.l - Math.min(d, m.l),
            r: q.r + Math.min(d, m.r),
            t:
              q.t -
              Math.min(
                d +
                  (variant > 0
                    ? variant * 10
                    : 0),
                m.t,
              ),
            b:
              q.b +
              Math.min(
                d +
                  (variant < 0
                    ? -variant * 10
                    : 0),
                m.b,
              ),
          };
        });

        if (!free([u, f], padded)) f = u;
        if (!free([v, g], padded)) g = v;
        let path: Point[] = [];
        if (
          !bus &&
          !trial &&
          list.length > 1 &&
          a.side !== b.side &&
          vertical(a.side) === vertical(b.side)
        ) {
          // Reciprocal edges use the same world-space lane ordering.
          const reach = Math.min(32, room * 0.2);
          const ca = move(u, a.side, reach, lens),
            cb = move(v, b.side, reach, lens);
          const bow = step
            ? fillet([s, u, ca, cb, v, t], radius)
            : [
                s,
                ...bezier(
                  u,
                  move(u, a.side, reach * 0.35),
                  move(ca, a.side, -reach * 0.4),
                  ca,
                ),
                cb,
                ...bezier(
                  cb,
                  move(cb, b.side, -reach * 0.4),
                  move(v, b.side, reach * 0.35),
                  v,
                ).slice(1),
                t,
              ];
          if (free(bow, buffer)) path = bow;
        }
        if (bus) {
          const horiz = !vertical(a.side),
            axis = horiz ? "y" : "x";
          const near = boxes.filter((q) =>
            horiz
              ? q.l < Math.max(u.x, v.x) &&
                q.r > Math.min(u.x, v.x) &&
                (rowAxis === axis ||
                  (q.t <= u.y && q.b >= u.y))
              : q.t < Math.max(u.y, v.y) &&
                q.b > Math.min(u.y, v.y) &&
                (rowAxis === axis ||
                  (q.l <= u.x && q.r >= u.x)),
          );
          const bank = bus.sign;
          const boundary =
            bank < 0
              ? Math.min(
                  s[axis],
                  ...near.map((q) =>
                    horiz ? q.t : q.l,
                  ),
                )
              : Math.max(
                  s[axis],
                  ...near.map((q) =>
                    horiz ? q.b : q.r,
                  ),
                );
          const parallel = boxes.filter((q) =>
            horiz
              ? q.l < Math.max(u.x, v.x) &&
                q.r > Math.min(u.x, v.x)
              : q.t < Math.max(u.y, v.y) &&
                q.b > Math.min(u.y, v.y),
          );
          const other = parallel
            .map((q) =>
              bank < 0
                ? horiz
                  ? q.b
                  : q.r
                : horiz
                  ? q.t
                  : q.l,
            )
            .filter(
              (v) => bank * (v - boundary) > 0,
            );
          const space = Math.min(
            Infinity,
            ...other.map(
              (v) => Math.abs(v - boundary) / 2,
            ),
          );
          const lane =
            boundary +
            bank *
              Math.min(
                space,
                Math.max(8, clearance) +
                  bus.lane * 14 +
                  variant * 3,
              );
          const channel = (p: Point, e: End) => {
            const arm = move(
              p,
              e.side,
              Math.max(
                11,
                14 - bus.lane * 2 + variant * 2,
              ),
            );
            return horiz
              ? pt(arm.x, lane)
              : pt(lane, arm.y);
          };
          const ca = channel(u, a),
            cb = channel(v, b);
          const raw = [
            s,
            horiz ? pt(ca.x, u.y) : pt(u.x, ca.y),
            ca,
            cb,
            horiz ? pt(cb.x, v.y) : pt(v.x, cb.y),
            t,
          ];
          const arc = fillet(raw, step ? 10 : 38);
          if (free(arc, buffer)) path = arc;
        }
        if (!path.length) {
          if (a.node === b.node) {
            const d =
              32 + list.indexOf(edge) * 12;
            path = rounded(
              [
                s,
                move(s, a.side, d),
                pt(s.x + d, t.y - d),
                move(t, b.side, d),
                t,
              ],
              Math.min(d, 24),
            );
            if (!free(path, boxes)) path = [];
          } else if (edge.route === "straight")
            path = free([u, v], legal)
              ? [s, u, v, t]
              : [];
          else if (!step) {
            const arm = Math.min(room * 0.38, 90);
            const mid = pt(
              (u.x + v.x) / 2 +
                (vertical(a.side) ? lens * 2 : 0),
              (u.y + v.y) / 2 +
                (vertical(a.side) ? 0 : lens * 2),
            );
            const control = (p: Point, e: End) =>
              move(
                p,
                e.side,
                arm,
                e.rank * Math.min(22, room / 12) +
                  (variant *
                    Math.min(16, room / 12)) /
                    (1 + Math.abs(e.rank)),
              );
            const bend = (
              stem: Point,
              guide: Point,
              e: End,
            ) => {
              const dx = guide.x - stem.x,
                dy = guide.y - stem.y;
              return bezier(
                stem,
                move(
                  stem,
                  e.side,
                  Math.min(
                    8,
                    distance(stem, guide) / 3,
                  ),
                ),
                pt(
                  guide.x - dx / 3,
                  guide.y - dy / 3,
                ),
                guide,
                5,
              );
            };
            const extend = (
              p: Point,
              o: Point,
              e: End,
            ) => {
              const dx = p.x - o.x,
                dy = p.y - o.y,
                d = Math.hypot(dx, dy);
              if (d < 1 || e.count === 1)
                return control(p, e);
              const reach = Math.min(
                arm,
                d * 0.85,
              );
              return pt(
                p.x + (reach * dx) / d,
                p.y + (reach * dy) / d,
              );
            };
            const useFan =
              !bus &&
              (a.count > 1 || b.count > 1);
            if (useFan) {
              const fc = extend(f, u, a),
                gc = extend(g, v, b);
              const core = lens
                ? [
                    ...bezier(
                      f,
                      fc,
                      pt(
                        mid.x - (g.x - f.x) / 6,
                        mid.y - (g.y - f.y) / 6,
                      ),
                      mid,
                    ),
                    ...bezier(
                      mid,
                      pt(
                        mid.x + (g.x - f.x) / 6,
                        mid.y + (g.y - f.y) / 6,
                      ),
                      gc,
                      g,
                    ).slice(1),
                  ]
                : bezier(f, fc, gc, g);
              path = [
                s,
                ...bend(u, f, a),
                ...core,
                ...bend(v, g, b).reverse(),
                t,
              ];
            } else
              path = [
                s,
                u,
                ...bezier(
                  u,
                  control(u, a),
                  control(v, b),
                  v,
                ),
                v,
                t,
              ];
            if (!free(path.slice(1, -1), legal))
              path = [];
          }
        }
        let corners = 0;
        if (!path.length) {
          let route: Point[] | undefined;
          if (
            step &&
            a.side !== b.side &&
            vertical(a.side) === vertical(b.side)
          ) {
            const horizontal = !vertical(a.side),
              mid =
                (horizontal
                  ? f.x + g.x
                  : f.y + g.y) /
                  2 +
                (a.rank + b.rank) * 5 +
                variant * 8;
            const jog = horizontal
              ? [
                  u,
                  f,
                  pt(mid, f.y),
                  pt(mid, g.y),
                  g,
                  v,
                ]
              : [
                  u,
                  f,
                  pt(f.x, mid),
                  pt(g.x, mid),
                  g,
                  v,
                ];
            if (free(jog, padded) && !lens)
              route = jog;
          }
          if (!route) {
            for (const padding of [
              padded,
              legal,
              boxes,
            ]) {
              const core = search(
                f,
                g,
                padding,
                step,
              );
              if (core) {
                route = [u, ...core, v];
                break;
              }
            }
          }
          if (!route) {
            // An enclosed socket can exit only after crossing its overlapping card.
            const passable = boxes.filter(
              (q) =>
                !cuts(u, u, q) && !cuts(v, v, q),
            );
            route =
              search(u, v, passable, step) ??
              search(u, v, passable, false);
            if (!route)
              throw new Error(
                "No free path between socket stems",
              );
          }
          const raw = simplify([s, ...route, t]);
          corners = Math.max(0, raw.length - 2);
          path = fillet(raw, step ? radius : 36);
          if (!free(path, boxes)) path = raw;
        }
        if (
          !bus &&
          !step &&
          edge.route !== "straight"
        )
          path = fair(
            simplify(path),
            a.side,
            b.side,
            buffer,
          );
        const score = lanes.score(
          path,
          edge,
          s,
          t,
          bestCost,
        );
        choices.push({ path, corners });
        const cost =
          score.cost + Math.abs(variant) * 0.5;
        if (cost < bestCost) {
          bestCost = cost;
          best = path;
          bestCorners = corners;
          bestOverlap = score.overlap;
          bestConflicts = score.conflicts;
        }
        if (
          score.clear ||
          a.node === b.node ||
          edge.waypoints?.length
        )
          break;
      }
      let path = best;
      if (
        !bundled &&
        bestCost > 250 &&
        a.node !== b.node &&
        !edge.waypoints?.length &&
        edge.route !== "straight"
      ) {
        // Slide the free span along its normal while keeping both stems fixed.
        const fixed = [
          s,
          u,
          ...best.filter(
            (p) =>
              distance(p, s) > 14.001 &&
              distance(p, t) > 14.001,
          ),
          v,
          t,
        ];
        const samples = fixed.flatMap((p, i) => {
          const q = fixed[i + 1];
          if (!q) return [p];
          const n = Math.max(
            1,
            Math.ceil(distance(p, q) / 10),
          );
          return Array.from(
            { length: n },
            (_, k) =>
              pt(
                p.x + ((q.x - p.x) * k) / n,
                p.y + ((q.y - p.y) * k) / n,
              ),
          );
        });
        const safe = boxes.map((q) =>
          inflate(
            q,
            Math.min(
              6,
              pointGap(u, q),
              pointGap(v, q),
            ),
          ),
        );
        const allowed = samples.map((p) =>
          safe.filter((q) => pointGap(p, q) < 45),
        );
        for (const offset of [
          -8, 8, -16, 16, -26, 26, -36, 36,
        ]) {
          const shifted = samples.map((p, i) => {
            const prev =
                samples[Math.max(0, i - 3)],
              next =
                samples[
                  Math.min(
                    samples.length - 1,
                    i + 3,
                  )
                ];
            const z =
              Math.min(
                distance(p, s),
                distance(p, t),
              ) - 14;
            if (!prev || !next || z <= 0)
              return p;
            const dx = next.x - prev.x,
              dy = next.y - prev.y,
              d = Math.hypot(dx, dy) || 1;
            let scale =
              (Math.min(1, z / 22) * offset) / d;
            const nearby = allowed[i] ?? [];
            while (Math.abs(scale) * d > 0.5) {
              const q = pt(
                p.x - dy * scale,
                p.y + dx * scale,
              );
              if (
                !nearby.some((box) =>
                  cuts(p, q, box),
                )
              )
                return q;
              scale *= 0.5;
            }
            return p;
          });
          if (!free(shifted, buffer)) continue;
          const scored = lanes.score(
            shifted,
            edge,
            s,
            t,
            bestCost,
          );
          if (scored.cost >= bestCost) continue;
          if (crossesItself(shifted)) continue;
          choices.push({
            path: shifted,
            corners: bestCorners,
          });
          if (scored.cost < bestCost) {
            bestCost = scored.cost;
            path = shifted;
            bestOverlap = scored.overlap;
            bestConflicts = scored.conflicts;
          }
          if (scored.clear) break;
        }
      }
      if (
        !bundled &&
        (bestOverlap > 14 || bestConflicts > 0) &&
        a.node !== b.node &&
        !edge.waypoints?.length &&
        edge.route !== "straight"
      ) {
        const clear = boxes.map((q) =>
          inflate(
            q,
            Math.min(
              8,
              pointGap(u, q),
              pointGap(v, q),
            ),
          ),
        );
        const toll = (p: Point, q: Point) =>
          lanes.toll(p, q, edge);
        const core = laneSearch(
          u,
          v,
          clear,
          step,
          normal[a.side],
          normal[b.side],
          toll,
        );
        if (core) {
          const raw = simplify([s, ...core, t]),
            smooth = fillet(
              raw,
              step ? radius : 32,
            );
          const base = free(smooth, boxes)
            ? smooth
            : raw;
          const candidate = step
            ? base
            : fair(base, a.side, b.side, buffer);
          choices.push({
            path: candidate,
            corners: raw.length - 2,
          });
          const score = lanes.score(
            candidate,
            edge,
            s,
            t,
          );
          if (score.cost < bestCost) {
            path = candidate;
            bestCorners = raw.length - 2;
          }
        }
      }
      if (
        !edge.waypoints?.length &&
        edge.route !== "straight" &&
        a.node !== b.node
      ) {
        const before = lanes.score(
          path,
          edge,
          s,
          t,
        );
        if (
          before.turn > 6.4 ||
          (!step && before.kink > 0.68)
        ) {
          const core = [
            u,
            ...path.filter(
              (p) =>
                distance(p, s) > 14.01 &&
                distance(p, t) > 14.01,
            ),
            v,
          ].map((p) => ({ ...p, z: 0 }));
          for (const tolerance of [3, 7, 14]) {
            const knots = [
              s,
              ...simplifyTrace(core, tolerance),
              t,
            ];
            const smooth = step
              ? fillet(knots, radius)
              : fair(
                  fillet(knots, 30),
                  a.side,
                  b.side,
                  buffer,
                );
            if (
              !free(smooth, buffer) ||
              crossesItself(smooth)
            )
              continue;
            const score = lanes.score(
              smooth,
              edge,
              s,
              t,
            );
            if (
              score.cost + 3 < before.cost &&
              score.overlap <=
                Math.max(13, before.overlap) &&
              score.conflicts <= before.conflicts
            ) {
              choices.push({
                path: smooth,
                corners: bestCorners,
              });
              path = smooth;
              break;
            }
          }
        }
      }
      const wire = materialize(
        edge,
        s,
        t,
        path,
        bestCorners,
      );
      lanes.insert(wire);
      return wire;
    })
    .sort(
      (p, q) =>
        required(order.get(p.edge)) -
        required(order.get(q.edge)),
    );
  // Later wires can make an earlier detour unnecessary.
  for (let i = wires.length - 1; i >= 0; i--) {
    const wire = required(wires[i]),
      choices = alternatives.get(wire.edge);
    if (
      !choices ||
      choices.length < 2 ||
      wire.edge.waypoints?.length
    )
      continue;
    const s = {
        ...wire.source,
        side: wire.sourceSide,
      },
      t = {
        ...wire.target,
        side: wire.targetSide,
      };
    let best = lanes.score(
        [...wire.points],
        wire.edge,
        s,
        t,
      ),
      updated: Wire | undefined;
    if (best.clear) continue;
    for (const choice of choices) {
      const next = lanes.score(
        choice.path,
        wire.edge,
        s,
        t,
        best.cost,
      );
      if (
        next.cost + 10 >= best.cost ||
        next.overlap > Math.max(14, best.overlap)
      )
        continue;
      best = next;
      updated = materialize(
        wire.edge,
        s,
        t,
        choice.path,
        choice.corners,
      );
      if (next.clear) break;
    }
    if (updated) {
      wires[i] = updated;
      lanes.insert(updated);
    }
  }
  byEdges.set(graph.edges, {
    clearance,
    radius,
    wires,
  });
  cache.set(graph.nodes, byEdges);
  return wires;
};
