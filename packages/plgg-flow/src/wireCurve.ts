import { chordDent } from "plgg-flow/wireDent";
import { outline } from "plgg-flow/wireInteraction";
import type { Point } from "plgg-board";
import type { Edge } from "./model";
import {
  corridor,
  intersects,
} from "plgg-flow/wireCorridors";
import type { Socket } from "plgg-flow/wireBase";
import { materialize } from "plgg-flow/wirePath";
import { search } from "plgg-flow/wireSearch";
import {
  type Box,
  bezier,
  distance,
  move,
  normal,
  pointGap,
  inflate,
  pt,
  free,
  vertical,
  simplify,
  crossesItself,
  gap,
  required,
} from "plgg-flow/wireGeometry";

export const canonical = (
  s: Socket,
  t: Socket,
  steps?: number,
) => {
  const span = distance(s, t);
  const projection = (socket: Socket) =>
    Math.abs(
      vertical(socket.side)
        ? t.y - s.y
        : t.x - s.x,
    );
  const arm =
    s.side === t.side
      ? 24 + 0.13 * span
      : Math.max(
          24,
          Math.min(
            160,
            0.5 *
              Math.max(
                projection(s),
                projection(t),
              ),
          ),
        );
  const p1 = move(s, s.side, arm),
    p2 = move(t, t.side, arm);
  const plain = bezier(
    s,
    p1,
    p2,
    t,
    steps ??
      Math.max(
        40,
        Math.ceil(
          Math.max(arm, distance(p1, p2)) / 4,
        ),
      ),
  );
  return { plain, p1, p2 };
};
export const blockers = (
  edge: Edge,
  plain: Point[],
  boxes: Box[],
) => {
  const bounds = corridor(plain, 10);
  const own = (q: Box) =>
    q.id === edge.source || q.id === edge.target;
  return boxes.filter((q) => {
    if (!intersects(bounds, q)) return false;
    if (own(q))
      return plain.some(
        (p, i) =>
          i > (plain.length - 1) / 8 &&
          i < ((plain.length - 1) * 7) / 8 &&
          pointGap(p, q) < 4,
      );
    if (free(plain, [inflate(q, 10)]))
      return false;
    return plain.some(
      (p, i) =>
        i > 0 &&
        gap(required(plain[i - 1]), p, q) < 10,
    );
  });
};
export const curvePath = (
  edge: Edge,
  s: Socket,
  t: Socket,
  boxes: Box[],
  rank: number,
  count: number,
  reciprocal: boolean,
) => {
  const span = distance(s, t);
  const { plain, p1, p2 } = canonical(s, t);
  const make = (path: Point[], vias: number) =>
    materialize(edge, s, t, path, vias, false);
  const dx = t.x - s.x,
    dy = t.y - s.y;
  const upright = vertical(s.side);
  const rise = upright ? dx : dy;
  if (count > 1 && span >= 50) {
    const direction = Math.sign(
      (upright ? dy : dx) || (upright ? dx : dy),
    );
    const nx =
        ((upright ? dy : -dy) * direction) / span,
      ny =
        ((upright ? -dx : dx) * direction) / span;
    const center = (count - 1) / 2;
    const pitch = reciprocal
      ? 2.9 +
        7.1 * Math.min(1, Math.abs(rise) / 24)
      : 10;
    // Retain uniform pitch and the parabolic lens in both travel directions.
    const offset =
      (rank - center) *
      Math.min(
        14 / center,
        (s.side === t.side ||
        (!rise && reciprocal)
          ? 1
          : 1.7) * pitch,
      );
    const facing =
      s.side !== t.side &&
      upright === vertical(t.side);
    const chordLens =
      facing && (!rise || count >= 3);
    const steps = chordLens
      ? Math.ceil(span / 4)
      : plain.length - 1;
    const path = Array.from(
      { length: steps + 1 },
      (_, i) => {
        const f = i / steps,
          bow = 4 * f * (1 - f);
        const base = chordLens
          ? pt(s.x + dx * f, s.y + dy * f)
          : required(plain[i]);
        // At staggered sockets the two shoulders follow the socket normals.
        const height =
          offset *
          (chordLens
            ? reciprocal
              ? Math.pow(bow, 0.15)
              : bow
            : bow * bow);
        return pt(
          base.x + nx * height,
          base.y + ny * height,
        );
      },
    );
    if (
      s.side === t.side &&
      (upright ? dy : dx) === 0
    ) {
      const axis = upright ? "y" : "x",
        along = upright ? "x" : "y";
      const sign =
        s.side === "top" || s.side === "left"
          ? -1
          : 1;
      // The outer bundle member gets a wider crown. Both shoulders
      // keep their socket tangents and are set by this pair alone.
      const layer = rank / (count - 1);
      const pitch = Math.min(12, span / 50);
      const arches = plain.map((p, i) => {
        const f =
          (p[along] - s[along]) /
          (t[along] - s[along]);
        const u = i / (plain.length - 1);
        const shoulder =
          (1 +
            Math.tanh(
              (Math.abs(f - 0.5) -
                (0.075 + 0.1 * layer)) /
                (0.08 / (1 + layer)),
            )) /
          2;
        return {
          ...p,
          [axis]:
            p[axis] +
            sign *
              pitch *
              ((0.75 * layer - 0.25) *
                (4 * u * (1 - u)) ** 2 -
                ((14 - 4 * layer) / 12) *
                  shoulder *
                  Math.sin(Math.PI * f) ** 2),
        };
      });
      if (free(arches, boxes))
        return make(arches, 0);
    }
    if (free(path, boxes)) return make(path, 0);
  }
  const blocked = blockers(edge, plain, boxes);
  if (!blocked.length)
    return {
      ...make(plain, 0),
      controls: [
        { ...p1, z: s.z },
        { ...p2, z: t.z },
      ],
    };
  const signed = (p: Point) =>
    (dx * (p.y - s.y) - dy * (p.x - s.x)) /
    (span || 1);
  const along = (p: Point) =>
    dx * (p.x - s.x) + dy * (p.y - s.y);
  const obstacle = required(blocked[0]);
  const center = pt(
    (obstacle.l + obstacle.r) / 2,
    (obstacle.t + obstacle.b) / 2,
  );
  const u = move(s, s.side, 16),
    v = move(t, t.side, 16);
  if (
    !upright &&
    center.y !== s.y &&
    dy === 0 &&
    s.side !== t.side &&
    blocked.length === 1 &&
    obstacle.id !== edge.source &&
    obstacle.id !== edge.target
  ) {
    const y =
      center.y < s.y
        ? obstacle.b + 10
        : obstacle.t - 10;
    const left = obstacle.l - 10,
      right = obstacle.r + 10;
    const knots = [
      s,
      u,
      pt(dx > 0 ? left : right, y),
      pt(dx > 0 ? right : left, y),
      v,
      t,
    ];
    if (
      knots.every(
        (p, i) =>
          !i ||
          along(p) >=
            along(required(knots[i - 1])),
      )
    ) {
      const path = fillet(knots, 8);
      if (
        Math.abs(y - s.y) * 2 <
          Math.min(
            Math.abs(u.x - knots[2]!.x),
            Math.abs(v.x - knots[3]!.x),
          ) &&
        free(path, boxes)
      )
        return materialize(edge, s, t, path, 2);
    }
  }
  const candidates = boxes
    .filter(
      (q) =>
        blocked.includes(q) || gap(u, v, q) < 12,
    )
    .flatMap((q) => {
      const b = inflate(
        q,
        12 +
          Math.min(
            2,
            (Math.hypot(v.x - u.x, v.y - u.y) /
              900) *
              2,
          ),
      );
      const center = pt(
        (q.l + q.r) / 2,
        (q.t + q.b) / 2,
      );
      const sign =
        Math.sign(signed(center)) ||
        ((q.id <
        (edge.source < edge.target
          ? edge.source
          : edge.target)
          ? 1
          : -1) *
          (dx || dy) >=
        0
          ? 1
          : -1);
      return [
        pt(b.l, b.t),
        pt(b.r, b.t),
        pt(b.l, b.b),
        pt(b.r, b.b),
      ]
        .filter((p) => sign * signed(p) < 0)
        .sort(
          (a, b) =>
            Math.abs(signed(a)) -
            Math.abs(signed(b)),
        );
    });

  const walls = boxes.map((q) =>
    q.id === edge.source || q.id === edge.target
      ? q
      : inflate(q, 10),
  );
  const foreign = blocked
    .filter(
      (q) =>
        q.id !== edge.source &&
        q.id !== edge.target,
    )
    .map((q) => {
      const c = pt(
        (q.l + q.r) / 2,
        (q.t + q.b) / 2,
      );
      return {
        along: along(c),
        side: Math.sign(signed(c)),
      };
    });
  const outside = (path: Point[]) =>
    foreign.every(
      (q) =>
        !q.side ||
        path.every((p, i) => {
          const prev = path[i - 1];
          if (!prev) return true;
          const a = along(prev),
            b = along(p);
          if (
            a === b ||
            q.along < Math.min(a, b) ||
            q.along > Math.max(a, b)
          )
            return true;
          const h =
            signed(prev) +
            ((signed(p) - signed(prev)) *
              (q.along - a)) /
              (b - a);
          return h * q.side <= 1e-7;
        }),
    );
  let best: Point[] | undefined;
  let viaCount = 0;
  let length = Infinity,
    leastBends = Infinity;
  const consider = (
    vias: Point[],
    monotone = true,
  ) => {
    const run = [u, ...vias, v];
    if (
      monotone &&
      run.some(
        (p, i) =>
          i > 0 &&
          along(p) < along(required(run[i - 1])),
      )
    )
      return;
    const path = fillet([s, ...run, t]);
    if (
      !outside(path) ||
      !free(path, walls) ||
      crossesItself(path)
    )
      return;
    const cost = path.reduce(
      (n, p, i) =>
        n +
        (i
          ? distance(p, required(path[i - 1]))
          : 0),
      0,
    );
    const bends = extraBends([s, ...run, t]);
    if (
      bends < leastBends ||
      (bends === leastBends && cost < length)
    ) {
      leastBends = bends;
      best = path;
      viaCount = vias.length;
      length = cost;
    }
  };
  if (
    s.side === "bottom" &&
    t.side === "top" &&
    Math.abs(dx) < 8 &&
    blocked.length === 1
  ) {
    // Round the approach and departure beside the blocking card.
    const safe = boxes.map((q) =>
      q.id === edge.source || q.id === edge.target
        ? q
        : inflate(q, 6),
    );
    const rim = (obstacle.b - obstacle.t) / 2;
    const right = signed(center) >= 0;
    for (const margin of [0, 4, 8]) {
      const x = right
        ? obstacle.r + 2 * rim + margin
        : obstacle.l - 2 * rim - margin;
      const path = fillet([
        s,
        u,
        pt(x, obstacle.b - 2),
        t,
      ]);
      if (free(path, safe))
        return materialize(edge, s, t, path, 1);
    }
  }
  const obstacles = blocked.filter(
    (q) =>
      q.id !== edge.source &&
      q.id !== edge.target,
  );
  consider([]);
  if (best && !leastBends)
    return materialize(edge, s, t, best, 0);
  for (const p of candidates) consider([p]);
  // A guide on an extended socket normal can clear a card with a
  // single turn where its nearest corner would introduce an S bend.
  if (!best || leastBends) {
    for (const end of [s, t]) {
      const axis = vertical(end.side) ? "y" : "x";
      const other = end === s ? t : s;
      const levels = [
        other[axis],
        ...candidates.map((p) => p[axis]),
      ];
      for (const level of levels) {
        const extent =
          (level - end[axis]) *
          (end.side === "top" ||
          end.side === "left"
            ? -1
            : 1);
        if (extent > 16 && extent < span)
          consider([move(end, end.side, extent)]);
      }
    }
  }
  if (!best || leastBends) {
    // In a narrow gap a long stem forces the next segment back across
    // the chord. Shorten the stems before accepting an extra bend.
    const compact = boxes.map((q) =>
      q.id === edge.source || q.id === edge.target
        ? q
        : inflate(q, 4),
    );
    const guides = [
      pt((s.x + t.x) / 2, (s.y + t.y) / 2),
      ...candidates,
    ];
    for (const f of [0.1, 0.9]) {
      for (const offset of [
        -span * 0.6,
        span * 0.6,
      ]) {
        guides.push(
          pt(
            s.x + f * dx - (dy * offset) / span,
            s.y + f * dy + (dx * offset) / span,
          ),
        );
      }
    }
    for (const [start, end] of [
      [16, 16],
      [12, 12],
      [10, 10],
      [8, 16],
      [16, 8],
      [6, 16],
      [16, 6],
      [6, 6],
    ] satisfies [number, number][]) {
      const from = move(s, s.side, start),
        to = move(t, t.side, end);
      for (const guide of guides) {
        const knots = [s, from, guide, to, t];
        if (
          extraBends(knots) ||
          !free(knots, compact)
        )
          continue;
        const forward = (
          end: Socket,
          stem: Point,
          p: Point,
        ) =>
          (stem.x - end.x) * (p.x - stem.x) +
          (stem.y - end.y) * (p.y - stem.y);
        if (
          forward(s, from, guide) < 0 ||
          forward(t, to, guide) < 0
        )
          continue;
        const path = fillet(knots);
        if (
          outside(path) &&
          free(path, compact) &&
          !crossesItself(path)
        )
          return materialize(edge, s, t, path, 1);
      }
    }
  }
  if (best && !leastBends)
    return materialize(edge, s, t, best, 1);
  for (const p of candidates)
    for (const q of candidates)
      if (p !== q && along(q) >= along(p))
        consider([p, q]);
  if (!best || leastBends) {
    // A convex chain between the sockets can skirt a blocker
    // without introducing opposing turns at both socket stems.
    const side = -Math.sign(signed(center)) || 1;
    for (const padding of [12, 18, 24, 32]) {
      const rim = blocked
        .flatMap((q) => {
          const b = inflate(q, padding);
          return [
            pt(b.l, b.t),
            pt(b.r, b.t),
            pt(b.l, b.b),
            pt(b.r, b.b),
          ];
        })
        .filter(
          (p) =>
            side * signed(p) > 0 &&
            along(p) > 0 &&
            along(p) < span * span,
        )
        .sort((a, b) => along(a) - along(b));
      const chain: Point[] = [s];
      for (const p of [...rim, t]) {
        while (chain.length >= 2) {
          const a = chain[chain.length - 2]!,
            b = chain[chain.length - 1]!;
          if (
            side *
              ((b.x - a.x) * (p.y - b.y) -
                (b.y - a.y) * (p.x - b.x)) <
            0
          )
            break;
          chain.pop();
        }
        chain.push(p);
      }
      if (
        upright &&
        !vertical(t.side) &&
        chain.length > 4 &&
        obstacles.length > 1
      ) {
        for (const q of obstacles)
          for (const h of [-1, 1])
            for (const k of [-1, 1]) {
              const x = h > 0 ? q.r : q.l,
                y = k > 0 ? q.b : q.t;
              const a = pt(x + h * 14, y - k * 8);
              const level =
                a.y +
                ((v.x - a.x) *
                  (y + k * 0.25 - a.y)) /
                  (x - a.x);
              const spine = [
                s,
                a,
                pt(v.x, level),
                t,
              ];
              if (
                extraBends(spine) ||
                !outside(spine) ||
                !free(spine, boxes)
              )
                continue;
              const path = fillet(spine, 8);
              if (
                outside(path) &&
                free(path, boxes) &&
                !extraBends(path) &&
                !crossesItself(path)
              )
                return materialize(
                  edge,
                  s,
                  t,
                  path,
                  2,
                );
            }
      }
      for (const radius of [40, 20, 10, 6]) {
        const stem = (
          end: Socket,
          toward: Point,
        ) => {
          const dot =
            ((toward.x - end.x) *
              normal[end.side].x +
              (toward.y - end.y) *
                normal[end.side].y) /
            (distance(end, toward) || 1);
          return span > 200 && dot < 0.67
            ? [move(end, end.side, 4)]
            : [];
        };
        const path = fillet(
          [
            s,
            ...stem(s, chain[1]!),
            ...chain.slice(1, -1),
            ...stem(t, chain[chain.length - 2]!),
            t,
          ],
          radius,
        );
        if (
          free(path, walls) &&
          !crossesItself(path) &&
          !extraBends(path)
        )
          return materialize(
            edge,
            s,
            t,
            path,
            chain.length - 2,
          );
      }
    }
  }
  if ((!best || leastBends) && obstacles.length) {
    for (const padding of [14, 20, 32, 48]) {
      const rims = boxes
        .filter(
          (q) =>
            q.id !== edge.source &&
            q.id !== edge.target,
        )
        .map((q) => inflate(q, padding));
      for (const axial of [false, true])
        for (const flank of [
          0,
          Math.sign(signed(center)) || 1,
        ]) {
          const dent = chordDent(
            s,
            t,
            plain,
            rims,
            walls,
            fillet,
            extraBends,
            axial,
            flank,
          );
          if (dent)
            return materialize(
              edge,
              s,
              t,
              dent,
              1,
            );
        }
    }
  }
  if (best)
    return materialize(
      edge,
      s,
      t,
      best,
      viaCount,
    );
  // The arc cuts inside a searched corner. Reserve space for its trim.
  const own = boxes.filter(
    (q) =>
      q.id === edge.source ||
      q.id === edge.target,
  );
  const envelope = {
    id: "",
    l: Math.min(s.x, t.x, ...own.map((q) => q.l)),
    r: Math.max(s.x, t.x, ...own.map((q) => q.r)),
    t: Math.min(s.y, t.y, ...own.map((q) => q.t)),
    b: Math.max(s.y, t.y, ...own.map((q) => q.b)),
  };
  const margin =
    Math.min(
      envelope.r - envelope.l,
      envelope.b - envelope.t,
    ) > 150
      ? 30
      : 90;
  let fallback;
  let bestGap = -Infinity;
  for (const direction of [
    pt(dx, dy),
    false,
  ] satisfies (Point | false)[]) {
    for (const padding of [
      12, 20, 32, 48, 6, 2, 0,
    ]) {
      const rim = boxes.map((q) =>
        inflate(
          q,
          Math.min(
            padding,
            pointGap(u, q),
            pointGap(v, q),
          ),
        ),
      );
      const route = search(
        u,
        v,
        rim,
        false,
        direction,
        undefined,
        padding,
      );
      if (!route) continue;
      const knots = outline(simplify(route), 8);
      const interior = knots.slice(1, -1);
      const monotone =
        interior.length <= 2 ||
        Boolean(direction);
      for (const [i, p] of interior.entries()) {
        consider([p], monotone);
        for (const q of interior.slice(i + 1))
          consider([p, q], monotone);
      }
      if (best && !leastBends)
        return materialize(
          edge,
          s,
          t,
          best,
          viaCount,
        );
      // Never emit an unverified shortcut through the interior of a
      // multi-corner search result. Try a wider rim or the other side.

      const path = fillet([s, ...knots, t]);
      if (crossesItself(path)) continue;
      const wire = materialize(
        edge,
        s,
        t,
        path,
        knots.length - 2,
      );
      if (free(path, walls)) {
        const bends =
          Number(
            path.some(
              (p) =>
                pointGap(p, envelope) > margin,
            ),
          ) *
            100 +
          extraBends([s, ...knots, t]);
        if (!bends) return wire;
        if (bends < leastBends) {
          leastBends = bends;
          fallback = wire;
        }
        continue;
      }
      if (leastBends < Infinity) continue;
      // Narrow passages can force less than ten units of clearance.
      // Keep the best searched passage even if its rounded rim comes close.
      let gap = Infinity;
      for (const p of wire.points)
        for (const q of boxes) {
          if (
            (q.id === edge.source &&
              distance(p, s) < 20) ||
            (q.id === edge.target &&
              distance(p, t) < 20)
          )
            continue;
          gap = Math.min(
            gap,
            Math.max(
              q.l - p.x,
              p.x - q.r,
              q.t - p.y,
              p.y - q.b,
            ),
          );
        }
      if (gap > bestGap) {
        bestGap = gap;
        fallback = wire;
      }
    }
    if (leastBends < Infinity) break;
  }
  if (!fallback) {
    // When obstacles form a chain, the two useful corners may lie on
    // different rectangles. Try an outer lane on each side of the chain.
    const rim = inflate(
      {
        id: "",
        l: Math.min(
          u.x,
          v.x,
          ...boxes.map((q) => q.l),
        ),
        r: Math.max(
          u.x,
          v.x,
          ...boxes.map((q) => q.r),
        ),
        t: Math.min(
          u.y,
          v.y,
          ...boxes.map((q) => q.t),
        ),
        b: Math.max(
          u.y,
          v.y,
          ...boxes.map((q) => q.b),
        ),
      },
      40,
    );
    for (const x of [rim.l, rim.r])
      consider([pt(x, u.y), pt(x, v.y)], false);
    for (const y of [rim.t, rim.b])
      consider([pt(u.x, y), pt(v.x, y)], false);
    if (best)
      return materialize(
        edge,
        s,
        t,
        best,
        viaCount,
      );
  }
  return (
    fallback ??
    materialize(
      edge,
      s,
      t,
      fillet([s, u, v, t]),
      0,
    )
  );
};

