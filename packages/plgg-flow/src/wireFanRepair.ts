import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import {
  distance,
  required,
  simplify,
  free,
  crossesItself,
  crossing,
  alignedStem,
  rounded,
  vertical,
  normal,
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
type Run = {
  i: number;
  p: Point;
  q: Point;
  horizontal: boolean;
};
const axisRuns = (path: Point[]) => {
  const ordered: Run[] = [],
    horizontal: Run[] = [],
    vertical: Run[] = [];
  for (let i = 1; i < path.length; i++) {
    const p = required(path[i - 1]),
      q = required(path[i]);
    if ((p.x === q.x) === (p.y === q.y)) continue;
    const run = {
      i,
      p,
      q,
      horizontal: p.y === q.y,
    };
    ordered.push(run);
    (run.horizontal ? horizontal : vertical).push(
      run,
    );
  }
  return { ordered, horizontal, vertical };
};
const runLists = new WeakMap<
  Point[],
  ReturnType<typeof axisRuns>
>();
const runsOf = (path: Point[]) => {
  const known = runLists.get(path);
  if (known) return known;
  const runs = axisRuns(path);
  runLists.set(path, runs);
  return runs;
};
const cuts = (a: Point[], b: Point[]) => {
  const result: Cut[] = [];
  const peers = runsOf(b);
  for (const left of runsOf(a).ordered)
    for (const right of left.horizontal
      ? peers.vertical
      : peers.horizontal) {
      const h = left.horizontal ? left : right,
        v = left.horizontal ? right : left;
      const x = v.p.x,
        y = h.p.y;
      if (
        (x - h.p.x) * (x - h.q.x) < 0 &&
        (y - v.p.y) * (y - v.q.y) < 0
      )
        result.push({
          i: left.i,
          j: right.i,
          p: { x, y },
        });
    }
  // Splice branches in travel order when one leg crosses several returns.
  return result.sort(
    (u, v) =>
      u.i - v.i ||
      distance(required(a[u.i - 1]), u.p) -
        distance(required(a[v.i - 1]), v.p),
  );
};
// Curves can cross obliquely between samples.
const curveCuts = (p: Point[], q: Point[]) => {
  const result: Cut[] = [];
  for (let i = 1; i < p.length; i++) {
    const a = required(p[i - 1]),
      b = required(p[i]);
    for (let j = 1; j < q.length; j++) {
      const c = required(q[j - 1]),
        d = required(q[j]);
      if (
        Math.max(a.x, b.x) < Math.min(c.x, d.x) ||
        Math.min(a.x, b.x) > Math.max(c.x, d.x) ||
        Math.max(a.y, b.y) < Math.min(c.y, d.y) ||
        Math.min(a.y, b.y) > Math.max(c.y, d.y)
      )
        continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        ux = d.x - c.x,
        uy = d.y - c.y,
        det = dx * uy - dy * ux;
      if (!det) continue;
      const f =
          ((c.x - a.x) * uy - (c.y - a.y) * ux) /
          det,
        g =
          ((c.x - a.x) * dy - (c.y - a.y) * dx) /
          det;
      if (
        (f > 0 && f < 1 && g > 0 && g < 1) ||
        ((f === 1 || g === 1) &&
          crossing(p, i, q, j))
      )
        result.push({
          i,
          j,
          p: { x: a.x + dx * f, y: a.y + dy * f },
        });
    }
  }
  return result;
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
  if (r < 0.5) return [];
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
  let span = 0,
    along = 0;
  for (let j = 1; j < path.length; j++) {
    const p = required(path[j - 1]),
      q = required(path[j]),
      d = distance(p, q);
    const transverse = Math.min(
      Math.abs(p.x - q.x),
      Math.abs(p.y - q.y),
    );
    // A long oblique chord between fillets would be a slanted step.
    if (transverse > d * 0.1 && d > 7)
      return false;
    along =
      transverse <= 0.15 * d ? along + d : 0;
    span = along >= 6 ? 0 : span + d;
    if (span > 32) return false;
  }
  return true;
};
// After exchanging prefixes, slide a conflicting elbow by one pitch
// or collapse a redundant jog at the opposite socket.
const trimJog = (
  wire: Wire,
  atSource: boolean,
  radius: number,
  boxes: Box[],
) => {
  const path = atSource
    ? simplify(wire.points)
    : simplify([...wire.points].reverse());
  const socket = atSource
      ? wire.source
      : wire.target,
    side = atSource
      ? wire.sourceSide
      : wire.targetSide;
  const along = vertical(side) ? "y" : "x",
    across = along === "x" ? "y" : "x",
    sign = normal[side][along];
  const candidates: Point[][] = [];
  let transverse = 0;
  for (let j = 1; j < path.length; j++) {
    const p = required(path[j - 1]),
      q = required(path[j]);
    if (
      p[along] === q[along] &&
      Math.abs(q[across] - p[across]) > 4
    )
      transverse++;
    if (transverse > 2) break;
    if (
      !transverse ||
      p[across] !== q[across] ||
      (q[along] - p[along]) * sign < 24
    )
      continue;
    for (const pitch of transverse === 1
      ? [-10, 10]
      : [0]) {
      const lane =
        p[along] - (radius + pitch) * sign;
      if ((lane - socket[along]) * sign < 18)
        continue;
      const head = rounded(
        [
          socket,
          { ...socket, [along]: lane },
          { ...p, [along]: lane },
          q,
        ],
        radius,
      );
      const joined = [
        ...head,
        ...path.slice(j + 1),
      ];
      if (
        free(head, boxes) &&
        !crossesItself(joined)
      )
        candidates.push(
          atSource ? joined : joined.reverse(),
        );
    }
  }
  return candidates;
};
const keepsStems = (path: Point[], w: Wire) =>
  alignedStem(path, {
    ...w.source,
    side: w.sourceSide,
  }) &&
  alignedStem(
    path,
    { ...w.target, side: w.targetSide },
    true,
  );
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
        const shared = [
          a.wire.source,
          a.wire.target,
        ].some((s) =>
          [b.wire.source, b.wire.target].some(
            (t) => distance(s, t) < 1,
          ),
        );
        // Reversing travel order preserves all interior intersections.
        if (conflict(a, b, 8) < 8) continue;
        let crossings = cuts(p, other);
        if (
          !shared &&
          crossings.length < 2 &&
          conflict(a, b, 90) >= 90
        )
          crossings = curveCuts(p, other);
        if (crossings.length < (shared ? 1 : 2))
          continue;
        const trySwap = (
          p: Point[],
          q: Point[],
          reverseP: boolean,
          reverseQ: boolean,
        ) => {
          const intersections = crossings.map(
            (c) => ({
              i: reverseP ? p.length - c.i : c.i,
              j: reverseQ ? q.length - c.j : c.j,
              p: c.p,
            }),
          );
          if (reverseP) intersections.reverse();
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
            const cap = shared ? 48 : 96;
            if (
              !near(m, n, cap) ||
              !near(n, m, cap)
            )
              continue;
            // A lane exchange can happen immediately outside a
            // socket stem. Keep that stem intact on both new tracks.
            const fillet = Math.min(
              radius,
              ...[
                a.wire.source,
                a.wire.target,
                b.wire.source,
                b.wire.target,
              ]
                .flatMap((p) => [
                  distance(p, start.p),
                  distance(p, end.p),
                ])
                .filter((d) => d > 0)
                .map((d) => Math.max(0, d - 14)),
            );
            const x = splice(
              p,
              q,
              start,
              end,
              fillet,
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
              fillet,
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
            if (
              !keepsStems(x, a.wire) ||
              !keepsStems(y, b.wire)
            )
              continue;
            const originalU = profile(
                make(a.wire, x),
              ),
              originalV = profile(
                make(b.wire, y),
              );
            type Swap = [
              typeof originalU,
              typeof originalV,
              Point[],
              Point[],
            ];
            const options =
              function* (): Generator<Swap> {
                yield [
                  originalU,
                  originalV,
                  x,
                  y,
                ];
                if (!shared) return;
                for (const trimmed of trimJog(
                  originalU.wire,
                  reverseP,
                  radius,
                  boxes,
                ))
                  yield [
                    profile(
                      make(a.wire, trimmed),
                    ),
                    originalV,
                    trimmed,
                    y,
                  ];
                for (const trimmed of trimJog(
                  originalV.wire,
                  reverseQ,
                  radius,
                  boxes,
                ))
                  yield [
                    originalU,
                    profile(
                      make(b.wire, trimmed),
                    ),
                    x,
                    trimmed,
                  ];
              };
            for (const [
              u,
              v,
              px,
              py,
            ] of options()) {
              const gain =
                conflict(a, b) - conflict(u, v);
              if (gain <= 1) continue;
              const neighbours = new Set(
                [u, v, a, b].flatMap((p) =>
                  peers.query(p).map((r) => r.i),
                ),
              );
              // Exchanging tracks must not buy a crossing by adding
              // a full pair of elbows to both paths.
              if (
                !shared &&
                Math.min(
                  u.turn - a.turn,
                  v.turn - b.turn,
                ) >
                  Math.PI * 0.9
              )
                continue;
              const delta = [
                ...neighbours,
              ].reduce(
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
              paths[i] = px;
              paths[j] = py;
              return true;
            }
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

// Two branches sharing a socket can exchange their prefixes at a
// shoulder crossing without changing a single occupied track.
export const orderStemBranches = (
  wires: Wire[],
  groups: Iterable<
    { i: number; start: boolean }[]
  >,
) => {
  for (const group of groups) {
    if (
      group.length < 3 ||
      !group.some(({ i }) => {
        const w = required(wires[i]);
        return (
          w.edge.route === "step" &&
          w.corners === 0
        );
      })
    )
      continue;
    const branches = group.flatMap(
      ({ i, start }) => {
        const w = required(wires[i]);
        if (
          w.edge.route !== "step" ||
          w.edge.source === w.edge.target ||
          w.edge.waypoints?.length
        )
          return [];
        const points = start
          ? w.points
          : [...w.points].reverse();
        const origin = required(points[0]);
        const end = points.findIndex(
          (p) => distance(p, origin) > 36,
        );
        if (end < 2 || end === points.length - 1)
          return [];
        return [
          {
            i,
            start,
            points,
            tip: points.slice(0, end + 1),
          },
        ];
      },
    );
    for (const [j, a] of branches.entries())
      for (const b of branches.slice(j + 1)) {
        if (a.start !== b.start) continue;
        const w = required(wires[a.i]),
          v = required(wires[b.i]);
        if (
          w.edge.source === v.edge.source &&
          w.edge.target === v.edge.target
        )
          continue;
        const cut = curveCuts(a.tip, b.tip)[0];
        if (
          !cut ||
          distance(required(a.tip[0]), cut.p) > 32
        )
          continue;
        const left = [
          ...b.points.slice(0, cut.j),
          cut.p,
          ...a.points.slice(cut.i),
        ];
        const right = [
          ...a.points.slice(0, cut.i),
          cut.p,
          ...b.points.slice(cut.j),
        ];
        if (
          crossesItself(left) ||
          crossesItself(right)
        )
          continue;
        for (const [branch, path, wire] of [
          [a, left, w],
          [b, right, v],
        ] satisfies [typeof a, Point[], Wire][]) {
          const next = materialize(
            wire.edge,
            {
              ...wire.source,
              side: wire.sourceSide,
            },
            {
              ...wire.target,
              side: wire.targetSide,
            },
            branch.start
              ? path
              : [...path].reverse(),
            wire.corners,
          );
          wires[branch.i] = next;
          branch.points = branch.start
            ? next.points
            : [...next.points].reverse();
          const end = branch.points.findIndex(
            (p) =>
              distance(
                p,
                required(branch.points[0]),
              ) > 36,
          );
          branch.tip = branch.points.slice(
            0,
            end + 1,
          );
        }
      }
  }
};
