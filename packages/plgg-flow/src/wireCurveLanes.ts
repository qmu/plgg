import type { Wire } from "./wiring";
import type { Side } from "./nodeBody";
import type { Point } from "plgg-board";
import {
  canonical,
  extraBends,
  fillet,
  blockers,
} from "plgg-flow/wireCurve";
import { cache, boxId } from "plgg-flow/wireMemo";
import {
  corridor,
  type Bounds,
} from "plgg-flow/wireCorridors";
import {
  profile,
  chordGap,
  measureConflict,
  neighbourIndex,
} from "plgg-flow/wireInteraction";
import { materialize } from "plgg-flow/wirePath";
import {
  bezier,
  vertical,
  move,
  distance,
  free,
  inflate,
  normal,
  crossesItself,
  crossing,
  type Box,
} from "plgg-flow/wireGeometry";

type Shape = ReturnType<typeof profile>;
const pairCosts = new WeakMap<
  Wire["points"],
  WeakMap<Wire["points"], number>
>();
const interaction = (a: Shape, b: Shape) => {
  const key = a.wire.points,
    other = b.wire.points;
  const peers =
    pairCosts.get(key) ??
    new WeakMap<Wire["points"], number>();
  const hit = peers.get(other);
  if (hit !== undefined) return hit;
  const cost = measureConflict(
    a,
    b,
    Infinity,
    true,
    true,
  );
  peers.set(other, cost);
  pairCosts.set(key, peers);
  return cost;
};
const shapes = cache<Shape[]>(4096);
const candidates = (
  wire: Wire,
  walls: Box[],
  crowded: boolean,
  fanConflict: boolean,
) => {
  const s = {
      ...wire.source,
      side: wire.sourceSide,
    },
    t = { ...wire.target, side: wire.targetSide };
  const { plain, p1, p2 } = canonical(s, t);
  const safe = walls.map((q) =>
    q.id === wire.edge.source ||
    q.id === wire.edge.target
      ? q
      : inflate(q, 9),
  );
  const result: Shape[] = [];
  const add = (
    path: Point[],
    corners: number,
    controls?: Point[],
  ) => {
    if (!free(path, safe) || crossesItself(path))
      return;
    result.push(
      profile({
        ...materialize(
          wire.edge,
          s,
          t,
          path,
          corners,
        ),
        ...(controls && {
          controls: controls.map((p, i) => ({
            ...p,
            z: i ? t.z : s.z,
          })),
        }),
      }),
    );
  };
  const dx = t.x - s.x,
    dy = t.y - s.y,
    span = distance(s, t) || 1;
  if (!blockers(wire.edge, plain, walls).length) {
    if (
      !fanConflict &&
      !crowded &&
      (!wire.controls || s.side === t.side)
    )
      return result;
    for (const d of s.side === t.side ||
    !wire.controls
      ? []
      : [-16, 16, -30, 30]) {
      for (const h of [d, -d]) {
        const a = move(
          s,
          s.side,
          Math.max(8, distance(s, p1) + d),
        );
        const b = move(
          t,
          t.side,
          Math.max(8, distance(t, p2) + h),
        );
        const path = bezier(
          s,
          a,
          b,
          t,
          plain.length - 1,
        );
        if (
          path.every(
            (p, i) => distance(p, plain[i]!) < 14,
          )
        )
          add(path, 0, [a, b]);
      }
    }
    if (!fanConflict) return result;
  }
  const u = move(s, s.side, 16),
    v = move(t, t.side, 16);
  for (const fraction of blockers(
    wire.edge,
    plain,
    walls,
  ).length
    ? [0.25, 0.5, 0.75]
    : []) {
    for (const offset of [
      -24, 24, -48, 48, -80, 80, -120, 120,
    ]) {
      const via = {
        x:
          s.x +
          dx * fraction -
          (dy / span) * offset,
        y:
          s.y +
          dy * fraction +
          (dx / span) * offset,
      };
      add(fillet([s, u, via, v, t]), 1);
    }
  }
  if (!crowded && !fanConflict) return result;
  // At a blocked terminal, compare clear cubics on its two forward
  // sides. Keep the shared fan end fixed unless both approaches are blocked.
  const socket = (
    id: string,
    side: Side,
    z: number,
  ) => {
    const box = walls.find((w) => w.id === id);
    if (!box) return;
    return {
      side,
      z,
      x:
        (box.l +
          box.r +
          normal[side].x * (box.r - box.l)) /
        2,
      y:
        (box.t +
          box.b +
          normal[side].y * (box.b - box.t)) /
        2,
    };
  };
  const sides: Side[] = [
    "left",
    "right",
    "top",
    "bottom",
  ];
  for (const left of sides)
    for (const right of sides) {
      if (
        (left === s.side && right === t.side) ||
        normal[left].x * dx +
          normal[left].y * dy <
          0 ||
        normal[right].x * dx +
          normal[right].y * dy >
          0
      )
        continue;
      const a = socket(
          wire.edge.source,
          left,
          s.z,
        ),
        b = socket(wire.edge.target, right, t.z);
      if (!a || !b) continue;
      const { plain, p1, p2 } = canonical(a, b);
      if (
        blockers(wire.edge, plain, walls).length
      ) {
        if (!crowded && !fanConflict) continue;
        const dx = b.x - a.x,
          dy = b.y - a.y,
          length = Math.hypot(dx, dy) || 1;
        for (const f of [
          0.15, 0.3, 0.45, 0.55, 0.7, 0.85,
        ]) {
          for (const offset of [
            -140, -80, -36, 0, 36, 80, 140,
          ]) {
            const via = {
              x:
                a.x +
                dx * f -
                (dy / length) * offset,
              y:
                a.y +
                dy * f +
                (dx / length) * offset,
            };
            const stem = length > 500 ? 24 : 12;
            const path = fillet([
              a,
              move(a, left, stem),
              via,
              move(b, right, stem),
              b,
            ]);
            if (
              free(path, safe) &&
              !crossesItself(path)
            )
              result.push(
                profile(
                  materialize(
                    wire.edge,
                    a,
                    b,
                    path,
                    1,
                  ),
                ),
              );
          }
        }
        // Stay in the open interval between obstacle rows for the
        // middle run, then rejoin the far fan on its own shoulder.
        const axis =
            Math.abs(dx) >= Math.abs(dy)
              ? "x"
              : "y",
          across = axis === "x" ? "y" : "x";
        const levels = new Set<number>();
        for (const q of safe) {
          const low = axis === "x" ? q.t : q.l,
            high = axis === "x" ? q.b : q.r;
          for (const level of [
            low - 12,
            high + 12,
          ]) {
            if (
              level >
                Math.min(a[across], b[across]) -
                  70 &&
              level <
                Math.max(a[across], b[across]) +
                  70
            )
              levels.add(level);
          }
        }
        const u = move(a, left, 20),
          v = move(b, right, 20);
        for (const level of levels)
          for (const frac of [0.12, 0.25]) {
            const first = {
              ...u,
              [axis]:
                u[axis] +
                (v[axis] - u[axis]) * frac,
              [across]: level,
            };
            const last = {
              ...v,
              [axis]:
                v[axis] -
                (v[axis] - u[axis]) * frac,
              [across]: level,
            };
            const path = fillet([
              a,
              u,
              first,
              last,
              v,
              b,
            ]);
            if (
              free(path, safe) &&
              !crossesItself(path) &&
              !extraBends(path)
            )
              result.push(
                profile(
                  materialize(
                    wire.edge,
                    a,
                    b,
                    path,
                    2,
                  ),
                ),
              );
          }
        continue;
      }
      result.push(
        profile({
          ...materialize(
            wire.edge,
            a,
            b,
            plain,
            0,
            false,
          ),
          controls: [
            { ...p1, z: s.z },
            { ...p2, z: t.z },
          ],
        }),
      );
    }
  return result;
};
export const separateCurves = (
  input: readonly Wire[],
  query: (box: Bounds) => Box[],
  guides: ReadonlyMap<
    Wire["edge"],
    readonly Wire[]
  >,
) => {
  const wires = input.slice();
  const contours = wires.map(profile);
  const index = neighbourIndex(contours);
  const score = (i: number, shape: Shape) => {
    let cost = 12 * extraBends(shape.path);
    for (const peer of index.query(shape))
      if (peer.i !== i)
        cost += interaction(
          shape,
          contours[peer.i]!,
        );
    return cost;
  };
  const order = wires
    .map((wire, i) => ({ wire, i }))
    .sort(
      (a, b) =>
        Number(!!a.wire.controls) -
          Number(!!b.wire.controls) ||
        b.wire.corners - a.wire.corners,
    );
  for (const { i, wire } of order) {
    const routes = guides.get(wire.edge);
    if (routes?.length) {
      const crossings = (shape: Shape) => {
        let total = 0;
        for (const peer of index.query(shape)) {
          if (peer.i === i) continue;
          const other = contours[peer.i]!;
          for (const a of shape.segments)
            for (const b of other.segments)
              if (
                crossing(
                  shape.path,
                  a.i,
                  other.path,
                  b.i,
                )
              )
                total++;
        }
        return total;
      };
      let best = contours[i]!,
        cost = crossings(best);
      for (const route of routes.slice(1)) {
        if (!cost) break;
        const shape = profile(route),
          value = crossings(shape);
        if (value < cost) {
          best = shape;
          cost = value;
        }
      }
      wires[i] = best.wire;
      contours[i] = best;
      index.update(i, best);
      continue;
    }
    if (
      (wire.edge.route &&
        wire.edge.route !== "curve") ||
      wire.edge.waypoints?.length ||
      wire.edge.via?.length ||
      wire.edge.source === wire.edge.target
    )
      continue;
    if (
      wire.sourceSide === wire.targetSide &&
      wire.corners === 0 &&
      (vertical(wire.sourceSide)
        ? wire.source.y === wire.target.y
        : wire.source.x === wire.target.x)
    )
      continue;
    const old = contours[i]!;
    let best = old,
      cost = score(i, old);
    if (cost < 7) continue;
    const walls = query(
      corridor(wire.points, 140),
    );
    const crowded = cost >= 100;
    const sharedEnds = index
      .query(old)
      .flatMap(({ i: j }) => {
        if (i === j) return [];
        const peer = contours[j]!;
        if (interaction(old, peer) < 10)
          return [];
        return [peer.wire].filter(
          (v) =>
            (v.edge.source === wire.edge.source &&
              v.sourceSide !== wire.sourceSide) ||
            (v.edge.target === wire.edge.target &&
              v.targetSide !== wire.targetSide),
        );
      });
    const fanConflict = sharedEnds.length > 0;

    const key = JSON.stringify([
      crowded,
      fanConflict,
      wire.edge.source,
      wire.edge.target,
      wire.source,
      wire.target,
      wire.sourceSide,
      wire.targetSide,
      !!wire.controls,
      walls.map(boxId),
    ]);
    for (const next of shapes(key, () =>
      candidates(
        wire,
        walls,
        crowded,
        fanConflict,
      ),
    )) {
      if (
        fanConflict &&
        !crowded &&
        !sharedEnds.some(
          (v) =>
            (v.edge.source === wire.edge.source &&
              next.wire.sourceSide ===
                v.sourceSide &&
              next.wire.targetSide ===
                wire.targetSide) ||
            (v.edge.target === wire.edge.target &&
              next.wire.targetSide ===
                v.targetSide &&
              next.wire.sourceSide ===
                wire.sourceSide),
        )
      )
        continue;
      if (
        !fanConflict &&
        !crowded &&
        !wire.controls &&
        next.path.some((p) =>
          old.segments.every(
            (seg) =>
              chordGap(p, seg.a, seg.b) > 14,
          ),
        )
      )
        continue;
      const value =
        score(i, next) +
        3 *
          Number(
            next.wire.sourceSide !==
              wire.sourceSide,
          ) +
        3 *
          Number(
            next.wire.targetSide !==
              wire.targetSide,
          ) +
        0.001 *
          Math.max(0, next.length - old.length);
      if (value < cost - 0.01) {
        best = next;
        cost = value;
        if (cost === 0) break;
      }
    }
    if (best !== old) {
      wires[i] = {
        ...best.wire,
        edge: wire.edge,
      };
      contours[i] = best;
      index.update(i, best);
    }
  }
  return wires;
};

