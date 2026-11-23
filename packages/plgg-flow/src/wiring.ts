import {
  outline,
  chordGap,
} from "plgg-flow/wireInteraction";
import {
  cache,
  pathValues,
} from "plgg-flow/wireMemo";
import { type Point3 } from "plgg-board";
import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import { type Edge, type Graph } from "./model";
import {
  required,
  distance,
  obstacles,
  move,
  free,
  inflate,
} from "plgg-flow/wireGeometry";
import {
  corridor,
  boundsIndex,
} from "plgg-flow/wireCorridors";
import {
  basePath,
  type Base,
} from "plgg-flow/wireBase";
import { separate } from "plgg-flow/wireSeparation";
import { planPorts } from "plgg-flow/wirePorts";
export type { Side } from "plgg-flow/nodeBody";
export { wireMetrics } from "plgg-flow/wireMetrics";
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
let serial = 0;
const geometryTokens = cache<number>(4096);
const rememberBase = cache<{
  wire: Base;
  token: number;
}>();
const rememberChannel = cache<Wire[]>();
let memo:
  | {
      key: string;
      wires: Wire[];
      edges: Edge[];
      knots: Point3[];
    }
  | undefined;
export const wireGraph = (
  graph: Graph,
  options: WiringOptions = {},
): readonly Wire[] => {
  const clearance = Math.max(
      0,
      options.clearance ?? 18,
    ),
    radius = Math.max(0, options.radius ?? 10);
  const key = JSON.stringify([
    graph.nodes,
    graph.edges,
    clearance,
    options.clearance === undefined,
    radius,
  ]);
  // Routes expose the caller's edge and waypoint objects.
  const knots = graph.edges.flatMap(
    (edge) => edge.waypoints ?? [],
  );
  if (
    memo?.key === key &&
    memo.knots.every((p, i) => p === knots[i]) &&
    memo.edges.every(
      (edge, i) => edge === graph.edges[i],
    )
  )
    return memo.wires;
  const byId = new Map(
    graph.nodes
      .filter((n) => !n.hidden)
      .map((n) => [n.id, n]),
  );
  const visible = graph.edges.filter(
    (e) =>
      !e.hidden &&
      byId.has(e.source) &&
      byId.has(e.target),
  );
  // Each occurrence owns a lane even for a repeated edge object.
  const boxes = obstacles(graph);
  const query = boundsIndex(boxes);
  const ports = planPorts(
    byId,
    visible.map((e) => ({ ...e })),
    query,
  );

  // Base paths depend only on the chosen sockets and nearby node boxes.
  const bases = ports.plans.map(
    ({ edge, a, b }) => {
      const s = {
          ...portPosition(a.node, a.side, 0),
          side: a.side,
        },
        t = {
          ...portPosition(b.node, b.side, 0),
          side: b.side,
        };
      const bounds = corridor(
        [s, t, ...(edge.waypoints ?? [])],
        3 * clearance,
      );
      const nearby = query(bounds);
      for (;;) {
        const key = JSON.stringify([
          edge.source,
          edge.target,
          edge.route,
          s,
          t,
          clearance,
          radius,
          nearby,
        ]);
        const build = () => {
          const wire = basePath(
            edge,
            s,
            t,
            nearby,
            clearance,
            radius,
          );
          const shape =
            JSON.stringify([
              edge.source,
              edge.target,
              edge.route,
              s,
              t,
              wire.corners,
              wire.spine,
              radius,
            ]) + pathValues(wire.points);
          return {
            wire,
            token: geometryTokens(
              shape,
              () => ++serial,
            ),
          };
        };
        const result = edge.waypoints?.length
          ? build()
          : rememberBase(key, build);
        const w = result.wire;
        const area = corridor(
          w.points,
          clearance,
        );
        const extra = query(area).filter(
          (q) =>
            !nearby.includes(q) &&
            !free(w.points, [
              inflate(q, clearance),
            ]),
        );
        if (!extra.length)
          return {
            wire: { ...w, edge },
            token: result.token,
            bounds: corridor(
              w.points,
              Math.max(
                18,
                5 * Math.max(a.count, b.count),
              ),
            ),
          };
        nearby.push(...extra);
      }
    },
  );
  const regions = bases.map((base, i) => ({
    ...base.bounds,
    i,
  }));
  // Transverse crossings do not bind independent lanes together.
  const parent = regions.map((r) => r.i);
  const root = (i: number): number => {
    let n = i;
    while (required(parent[n]) !== n)
      n = required(parent[n]);
    while (i !== n) {
      const next = required(parent[i]);
      parent[i] = n;
      i = next;
    }
    return n;
  };
  const sockets = new Map<string, number>();
  const segments = bases.flatMap(
    ({ wire }, i) => {
      for (const key of [
        JSON.stringify([
          wire.source.x,
          wire.source.y,
        ]),
        JSON.stringify([
          wire.target.x,
          wire.target.y,
        ]),
        JSON.stringify(
          [
            wire.edge.source,
            wire.edge.target,
          ].sort(),
        ),
      ]) {
        const other = sockets.get(key);
        if (other === undefined)
          sockets.set(key, i);
        else parent[root(i)] = root(other);
      }
      const path =
        wire.spine ?? outline(wire.points, 2);
      return path.slice(1).map((b, j) => {
        const a = required(path[j]),
          d = distance(a, b) || 1;
        return {
          ...corridor([a, b], 12),
          a,
          end: b,
          dx: (b.x - a.x) / d,
          dy: (b.y - a.y) / d,
          i,
        };
      });
    },
  );
  const near = boundsIndex(segments);
  for (const seg of segments) {
    for (const peer of near(seg)) {
      if (
        peer.i >= seg.i ||
        root(seg.i) === root(peer.i) ||
        Math.abs(
          seg.dx * peer.dy - seg.dy * peer.dx,
        ) > 0.52
      )
        continue;
      if (
        Math.min(
          chordGap(seg.a, peer.a, peer.end),
          chordGap(seg.end, peer.a, peer.end),
          chordGap(peer.a, seg.a, seg.end),
          chordGap(peer.end, seg.a, seg.end),
        ) <= 24
      )
        parent[root(seg.i)] = root(peer.i);
    }
  }
  const groups = new Map<
    number,
    typeof regions
  >();
  for (const r of regions) {
    const id = root(r.i),
      group = groups.get(id);
    if (group) group.push(r);
    else groups.set(id, [r]);
  }
  const wires: Wire[] = [];
  for (const group of groups.values()) {
    const plans = group.map((r) =>
      required(ports.plans[r.i]),
    );
    const parallels = new Map<string, Edge[]>();
    for (const { edge } of plans) {
      const pair = JSON.stringify(
        [edge.source, edge.target].sort(),
      );
      if (!parallels.has(pair))
        parallels.set(
          pair,
          required(ports.parallels.get(pair)),
        );
    }
    const members = group.map((r) =>
      required(bases[r.i]),
    );
    let area = {
      l: Math.min(...group.map((r) => r.l)) - 100,
      r: Math.max(...group.map((r) => r.r)) + 100,
      t: Math.min(...group.map((r) => r.t)) - 100,
      b: Math.max(...group.map((r) => r.b)) + 100,
    };
    for (;;) {
      const walls = query(area),
        wallSet = new Set(walls);
      const key = JSON.stringify([
        members.map((m) => m.token),
        plans.map(({ a, b }) => [
          a.count,
          a.rank,
          b.count,
          b.rank,
        ]),
        walls,
      ]);
      const solve = () =>
        separate(
          members.map((m) => m.wire),
          { parallels, plans },
          walls,
          radius,
          members.map((m) => m.token),
          (b) =>
            query(b).filter((q) =>
              wallSet.has(q),
            ),
        );
      const solved = plans.some(
        (p) => p.edge.waypoints?.length,
      )
        ? solve()
        : rememberChannel(key, solve);
      // An escaping detour must account for obstacles beyond the first corridor.
      const expanded = { ...area };
      for (const w of solved) {
        const b = corridor(w.points, 7);
        expanded.l = Math.min(expanded.l, b.l);
        expanded.r = Math.max(expanded.r, b.r);
        expanded.t = Math.min(expanded.t, b.t);
        expanded.b = Math.max(expanded.b, b.b);
      }
      if (
        (expanded.l < area.l ||
          expanded.r > area.r ||
          expanded.t < area.t ||
          expanded.b > area.b) &&
        query(expanded).some(
          (q) => !wallSet.has(q),
        )
      ) {
        area = expanded;
        continue;
      }
      group.forEach((r, j) => {
        wires[r.i] = required(solved[j]);
      });
      break;
    }
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
    ) {
      if (w.arrow.at !== w.target)
        wires[i] = {
          ...w,
          arrow: {
            at: w.target,
            toward: {
              ...move(w.target, w.targetSide, -1),
              z: w.target.z,
            },
          },
        };
      continue;
    }
    // Measure back along the wire so sampling density cannot move the arrow.
    let remaining = Math.min(
      14,
      distance(w.source, w.target) / 3 || 14,
    );
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
  const routed = wires.map((w, i) => ({
    source: w.source,
    target: w.target,
    sourceSide: w.sourceSide,
    targetSide: w.targetSide,
    arrow: w.arrow,
    points: w.points,
    corners: w.corners,
    edge: required(visible[i]),
  }));
  memo = {
    key,
    wires: routed,
    knots,
    edges: [...graph.edges],
  };
  return routed;
};
