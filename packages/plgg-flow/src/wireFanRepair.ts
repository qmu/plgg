import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import {
  distance,
  required,
  simplify,
  free,
  crossesItself,
  type Box,
} from "plgg-flow/wireGeometry";
import {
  profile,
  conflict,
  chordGap,
  neighbourIndex,
} from "plgg-flow/wireInteraction";
import { materialize } from "plgg-flow/wirePath";

type Cut = { i: number; j: number; p: Point };
const cuts = (a: Point[], b: Point[]) => {
  const result: Cut[] = [];
  for (let i = 1; i < a.length; i++)
    for (let j = 1; j < b.length; j++) {
      const p = required(a[i - 1]),
        q = required(a[i]),
        u = required(b[j - 1]),
        v = required(b[j]);
      const xy = p.x === q.x && u.y === v.y,
        yx = p.y === q.y && u.x === v.x;
      if (!xy && !yx) continue;
      const x = xy ? p.x : u.x,
        y = xy ? u.y : p.y;
      if (
        (xy
          ? (y - p.y) * (y - q.y)
          : (x - p.x) * (x - q.x)) >= 0 ||
        (xy
          ? (x - u.x) * (x - v.x)
          : (y - u.y) * (y - v.y)) >= 0
      )
        continue;
      result.push({ i, j, p: { x, y } });
    }
  // Splice branches in travel order when one leg crosses several returns.
  return result.sort(
    (u, v) =>
      u.i - v.i ||
      distance(required(a[u.i - 1]), u.p) -
        distance(required(a[v.i - 1]), v.p),
  );
};
const near = (
  a: Point[],
  b: Point[],
  cap: number,
) =>
  a.every((p) =>
    b.some(
      (q, j) =>
        j > 0 &&
        chordGap(p, required(b[j - 1]), q) <= cap,
    ),
  );