// Interleaved arches must cross. Steepen their shoulders across the
// common interval so they meet transversely, with a smooth crown.
export const archShoulders = (
  wires: readonly Wire[],
  query: (bounds: Bounds) => Box[],
) => {
  const arches = wires.filter(
    (w) =>
      w.corners === 0 &&
      w.sourceSide === w.targetSide &&
      !w.edge.waypoints?.length &&
      !w.edge.via?.length &&
      (!w.edge.route ||
        w.edge.route === "curve") &&
      w.edge.source !== w.edge.target,
  );
  if (!arches.length) return wires.slice();
  const eligible = new Set(arches);
  return wires.map((w) => {
    if (!eligible.has(w)) return w;
    const axis = vertical(w.sourceSide)
      ? "x"
      : "y";
    const normalAxis = axis === "x" ? "y" : "x";
    if (
      w.source[normalAxis] !==
      w.target[normalAxis]
    )
      return w;
    const start = w.source[axis],
      span = w.target[axis] - start;
    const lo = Math.min(start, start + span),
      hi = Math.max(start, start + span);
    const peer = arches.find((v) => {
      if (
        v.sourceSide !== w.sourceSide ||
        v.source[normalAxis] !==
          w.source[normalAxis] ||
        v.target[normalAxis] !==
          w.target[normalAxis]
      )
        return false;
      const a = Math.min(
          v.source[axis],
          v.target[axis],
        ),
        b = Math.max(
          v.source[axis],
          v.target[axis],
        );
      return (
        (a < lo && lo < b && b < hi) ||
        (lo < a && a < hi && hi < b)
      );
    });
    if (!peer || !span) return w;
    const { controls, ...rest } = w;
    const sign =
      w.sourceSide === "top" ||
      w.sourceSide === "left"
        ? -1
        : 1;
    const points = w.points.map((p) => {
      const f = (p[axis] - start) / span;
      const shoulder =
        (1 +
          Math.tanh(
            (Math.abs(f - 0.5) - 0.1) / 0.06,
          )) /
        2;
      return {
        ...p,
        [normalAxis]:
          p[normalAxis] -
          sign *
            Math.min(12, Math.abs(span) / 50) *
            shoulder *
            Math.sin(Math.PI * f) ** 2,
      };
    });
    const walls = query(corridor(points, 10)).map(
      (q) =>
        q.id === w.edge.source ||
        q.id === w.edge.target
          ? q
          : inflate(q, 10),
    );
    return free(points, walls)
      ? { ...rest, points }
      : w;
  });
};
