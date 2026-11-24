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
import { profile } from "plgg-flow/wireInteraction";
import type { FlowNode, Edge } from "./model";
import type { Socket } from "./wireBase";

type Option = {
  left: Side;
  right: Side;
  shape: ReturnType<typeof profile>;
  length: number;
  free: boolean;
  faults: number;
  sidePenalty?: number;
};
const cubics = cache<{
  plain: ReturnType<typeof canonical>["plain"];
  bounds: Bounds;
  option: Option;
}>(4096);
export const socketRegion = (
  a: FlowNode,
  b: FlowNode,
) =>
  corridor(
    [a.position, b.position],
    Math.max(
      180,
      24 +
        0.13 * distance(a.position, b.position),
      a.width ?? 0,
      b.width ?? 0,
      a.height ?? 0,
      b.height ?? 0,
    ),
  );
const swept = cache<Box[]>(8192);
const geometry = cache<Option>(8192);
export const socketOption = (
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
    const { plain, p1, p2 } = canonical(s, t);
    const shape = profile({
      ...materialize(edge, s, t, plain, 0, false),
      controls: [
        { ...p1, z: s.z },
        { ...p2, z: t.z },
      ],
    });
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
  const nearby = walls.filter((w) =>
    intersects(w, cubic.bounds),
  );
  const blocked = swept(
    JSON.stringify([ends, nearby.map(boxId)]),
    () => blockers(edge, cubic.plain, nearby),
  );
  if (!blocked.length) return cubic.option;
  if (!detour)
    return { ...cubic.option, free: false };
  const active = walls.filter(
    (q) =>
      q.id === edge.source ||
      q.id === edge.target ||
      blocked.some((w) => boxId(w) === boxId(q)),
  );
  for (;;) {
    const result = geometry(
      JSON.stringify([ends, active.map(boxId)]),
      () => {
        const wire = curvePath(
          edge,
          s,
          t,
          active,
          0,
          1,
          false,
        );
        const shape = profile(wire);
        let contacts = 0;
        for (const wall of active) {
          const end =
            wall.id === edge.source
              ? s
              : wall.id === edge.target
                ? t
                : undefined;
          if (
            wire.points.some(
              (p) =>
                (!end ||
                  distance(p, end) >= 20) &&
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
            contacts * 10 +
            extraBends(wire.points),
        };
      },
    );
    const path = result.shape.wire.points;
    const area = corridor(path, 10);
    const extra = walls.filter(
      (q) =>
        !active.includes(q) &&
        intersects(q, area) &&
        !free(path, [inflate(q, 10)]),
    );
    if (!extra.length) return result;
    active.push(...extra);
  }
};

export const selectCurvePairs = (
  plans: Plan[],
  query: (b: Bounds) => Box[],
  policy: (
    end: End,
    start: boolean,
  ) => {
    common: boolean;
    main: Side;
    allowed: Side[];
  },
) => {
  const pair = (p: Plan) =>
    JSON.stringify(
      [p.edge.source, p.edge.target].sort(),
    );
  const multiplicity = new Map<string, number>();
  const degree = new Map<string, number>();
  const childrenByNode = new Map<
    string,
    Plan[]
  >();
  const incoming = new Map<string, number>();
  for (const plan of plans) {
    const children =
      childrenByNode.get(plan.edge.source) ?? [];
    children.push(plan);
    childrenByNode.set(
      plan.edge.source,
      children,
    );
    incoming.set(
      plan.edge.target,
      (incoming.get(plan.edge.target) ?? 0) + 1,
    );
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
  const options = new Map<Plan, Option[]>();
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
    const walls = query(
      socketRegion(a.node, b.node),
    );
    // In a downward branch, keep each child attached to the same
    // faces even when another child occupies the intervening row.
    const children = required(
      childrenByNode.get(edge.source),
    );
    if (
      children.length > 1 &&
      children.every(
        (child) =>
          child.b.node.position.y > p.y &&
          incoming.get(child.edge.target) === 1,
      ) &&
      children.some(
        (child) =>
          Math.abs(
            child.b.node.position.x - p.x,
          ) < 8,
      )
    ) {
      a.side = "bottom";
      b.side = "top";
      continue;
    }
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
    const sourcePolicy = policy(a, true);
    const targetPolicy = policy(b, false);
    const sides = (
      end: End,
      {
        common,
        main,
        allowed,
      }: ReturnType<typeof policy>,
    ) => {
      return fixed
        ? [end.side]
        : common && !obstructed
          ? [main]
          : [end.side, ...allowed];
    };
    const leftSides = sides(a, sourcePolicy),
      rightSides = sides(b, targetPolicy);
    const candidates = (
      leftSides: Side[],
      rightSides: Side[],
    ) => {
      const make = (
        left: Side,
        right: Side,
        detour: boolean,
      ) =>
        socketOption(
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
        );
      const variants = (detour: boolean) =>
        leftSides.flatMap((left) =>
          rightSides.map((right) =>
            make(left, right, detour),
          ),
        );
      // Keep a shared fan socket, but aim independent ends at their peer.
      const aligned = (
        end: End,
        side: Side,
        start: boolean,
      ) => {
        const dx =
          end.peer.position.x -
          end.node.position.x;
        const dy =
          end.peer.position.y -
          end.node.position.y;
        return (
          side === facing(dx, dy) ||
          (side === end.side &&
            (start ? sourcePolicy : targetPolicy)
              .common)
        );
      };
      const facingPair = (v: Option) =>
        aligned(a, v.left, true) &&
        aligned(b, v.right, false);
      const plain = variants(false);
      const clear = plain.filter((v) => v.free);
      const largeFan =
        Math.max(
          degree.get(a.node.id) ?? 0,
          degree.get(b.node.id) ?? 0,
        ) >= 6;
      const preferred =
        fixed || (obstructed && !largeFan)
          ? []
          : plain
              .filter(facingPair)
              .map((v) =>
                v.free
                  ? v
                  : make(v.left, v.right, true),
              )
              .filter((v) => !v.faults);
      const terminalFan =
        degree.get(a.node.id) === 1 ||
        degree.get(b.node.id) === 1;
      // Allow a clear alternate at a fan tip when two facing cubics
      // would coincide. An overlap costs 100 in the fan solver.
      const alternative =
        terminalFan &&
        !largeFan &&
        preferred.some((p) => p.free)
          ? clear
              .filter((v) => !facingPair(v))
              .map((v) => ({
                ...v,
                sidePenalty: 60,
              }))
          : [];
      let valid = preferred.length
        ? [...preferred, ...alternative]
        : clear.length
          ? clear
          : variants(true);
      // A boxed-in socket can force two turns in opposite directions.
      // Try the other forward-facing side before accepting that detour.
      if (
        !fixed &&
        valid.every((v) => v.faults > 0)
      ) {
        const forward = (end: End) =>
          (
            [
              "left",
              "right",
              "top",
              "bottom",
            ] satisfies Side[]
          ).filter(
            (side) =>
              normal[side].x *
                (end.peer.position.x -
                  end.node.position.x) +
                normal[side].y *
                  (end.peer.position.y -
                    end.node.position.y) >=
              0,
          );
        const retry = forward(a).flatMap((left) =>
          forward(b).map((right) =>
            make(left, right, false),
          ),
        );
        const free = retry.filter((v) => v.free);
        valid = [
          ...valid,
          ...(free.length
            ? free
            : retry.map((v) =>
                make(v.left, v.right, true),
              )),
        ];
      }
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
  }
  for (const [p, variants] of options) {
    const score = (v: Option) =>
      (v.sidePenalty ?? 0) +
      v.length +
      Number(v.left !== p.a.side) * 1e-5;
    const best = variants.reduce((a, b) =>
      score(a) <= score(b) ? a : b,
    );
    if (
      degree.get(p.a.node.id) === 1 &&
      degree.get(p.b.node.id) === 1 &&
      best.free &&
      variants.some(
        (v) =>
          v.left === p.a.side &&
          v.right === p.b.side,
      )
    )
      continue;
    p.a.side = best.left;
    p.b.side = best.right;
  }
};
