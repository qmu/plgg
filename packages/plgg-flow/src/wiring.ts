import { materialize } from "plgg-flow/wirePath";
import { nodeSize } from "plgg-flow/nodeSize";
import {
  outline,
  chordGap,
} from "plgg-flow/wireInteraction";
import {
  cache,
  boxId,
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
  vertical,
  normal,
  obstacles,
  move,
  free,
  inflate,
} from "plgg-flow/wireGeometry";
import {
  corridor,
  type Bounds,
  boundsIndex,
} from "plgg-flow/wireCorridors";
import {
  archStep,
  bundleBranch,
  archCurve,
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
// Reuse the narrow-phase channel test while both base paths keep their shape.
const channelShape = (wire: Base) => {
  const path =
    wire.spine ?? outline(wire.points, 2);
  const segments = path.slice(1).map((end, j) => {
    const a = required(path[j]),
      d = distance(a, end) || 1;
    return {
      ...corridor([a, end], 12),
      a,
      end,
      dx: (end.x - a.x) / d,
      dy: (end.y - a.y) / d,
    };
  });
  return {
    segments,
    near: boundsIndex(segments),
    bounds: corridor(path, 12),
    contacts: new WeakMap<
      Base["points"],
      boolean
    >(),
  };
};
const rememberedShapes = new WeakMap<
  Base["points"],
  ReturnType<typeof channelShape>
>();
const shapeOf = (w: Base) => {
  const hit = rememberedShapes.get(w.points);
  if (hit) return hit;
  const shape = channelShape(w);
  rememberedShapes.set(w.points, shape);
  return shape;
};
const shareChannel = (
  a: ReturnType<typeof channelShape>,
  b: ReturnType<typeof channelShape>,
) =>
  a.segments.some((seg) =>
    b
      .near(seg)
      .some(
        (peer) =>
          Math.abs(
            seg.dx * peer.dy - seg.dy * peer.dx,
          ) <= 0.52 &&
          (chordGap(seg.a, peer.a, peer.end) <=
            24 ||
            chordGap(seg.end, peer.a, peer.end) <=
              24 ||
            chordGap(peer.a, seg.a, seg.end) <=
              24 ||
            chordGap(peer.end, seg.a, seg.end) <=
              24),
      ),
  );
let serial = 0;
const geometryTokens = cache<number>(4096);
type BaseRoute = {
  wire: Base;
  token: number;
  bounds: Bounds;
};
const expand = (b: Bounds, m: number) => ({
  l: b.l - m,
  r: b.r + m,
  t: b.t - m,
  b: b.b + m,
});
const rememberBase = cache<BaseRoute>();
const rememberChannel = cache<{
  wires: Wire[];
  bounds: Bounds;
}>();
type Snapshot = {
  inputs: unknown[];
  wires: Wire[];
};
// Public entry bundles have separate module scopes but route the same sheets.
const sheetCache = Symbol.for(
  "plgg-flow/wiring/snapshot/v1",
);
type Shared = {
  [sheetCache]?: WeakMap<object, Snapshot>;
};
const shared: typeof globalThis & Shared =
  globalThis;
const snapshots = (shared[sheetCache] ??=
  new WeakMap<object, Snapshot>());
const previousWire = new WeakMap<Edge, Wire>();
const samePoint = (a: Point3, b: Point3) =>
  a.x === b.x && a.y === b.y && a.z === b.z;
export const wireGraph = (
  graph: Graph,
  options: WiringOptions = {},
): readonly Wire[] => {
  const clearance = Math.max(
      0,
      options.clearance ?? 18,
    ),
    radius = Math.max(0, options.radius ?? 10);
  const inputs: unknown[] = [
    clearance,
    radius,
    graph.nodes.length,
    graph.edges.length,
  ];
  for (const n of graph.nodes) {
    const { width, height } = nodeSize(n);
    inputs.push(
      n.id,
      n.position.x,
      n.position.y,
      n.position.z,
      width,
      height,
      Boolean(n.hidden),
      Boolean(n.group && !n.collapsed),
    );
  }
  for (const e of graph.edges) {
    inputs.push(
      e,
      e.source,
      e.target,
      e.route ?? "curve",
      Boolean(e.hidden),
      e.waypoints?.length,
    );
    for (const p of e.waypoints ?? [])
      inputs.push(p, p.x, p.y, p.z);
  }
  const owner = graph.edges[0] ?? graph.edges;
  const memo = snapshots.get(owner);
  if (
    memo &&
    memo.inputs.length === inputs.length &&
    inputs.every((v, i) => v === memo.inputs[i])
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
      const route = (walls: typeof nearby) => {
        const key = JSON.stringify([
          edge.source,
          edge.target,
          edge.route,
          s,
          t,
          clearance,
          radius,
          a.depth,
          Boolean(a.bundleBranch),
          Boolean(b.bundleBranch),
          walls.map(boxId),
        ]);
        const build = () => {
          let arch;
          if (a.depth && a.side === b.side) {
            const axis = vertical(a.side)
              ? "y"
              : "x";
            const sign = normal[a.side][axis];
            const level =
              sign *
              (Math.max(
                sign * s[axis],
                sign * t[axis],
              ) +
                a.depth);
            const path =
              edge.route === "step"
                ? archStep(s, t, level, radius)
                : archCurve(s, t, level);
            if (free(path, walls))
              arch = {
                settled: true,
                ...materialize(
                  edge,
                  s,
                  t,
                  path,
                  2,
                ),
              };
          }
          if (a.bundleBranch || b.bundleBranch)
            arch ??= bundleBranch(
              edge,
              s,
              t,
              walls,
              radius,
              Boolean(a.bundleBranch),
            );
          const wire: Base =
            arch ??
            basePath(
              edge,
              s,
              t,
              walls,
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
              wire.settled,
              wire.corners,
              wire.spine,
              radius,
            ]) + pathValues(wire.points);
          return {
            wire,
            bounds: corridor(wire.points, 0),
            token: geometryTokens(
              shape,
              () => ++serial,
            ),
          };
        };
        return edge.waypoints?.length
          ? build()
          : rememberBase(key, build);
      };
      // A clear natural path depends only on its sockets and its swept clearance.
      const own = nearby.filter(
        (q) =>
          q.id === edge.source ||
          q.id === edge.target,
      );
      const plain = edge.waypoints?.length
        ? undefined
        : route(own);
      const member = (base: BaseRoute) => ({
        wire: { ...base.wire, edge },
        token: base.token,
        bounds: expand(
          base.bounds,
          Math.max(
            18,
            5 * Math.max(a.count, b.count),
          ),
        ),
      });
      if (plain && edge.source === edge.target)
        return member(plain);
      // A curve depends on the walls swept by its successive clearance
      // envelopes. A blocked step also needs both walls of its lane.
      let active = plain ? own : nearby;
      let result = plain ?? route(active);
      for (;;) {
        const extra = query(
          expand(result.bounds, clearance),
        ).filter(
          (q) =>
            !active.includes(q) &&
            !free(result.wire.points, [
              inflate(q, clearance),
            ]),
        );
        if (!extra.length) return member(result);
        if (
          result === plain &&
          edge.route === "step"
        )
          active = nearby;
        for (const wall of extra)
          if (!active.includes(wall))
            active.push(wall);
        result = route(active);
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
  const shapes = bases.map(({ wire }, i) => {
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
    const shape = shapeOf(wire);
    return { ...shape.bounds, i, wire, shape };
  });
  const near = boundsIndex(shapes);
  for (const a of shapes)
    for (const b of near(a)) {
      if (b.i >= a.i || root(a.i) === root(b.i))
        continue;
      let shared = a.shape.contacts.get(
        b.wire.points,
      );
      if (shared === undefined) {
        shared = shareChannel(a.shape, b.shape);
        a.shape.contacts.set(
          b.wire.points,
          shared,
        );
      }
      if (shared) parent[root(a.i)] = root(b.i);
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
        walls.map(boxId),
      ]);
      const solve = () => {
        const wires = separate(
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
        const bounds = wires.map((w) =>
          corridor(w.points, 7),
        );
        return {
          wires,
          bounds: {
            l: Math.min(
              ...bounds.map((b) => b.l),
            ),
            r: Math.max(
              ...bounds.map((b) => b.r),
            ),
            t: Math.min(
              ...bounds.map((b) => b.t),
            ),
            b: Math.max(
              ...bounds.map((b) => b.b),
            ),
          },
        };
      };
      const solved = plans.some(
        (p) => p.edge.waypoints?.length,
      )
        ? solve()
        : rememberChannel(key, solve);
      // An escaping detour must account for obstacles beyond the first corridor.
      const expanded = {
        l: Math.min(area.l, solved.bounds.l),
        r: Math.max(area.r, solved.bounds.r),
        t: Math.min(area.t, solved.bounds.t),
        b: Math.max(area.b, solved.bounds.b),
      };
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
        wires[r.i] = required(solved.wires[j]);
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
  const routed = wires.map((w, i) => {
    const edge = required(visible[i]),
      old = previousWire.get(edge);
    if (
      !edge.waypoints?.length &&
      old &&
      old.sourceSide === w.sourceSide &&
      old.targetSide === w.targetSide &&
      old.corners === w.corners &&
      samePoint(old.source, w.source) &&
      samePoint(old.target, w.target) &&
      samePoint(old.arrow.at, w.arrow.at) &&
      samePoint(
        old.arrow.toward,
        w.arrow.toward,
      ) &&
      (old.points === w.points ||
        (old.points.length === w.points.length &&
          old.points.every((p, i) =>
            samePoint(p, required(w.points[i])),
          )))
    )
      return old;
    const wire: Wire = {
      edge,
      points: w.points,
      corners: w.corners,
      source: w.source,
      target: w.target,
      sourceSide: w.sourceSide,
      targetSide: w.targetSide,
      arrow: w.arrow,
    };
    previousWire.set(edge, wire);
    return wire;
  });
  snapshots.set(owner, {
    inputs,
    wires: routed,
  });
  return routed;
};
