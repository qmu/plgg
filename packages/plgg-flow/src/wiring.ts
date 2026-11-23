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
  intersects,
} from "plgg-flow/wireCorridors";
import { basePath } from "plgg-flow/wireBase";
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
  const ports = planPorts(
    byId,
    visible.map((e) => ({ ...e })),
  );

  const boxes = obstacles(graph);
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
      const nearby = boxes.filter((q) =>
        intersects(bounds, q),
      );
      for (;;) {
        const w = basePath(
          edge,
          s,
          t,
          nearby,
          clearance,
          radius,
        );
        const extra = boxes.filter(
          (q) =>
            !nearby.includes(q) &&
            !free(w.points, [
              inflate(q, clearance),
            ]),
        );
        if (!extra.length) return w;
        nearby.push(...extra);
      }
    },
  );
  // Shared channels can shift finished stretches within their lane budget.
  const wires = separate(
    bases,
    ports,
    boxes,
    radius,
  );
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
