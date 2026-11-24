import { materialize } from "plgg-flow/wirePath";
import type { Plan, End } from "./wirePorts";
import {
  corridor,
  intersects,
  type Bounds,
} from "plgg-flow/wireCorridors";
import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import {
  canonical,
  blockers,
  extraBends,
  curvePath,
} from "plgg-flow/wireCurve";
import {
  type Box,
  required,
  distance,
  gap,
  free,
  inflate,
  pointGap,
  facing,
  normal,
} from "plgg-flow/wireGeometry";
import { cache, boxId } from "plgg-flow/wireMemo";
import {
  profile,
  measureConflict,
} from "plgg-flow/wireInteraction";
import type { Edge } from "./model";
import type { Socket } from "./wireBase";

type Option = {
  left: Side;
  right: Side;
  shape: ReturnType<typeof profile>;
  length: number;
  free: boolean;
  faults: number;
};
const cubics = cache<{
  plain: ReturnType<typeof canonical>["plain"];
  bounds: Bounds;
  option: Option;
}>(4096);
const geometry = cache<Option>(8192);
const option = (
  edge: Edge,
  s: Socket,
  t: Socket,
  walls: Box[],
  detour: boolean,
) => {
  const ends = JSON.stringify([
    edge.source,
    edge.target,
    s,
    t,
  ]);
  const cubic = cubics(ends, () => {
    const { plain } = canonical(s, t);
    const shape = profile(
      materialize(edge, s, t, plain, 0, false),
    );
    return {
      plain,
      bounds: corridor(plain, 10),
      option: {
        left: s.side,
        right: t.side,
        free: true,
        shape,
        length: shape.length,
        faults: 0,
      },
    };
  });
  const nearby = detour
    ? walls
    : walls.filter((w) =>
        intersects(w, cubic.bounds),
      );
  return geometry(
    JSON.stringify([
      ends,
      nearby.map(boxId),
      detour,
    ]),
    () => {
      if (
        !blockers(edge, cubic.plain, nearby)
          .length
      )
        return cubic.option;
      if (!detour)
        return { ...cubic.option, free: false };
      const wire = curvePath(
        edge,
        s,
        t,
        nearby,
        0,
        1,
        false,
      );
      const shape = profile(wire);
      let contacts = 0;
      for (const wall of nearby) {
        const end =
          wall.id === edge.source
            ? s
            : wall.id === edge.target
              ? t
              : undefined;
        if (
          wire.points.some(
            (p) =>
              (!end || distance(p, end) >= 20) &&
              pointGap(p, wall) < (end ? 3 : 6),
          )
        )
          contacts++;
      }
      return {
        left: s.side,
        right: t.side,
        free: false,
        shape,
        length: shape.length,
        faults:
          contacts * 10 + extraBends(wire.points),
      };
    },
  );
};

const conflictMemo = new WeakMap<
  Option,
  WeakMap<Option, number>
>();
const conflicts = (a: Option, b: Option) => {
  const memo =
    conflictMemo.get(a) ??
    new WeakMap<Option, number>();
  const hit = memo.get(b);
  if (hit !== undefined) return hit;
  const cost = measureConflict(
    a.shape,
    b.shape,
    Infinity,
    true,
  );
  memo.set(b, cost);
  conflictMemo.set(a, memo);
  return cost;
};

