import type { Point } from "plgg-board";
import type { FlowNode } from "./model";
import type { Wire } from "./wiring";
import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import { sides } from "plgg-flow/wirePorts";
import { materialize } from "plgg-flow/wirePath";
import { search } from "plgg-flow/wireSearch";
import { simplifyTrace } from "plgg-flow/polyline";
import {
  move,
  free,
  cuts,
  distance,
  required,
  rounded,
  simplify,
  crossesItself,
  type Box,
} from "plgg-flow/wireGeometry";

const separation = (
  points: readonly Point[],
  guide: readonly Point[],
) => {
  let worst = 0;
  for (const p of points) {
    let gap = Infinity;
    for (let i = 1; i < guide.length; i++) {
      const a = required(guide[i - 1]),
        b = required(guide[i]),
        dx = b.x - a.x,
        dy = b.y - a.y;
      const f = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy) /
            (dx * dx + dy * dy || 1),
        ),
      );
      gap = Math.min(
        gap,
        (p.x - a.x - f * dx) ** 2 +
          (p.y - a.y - f * dy) ** 2,
      );
    }
    worst = Math.max(worst, gap);
  }
  return Math.sqrt(worst);
};

// When a corridor closes, compare both ends together before abandoning its bends.
export const followCorridor = (
  wire: Wire,
  prior: Wire,
  source: FlowNode,
  target: FlowNode,
  boxes: Box[],
  own: boolean,
) => {
  if (
    wire.edge.waypoints?.length ||
    wire.edge.route === "straight" ||
    source === target
  )
    return wire;
  const guide = simplifyTrace(prior.points, 1);
  const margin = 24;
  let best = separation(wire.points, guide);
  if (best < margin / 2) return wire;
  let chosen = wire;
  const faces = (
    node: FlowNode,
    old: Side,
    current: Side,
  ) => {
    const p = portPosition(node, old, 0);
    if (
      !own &&
      !boxes.some(
        (q) =>
          q.id !== node.id &&
          cuts(p, move(p, old, 1), q),
      )
    )
      return [old];
    return [...new Set([old, current, ...sides])];
  };
  const step = wire.edge.route === "step";
  for (const sa of faces(
    source,
    prior.sourceSide,
    wire.sourceSide,
  )) {
    const s = {
      ...portPosition(source, sa, 0),
      side: sa,
    };
    if (separation([s], guide) > best) continue;
    for (const sb of faces(
      target,
      prior.targetSide,
      wire.targetSide,
    )) {
      const t = {
        ...portPosition(target, sb, 0),
        side: sb,
      };
      if (separation([t], guide) > best) continue;
      const arm = Math.min(4, distance(s, t) / 3);
      const u = move(s, sa, arm),
        v = move(t, sb, arm);
      if (
        !free([s, u], boxes) ||
        !free([t, v], boxes)
      )
        continue;
      const accept = (core: Point[]) => {
        const raw = simplify([s, ...core, t]);
        const path = rounded(raw, step ? 6 : 12);
        if (
          !free(path, boxes) ||
          crossesItself(path)
        )
          return;
        const candidate = materialize(
          wire.edge,
          s,
          t,
          path,
          raw.length - 2,
        );
        const change = Math.max(
          separation(candidate.points, guide),
          separation(guide, candidate.points),
        );
        if (change + 1 < best) {
          best = change;
          chosen = candidate;
        }
      };
      const direct = search(u, v, boxes, step);
      if (direct) accept(direct);
      // Preserve a distant bend if the shortest path goes round the other side.
      if (guide.length > 2 && best > margin / 2) {
        const anchor = required(
          guide[Math.floor(guide.length / 2)],
        );
        const left = search(
            u,
            anchor,
            boxes,
            step,
          ),
          right =
            left &&
            search(anchor, v, boxes, step);
        if (left && right)
          accept([...left, ...right.slice(1)]);
      }
    }
  }
  return chosen;
};
