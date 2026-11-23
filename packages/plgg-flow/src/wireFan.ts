import { nodeSize } from "plgg-flow/nodeSize";
import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import type { Point } from "plgg-board";
import type { Edge, FlowNode } from "./model";
import {
  vertical,
  frame,
  required,
  pt,
  rounded,
  free,
  simplify,
  bezier,
  type Box,
} from "plgg-flow/wireGeometry";
export type End = {
  node: FlowNode;
  peer: FlowNode;
  side: Side;
  rank: number;
  count: number;
};
// Route a fan through successive columns in the order of its leaves.
export const fanCorridors = (
  plans: { edge: Edge; a: End; b: End }[],
  boxes: Box[],
  radius: number,
) => {
  const bundles = new Map<
    string,
    {
      edge: Edge;
      hub: End;
      leaf: End;
      reverse: boolean;
    }[]
  >();
  for (const { edge, a, b } of plans) {
    if (
      a.node === b.node ||
      a.side === b.side ||
      vertical(a.side) !== vertical(b.side) ||
      edge.waypoints?.length ||
      edge.route === "straight"
    )
      continue;
    const reverse = b.count > a.count,
      hub = reverse ? b : a,
      leaf = reverse ? a : b;
    if (hub.count < 3 || hub.count < leaf.count)
      continue;
    const key = JSON.stringify([
        hub.node.id,
        hub.side,
      ]),
      group = bundles.get(key) ?? [];
    group.push({ edge, hub, leaf, reverse });
    bundles.set(key, group);
  }
  const routes = new Map<Edge, Point[]>();
  for (const group of bundles.values()) {
    if (group.length < 3) continue;
    const first = required(group[0]),
      { local, world } = frame(first.hub.side),
      origin = local(
        portPosition(
          first.hub.node,
          first.hub.side,
          0,
        ),
      );
    const peers = group
      .map((item) => {
        const leaf = item.leaf.node,
          size = nodeSize(leaf),
          p = local(
            portPosition(leaf, item.leaf.side, 0),
          );
        return {
          ...item,
          p,
          extent: vertical(first.hub.side)
            ? size.height
            : size.width,
          half:
            (vertical(first.hub.side)
              ? size.width
              : size.height) / 2,
        };
      })
      .sort((a, b) => a.p.y - b.p.y);
    // Leaves in the same physical column stay together during a small drag.
    const columns: (typeof peers)[] = [];
    for (const peer of [...peers].sort(
      (a, b) => a.p.x - b.p.x,
    )) {
      const band = columns[columns.length - 1],
        first = band?.[0];
      if (
        band &&
        first &&
        peer.p.x - first.p.x <
          Math.min(first.extent, peer.extent) *
            0.65
      )
        band.push(peer);
      else columns.push([peer]);
    }
    const u = pt(origin.x + 14, origin.y);
    for (const [rank, peer] of peers.entries()) {
      const v = pt(peer.p.x - 14, peer.p.y);
      if (v.x <= u.x + 28) continue;
      const knots = [u];
      let feasible = true;
      for (const band of columns) {
        if (band.includes(peer)) break;
        const near =
            Math.min(...band.map((p) => p.p.x)) -
            14,
          far =
            Math.max(
              ...band.map(
                (p) => p.p.x + p.extent,
              ),
            ) + 9;
        if (near <= u.x || far >= v.x) {
          feasible = false;
          break;
        }
        let low = -Infinity,
          high = Infinity;
        for (const p of band) {
          if (p.p.y < peer.p.y)
            low = Math.max(
              low,
              p.p.y + p.half + 8,
            );
          else
            high = Math.min(
              high,
              p.p.y - p.half - 8,
            );
        }
        if (low > high) {
          feasible = false;
          break;
        }
        const y = Math.min(
          high,
          Math.max(low, peer.p.y),
        );
        knots.push(pt(near, y), pt(far, y));
      }
      if (!feasible) continue;
      knots.push(v);
      const path = [origin, u];
      for (let i = 1; i < knots.length; i++) {
        const a = required(knots[i - 1]),
          b = required(knots[i]),
          dx = b.x - a.x;
        if (dx < 0) {
          feasible = false;
          break;
        }
        if (Math.abs(a.y - b.y) < 0.001) {
          path.push(b);
          continue;
        }
        if (peer.edge.route === "step") {
          // Outer branches turn first so nearer lanes can continue through the fan.
          const level = Math.abs(
            rank - (peers.length - 1) / 2,
          );
          const branch =
            a.x +
            Math.min(
              dx / 5,
              Math.max(2, 23 - level * 5),
            );
          const mid =
            a.x +
            dx *
              (0.65 -
                (0.6 * level) / peers.length);
          const lane =
            a.y +
            Math.sign(b.y - a.y) *
              Math.min(
                Math.abs(b.y - a.y),
                level * 7,
              );
          path.push(
            pt(branch, a.y),
            pt(branch, lane),
            pt(mid, lane),
            pt(mid, b.y),
            b,
          );
        } else {
          const ctrl = Math.min(dx * 0.36, 110);
          const across =
            i === 1
              ? (rank - (peers.length - 1) / 2) *
                Math.min(12, dx / 12)
              : 0;
          path.push(
            ...bezier(
              a,
              pt(a.x + ctrl, a.y + across),
              pt(b.x - ctrl, b.y),
              b,
            ).slice(1),
          );
        }
      }
      if (!feasible) continue;
      path.push(peer.p);
      const route = (
        peer.edge.route === "step"
          ? rounded(simplify(path), radius)
          : path
      ).map(world);
      if (free(route, boxes))
        routes.set(
          peer.edge,
          peer.reverse ? route.reverse() : route,
        );
    }
  }
  return routes;
};
