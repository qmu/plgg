import { type Bounds } from "plgg-flow/wireCorridors";
import {
  type Box,
  inflate,
} from "plgg-flow/wireGeometry";
import type { Point } from "plgg-board";
import type { FlowNode, Edge } from "./model";
type End = {
  node: FlowNode;
  peer: FlowNode;
  side: Side;
  rank: number;
  count: number;
};

import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import {
  box,
  gap,
  move,
  vertical,
  pt,
  required,
  normal,
  distance,
  facing,
} from "plgg-flow/wireGeometry";
export const sides = [
  "top",
  "bottom",
  "right",
  "left",
] satisfies Side[];

export const planPorts = (
  nodes: ReadonlyMap<string, FlowNode>,
  edges: Edge[],
  query: (bounds: Bounds) => Box[],
) => {
  const cards = (
    along: "x" | "y",
    low: number,
    high: number,
    middle: number,
    width: number,
  ) => {
    const bounds =
      along === "x"
        ? {
            l: low,
            r: high,
            t: middle - width,
            b: middle + width,
          }
        : {
            t: low,
            b: high,
            l: middle - width,
            r: middle + width,
          };
    return query(bounds).map((b) =>
      required(nodes.get(b.id)),
    );
  };
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
      degrees.set(
        k,
        (degrees.get(k) ?? 0) + Number(n !== p),
      );
      means.set(
        k,
        pt(old.x + dx / d, old.y + dy / d),
      );
    }
  }
  for (const list of parallels.values()) {
    list.sort((a, b) => {
      const p = required(
          nodes.get(a.source),
        ).position,
        q = required(
          nodes.get(b.source),
        ).position;
      return p.x - q.x || p.y - q.y;
    });
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
      (Math.hypot(m.x, m.y) <
        0.5 *
          (degrees.get(key(node.id, start)) ??
            1) ||
        dx * normal[side].x +
          dy * normal[side].y <
          0.26 * Math.hypot(dx, dy))
    )
      side = facing(dx, dy);
    // A near-diagonal step leaf can lose an elbow along the card's long axis.
    if (
      edge.route === "step" &&
      node !== peer &&
      (degrees.get(key(node.id, true)) ?? 0) +
        (degrees.get(key(node.id, false)) ??
          0) ===
        1
    ) {
      const wall = box(node);
      const horizontal =
        wall.r - wall.l >= wall.b - wall.t;
      if (
        Math.min(Math.abs(dx), Math.abs(dy)) >=
        0.97 *
          Math.max(Math.abs(dx), Math.abs(dy))
      )
        side = horizontal
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "bottom"
            : "top";
    }
    return {
      node,
      peer,
      side,
      rank: 0,
      count: 1,
    };
  };
  const plans = edges.map((edge) => ({
    edge,
    a: end(edge, true),
    b: end(edge, false),
  }));
  // Partition the four faces together so a return edge cannot steal an arrival socket.
  const incident = new Map<
    string,
    { end: End; start: boolean }[]
  >();
  for (const { a, b } of plans) {
    for (const entry of [
      { end: a, start: true },
      { end: b, start: false },
    ]) {
      const id = entry.end.node.id;
      const entries = incident.get(id) ?? [];
      entries.push(entry);
      incident.set(id, entries);
    }
  }

  // Compare the peer with the spacing of this node's own row.
  for (const entries of incident.values()) {
    for (const { end, start } of entries) {
      const { node, peer } = end;
      if (node === peer) continue;
      const dx =
          peer.position.x - node.position.x,
        dy = peer.position.y - node.position.y;
      const along =
          Math.abs(dx) > Math.abs(dy) ? "x" : "y",
        across = along === "x" ? "y" : "x";
      const span = Math.abs(
        peer.position[along] -
          node.position[along],
      );
      if (
        Math.abs(
          peer.position[across] -
            node.position[across],
        ) > 8
      )
        continue;
      const low = Math.min(
        node.position[along],
        peer.position[along],
      );
      const row = cards(
        along,
        low - 200,
        low + span + 200,
        node.position[across],
        12,
      ).filter(
        (n) =>
          !n.group &&
          Math.abs(
            n.position[across] -
              node.position[across],
          ) < 12 &&
          Math.abs(
            n.position[along] -
              (node.position[along] +
                peer.position[along]) /
                2,
          ) <=
            span * 0.5 + 200,
      );
      const q = box(node),
        r = box(peer);
      const spacing =
        along === "x"
          ? Math.max(q.r - q.l, r.r - r.l) * 1.7
          : Math.max(q.b - q.t, r.b - r.t) * 3.8;
      // A regular three-card span determines its own skip even at the end of a row.
      const regular =
        Math.abs(span / 2 - spacing) <
          spacing * 0.2 &&
        row.some(
          (n) =>
            n !== node &&
            n !== peer &&
            Math.abs(
              n.position[along] -
                (node.position[along] +
                  peer.position[along]) /
                  2,
            ) < 8,
        );
      const between = row.filter(
        (n) =>
          (n.position[along] -
            node.position[along]) *
            (n.position[along] -
              peer.position[along]) <
          0,
      );
      const narrow = between.some((n) => {
        const wall = box(n);
        return (
          gap(
            node.position,
            peer.position,
            wall,
          ) === 0 &&
          Math.max(
            Math.abs(
              n.position[along] -
                node.position[along],
            ),
            Math.abs(
              n.position[along] -
                peer.position[along],
            ),
          ) <
            (along === "x"
              ? q.r - q.l
              : q.b - q.t) +
              34
        );
      });
      if (
        (!regular &&
          !narrow &&
          row.length < 4 &&
          (along !== "y" || span > 200)) ||
        !between.length
      )
        continue;
      if (
        !narrow &&
        span <
          spacing * (along === "y" ? 1.2 : 1.5)
      )
        continue;
      const forward =
        peer.position[along] >
        node.position[along];
      // Put skips from the head of a row on one flank and interior skips on the other.
      const vicinity = cards(
        along,
        low - 2.5 * spacing,
        low + span + 2.5 * spacing,
        node.position[across],
        spacing * 3,
      ).filter(
        (n) =>
          !n.group &&
          n.position[along] >=
            low - 2.5 * spacing &&
          n.position[along] <=
            low + span + 2.5 * spacing &&
          Math.abs(
            n.position[across] -
              node.position[across],
          ) <
            spacing * 3,
      );
      const inRow =
        vicinity.filter(
          (n) =>
            Math.abs(
              n.position[across] -
                node.position[across],
            ) > 12,
        ).length <= 1;
      const even = inRow
        ? !vicinity.some(
            (n) => n.position[along] < low - 8,
          )
        : Math.round(span / spacing) % 2 === 0;
      const flank = vicinity.filter(
        (n) =>
          n.position[along] >= low &&
          n.position[along] <= low + span &&
          Math.abs(
            n.position[across] -
              node.position[across],
          ) < spacing,
      );
      if (
        flank.some(
          (n) =>
            n.position[across] <
            node.position[across] - 36,
        ) &&
        flank.some(
          (n) =>
            n.position[across] >
            node.position[across] + 36,
        )
      )
        continue;
      const positive = narrow
        ? along === "x"
        : (start === forward) === even;

      Object.assign(end, {
        side:
          along === "x"
            ? positive
              ? "top"
              : "bottom"
            : positive
              ? "left"
              : "right",
      });
    }
  }
  // Opposite directions need distinct approaches at the same peer.
  for (const entries of incident.values()) {
    for (const { end, start } of entries) {
      if (
        (end.node.position.x !==
          end.peer.position.x &&
          end.node.position.y !==
            end.peer.position.y) ||
        (entries.length !== 2 &&
          entries.some(
            (e) =>
              e.start &&
              e.end.side === end.side &&
              e.end.peer !== end.peer,
          )) ||
        !start ||
        end.node === end.peer ||
        !entries.some(
          (e) =>
            !e.start &&
            e.end.peer === end.peer &&
            e.end.side === end.side,
        )
      )
        continue;
      const side = vertical(end.side)
        ? end.side === "top"
          ? "left"
          : "right"
        : end.side === "right"
          ? "top"
          : "bottom";
      Object.assign(end, { side });
    }
  }
  // Leave room for a stem beside an overlapping peer.
  for (const entries of incident.values()) {
    const owner = required(entries[0]).end.node;
    const neighbours = query(
      inflate(box(owner), 22),
    ).filter(
      (q) =>
        q.id !== owner.id &&
        !nodes.get(q.id)?.group,
    );
    for (const { end } of entries) {
      const { node, peer } = end;
      if (node === peer) continue;
      const clear = (side: Side) => {
        const p = portPosition(node, side, 0);
        return neighbours.every(
          (q) =>
            gap(p, move(p, side, 14), q) >= 6,
        );
      };
      if (clear(end.side)) continue;
      const dx =
          peer.position.x - node.position.x,
        dy = peer.position.y - node.position.y;
      const side = sides
        .filter(
          (k) =>
            dx * normal[k].x + dy * normal[k].y >=
              -0.25 * Math.hypot(dx, dy) &&
            clear(k),
        )
        .sort(
          (a, b) =>
            dx * (normal[b].x - normal[a].x) +
            dy * (normal[b].y - normal[a].y),
        )[0];
      if (side) Object.assign(end, { side });
    }
  }
  // Put loops in the least occupied corner of their node.
  for (const { a, b } of plans) {
    if (a.node !== b.node) continue;
    const used = (side: Side) => {
      const socket = portPosition(
          a.node,
          side,
          0,
        ),
        tip = move(socket, side, 40);
      return [...nodes.values()].reduce(
        (sum, n) =>
          n === a.node || n.group
            ? sum
            : sum +
              Math.max(
                0,
                64 - gap(socket, tip, box(n)),
              ),
        0,
      );
    };
    const source = (
      ["right", "left"] satisfies Side[]
    ).sort((x, y) => used(x) - used(y))[0];
    const target = (
      ["top", "bottom"] satisfies Side[]
    ).sort((x, y) => used(x) - used(y))[0];
    Object.assign(a, { side: required(source) });
    Object.assign(b, { side: required(target) });
  }
  for (const entries of incident.values()) {
    for (const { end } of entries) {
      const k = JSON.stringify([
          end.node.id,
          end.side,
        ]),
        group = groups.get(k) ?? [];
      group.push(end);
      groups.set(k, group);
    }
  }
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
    group.sort(
      (a, b) =>
        angle(a) - angle(b) ||
        Math.sign(angle(a)) *
          (distance(
            b.peer.position,
            b.node.position,
          ) -
            distance(
              a.peer.position,
              a.node.position,
            )),
    );
    const angles = group.map(angle),
      sums = [0];
    const count = new Map<FlowNode, number>(),
      seen = new Map<FlowNode, number>();
    for (const [i, e] of group.entries()) {
      sums.push(
        required(sums[i]) + required(angles[i]),
      );
      count.set(
        e.peer,
        (count.get(e.peer) ?? 0) + 1,
      );
    }
    // Integrate close rays in angular order, excluding duplicate peers.
    let lo = 0,
      hi = 0;
    group.forEach((e, i) => {
      e.count = group.length;
      const theta = required(angles[i]);
      while (
        lo < i &&
        theta - required(angles[lo]) >= 0.08
      )
        lo++;
      hi = Math.max(hi, i + 1);
      while (
        hi < group.length &&
        required(angles[hi]) - theta < 0.08
      )
        hi++;
      const left = i - lo,
        right = hi - i - 1,
        previous = seen.get(e.peer) ?? 0;
      const nearLeft =
        left -
        (theta * left -
          required(sums[i]) +
          required(sums[lo])) /
          0.08;
      const nearRight =
        right -
        (required(sums[hi]) -
          required(sums[i + 1]) -
          theta * right) /
          0.08;
      const rank =
        i -
        (group.length - 1) / 2 +
        (nearRight -
          nearLeft -
          required(count.get(e.peer)) +
          1 +
          2 * previous) /
          2;
      seen.set(e.peer, previous + 1);
      e.rank = rank;
    });
  }
  return { plans, parallels };
};
