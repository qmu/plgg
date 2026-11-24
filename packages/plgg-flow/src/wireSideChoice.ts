import {
  socketRegion,
  socketOption,
} from "plgg-flow/wireCurvePairs";
import type { Wire } from "./wiring";
import type { FlowNode } from "./model";
import { sides } from "plgg-flow/wirePorts";
import { portPosition } from "plgg-flow/nodeBody";
import { extraBends } from "plgg-flow/wireCurve";
import { type Bounds } from "plgg-flow/wireCorridors";
import {
  distance,
  crossesItself,
  normal,
  facing,
  gap,
  pt,
  type Box,
} from "plgg-flow/wireGeometry";
import { cache, boxId } from "plgg-flow/wireMemo";
import {
  profile,
  measureConflict,
  neighbourIndex,
} from "plgg-flow/wireInteraction";

const plainRoutes = cache<Wire[]>(2048);
const penalties = new WeakMap<
  Wire["points"],
  WeakMap<Wire["points"], number>
>();
type Shape = ReturnType<typeof profile>;
const penalty = (a: Shape, b: Shape) => {
  const peers =
    penalties.get(a.wire.points) ??
    new WeakMap<Wire["points"], number>();
  const hit = peers.get(b.wire.points);
  if (hit !== undefined) return hit;
  const value = measureConflict(
    a,
    b,
    Infinity,
    true,
    true,
  );
  const cost = value >= 100 ? 4 * value : value;
  peers.set(b.wire.points, cost);
  penalties.set(a.wire.points, peers);
  return cost;
};

