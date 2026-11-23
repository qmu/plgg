import type { Point } from "plgg-board";
import type { FlowNode, Edge } from "./model";
import type { Wire } from "./wiring";
import type { End } from "./wireFan";
import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import {
  vertical,
  pt,
  required,
  normal,
  move,
  distance,
  facing,
  cuts,
  bezier,
  type Box,
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
  boxes: Box[],
  previous?: Wire[],
) => {
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
          (means.has(key(node.id, !start))
            ? 0.62
            : 0.12) *
            Math.hypot(dx, dy))
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
  if (rowAxis && !previous) {
    const skips = plans
      .map(({ a, b }) => {
        const from = required(
            ordinal.get(a.node.id),
          ),
          to = required(ordinal.get(b.node.id));
        return {
          a,
          b,
          lo: Math.min(from, to),
          hi: Math.max(from, to),
          from,
          to,
        };
      })
      .filter((p) => p.hi - p.lo > 1)
      .sort(
        (p, q) => q.hi - q.lo - (p.hi - p.lo),
      );
    // Minimise interleaving spans and opposing uses of a socket on each bank.
    const weights = skips.map((p) =>
      skips.map((q) => {
        if (p.lo === q.lo && p.hi === q.hi)
          return 100;
        if (p.to === q.from || p.from === q.to)
          return 6;
        if (p.hi <= q.lo || q.hi <= p.lo)
          return 0;
        if (
          (p.lo < q.lo && p.hi < q.hi) ||
          (p.lo > q.lo && p.hi > q.hi)
        )
          return 12;
        return p.from === q.from || p.to === q.to
          ? 5
          : 1;
      }),
    );
    const banks: number[] = [];
    const cost = (i: number, side: number) =>
      banks.reduce(
        (sum, b, j) =>
          sum +
          (j !== i && b === side
            ? required(required(weights[i])[j])
            : 0),
        0,
      );
    skips.forEach((_, i) =>
      banks.push(
        cost(i, 0) <= cost(i, 1) ? 0 : 1,
      ),
    );
    for (
      let pass = 0;
      pass < skips.length;
      pass++
    ) {
      let change = false;
      for (let i = 0; i < skips.length; i++) {
        const current = required(banks[i]);
        if (
          cost(i, 1 - current) < cost(i, current)
        ) {
          banks[i] = 1 - current;
          change = true;
        }
      }
      if (!change) break;
    }
    // Joint flips can resolve interleavings that a single-bank flip cannot improve.
    if (skips.length <= 12) {
      let best =
        banks.reduce(
          (sum, bank, i) => sum + cost(i, bank),
          0,
        ) / 2;
      const assignment: number[] = [0];
      const choose = (
        i: number,
        total: number,
      ) => {
        if (total >= best) return;
        if (i === skips.length) {
          best = total;
          banks.splice(
            0,
            banks.length,
            ...assignment,
          );
          return;
        }
        for (const side of [0, 1]) {
          let next = total;
          for (let j = 0; j < i; j++)
            if (assignment[j] === side)
              next += required(
                required(weights[i])[j],
              );
          assignment[i] = side;
          choose(i + 1, next);
        }
      };
      if (skips.length > 1) choose(1, 0);
    }
    skips.forEach(({ a, b }, i) => {
      a.side = b.side =
        rowAxis === "y"
          ? banks[i]
            ? "bottom"
            : "top"
          : banks[i]
            ? "right"
            : "left";
    });
  }
  if (previous) {
    plans.forEach(({ a, b, edge }, i) => {
      const w = previous[i];
      if (!w || w.edge !== edge) return;
      for (const [end, side] of [
        [a, w.sourceSide],
        [b, w.targetSide],
      ] satisfies [End, Side][]) {
        const p = portPosition(end.node, side, 0);
        if (
          !boxes.some(
            (q) =>
              q.id !== end.node.id &&
              cuts(p, move(p, side, 1), q),
          )
        )
          end.side = side;
        else {
          // When the old stem closes, keep the replacement close to the visible wire.
          let best = Infinity;
          for (const face of sides) {
            const socket = portPosition(
              end.node,
              face,
              0,
            );
            if (
              boxes.some(
                (q) =>
                  q.id !== end.node.id &&
                  cuts(
                    socket,
                    move(socket, face, 16),
                    q,
                  ),
              )
            )
              continue;
            let gap = Infinity;
            for (const sample of w.points)
              gap = Math.min(
                gap,
                distance(sample, socket),
              );
            const cost =
              gap +
              0.25 * distance(socket, p) +
              (face === end.side ? 0 : 4);
            if (cost < best) {
              best = cost;
              end.side = face;
            }
          }
        }
      }
    });
  }
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
  for (const entries of incident.values()) {
    const mixed =
      entries.some((x) => x.start) &&
      entries.some((x) => !x.start);
    if (
      !previous &&
      !rowAxis &&
      mixed &&
      entries.some((x) =>
        entries.some(
          (y) =>
            x.start !== y.start &&
            x.end.side === y.end.side,
        ),
      )
    ) {
      const costs = entries.map(({ end }) =>
        sides.map((side) => {
          const dx =
              end.peer.position.x -
              end.node.position.x,
            dy =
              end.peer.position.y -
              end.node.position.y;
          const p = portPosition(
            end.node,
            side,
            0,
          );
          return (
            (boxes.some(
              (q) =>
                q.id !== end.node.id &&
                cuts(p, move(p, side, 16), q),
            )
              ? 1000
              : 0) +
            (end.side === side ? 0 : 1) -
            (dx * normal[side].x +
              dy * normal[side].y) /
              (Math.hypot(dx, dy) || 1)
          );
        }),
      );
      let best = Infinity;
      for (let mask = 1; mask < 15; mask++) {
        let sum = 0;
        const assignment = entries.map(
          ({ start }, i) => {
            let cost = Infinity,
              pick = 0;
            sides.forEach((_, j) => {
              const v = required(
                required(costs[i])[j],
              );
              if (
                Boolean(mask & (1 << j)) ===
                  start &&
                v < cost
              ) {
                cost = v;
                pick = j;
              }
            });
            sum += cost;
            return required(sides[pick]);
          },
        );
        if (sum < best) {
          best = sum;
          entries.forEach(({ end }, i) => {
            end.side = required(assignment[i]);
          });
        }
      }
    }
  }
  if (!rowAxis && !previous) {
    // A spare face can give a blocked wire a shorter, gentler exit.

    for (const { a, b } of plans) {
      if (
        a.node === b.node ||
        (!boxes.some(
          (q) =>
            q.id !== a.node.id &&
            q.id !== b.node.id &&
            cuts(
              a.node.position,
              b.node.position,
              q,
            ),
        ) &&
          (parallels.get(
            JSON.stringify(
              [a.node.id, b.node.id].sort(),
            ),
          )?.length ?? 0) <= 1)
      )
        continue;
      const options = (
        end: End,
        start: boolean,
      ) => {
        const entries = required(
          incident.get(end.node.id),
        );
        if (entries.length > 7) return [end.side];
        const dx =
            end.peer.position.x -
            end.node.position.x,
          dy =
            end.peer.position.y -
            end.node.position.y;
        return [
          end.side,
          ...sides.filter(
            (side) =>
              side !== end.side &&
              dx * normal[side].x +
                dy * normal[side].y >=
                0 &&
              !entries.some(
                (x) =>
                  x.start !== start &&
                  x.end.side === side,
              ),
          ),
        ];
      };
      const preview = (sa: Side, sb: Side) => {
        const p = portPosition(a.node, sa, 0),
          q = portPosition(b.node, sb, 0);
        const u = move(p, sa, 14),
          v = move(q, sb, 14),
          gap = distance(u, v),
          arm = Math.max(40, gap * 0.45);
        return [
          p,
          ...bezier(
            u,
            move(u, sa, arm),
            move(v, sb, arm),
            v,
            8,
          ),
          q,
        ];
      };
      const assess = (path: Point[]) => {
        const p = required(path[0]),
          q = required(path[path.length - 1]);
        let cost = 0;
        const bounds = {
          l: Infinity,
          r: -Infinity,
          t: Infinity,
          b: -Infinity,
        };
        for (const p of path) {
          bounds.l = Math.min(bounds.l, p.x);
          bounds.r = Math.max(bounds.r, p.x);
          bounds.t = Math.min(bounds.t, p.y);
          bounds.b = Math.max(bounds.b, p.y);
        }
        for (const box of boxes) {
          if (
            bounds.r <= box.l ||
            bounds.l >= box.r ||
            bounds.t >= box.b ||
            bounds.b <= box.t
          )
            continue;
          if (
            path.some(
              (p, i) =>
                i > 0 &&
                cuts(
                  required(path[i - 1]),
                  p,
                  box,
                ),
            )
          )
            cost += 120;
        }
        // Reject short facing gaps that force the cubic to turn back on itself.
        let length = 0,
          maxTurn = 0;
        for (let i = 1; i < path.length; i++) {
          const p = required(path[i - 1]),
            q = required(path[i]),
            r = path[i + 1];
          length += distance(p, q);
          if (r) {
            const dx = q.x - p.x,
              dy = q.y - p.y,
              x = r.x - q.x,
              y = r.y - q.y;
            maxTurn = Math.max(
              maxTurn,
              Math.abs(
                Math.atan2(
                  dx * y - dy * x,
                  dx * x + dy * y,
                ),
              ),
            );
          }
        }
        cost +=
          Math.max(0, maxTurn - 0.7) * 90 +
          Math.max(
            0,
            length - 1.35 * distance(p, q),
          ) *
            0.35;
        return cost;
      };
      const chosen = preview(a.side, b.side);
      let low = assess(chosen);
      const left = options(a, true),
        right = options(b, false);
      let bestA = a.side,
        bestB = b.side;
      if (low >= 12)
        for (const sa of left)
          for (const sb of right) {
            if (sa === a.side && sb === b.side)
              continue;
            const candidate = preview(sa, sb);
            const cost =
              assess(candidate) +
              (sa === a.side ? 0 : 16) +
              (sb === b.side ? 0 : 16);
            if (cost < low) {
              low = cost;

              bestA = sa;
              bestB = sb;
            }
          }
      a.side = bestA;
      b.side = bestB;
    }
  }
  // Keep the clearest facing sockets, then prefer an established sibling fan.
  if (!previous)
    for (const entries of incident.values()) {
      for (const { end, start } of entries) {
        const { node, peer } = end;
        if (
          node === peer ||
          ((Math.abs(
            node.position.x - peer.position.x,
          ) < 1 ||
            Math.abs(
              node.position.y - peer.position.y,
            ) < 1) &&
            entries.some(
              (x) =>
                x.start !== start &&
                x.end.peer === peer,
            )) ||
          boxes.some(
            (q) =>
              q.id !== node.id &&
              q.id !== peer.id &&
              cuts(
                node.position,
                peer.position,
                q,
              ),
          )
        )
          continue;
        const dx =
            peer.position.x - node.position.x,
          dy = peer.position.y - node.position.y;
        const cosine = (side: Side) =>
          (dx * normal[side].x +
            dy * normal[side].y) /
          (Math.hypot(dx, dy) || 1);
        const open = sides.filter((side) => {
          const p = portPosition(node, side, 0);
          return !boxes.some(
            (q) =>
              q.id !== node.id &&
              cuts(p, move(p, side, 16), q),
          );
        });
        const best = Math.max(
          ...open.map(cosine),
        );
        const score = (side: Side) =>
          cosine(side) +
          Number(
            entries.some(
              (x) =>
                x.end !== end &&
                x.start === start &&
                x.end.side === side,
            ),
          ) *
            4 -
          Number(
            entries.some(
              (x) =>
                x.start !== start &&
                x.end.side === side,
            ),
          );
        Object.assign(end, {
          side:
            open
              .filter(
                (side) =>
                  best - cosine(side) <= 0.35,
              )
              .sort(
                (a, b) => score(b) - score(a),
              )[0] ?? end.side,
        });
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
    group.forEach((e, i) => {
      e.count = group.length;
      e.rank = i - (group.length - 1) / 2;
    });
  }
  const degree = (id: string) =>
    (degrees.get(key(id, true)) ?? 0) +
    (degrees.get(key(id, false)) ?? 0);
  return {
    rowAxis,
    ordinal,
    plans,
    parallels,
    degree,
  };
};