const join = (
  before: Point[],
  after: Point[],
  at: Point,
  radius: number,
) => {
  if (!before.length) return after;
  const a = required(before[before.length - 1]),
    b = required(after[0]),
    u = distance(at, a),
    v = distance(at, b);
  const r = Math.min(radius, u, v);
  if (r < 4) return [];
  const arc = Array.from(
    { length: 7 },
    (_, i) => {
      const angle = (i * Math.PI) / 12,
        l = (r * (1 - Math.sin(angle))) / u,
        h = (r * (1 - Math.cos(angle))) / v;
      return {
        x:
          at.x +
          (a.x - at.x) * l +
          (b.x - at.x) * h,
        y:
          at.y +
          (a.y - at.y) * l +
          (b.y - at.y) * h,
      };
    },
  );
  return simplify([...before, ...arc, ...after]);
};
const splice = (
  p: Point[],
  q: Point[],
  start: Cut,
  end: Cut,
  radius: number,
) => {
  const middle = q.slice(start.j, end.j);
  if (!middle.length)
    middle.push({
      x: (start.p.x + end.p.x) / 2,
      y: (start.p.y + end.p.y) / 2,
    });
  const head = join(
    p.slice(0, start.i),
    middle,
    start.p,
    radius,
  );
  return head.length
    ? join(head, p.slice(end.i), end.p, radius)
    : [];
};
// Adjacent fillets need a visible straight or they read like a diagonal.
const distinctBends = (path: Point[]) => {
  let span = 0;
  for (let j = 1; j < path.length; j++) {
    const p = required(path[j - 1]),
      q = required(path[j]),
      d = distance(p, q);
    if (
      (Math.abs(p.x - q.x) < 0.001 ||
        Math.abs(p.y - q.y) < 0.001) &&
      d >= 6
    )
      span = 0;
    else span += d;
    if (span > 32) return false;
  }
  return true;
};
// Swap only the portions of two lanes enclosed by successive crossings.
export const mendFans = (
  original: Wire[],
  boxes: Box[],
  radius: number,
) => {
  const wires = [...original],
    profiles = wires.map(profile);
  const peers = neighbourIndex(profiles);
  const paths = wires.map((w) =>
    w.edge.route === "step" &&
    !w.edge.waypoints?.length &&
    w.edge.source !== w.edge.target
      ? simplify(w.points)
      : [],
  );
  const eligible = (p: Point[]) => p.length > 2;
  let changed = true;
  for (
    let pass = 0;
    changed && pass < 3;
    pass++
  ) {
    changed = false;
    for (const [i, path] of paths.entries()) {
      if (!eligible(path)) continue;
      for (const { i: j } of peers.query(
        required(profiles[i]),
      )) {
        if (j >= i) continue;
        const p = required(paths[i]),
          other = required(paths[j]);
        if (!eligible(other)) continue;
        const a = required(profiles[i]),
          b = required(profiles[j]);
        if (conflict(a, b) < 8) continue;
        const shared = [
          a.wire.source,
          a.wire.target,
        ].some((s) =>
          [b.wire.source, b.wire.target].some(
            (t) => distance(s, t) < 1,
          ),
        );
        const trySwap = (
          p: Point[],
          q: Point[],
          reverseP: boolean,
          reverseQ: boolean,
        ) => {
          const intersections = cuts(p, q);
          if (
            distance(
              required(p[0]),
              required(q[0]),
            ) < 1
          )
            intersections.unshift({
              i: 0,
              j: 0,
              p: required(p[0]),
            });
          for (
            let k = 1;
            k < intersections.length;
            k++
          ) {
            const start = required(
                intersections[k - 1],
              ),
              end = required(intersections[k]);
            if (
              start.j > end.j ||
              distance(start.p, end.p) < 18
            )
              continue;
            const m = [
                start.p,
                ...p.slice(start.i, end.i),
                end.p,
              ],
              n = [
                start.p,
                ...q.slice(start.j, end.j),
                end.p,
              ];
            const cap = shared ? 40 : 14;
            if (
              !near(m, n, cap) ||
              !near(n, m, cap)
            )
              continue;
            const x = splice(
              p,
              q,
              start,
              end,
              radius,
            );
            const y = splice(
              q,
              p,
              {
                ...start,
                i: start.j,
                j: start.i,
              },
              { ...end, i: end.j, j: end.i },
              radius,
            );
            if (
              !x.length ||
              !y.length ||
              !distinctBends(x) ||
              !distinctBends(y) ||
              !free(x, boxes) ||
              !free(y, boxes) ||
              crossesItself(x) ||
              crossesItself(y)
            )
              continue;
            const make = (
              w: Wire,
              path: Point[],
            ) =>
              materialize(
                w.edge,
                {
                  ...w.source,
                  side: w.sourceSide,
                },
                {
                  ...w.target,
                  side: w.targetSide,
                },
                path,
                w.corners,
              );
            if (reverseP) x.reverse();
            if (reverseQ) y.reverse();
            const u = profile(make(a.wire, x)),
              v = profile(make(b.wire, y));
            const gain =
              conflict(a, b) - conflict(u, v);
            if (gain <= 1) continue;
            const neighbours = new Set(
              [u, v, a, b].flatMap((p) =>
                peers.query(p).map((r) => r.i),
              ),
            );
            const delta = [...neighbours].reduce(
              (sum, k) =>
                k === i || k === j
                  ? sum
                  : sum +
                    conflict(
                      u,
                      required(profiles[k]),
                    ) +
                    conflict(
                      v,
                      required(profiles[k]),
                    ) -
                    conflict(
                      a,
                      required(profiles[k]),
                    ) -
                    conflict(
                      b,
                      required(profiles[k]),
                    ),
              0,
            );
            if (
              gain <=
              delta +
                u.turn +
                v.turn -
                a.turn -
                b.turn
            )
              continue;
            wires[i] = u.wire;
            wires[j] = v.wire;
            peers.update(i, u);
            peers.update(j, v);
            profiles[i] = u;
            profiles[j] = v;
            changed = true;
            paths[i] = x;
            paths[j] = y;
            return true;
          }
          return false;
        };
        if (
          trySwap(p, other, false, false) ||
          trySwap(
            p,
            [...other].reverse(),
            false,
            true,
          )
        )
          continue;
        if (shared) {
          const rev = [...p].reverse();
          if (!trySwap(rev, other, true, false))
            trySwap(
              rev,
              [...other].reverse(),
              true,
              true,
            );
        }
      }
    }
  }
  return wires;
};