const alternatives = (
  w: Wire,
  a: FlowNode,
  b: FlowNode,
  walls: Box[],
  detours: boolean,
  leftSide?: Wire["sourceSide"],
  rightSide?: Wire["targetSide"],
) => {
  const key = JSON.stringify([
    a.id,
    b.id,
    a.position,
    b.position,
    walls.map(boxId),
    detours,
    leftSide,
    rightSide,
  ]);
  return plainRoutes(key, () => {
    const routes: Wire[] = [];
    for (const left of leftSide
      ? [leftSide]
      : sides)
      for (const right of rightSide
        ? [rightSide]
        : sides) {
        const s = {
            ...portPosition(a, left, 0),
            side: left,
          },
          t = {
            ...portPosition(b, right, 0),
            side: right,
          };
        const option = socketOption(
          w.edge,
          s,
          t,
          walls,
          detours,
        );
        if (
          (option.free || detours) &&
          option.faults < 10 &&
          !crossesItself([
            ...option.shape.wire.points,
          ])
        )
          routes.push(option.shape.wire);
      }
    return routes;
  });
};
export const chooseSides = (
  wires: Wire[],
  nodes: Map<string, FlowNode>,
  wallsIn: (bounds: Bounds) => Box[],
  guides: Map<Wire["edge"], Wire[]>,
) => {
  const shapes = wires.map(profile);
  const index = neighbourIndex(shapes);
  const result = wires.slice();
  const means = new Map<
    string,
    { x: number; y: number }
  >();
  const counts = new Map<string, number>();
  const pairCount = new Map<string, number>();
  const pair = (w: Wire) =>
    JSON.stringify(
      [w.edge.source, w.edge.target].sort(),
    );
  for (const w of wires) {
    pairCount.set(
      pair(w),
      (pairCount.get(pair(w)) ?? 0) + 1,
    );
    for (const key of [
      w.edge.source + "-out",
      w.edge.target + "-in",
    ]) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const a = nodes.get(
          w.edge.source,
        )!.position,
        b = nodes.get(w.edge.target)!.position;
      const scale =
        (key === w.edge.source + "-out"
          ? 1
          : -1) / (distance(a, b) || 1);
      const m = means.get(key) ?? pt(0, 0);
      means.set(
        key,
        pt(
          m.x + (b.x - a.x) * scale,
          m.y + (b.y - a.y) * scale,
        ),
      );
    }
  }
  // Choose the faces at the tips of a terminal fan together. The
  // common face stays fixed and each option has its own obstacle route.
  const terminal = new Set<number>();
  const fans = new Map<string, number[]>();
  for (const [i, w] of wires.entries()) {
    if (
      (w.edge.route &&
        w.edge.route !== "curve") ||
      w.edge.via?.length ||
      w.edge.waypoints?.length
    )
      continue;
    for (const [key, other] of [
      [w.edge.source + "-out", w.edge.target],
      [w.edge.target + "-in", w.edge.source],
    ] satisfies [string, string][]) {
      if (
        (counts.get(key) ?? 0) < 4 ||
        (counts.get(other + "-out") ?? 0) +
          (counts.get(other + "-in") ?? 0) !==
          1
      )
        continue;
      const list = fans.get(key) ?? [];
      list.push(i);
      fans.set(key, list);
    }
  }
  for (const [key, group] of fans) {
    if (group.length !== counts.get(key))
      continue;
    const source = key.endsWith("-out");
    const mean = means.get(key)!;
    const main = facing(mean.x, mean.y),
      opposite = facing(-mean.x, -mean.y);
    const preferred = group.map((i) => {
      const w = wires[i]!,
        a = nodes.get(w.edge.source)!,
        b = nodes.get(w.edge.target)!;
      return alternatives(
        w,
        a,
        b,
        wallsIn(socketRegion(a, b)),
        false,
        source ? main : opposite,
        source ? opposite : main,
      )[0];
    });
    if (preferred.every((w) => w !== undefined)) {
      preferred.forEach((w, j) => {
        const i = group[j]!;
        terminal.add(i);
        shapes[i] = profile(w);
        index.update(i, shapes[i]!);
        result[i] = {
          ...w,
          edge: wires[i]!.edge,
        };
      });
      continue;
    }
    if (
      Math.hypot(mean.x, mean.y) <
      group.length * 0.8
    )
      continue;
    type Pick = {
      cost: number;
      choices: Shape[];
    };
    let states: Pick[] = [
      { cost: 0, choices: [] },
    ];
    for (const i of group) {
      const w = wires[i]!,
        a = nodes.get(w.edge.source)!,
        b = nodes.get(w.edge.target)!;
      const walls = wallsIn(socketRegion(a, b));
      const options = alternatives(
        w,
        a,
        b,
        walls,
        true,
        source ? main : undefined,
        source ? undefined : main,
      ).map(profile);
      if (!options.length) {
        states = [];
        break;
      }
      const tip = source
          ? b.position
          : a.position,
        hub = source ? a.position : b.position;
      const desired = facing(
        hub.x - tip.x,
        hub.y - tip.y,
      );
      const next = states.flatMap((state) =>
        options.map((shape) => {
          const side = source
            ? shape.wire.targetSide
            : shape.wire.sourceSide;
          const cost =
            state.cost +
            Number(side !== desired) * 2 +
            extraBends(shape.path) * 1.5 +
            Number(
              !shape.wire.controls &&
                side !== desired &&
                normal[side].x * (hub.x - tip.x) +
                  normal[side].y *
                    (hub.y - tip.y) <
                  0,
            ) *
              4 +
            shape.length /
              (distance(tip, hub) || 1) +
            state.choices.reduce(
              (n, p) => n + penalty(shape, p),
              0,
            );
          return {
            cost,
            choices: [...state.choices, shape],
          };
        }),
      );
      states = next
        .sort((a, b) => a.cost - b.cost)
        .slice(0, 16);
    }
    const chosen = states[0];
    if (!chosen) continue;
    chosen.choices.forEach((shape, j) => {
      const i = group[j]!;
      terminal.add(i);
      result[i] = {
        ...shape.wire,
        edge: wires[i]!.edge,
      };
      shapes[i] = shape;
      index.update(i, shape);
    });
  }
  for (let pass = 0; pass < 2; pass++)
    for (const [i, w] of result.entries()) {
      if (
        terminal.has(i) ||
        (w.edge.route &&
          w.edge.route !== "curve") ||
        w.edge.waypoints?.length ||
        w.edge.source === w.edge.target ||
        (pairCount.get(pair(w)) ?? 0) > 1
      )
        continue;
      const score = (shape: Shape) =>
        index
          .query(shape)
          .reduce(
            (sum, p) =>
              sum +
              (p.i === i
                ? 0
                : penalty(shape, shapes[p.i]!)),
            0,
          );
      let best = shapes[i]!;
      let least =
        score(best) + 100 * extraBends(w.points);
      const a = nodes.get(w.edge.source)!,
        b = nodes.get(w.edge.target)!;
      const walls = wallsIn(socketRegion(a, b));
      const axis =
        w.source.x === w.target.x ? "x" : "y";
      if (
        w.sourceSide === w.targetSide &&
        w.source[axis] === w.target[axis] &&
        (least < 100 ||
          walls.every(
            (q) =>
              nodes.get(q.id)?.position[axis] ===
              a.position[axis],
          ))
      )
        continue;
      const obstructed = walls.some(
        (q) =>
          q.id !== a.id &&
          q.id !== b.id &&
          gap(a.position, b.position, q) < 10,
      );
      const directionCost = (
        wire: Pick<
          Wire,
          "sourceSide" | "targetSide"
        >,
      ) => {
        const dx = b.position.x - a.position.x,
          dy = b.position.y - a.position.y,
          span =
            distance(a.position, b.position) || 1;
        let cost = 0;
        for (const [key, side, sign] of [
          [a.id + "-out", wire.sourceSide, 1],
          [b.id + "-in", wire.targetSide, -1],
        ] satisfies [
          string,
          Wire["sourceSide"],
          number,
        ][]) {
          const mean = means.get(key)!,
            degree = counts.get(key)!,
            main = facing(mean.x, mean.y);
          const cos = (k: Wire["sourceSide"]) =>
            (sign *
              (normal[k].x * dx +
                normal[k].y * dy)) /
            span;
          if (
            degree > 1 &&
            main !== side &&
            Math.hypot(mean.x, mean.y) >
              degree / 2 &&
            cos(main) > 0.26
          )
            cost += obstructed ? 4 : 120;
          cost +=
            (1 - cos(side)) *
              (obstructed ? 2 : 6) +
            (cos(side) < -0.25 ? 30 : 0);
        }
        return cost;
      };
      if (
        !w.edge.via?.length &&
        w.sourceSide === "bottom" &&
        w.targetSide === "top" &&
        Math.abs(w.source.x - w.target.x) < 8
      )
        continue;
      if (least < 100 && !guides.has(w.edge))
        continue;
      const intrinsic = directionCost(w);
      least += intrinsic;
      if (least < 20 && !guides.has(w.edge))
        continue;
      const originalLength = best.length;
      const evaluate = (
        v: Wire,
        direction: number,
      ) => {
        const shape = profile(v);
        const bends = extraBends(v.points);
        const cost =
          direction +
          score(shape) +
          bends * 70 +
          Number(!v.controls) * 1.5 +
          Math.max(
            0,
            shape.length - originalLength,
          ) *
            0.05 +
          2;
        if (cost < least) {
          least = cost;
          best = shape;
        }
      };
      const layout = guides.get(w.edge);
      if (layout) {
        for (const v of layout) evaluate(v, 0);
      } else {
        const options = sides
          .flatMap((sourceSide) =>
            sides.map((targetSide) => ({
              sourceSide,
              targetSide,
              direction: directionCost({
                sourceSide,
                targetSide,
              }),
            })),
          )
          .sort(
            (a, b) => a.direction - b.direction,
          );
        for (const detours of [false, true]) {
          if (detours && least < 15) break;
          for (const v of options) {
            if (v.direction + 2 >= least) break;
            if (
              v.sourceSide === w.sourceSide &&
              v.targetSide === w.targetSide
            )
              continue;
            const route = alternatives(
              w,
              a,
              b,
              walls,
              detours,
              v.sourceSide,
              v.targetSide,
            )[0];
            if (route)
              evaluate(route, v.direction);
          }
        }
      }
      if (best !== shapes[i]) {
        shapes[i] = best;
        result[i] = {
          ...best.wire,
          edge: w.edge,
        };
        index.update(i, best);
      }
    }
  return result;
};