// A line joining two circular fillets adds no turning of its own.
export const extraBends = (
  points: readonly Point[],
) => {
  let previous = 0,
    turn = 0,
    flips = 0;
  for (let i = 2; i < points.length; i++) {
    const a = required(points[i - 2]),
      b = required(points[i - 1]),
      c = required(points[i]);
    const x = b.x - a.x,
      y = b.y - a.y,
      u = c.x - b.x,
      v = c.y - b.y;
    const angle = Math.atan2(
      x * v - y * u,
      x * u + y * v,
    );
    if (Math.abs(angle) < 1e-8) continue;
    turn =
      Math.sign(turn) === Math.sign(angle)
        ? turn + angle
        : angle;
    if (Math.abs(turn) < 0.12) continue;
    const sign = Math.sign(turn);
    if (previous && previous !== sign) flips++;
    previous = sign;
  }
  return Math.max(0, flips - 1);
};

export const fillet = (
  knots: Point[],
  maxRadius = 40,
) => {
  const path = simplify(knots);
  const arcs = path.slice(1, -1).map((b, i) => {
    const a = required(path[i]),
      c = required(path[i + 2]);
    const u = distance(a, b),
      v = distance(b, c);
    const x = (b.x - a.x) / u,
      y = (b.y - a.y) / u,
      tx = (c.x - b.x) / v,
      ty = (c.y - b.y) / v;
    const turn = Math.atan2(
      x * ty - y * tx,
      x * tx + y * ty,
    );
    const radius = Math.min(
      maxRadius,
      u / 2,
      v / 2,
    );
    return {
      b,
      x,
      y,
      u,
      v,
      turn,
      radius,
      trim: radius * Math.tan(Math.abs(turn) / 2),
    };
  });
  const out = [required(path[0])];
  for (const [i, arc] of arcs.entries()) {
    const { b, x, y, turn } = arc;
    if (Math.abs(turn) < 1e-8) {
      out.push(b);
      continue;
    }
    // The tangent setback equals radius times tan(turn / 2). Fit neighbouring fillets
    // to their shared run only when their full radii would intersect.
    const fit = Math.min(
      1,
      arc.u /
        (arc.trim + (arcs[i - 1]?.trim ?? 0)),
      arc.v /
        (arc.trim + (arcs[i + 1]?.trim ?? 0)),
    );
    const radius = arc.radius * fit,
      trim = arc.trim * fit,
      sign = Math.sign(turn);
    const center = pt(
      b.x - trim * x - sign * y * radius,
      b.y - trim * y + sign * x * radius,
    );
    const start = Math.atan2(-sign * x, sign * y);
    const steps = Math.max(
      2,
      Math.ceil((Math.abs(turn) * radius) / 2),
    );
    for (let j = 0; j <= steps; j++) {
      const angle = start + (turn * j) / steps;
      out.push(
        pt(
          center.x + radius * Math.cos(angle),
          center.y + radius * Math.sin(angle),
        ),
      );
    }
  }
  out.push(required(path[path.length - 1]));
  return out;
};
