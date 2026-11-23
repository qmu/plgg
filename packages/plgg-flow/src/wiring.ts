import { refine } from "plgg-flow/wireRefinement";
import { planPorts } from "plgg-flow/wirePorts";
import { shorten } from "plgg-flow/wireShortcut";
import {
  materialize,
  throughKnots,
} from "plgg-flow/wirePath";
import { uncross } from "plgg-flow/wireUncross";
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
  facing,
  rounded,
  normal,
  move,
  cuts,
  free,
  inflate,
  simplify,
  bezier,
  box,
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
  arrow: { at: Point3; toward: Point3 };
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

type CachedRoutes = {
  clearance: number;
  radius: number;
  wires: Wire[];
};
const cache = new WeakMap<
  Graph["nodes"],
  WeakMap<Graph["edges"], CachedRoutes>
>();
// Keep the last layout for small translations during a drag.
const recent = new WeakMap<
  Graph["edges"],
  CachedRoutes & { nodes: Graph["nodes"] }
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
  const previous = recent.get(graph.edges);
  const changed =
    previous &&
    previous.nodes.length ===
      graph.nodes.length &&
    clearance === previous.clearance &&
    radius === previous.radius
      ? graph.nodes.filter(
          (n, i) => previous.nodes[i] !== n,
        )
      : [];
  const moved =
    changed.length === 1 ? changed[0] : undefined;
  const old =
    moved &&
    previous?.nodes.find(
      (n) => n.id === moved.id,
    );
  const shift =
    old &&
    moved &&
    !moved.hidden &&
    !old.hidden &&
    old.position.z === moved.position.z &&
    old.label === moved.label &&
    old.width === moved.width &&
    old.height === moved.height &&
    old.group === moved.group &&
    old.collapsed === moved.collapsed &&
    distance(old.position, moved.position) <= 12
      ? {
          dx: moved.position.x - old.position.x,
          dy: moved.position.y - old.position.y,
          box: box(old),
          id: old.id,
        }
      : undefined;
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
  const {
    rowAxis,
    ordinal,
    plans,
    parallels,
    degree,
  } = planPorts(
    nodes,
    edges,
    boxes,
    shift ? previous?.wires : undefined,
  );
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

  // Nested row skips run in parallel channels, closest first.
  const arches = new Map<Edge, number>();
  if (rowAxis) {
    const along = rowAxis === "y" ? "x" : "y";
    const spans = plans
      .filter(
        ({ a, b }) =>
          a.side === b.side && a.node !== b.node,
      )
      .map(({ edge, a, b }) => ({
        edge,
        side: a.side,
        lo: Math.min(
          a.node.position[along],
          b.node.position[along],
        ),
        hi: Math.max(
          a.node.position[along],
          b.node.position[along],
        ),
      }))
      .sort(
        (a, b) => a.hi - a.lo - (b.hi - b.lo),
      );
    for (const span of spans) {
      let lane = 0;
      for (const other of spans) {
        if (other === span) break;
        if (
          other.side === span.side &&
          other.lo <= span.hi &&
          other.hi >= span.lo
        )
          lane = Math.max(
            lane,
            (arches.get(other.edge) ?? 0) + 1,
          );
      }
      arches.set(span.edge, lane);
    }
  }
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
  // Reserve clear axial corridors before routing the branches that cross them.
  const axial = (a: End, b: End) => {
    if (
      a.side === b.side ||
      vertical(a.side) !== vertical(b.side)
    )
      return false;
    const dx =
        b.node.position.x - a.node.position.x,
      dy = b.node.position.y - a.node.position.y;
    return vertical(a.side)
      ? Math.abs(dx) < 0.08 * Math.abs(dy)
      : Math.abs(dy) < 0.08 * Math.abs(dx);
  };
  const wires = plans
    .slice()
    .sort(
      (p, q) =>
        Number(q.a.node === q.b.node) -
          Number(p.a.node === p.b.node) ||
        Number(
          q.edge.route !== "step" &&
            axial(q.a, q.b),
        ) -
          Number(
            p.edge.route !== "step" &&
              axial(p.a, p.b),
          ),
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
      const prior =
        shift && previous?.wires[index];
      // Preserve an untouched corridor throughout a drag.
      if (
        shift &&
        prior &&
        prior.edge === edge &&
        edge.source !== shift.id &&
        edge.target !== shift.id &&
        free(prior.points, [
          inflate(box(required(moved)), 60),
        ]) &&
        free(prior.points, boxes)
      ) {
        lanes.insert(prior);
        return prior;
      }
      const pair =
        parallels.get(
          JSON.stringify(
            [edge.source, edge.target].sort(),
          ),
        ) ?? [];
      if (
        !edge.waypoints?.length &&
        a.side !== b.side &&
        vertical(a.side) === vertical(b.side) &&
        (vertical(a.side)
          ? Math.abs(s.x - t.x) < 1e-7
          : Math.abs(s.y - t.y) < 1e-7) &&
        free([s, t], boxes) &&
        pair.filter(
          (other) => other.source === edge.source,
        ).length === 1 &&
        !plans.some(
          (other) =>
            other.edge !== edge &&
            other.a.node === b.node &&
            other.b.node === a.node &&
            other.a.side === b.side &&
            other.b.side === a.side,
        )
      ) {
        const wire = materialize(
          edge,
          s,
          t,
          [s, t],
          0,
        );
        lanes.insert(wire);
        return wire;
      }
      const channel = arches.get(edge);
      if (
        !shift &&
        channel !== undefined &&
        !edge.waypoints?.length &&
        (rowAxis === "x" || rowAxis === "y")
      ) {
        const along = rowAxis === "y" ? "x" : "y",
          sign = normal[a.side][rowAxis];
        let boundary = Math.max(
          sign * s[rowAxis],
          sign * t[rowAxis],
        );
        for (const q of boxes) {
          const lo = rowAxis === "y" ? q.l : q.t,
            hi = rowAxis === "y" ? q.r : q.b;
          if (
            hi < Math.min(s[along], t[along]) ||
            lo > Math.max(s[along], t[along])
          )
            continue;
          boundary = Math.max(
            boundary,
            rowAxis === "y"
              ? sign > 0
                ? q.b
                : -q.t
              : sign > 0
                ? q.r
                : -q.l,
          );
        }
        const height =
          sign *
          (boundary +
            Math.max(clearance, 24) +
            10 * channel);
        const path = rounded(
          [
            s,
            { ...s, [rowAxis]: height },
            { ...t, [rowAxis]: height },
            t,
          ],
          24,
        );
        if (free(path, boxes)) {
          const wire = materialize(
            edge,
            s,
            t,
            path,
            2,
          );
          lanes.insert(wire);
          return wire;
        }
      }
      if (
        shift &&
        prior &&
        prior.edge === edge &&
        !edge.waypoints?.length &&
        edge.route !== "step" &&
        edge.route !== "straight"
      ) {
        // Carry the nearby span with the moving card, tapering to fixed sockets.
        const ownA = edge.source === shift.id,
          ownB = edge.target === shift.id;
        const fixed = boxes.filter(
          (q) => q.id !== shift.id,
        );
        const path = prior.points.map((p) => {
          const gap = pointGap(p, shift.box);
          const anchor = Math.min(
            ownA ? Infinity : distance(p, s),
            ownB ? Infinity : distance(p, t),
          );
          const wall = fixed.reduce(
            (d, q) => Math.min(d, pointGap(p, q)),
            Infinity,
          );
          const influence = Math.min(
            wall / 12,
            1,
            Math.max(0, (100 - gap) / 70),
            Math.max(0, (anchor - 14) / 40),
          );
          return pt(
            p.x + shift.dx * influence,
            p.y + shift.dy * influence,
          );
        });
        if (
          !ownA &&
          !ownB &&
          prior.sourceSide === a.side &&
          prior.targetSide === b.side &&
          !free(path, boxes) &&
          free([...prior.points], boxes)
        ) {
          lanes.insert(prior);
          return prior;
        }
        // If a moving card covers a face, reconnect only the end that must move.
        const reconnect = (
          socket: Point,
          stem: Point,
        ) => {
          let best = Infinity,
            index = 1;
          for (
            let i = 1;
            i < path.length - 1;
            i++
          ) {
            const d = distance(
              stem,
              required(path[i]),
            );
            if (
              d < best &&
              free(
                [stem, required(path[i])],
                boxes,
              )
            ) {
              best = d;
              index = i;
            }
          }
          if (Number.isFinite(best))
            path.splice(0, index, socket, stem);
          else path.splice(0, 1, socket, stem);
        };
        if (prior.sourceSide !== a.side)
          reconnect(s, u);
        if (prior.targetSide !== b.side) {
          path.reverse();
          reconnect(t, v);
          path.reverse();
        }
        path[0] = s;
        path[path.length - 1] = t;
        // Slide a contacted section around the card while retaining its distant bends.
        for (const q of boxes) {
          if (free(path, [q])) continue;
          let first = path.findIndex(
            (p, i) =>
              i > 0 &&
              cuts(required(path[i - 1]), p, q),
          );
          if (first < 1) continue;
          while (first < path.length) {
            let last = first;
            while (
              last + 1 < path.length &&
              cuts(
                required(path[last]),
                required(path[last + 1]),
                q,
              )
            )
              last++;
            const left = required(
                path[first - 1],
              ),
              right = required(path[last]);
            const detour = search(
              left,
              right,
              [q],
              false,
            );
            if (!detour) break;
            path.splice(
              first,
              last - first,
              ...detour.slice(1, -1),
            );
            first += detour.length - 1;
            while (
              first < path.length &&
              !cuts(
                required(path[first - 1]),
                required(path[first]),
                q,
              )
            )
              first++;
          }
        }
        if (
          free(path, boxes) &&
          !crossesItself(path)
        ) {
          const wire = materialize(
            edge,
            s,
            t,
            path,
            prior.corners,
          );
          lanes.insert(wire);
          return wire;
        }
      }
      if (edge.waypoints?.length) {
        if (edge.route === "step") {
          // Keep authored knots at their original depth while rounding the spans between them.
          const anchors = [
            { ...u, z: s.z },
            ...edge.waypoints,
            { ...v, z: t.z },
          ];
          const guides = anchors.map((p, i) => {
            const prev = anchors[i - 1],
              next = anchors[i + 1];
            if (!prev || !next)
              return { before: p, after: p };
            const side = facing(
              next.x - prev.x,
              next.y - prev.y,
            );
            const reach = Math.min(
              24,
              distance(p, prev) / 4,
              distance(p, next) / 4,
              ...boxes.map((q) => pointGap(p, q)),
            );
            return {
              before: move(p, side, -reach),
              after: move(p, side, reach),
            };
          });
          const points: Point3[] = [
            s,
            required(anchors[0]),
          ];
          let corners = 0;
          for (
            let i = 1;
            i < anchors.length;
            i++
          ) {
            const left = required(anchors[i - 1]),
              right = required(anchors[i]);
            const begin = required(
                guides[i - 1],
              ).after,
              end = required(guides[i]).before;
            const core = search(
              begin,
              end,
              boxes,
              true,
            ) ?? [begin, pt(begin.x, end.y), end];
            const raw = simplify([
              left,
              ...core,
              right,
            ]);
            const arc = rounded(raw, radius);
            const span = free(arc, boxes)
              ? arc
              : raw;
            corners += Math.max(
              0,
              raw.length - 2,
            );
            const length = span.reduce(
              (sum, p, j) =>
                sum +
                (j
                  ? distance(
                      p,
                      required(span[j - 1]),
                    )
                  : 0),
              0,
            );
            let along = 0;
            for (
              let j = 1;
              j < span.length;
              j++
            ) {
              const p = required(span[j]),
                q = required(span[j - 1]),
                d = distance(p, q),
                n = Math.ceil(d / 12);
              for (let k = 1; k <= n; k++) {
                const f = k / n;
                points.push({
                  x: q.x + (p.x - q.x) * f,
                  y: q.y + (p.y - q.y) * f,
                  z:
                    left.z +
                    ((right.z - left.z) *
                      (along + d * f)) /
                      (length || 1),
                });
              }
              along += d;
            }
            if (length)
              points[points.length - 1] = right;
            else points.push(right);
          }
          points.push(t);
          const wire = {
            edge,
            points,
            corners,
            source: s,
            target: t,
            arrow: {
              at: t,
              toward: {
                ...move(t, b.side, -1),
                z: t.z,
              },
            },
            sourceSide: a.side,
            targetSide: b.side,
          };
          lanes.insert(wire);
          return wire;
        }
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
      const star =
        stars.has(a.node.id) ||
        stars.has(b.node.id);
      if (
        !step &&
        edge.route !== "straight" &&
        a.node !== b.node &&
        list.length === 1 &&
        !(star && families.has(edge)) &&
        (free([u, v], legal) || a.side === b.side)
      ) {
        const arm = Math.max(40, room * 0.45);
        const direct = [
          s,
          ...bezier(
            u,
            move(u, a.side, arm),
            move(v, b.side, arm),
            v,
            Math.max(
              2,
              Math.ceil(
                (3 *
                  Math.max(
                    arm,
                    distance(
                      move(u, a.side, arm),
                      move(v, b.side, arm),
                    ),
                  )) /
                  12,
              ),
            ),
          ),
          t,
        ];
        if (
          free(direct, buffer) &&
          !crossesItself(direct) &&
          (lanes.score(direct, edge, s, t)
            .overlap <= 12 ||
            (room < 40 &&
              a.count === 1 &&
              b.count === 1))
        ) {
          const wire = materialize(
            edge,
            s,
            t,
            direct,
            0,
          );
          lanes.insert(wire);
          return wire;
        }
      }
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
      // A single shared tangent at the via point keeps both halves of a detour smooth.
      if (
        !step &&
        edge.route !== "straight" &&
        a.node !== b.node &&
        !fanOnly &&
        room > 1
      ) {
        const dx = (v.x - u.x) / room,
          dy = (v.y - u.y) / room;
        const centre = pt(
          (u.x + v.x) / 2,
          (u.y + v.y) / 2,
        );
        const bank =
          bus?.sign ??
          (a.rank + b.rank < 0 ? -1 : 1);
        const span = free([u, v], legal)
          ? Math.min(room, 140)
          : room;
        for (const height of [
          0, 0.12, -0.12, 0.25, -0.25, 0.42,
          -0.42, 0.65, -0.65,
        ]
          .map((k) => k * span)
          .concat(
            room > span
              ? [
                  0.25 * room,
                  -0.25 * room,
                  0.42 * room,
                  -0.42 * room,
                ]
              : [],
          )) {
          if (
            Math.abs(height) > 91 &&
            best.length &&
            bestOverlap <= 12
          )
            break;
          const h = height * bank + lens;
          const mid = pt(
            centre.x - dy * h,
            centre.y + dx * h,
          );
          const arm = distance(u, mid) / 3;
          const candidate = [
            s,
            ...bezier(
              u,
              move(u, a.side, arm),
              pt(
                mid.x - dx * arm,
                mid.y - dy * arm,
              ),
              mid,
            ),
            ...bezier(
              mid,
              pt(
                mid.x + dx * arm,
                mid.y + dy * arm,
              ),
              move(v, b.side, arm),
              v,
            ).slice(1),
            t,
          ];
          if (
            !free(
              candidate.slice(1, -1),
              options.clearance === undefined
                ? buffer
                : legal,
            ) ||
            crossesItself(candidate)
          )
            continue;
          const score = lanes.score(
            candidate,
            edge,
            s,
            t,
            bestCost,
          );
          if (score.cost < bestCost) {
            bestCost = score.cost;
            best = candidate;
            bestCorners = 0;
            bestOverlap = score.overlap;
            bestConflicts = score.conflicts;
            choices.push({
              path: candidate,
              corners: 0,
            });
            if (score.clear) break;
          }
        }
      }
      if (
        step &&
        !(star && family) &&
        (Math.max(a.count, b.count) > 2 ||
          list.length > 1) &&
        a.node !== b.node &&
        !bus &&
        vertical(a.side) === vertical(b.side) &&
        a.side !== b.side
      ) {
        const h = !vertical(a.side);
        const world = (
          along: number,
          across: number,
        ) =>
          h
            ? pt(along, across)
            : pt(across, along);
        const x = h ? u.x : u.y,
          y = h ? u.y : u.x,
          X = h ? v.x : v.y,
          Y = h ? v.y : v.x;
        const sign = h
          ? normal[a.side].x
          : normal[a.side].y;
        if ((X - x) * sign > 12) {
          for (const f of [
            0.5, 0.25, 0.75, 0.1, 0.9,
          ]) {
            const m = x + (X - x) * f;
            const branch = (rank: number) =>
              Math.max(1, 9 - Math.abs(rank) * 3);
            const l = x + sign * branch(a.rank),
              r = X - sign * branch(b.rank);
            const lo = y + (a.rank * 8 + lens),
              hi = Y + (b.rank * 8 + lens);
            const raw = simplify([
              s,
              world(l, y),
              world(l, lo),
              world(m, lo),
              world(m, hi),
              world(r, hi),
              world(r, Y),
              t,
            ]);
            const path = rounded(raw, radius);
            if (!free(path, buffer)) continue;
            const score = lanes.score(
              path,
              edge,
              s,
              t,
              bestCost,
            );
            if (score.cost < bestCost) {
              bestCost = score.cost;
              best = path;
              bestCorners = raw.length - 2;
              bestOverlap = score.overlap;
              bestConflicts = score.conflicts;
              choices.push({
                path,
                corners: bestCorners,
              });
            }
            if (score.clear) break;
          }
        }
      }
      if (
        step &&
        a.side === b.side &&
        a.node !== b.node
      ) {
        const h = !vertical(a.side),
          sign = h
            ? normal[a.side].x
            : normal[a.side].y;
        const outer = Math.max(
          sign * (h ? u.x : u.y),
          sign * (h ? v.x : v.y),
        );
        for (const fraction of [
          0.15, 0.24, 0.36, 0.5,
        ]) {
          const level =
            sign *
            (outer +
              Math.max(
                8,
                Math.min(120, room) * fraction,
              ));
          const raw = [
            s,
            h ? pt(level, s.y) : pt(s.x, level),
            h ? pt(level, t.y) : pt(t.x, level),
            t,
          ];
          const path = rounded(raw, radius);
          if (!free(path, buffer)) continue;
          const score = lanes.score(
            path,
            edge,
            s,
            t,
            bestCost,
          );
          if (score.cost < bestCost) {
            best = path;
            bestCost = score.cost;
            bestCorners = 2;
            bestOverlap = score.overlap;
            bestConflicts = score.conflicts;
            choices.push({ path, corners: 2 });
          }
          if (score.clear) break;
        }
      }
      const clearChoice =
        best.length > 0 &&
        lanes.score(best, edge, s, t).clear;
      const bundled =
        fanOnly &&
        (bestOverlap <= 13 ||
          stars.has(a.node.id) ||
          stars.has(b.node.id));
      for (
        let trial = 0;
        trial < (step ? 5 : 3) &&
        !clearChoice &&
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
        f = step
          ? move(
              u,
              a.side,
              Math.min(
                room / 4,
                4 +
                  (a.count / 2 -
                    Math.abs(a.rank)) *
                    4 +
                  trial * 4,
              ),
            )
          : fan(u, a);
        g = step
          ? move(
              v,
              b.side,
              Math.min(
                room / 4,
                4 +
                  (b.count / 2 -
                    Math.abs(b.rank)) *
                    4 +
                  trial * 4,
              ),
            )
          : fan(v, b);
        if (trial && !step) {
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
            ? fillet(
                simplify([
                  s,
                  move(u, a.side, reach),
                  ca,
                  vertical(a.side)
                    ? pt(ca.x, cb.y)
                    : pt(cb.x, ca.y),
                  cb,
                  move(v, b.side, reach),
                  t,
                ]),
                radius,
              )
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
                vertical(a.side)
                  ? pt(
                      move(t, b.side, d).x,
                      move(s, a.side, d).y,
                    )
                  : pt(
                      move(s, a.side, d).x,
                      move(t, b.side, d).y,
                    ),
                move(t, b.side, d),
                t,
              ],
              Math.min(d, step ? radius : 24),
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
          // Open a parallel channel before entering the obstacle search.
          if (step && trial && !route) {
            const left = move(
              f,
              a.side,
              0,
              a.rank * 8 + variant * 8,
            );
            const right = move(
              g,
              b.side,
              0,
              b.rank * 8 + variant * 8,
            );
            if (
              free([u, f, left], padded) &&
              free([right, g, v], padded)
            ) {
              const core = search(
                left,
                right,
                padded,
                true,
              );
              if (core)
                route = [u, f, ...core, g, v];
            }
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
            route = search(u, v, passable, step);
            if (!route)
              throw new Error(
                "No free path between socket stems",
              );
          }
          const raw = simplify([s, ...route, t]);
          corners = Math.max(0, raw.length - 2);
          path = fillet(raw, step ? radius : 36);
          if (!free(path, boxes)) path = raw;
          if (
            !step &&
            edge.route !== "straight" &&
            route.length > 2
          ) {
            const smooth = [
              s,
              ...throughKnots(
                simplify(route),
                a.side,
                b.side,
              ),
              t,
            ];
            if (
              free(
                smooth.slice(1, -1),
                options.clearance === undefined
                  ? buffer
                  : legal,
              ) &&
              !crossesItself(smooth)
            )
              path = smooth;
            else
              path = fair(
                path,
                a.side,
                b.side,
                buffer,
              );
          }
        }
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
        !step &&
        !bundled &&
        bestOverlap > 13 &&
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
        bestOverlap > 14 &&
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
          (!step && before.turn > 6.4) ||
          (!step &&
            (before.kink > 0.65 || before.stiff))
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
          for (const tolerance of [
            Math.max(20, room * 0.09),
            14,
            6,
          ]) {
            const knots = simplifyTrace(
              core,
              tolerance,
            );
            const smooth = [
              s,
              ...throughKnots(
                knots,
                a.side,
                b.side,
              ),
              t,
            ];
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
        wire.points,
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
  if (!shift && !rowAxis)
    refine(
      wires,
      nodes,
      boxes,
      lanes,
      rowAxis,
      ordinal,
      radius,
      clearance,
    );
  if (!shift && !rowAxis) {
    const changed = uncross(
      wires,
      boxes,
      lanes,
      radius,
    );
    shorten(
      wires,
      boxes,
      lanes,
      radius,
      clearance,
    );
    if (
      changed &&
      uncross(wires, boxes, lanes, radius)
    )
      shorten(
        wires,
        boxes,
        lanes,
        radius,
        clearance,
      );
  }
  // A swapped branch may have acquired two facing sockets during refinement.
  for (const [i, w] of wires.entries()) {
    if (
      w.edge.waypoints?.length ||
      w.sourceSide === w.targetSide ||
      vertical(w.sourceSide) !==
        vertical(w.targetSide)
    )
      continue;
    const axis = vertical(w.sourceSide)
      ? "x"
      : "y";
    if (
      Math.abs(w.source[axis] - w.target[axis]) >
        1e-7 ||
      w.points.every(
        (p) =>
          Math.abs(p[axis] - w.source[axis]) <
          1e-7,
      ) ||
      !free([w.source, w.target], boxes)
    )
      continue;
    if (
      wires.some(
        (v) =>
          v !== w &&
          ((v.edge.source === w.edge.source &&
            v.edge.target === w.edge.target) ||
            (v.edge.source === w.edge.target &&
              v.edge.target === w.edge.source &&
              v.sourceSide === w.targetSide &&
              v.targetSide === w.sourceSide)),
      )
    )
      continue;
    wires[i] = materialize(
      w.edge,
      { ...w.source, side: w.sourceSide },
      { ...w.target, side: w.targetSide },
      [w.source, w.target],
      0,
    );
  }
  const departures = new Set(
    wires.map((w) =>
      JSON.stringify([
        w.edge.source,
        w.sourceSide,
      ]),
    ),
  );
  for (const [i, w] of wires.entries()) {
    if (
      !departures.has(
        JSON.stringify([
          w.edge.target,
          w.targetSide,
        ]),
      )
    )
      continue;
    // Measure back along the wire so sampling density cannot move the arrow.
    let remaining = 14;
    for (
      let j = w.points.length - 1;
      j > 0;
      j--
    ) {
      const end = required(w.points[j]),
        start = required(w.points[j - 1]),
        length = distance(start, end);
      if (!length) continue;
      if (length < remaining && j > 1) {
        remaining -= length;
        continue;
      }
      const f = Math.min(1, remaining / length);
      const at = {
        x: end.x + (start.x - end.x) * f,
        y: end.y + (start.y - end.y) * f,
        z: end.z + (start.z - end.z) * f,
      };
      wires[i] = {
        ...w,
        arrow: { at, toward: end },
      };
      break;
    }
  }
  byEdges.set(graph.edges, {
    clearance,
    radius,
    wires,
  });
  recent.set(graph.edges, {
    nodes: graph.nodes,
    wires,
    clearance,
    radius,
  });
  cache.set(graph.nodes, byEdges);
  return wires;
};
