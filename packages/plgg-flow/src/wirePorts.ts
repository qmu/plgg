import { type Bounds } from "plgg-flow/wireCorridors";
import {
  type Box,
  inflate,
} from "plgg-flow/wireGeometry";
import type { Point } from "plgg-board";
import type { FlowNode, Edge } from "./model";
export type End = {
  node: FlowNode;
  peer: FlowNode;
  side: Side;
  book?: { page: number; depth: number };
  depth?: number;
  bundleBranch?: boolean;
  pairedFan?: boolean;
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

export type Plan = {
  edge: Edge;
  a: End;
  b: End;
};
const assignPages = (plans: Plan[]) => {
  // Interleaving intervals cross exactly once on a common page.
  const arcs = plans
    .filter(
      ({ a, b, edge }) =>
        edge.route !== "straight" &&
        a.book &&
        b.book &&
        !edge.waypoints?.length,
    )
    .map(({ a, b }) => {
      const along =
        Math.abs(
          a.node.position.x - b.node.position.x,
        ) >
        Math.abs(
          a.node.position.y - b.node.position.y,
        )
          ? "x"
          : "y";
      const across = along === "x" ? "y" : "x";
      const p = a.node.position,
        q = b.node.position;
      return {
        a,
        b,
        along,
        row: (p[across] + q[across]) / 2,
        lo: Math.min(p[along], q[along]),
        hi: Math.max(p[along], q[along]),
        page: required(a.book).page,
        depth: required(a.book).depth,
      };
    });
  const placed: typeof arcs = [];
  for (const arc of arcs.sort(
    (a, b) => a.hi - a.lo - (b.hi - b.lo),
  )) {
    for (const p of placed)
      if (
        p.along === arc.along &&
        Math.abs(p.row - arc.row) <= 12 &&
        p.page === arc.page &&
        p.lo < arc.hi &&
        p.hi > arc.lo
      )
        arc.depth = Math.max(
          arc.depth,
          p.depth + 7,
        );
    placed.push(arc);
    arc.a.side = arc.b.side =
      arc.along === "x"
        ? arc.page < 0
          ? "top"
          : "bottom"
        : arc.page < 0
          ? "left"
          : "right";
    arc.a.depth = arc.depth;
  }
};
export const planPorts = (
  nodes: ReadonlyMap<string, FlowNode>,
  edges: Edge[],
  query: (bounds: Bounds) => Box[],
  dragging = false,
  trayLabels?: ReadonlySet<FlowNode>,
) => {
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
          ? "left"
          : "bottom"
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
  const plans: Plan[] = edges.map((edge) => ({
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

  // A skip spans a nearer aligned sibling. Its page depends on
  // the continuations visible at its two ends.
  for (const { a, b, edge } of plans) {
    const p = a.node.position,
      q = b.node.position;
    const qa = box(a.node),
      qb = box(b.node);
    if (
      a.node !== b.node &&
      qa.l < qb.r &&
      qa.r > qb.l &&
      qa.t < qb.b &&
      qa.b > qb.t
    ) {
      // In the overlapping rectangle, join the two nearest adjacent faces.
      const pairs = sides.flatMap((left) =>
        sides
          .filter(
            (right) =>
              vertical(right) !== vertical(left),
          )
          .map((right) => ({
            left,
            right,
            d: distance(
              portPosition(a.node, left, 0),
              portPosition(b.node, right, 0),
            ),
          })),
      );
      const nearest = pairs.sort(
        (x, y) => x.d - y.d,
      )[0]!;
      a.side = nearest.left;
      b.side = nearest.right;
      continue;
    }
    const children = (
      incident.get(a.node.id) ?? []
    ).filter((entry) => entry.start);
    if (
      children.length > 1 &&
      (children.some(
        (child) =>
          Math.abs(
            child.end.peer.position.x - p.x,
          ) > 8,
      ) ||
        !degrees.get(key(b.node.id, true))) &&
      children.every(
        (entry) =>
          entry.end.peer.position.y > p.y,
      ) &&
      children.some(
        (entry) =>
          Math.abs(
            entry.end.peer.position.x - p.x,
          ) < 8,
      ) &&
      degrees.get(key(b.node.id, false)) === 1
    ) {
      a.side = "bottom";
      b.side = "top";
      continue;
    }
    for (const [hub, tip, start] of [
      [a, b, true],
      [b, a, false],
    ] satisfies [End, End, boolean][]) {
      const k = key(hub.node.id, start),
        n = degrees.get(k) ?? 0,
        m = means.get(k)!;
      if (
        n >= 4 &&
        Math.hypot(m.x, m.y) > 0.8 * n &&
        degrees.get(key(tip.node.id, !start)) ===
          1
      ) {
        Object.assign(hub, {
          side: facing(m.x, m.y),
        });
        const main = hub.side;
        const axis = vertical(main) ? "y" : "x",
          across = axis === "x" ? "y" : "x";
        const travel = normal[main][axis],
          origin = hub.node.position;
        const dx =
            (tip.node.position[axis] -
              origin[axis]) *
            travel,
          dy =
            tip.node.position[across] -
            origin[across];
        const face = facing(
          -normal[main].x,
          -normal[main].y,
        );
        let side = face;
        const opening = Math.abs(
          portPosition(hub.node, main, 0)[axis] -
            portPosition(tip.node, face, 0)[axis],
        );
        if (
          n >= 6 &&
          opening > 320 &&
          opening <
            6 *
              Math.max(
                box(tip.node).r - box(tip.node).l,
                box(tip.node).b - box(tip.node).t,
              ) &&
          dx > 0 &&
          Math.abs(dy) >
            Math.abs(
              portPosition(
                tip.node,
                vertical(main)
                  ? "right"
                  : "bottom",
                0,
              )[across] -
                tip.node.position[across],
            ) *
              2
        ) {
          const pitch = Math.abs(dy / dx);
          const bearings = (
            incident.get(hub.node.id) ?? []
          )
            .filter(
              (entry) =>
                entry.start === start &&
                entry.end.peer !== tip.node,
            )
            .map((entry) => {
              const q = entry.end.peer.position;
              return (
                (Math.sign(dy) *
                  (q[across] - origin[across])) /
                ((q[axis] - origin[axis]) *
                  travel)
              );
            })
            .filter(
              (v) => v > 0 && Number.isFinite(v),
            );
          const inner = bearings.filter(
              (b) => b < pitch,
            ),
            outer = bearings.filter(
              (b) => b > pitch,
            );
          if (
            (edge.route === "step" ||
              pitch < 0.3) &&
            inner.length &&
            outer.length &&
            2 * (pitch - Math.max(...inner)) <
              Math.min(...outer) - pitch
          ) {
            const flank =
              edge.route === "step" ? -dy : dy;
            side =
              across === "x"
                ? facing(flank, 0)
                : facing(0, flank);
          }
        }
        Object.assign(tip, { side });
      }
    }
    const along =
      Math.abs(p.x - q.x) > Math.abs(p.y - q.y)
        ? "x"
        : "y";
    const across = along === "x" ? "y" : "x";
    if (Math.abs(p[across] - q[across]) > 8)
      continue;
    const peers = [a, b].flatMap((end) =>
      (incident.get(end.node.id) ?? []).map(
        (entry) => entry.end.peer.position,
      ),
    );
    const lo = Math.min(p[along], q[along]),
      hi = Math.max(p[along], q[along]);
    const size = Math.max(
      ...[a.node, b.node].map((node) => {
        const rect = box(node);
        return along === "x"
          ? rect.r - rect.l
          : rect.b - rect.t;
      }),
    );
    const between = peers.some(
      (peer) =>
        peer[along] > lo &&
        peer[along] < hi &&
        Math.abs(peer[across] - p[across]) <= 8 &&
        Math.abs(peer[across] - q[across]) <= 8,
    );
    if (!between) {
      if (a.node !== b.node) {
        a.side = facing(q.x - p.x, q.y - p.y);
        b.side = facing(p.x - q.x, p.y - q.y);
      }
      continue;
    }
    const span = hi - lo;
    const skipSpan =
      size * (along === "x" ? 2.7 : 5.8);
    if (span < skipSpan) continue;
    const rowEnds = [a, b].map((end) => {
      const rays = (
        incident.get(end.node.id) ?? []
      ).filter(
        (entry) => entry.end.peer !== end.node,
      );
      const towards = Math.sign(
        end.peer.position[along] -
          end.node.position[along],
      );
      const orientation = (other: End) => {
        const delta =
          other.peer.position[along] -
          end.node.position[along];
        if (
          !delta ||
          Math.abs(
            other.peer.position[across] -
              end.node.position[across],
          ) >
            (span > 5 * size ? 0.45 : 0.035) *
              Math.abs(delta)
        )
          return 0;
        return Math.sign(delta) * towards;
      };
      return {
        inside: rays.some(
          (e) =>
            e.end.peer !== end.peer &&
            orientation(e.end) > 0,
        ),
        outside: rays.every(
          (e) =>
            (e.end.peer.position[along] -
              end.node.position[along]) *
              towards >=
            0,
        ),
        twoWay:
          rays.some((e) => e.start) &&
          rays.some((e) => !e.start),
        branch:
          rays.filter((e) => e.start).length >
            1 &&
          rays.filter((e) => !e.start).length > 1,
        returning: rays.some(
          (e) =>
            e.start &&
            e.end.peer !== end.peer &&
            orientation(e.end) > 0,
        ),
        low: end.node.position[along] === lo,
      };
    });
    if (
      !rowEnds.some((end) => end.inside) ||
      (peers.some(
        (peer) => peer[across] < p[across] - 36,
      ) &&
        peers.some(
          (peer) => peer[across] > p[across] + 36,
        ))
    )
      continue;
    const reciprocal = parallels
      .get(
        JSON.stringify(
          [a.node.id, b.node.id].sort(),
        ),
      )
      ?.some((e) => e.source === b.node.id);
    if (
      reciprocal &&
      span <
        3 *
          Math.max(
            a.node.width ?? 0,
            b.node.width ?? 0,
            size,
          ) &&
      !rowEnds.every((end) => end.inside)
    )
      continue;
    const exterior = rowEnds.some(
      (end, i) =>
        end.outside &&
        (end.twoWay || rowEnds[1 - i]!.branch) &&
        !(end.low && rowEnds[1 - i]!.returning),
    );
    const page = rowEnds.every(
      (end) => end.outside,
    )
      ? p[along] < q[along] &&
        (reciprocal ||
          !rowEnds.some(
            (e) => !e.low && e.returning,
          ))
        ? -1
        : 1
      : exterior && !reciprocal
        ? -1
        : 1;
    a.book = b.book = { page, depth: 23.5 };
  }
  assignPages(plans);
  // Opposite directions need distinct approaches at the same peer.
  for (const entries of incident.values()) {
    for (const { end, start } of entries) {
      if (
        (Math.abs(
          end.node.position.x -
            end.peer.position.x,
        ) > 12 &&
          Math.abs(
            end.node.position.y -
              end.peer.position.y,
          ) > 12) ||
        (entries.length !== 2 &&
          entries.some(
            (e) =>
              e.start &&
              e.end.side === end.side &&
              e.end.peer !== end.peer,
          )) ||
        end.book ||
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
  // If a return fan surrounds its only arrival, its two halves
  // depart on opposite flanks of the arrival face.
  const splitSources = new Set<string>();
  for (const entries of incident.values()) {
    const incoming = entries.filter(
        (e) => !e.start,
      ),
      outgoing = entries.filter((e) => e.start);
    if (
      incoming.length !== 1 ||
      outgoing.length < 2
    )
      continue;
    const inward = incoming[0]!.end,
      p = inward.node.position;
    const axis = vertical(inward.side)
      ? "x"
      : "y";
    if (
      outgoing.some(
        (e) =>
          e.end.peer === inward.peer ||
          Math.abs(
            e.end.peer.position[axis] - p[axis],
          ) >
            0.25 *
              distance(e.end.peer.position, p),
      )
    )
      continue;
    const shifts = outgoing.map(
      ({ end }) =>
        end.peer.position[axis] - p[axis],
    );
    if (
      !outgoing.every(
        ({ end }) =>
          !end.book &&
          facing(
            end.peer.position.x - p.x,
            end.peer.position.y - p.y,
          ) === inward.side,
      ) ||
      !shifts.some((d) => d > 8) ||
      !shifts.some((d) => d < -8)
    )
      continue;
    splitSources.add(inward.node.id);
    outgoing.forEach(({ end }, i) => {
      const shift = shifts[i]!;
      if (Math.abs(shift) > 8)
        Object.assign(end, {
          side:
            axis === "x"
              ? facing(shift, 0)
              : facing(0, shift),
        });
    });
  }
  for (const entries of incident.values()) {
    const reciprocal = entries.filter(
      (e) =>
        e.start &&
        entries.some(
          (q) =>
            !q.start && q.end.peer === e.end.peer,
        ),
    );
    for (const { start, end } of entries) {
      if (
        start ||
        end.book ||
        splitSources.has(end.peer.id)
      )
        continue;
      const p = end.node.position,
        q = end.peer.position,
        dx = q.x - p.x,
        dy = q.y - p.y;
      const short = reciprocal.find(
        (e) =>
          e.end.peer !== end.peer &&
          distance(p, q) >
            Math.max(
              box(end.node).r - box(end.node).l,
              box(end.node).b - box(end.node).t,
            ) *
              3 &&
          facing(
            e.end.peer.position.x - p.x,
            e.end.peer.position.y - p.y,
          ) === end.side,
      );
      if (!short) continue;
      const lateral = vertical(end.side)
        ? dx
        : dy;
      if (
        Math.abs(lateral) > 8 &&
        Math.abs(lateral) < distance(p, q) * 0.25
      )
        Object.assign(end, {
          side: vertical(end.side)
            ? facing(dx, 0)
            : facing(0, dy),
        });
    }
  }
  // Diagonal branches share the facing socket with the bundle.
  const bundleAxes = new Map<string, "x" | "y">();
  for (const list of parallels.values()) {
    const first = list[0];
    if (
      !first ||
      list.length < 3 ||
      first.source === first.target
    )
      continue;
    const p = required(
        nodes.get(first.source),
      ).position,
      q = required(
        nodes.get(first.target),
      ).position;
    const axis =
      Math.abs(p.x - q.x) >= Math.abs(p.y - q.y)
        ? "x"
        : "y";
    bundleAxes.set(first.source, axis);
    bundleAxes.set(first.target, axis);
  }
  for (const { a, b } of plans) {
    if (
      bundleAxes.has(a.node.id) ===
      bundleAxes.has(b.node.id)
    )
      continue;
    const along =
        bundleAxes.get(a.node.id) ??
        required(bundleAxes.get(b.node.id)),
      across = along === "x" ? "y" : "x";
    const advance =
        b.node.position[along] -
        a.node.position[along],
      rise =
        b.node.position[across] -
        a.node.position[across];
    if (
      !rise ||
      Math.abs(rise) < 0.55 * Math.abs(advance)
    )
      continue;
    const side = (
      axis: "x" | "y",
      d: number,
    ): Side =>
      axis === "x"
        ? d > 0
          ? "right"
          : "left"
        : d > 0
          ? "bottom"
          : "top";
    Object.assign(a, {
      side: side(along, advance),
      bundleBranch: bundleAxes.has(a.node.id),
    });
    Object.assign(b, {
      side: bundleAxes.has(b.node.id)
        ? side(along, -advance)
        : side(across, -rise),
      bundleBranch: bundleAxes.has(b.node.id),
    });
  }

  // Leave room for a stem beside an overlapping peer.
  for (const entries of incident.values()) {
    const owner = required(entries[0]).end.node;
    if (dragging) continue;
    const bounds = box(owner);
    const neighbours = query(
      inflate(bounds, 24),
    ).filter(
      (q) =>
        q.id !== owner.id &&
        Math.hypot(
          Math.max(
            q.l - bounds.r,
            bounds.l - q.r,
            0,
          ),
          Math.max(
            q.t - bounds.b,
            bounds.t - q.b,
            0,
          ),
        ) < 24 &&
        !nodes.get(q.id)?.group,
    );
    for (const { end } of entries) {
      const { node, peer } = end;
      if (node === peer) continue;
      const clear = (side: Side) => {
        const p = portPosition(node, side, 0);
        return neighbours.every(
          (q) =>
            gap(p, move(p, side, 18), q) >= 6,
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
  if (trayLabels?.size)
    for (const { a, b } of plans) {
      const label = trayLabels.has(a.node)
        ? a
        : trayLabels.has(b.node)
          ? b
          : undefined;
      if (!label) continue;
      const member = label === a ? b : a;
      const frame = box(member.node),
        name = box(label.node);
      const across =
        frame.l - name.r >= frame.t - name.b;
      label.side = across ? "right" : "bottom";
      member.side = across ? "left" : "top";
      delete label.book;
      delete member.book;
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
    if (group.length === 2) {
      const [first, second] = group;
      if (
        first &&
        second &&
        incident.get(first.node.id)?.length ===
          2 &&
        first.peer !== second.peer
      ) {
        const axis = vertical(first.side)
          ? "y"
          : "x";
        const offset = Math.abs(
          first.peer.position[axis] -
            second.peer.position[axis],
        );
        const reach = Math.min(
          ...group.map((e) =>
            Math.abs(
              e.node.position[axis] -
                e.peer.position[axis],
            ),
          ),
        );
        first.pairedFan = second.pairedFan =
          offset < reach * 0.55;
      }
    }
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