export const selectCurvePairs = (
  plans: Plan[],
  query: (b: Bounds) => Box[],
  policy: (
    end: End,
    start: boolean,
  ) => { common: boolean; allowed: Side[] },
) => {
  const pair = (p: Plan) =>
    JSON.stringify(
      [p.edge.source, p.edge.target].sort(),
    );
  const multiplicity = new Map<string, number>();
  const degree = new Map<string, number>();
  for (const plan of plans) {
    multiplicity.set(
      pair(plan),
      (multiplicity.get(pair(plan)) ?? 0) + 1,
    );
    for (const id of [
      plan.edge.source,
      plan.edge.target,
    ])
      degree.set(id, (degree.get(id) ?? 0) + 1);
  }
  const region = new Map<Plan, Box[]>();
  const options = new Map<Plan, Option[]>();
  const projected = new Map<End, Option[]>();
  const incident = new Map<string, Plan[]>();
  for (const plan of plans) {
    const { edge, a, b } = plan;
    if (
      (edge.route && edge.route !== "curve") ||
      edge.waypoints?.length ||
      a.node === b.node
    )
      continue;
    const p = a.node.position,
      q = b.node.position;
    const reach = Math.max(
      180,
      24 + 0.13 * distance(p, q),
      a.node.width ?? 0,
      b.node.width ?? 0,
      a.node.height ?? 0,
      b.node.height ?? 0,
    );
    const walls = query({
      l: Math.min(p.x, q.x) - reach,
      r: Math.max(p.x, q.x) + reach,
      t: Math.min(p.y, q.y) - reach,
      b: Math.max(p.y, q.y) + reach,
    });
    region.set(plan, walls);
    const obstructed = walls.some(
      (w) =>
        w.id !== edge.source &&
        w.id !== edge.target &&
        gap(p, q, w) < 10,
    );
    const fixed = Boolean(
      a.depth ||
        required(multiplicity.get(pair(plan))) >
          1,
    );
    const sides = (end: End, start: boolean) => {
      const { common, allowed } = policy(
        end,
        start,
      );
      return fixed || (common && !obstructed)
        ? [end.side]
        : [end.side, ...allowed];
    };
    const leftSides = sides(a, true),
      rightSides = sides(b, false);
    const candidates = (
      leftSides: Side[],
      rightSides: Side[],
    ) => {
      const variants = (detour: boolean) =>
        leftSides.flatMap((left) =>
          rightSides.map((right) =>
            option(
              edge,
              {
                ...portPosition(a.node, left, 0),
                side: left,
              },
              {
                ...portPosition(b.node, right, 0),
                side: right,
              },
              walls,
              detour,
            ),
          ),
        );
      const clear = variants(false).filter(
        (v) => v.free,
      );
      const valid = clear.length
        ? clear
        : variants(true);
      const minFaults = Math.min(
        ...valid.map((v) => v.faults),
      );
      return valid.filter(
        (v) => v.faults === minFaults,
      );
    };
    options.set(
      plan,
      candidates(leftSides, rightSides),
    );
    // At the far end of a sibling only its node geometry belongs to this
    // fan. Reading its own other wires here would relay a second-hop edit.
    const facingSides = (end: End) => {
      const dx =
          end.peer.position.x -
          end.node.position.x,
        dy =
          end.peer.position.y -
          end.node.position.y;
      const primary = facing(dx, dy);
      const sides: Side[] = [
        "top",
        "bottom",
        "left",
        "right",
      ];
      return [
        primary,
        ...sides.filter(
          (side) =>
            side !== primary &&
            normal[side].x * dx +
              normal[side].y * dy >=
              0,
        ),
      ];
    };
    projected.set(
      a,
      fixed || degree.get(a.node.id) === 1
        ? required(options.get(plan))
        : candidates(leftSides, facingSides(b)),
    );
    projected.set(
      b,
      fixed || degree.get(b.node.id) === 1
        ? required(options.get(plan))
        : candidates(facingSides(a), rightSides),
    );
    for (const id of [edge.source, edge.target]) {
      const list = incident.get(id) ?? [];
      list.push(plan);
      incident.set(id, list);
    }
  }
  const cost = (
    id: string,
    p: Plan,
    v: Option,
    peer: Plan,
    other: Option,
  ) => {
    const out = p.edge.source === id,
      otherOut = peer.edge.source === id;
    const mixed =
      out !== otherOut &&
      (out ? v.left : v.right) ===
        (otherOut ? other.left : other.right);
    return (
      (mixed ? 1000 : 0) + conflicts(v, other)
    );
  };
  // Solve each fan independently. A decision is never passed on to the
  // next fan, so solving order cannot propagate a change across a sheet.
  const fans = new Map<
    string,
    Map<Plan, Option>
  >();
  for (const [id, star] of incident) {
    const pool = (p: Plan) =>
      required(
        projected.get(
          p.edge.source === id ? p.a : p.b,
        ),
      );
    const picks = new Map<Plan, Option>();
    for (const p of star)
      picks.set(p, required(pool(p)[0]));
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (const p of star) {
        const current = required(picks.get(p));
        let best = current,
          least = Infinity;
        for (const v of pool(p)) {
          let count = 0;
          for (const [peer, other] of picks)
            if (peer !== p)
              count += cost(
                id,
                p,
                v,
                peer,
                other,
              );
          if (
            count < least ||
            (count === least &&
              v.length < best.length - 1e-6)
          ) {
            best = v;
            least = count;
          }
        }
        picks.set(p, best);
        changed ||= best !== current;
      }
      if (!changed) break;
    }
    fans.set(id, picks);
  }
  for (const [p, variants] of options) {
    const stars = [
      required(fans.get(p.edge.source)),
      required(fans.get(p.edge.target)),
    ];
    let best = required(variants[0]),
      least = Infinity;
    for (const v of variants) {
      let score = 0;
      for (const [index, star] of stars.entries())
        for (const [peer, route] of star)
          if (peer !== p)
            score += cost(
              index === 0
                ? p.edge.source
                : p.edge.target,
              p,
              v,
              peer,
              route,
            );
      if (
        score < least ||
        (score === least &&
          v.length < best.length - 1e-6)
      ) {
        best = v;
        least = score;
      }
    }
    // Preserve the dominant-axis convention on an isolated clear pair.
    if (
      stars.every((star) => star.size === 1) &&
      best.free &&
      variants.some(
        (v) =>
          v.left === p.a.side &&
          v.right === p.b.side,
      )
    )
      continue;
    if (
      !best.free &&
      required(multiplicity.get(pair(p))) === 1
    ) {
      const wire = best.shape.wire;
      const walls = required(region.get(p));
      if (
        query(corridor(wire.points, 10)).every(
          (q) =>
            walls.includes(q) ||
            free(wire.points, [inflate(q, 10)]),
        )
      )
        p.curve = wire;
    }
    p.a.side = best.left;
    p.b.side = best.right;
  }
};
