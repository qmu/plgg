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
  book?: { page: number; depth: number };
  skip?: boolean;
  depth?: number;
  direct?: boolean;
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

type Plan = { edge: Edge; a: End; b: End };
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
      const along = vertical(a.side) ? "x" : "y";
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
  const adjacent = arcs.map((a) =>
    arcs.flatMap((b) => {
      if (
        a === b ||
        a.along !== b.along ||
        Math.abs(a.row - b.row) > 12
      )
        return [];
      const interleaves =
        (a.lo < b.lo &&
          b.lo < a.hi &&
          a.hi < b.hi) ||
        (b.lo < a.lo &&
          a.lo < b.hi &&
          b.hi < a.hi);
      const weight = interleaves
        ? 1
        : a.lo === b.lo && a.hi === b.hi
          ? 0.25
          : 0;
      return weight ? [{ b, weight }] : [];
    }),
  );
  // Keep the seeded page on a one-crossing trade so removing an arc
  // cannot flip a distant wire solely to reclaim one crossing.
  for (let pass = 0; pass < arcs.length; pass++) {
    let gain = 1,
      best;
    for (const [i, a] of arcs.entries()) {
      const score = required(adjacent[i]).reduce(
        (sum, { b, weight }) =>
          sum +
          (a.page === b.page ? weight : -weight),
        0,
      );
      if (score > gain) {
        gain = score;
        best = a;
      }
    }
    if (!best) break;
    best.page *= -1;
  }
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
          p.depth + 10,
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
const planDiagonalFans = (
  plans: Plan[],
  query: (bounds: Bounds) => Box[],
) => {
  // When a straight trunk and its blocked diagonal share both endpoint
  // rows, keep the diagonal fan together in the open strip between rows.
  const trunks = new Set(
    plans
      .filter(
        ({ a, b }) =>
          a.node !== b.node &&
          !vertical(a.side) &&
          !vertical(b.side) &&
          Math.abs(
            a.node.position.y - b.node.position.y,
          ) < 8,
      )
      .flatMap(({ a, b }) => [
        a.node.id,
        b.node.id,
      ]),
  );
  const branches = new Map<
    string,
    {
      a: End;
      b: End;
      blocked: boolean;
      source: Side;
      target: Side;
    }[]
  >();
  for (const { a, b, edge } of plans) {
    const p = a.node.position,
      q = b.node.position,
      dy = q.y - p.y;
    if (
      edge.route !== "step" ||
      edge.waypoints?.length ||
      vertical(a.side) ||
      vertical(b.side) ||
      Math.abs(dy) < 60 ||
      Math.abs(q.x - p.x) > Math.abs(dy) * 2.2 ||
      !trunks.has(a.node.id) ||
      !trunks.has(b.node.id)
    )
      continue;
    const source = dy > 0 ? "bottom" : "top",
      target = dy > 0 ? "top" : "bottom";
    const u = portPosition(a.node, source, 0),
      v = portPosition(b.node, target, 0);
    const walls = query({
      l: Math.min(u.x, v.x) - 12,
      r: Math.max(u.x, v.x) + 12,
      t: Math.min(u.y, v.y) - 12,
      b: Math.max(u.y, v.y) + 12,
    }).filter(
      (o) =>
        o.id !== a.node.id && o.id !== b.node.id,
    );
    if (
      ![0.5, 0.25, 0.75].some((f) => {
        const y = u.y + (v.y - u.y) * f;
        const l = pt(u.x, y),
          r = pt(v.x, y);
        return walls.every(
          (o) =>
            gap(u, l, o) >= 12 &&
            gap(l, r, o) >= 12 &&
            gap(r, v, o) >= 12,
        );
      })
    )
      continue;
    const key = JSON.stringify([
        a.node.id,
        a.side,
        source,
      ]),
      list = branches.get(key) ?? [];
    const start = portPosition(a.node, a.side, 0),
      end = portPosition(b.node, b.side, 0);
    list.push({
      a,
      b,
      source,
      target,
      blocked: walls.some(
        (o) => gap(start, end, o) < 8,
      ),
    });
    branches.set(key, list);
  }
  for (const group of branches.values()) {
    if (
      group.length < 2 ||
      !group.some((g) => g.blocked)
    )
      continue;
    for (const {
      a,
      b,
      source,
      target,
      blocked,
    } of group) {
      Object.assign(a, {
        side: source,
        direct: !blocked,
      });
      Object.assign(b, { side: target });
    }
  }
};
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
  const reach = new Map<
    string,
    { longest: number; total: number; ray: Point }
  >();
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
      const oldReach = reach.get(k);
      if (n !== p)
        reach.set(k, {
          longest: Math.max(
            d,
            oldReach?.longest ?? 0,
          ),
          total: (oldReach?.total ?? 0) + d,
          ray:
            d > (oldReach?.longest ?? 0)
              ? pt(dx, dy)
              : required(oldReach).ray,
        });
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
    const distances = reach.get(
      key(node.id, start),
    );
    const axis =
      distances &&
      (degrees.get(key(node.id, start)) ?? 0) >=
        3 &&
      distances.longest > distances.total * 0.6
        ? distances.ray
        : m;
    let side =
      node === peer
        ? start
          ? "left"
          : "bottom"
        : facing(axis.x, axis.y);
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
      Object.assign(end, {
        skip: !inRow && !narrow,
      });
      const head = !vicinity.some(
        (n) => n.position[along] < low - 8,
      );
      const tail = !vicinity.some(
        (n) => n.position[along] > low + span + 8,
      );
      if (inRow && !narrow) {
        const exterior = head || tail;
        const page =
          head && tail && start !== forward
            ? 1
            : exterior
              ? -1
              : 1;
        const depth =
          23.5 +
          10 * Math.max(0, between.length - 3);
        Object.assign(end, {
          book: { page, depth },
        });
      }
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
  // Keep an aligned skip outside the fan of diagonal siblings.
  for (const { a, b, edge } of plans) {
    if (
      !a.skip ||
      !b.skip ||
      a.side !== b.side ||
      edge.waypoints?.length ||
      (parallels.get(
        JSON.stringify(
          [edge.source, edge.target].sort(),
        ),
      )?.length ?? 0) > 1
    )
      continue;
    const upright = vertical(a.side),
      across = upright ? "y" : "x";
    let bias = 0;
    for (const [end, start] of [
      [a, true],
      [b, false],
    ] satisfies [End, boolean][]) {
      for (const peer of incident.get(
        end.node.id,
      ) ?? []) {
        if (
          peer.start !== start ||
          peer.end.peer === end.peer
        )
          continue;
        const d =
          peer.end.peer.position[across] -
          end.node.position[across];
        if (Math.abs(d) > 12)
          bias += Math.sign(d);
      }
    }
    if (
      !bias ||
      Math.sign(bias) !== normal[a.side][across]
    )
      continue;
    const side: Side = upright
      ? bias > 0
        ? "top"
        : "bottom"
      : bias > 0
        ? "left"
        : "right";
    const u = portPosition(a.node, side, 0),
      v = portPosition(b.node, side, 0);
    const l = move(u, side, 38),
      r = move(v, side, 38);
    const walls = query({
      l: Math.min(u.x, v.x, l.x, r.x) - 10,
      r: Math.max(u.x, v.x, l.x, r.x) + 10,
      t: Math.min(u.y, v.y, l.y, r.y) - 10,
      b: Math.max(u.y, v.y, l.y, r.y) + 10,
    });
    if (
      walls.every(
        (q) =>
          q.id === a.node.id ||
          q.id === b.node.id ||
          (gap(u, l, q) >= 10 &&
            gap(l, r, q) >= 10 &&
            gap(r, v, q) >= 10),
      )
    ) {
      Object.assign(a, { side });
      Object.assign(b, { side });
    }
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
  // Keep the long axis free for a parallel bundle. Diagonal neighbours
  // take the adjacent flank on that card and arrive on the facing flank.
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
      side: bundleAxes.has(a.node.id)
        ? side(across, rise)
        : side(along, advance),
    });
    Object.assign(b, {
      side: side(across, -rise),
    });
  }
  planDiagonalFans(plans, query);
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
