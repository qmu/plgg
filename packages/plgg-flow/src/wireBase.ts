import { shortcuts } from "plgg-flow/wireShortcuts";
import {
  type Point,
  type Point3,
} from "plgg-board";
import { type Side } from "plgg-flow/nodeBody";
import { type Edge } from "./model";
import {
  vertical,
  required,
  pt,
  distance,
  pointGap,
  crossesItself,
  facing,
  rounded,
  normal,
  move,
  cuts,
  free,
  inflate,
  simplify,
  bezier,
  type Box,
} from "plgg-flow/wireGeometry";
import {
  materialize,
  throughKnots,
} from "plgg-flow/wirePath";
import type { Wire } from "./wiring";
import { search } from "plgg-flow/wireSearch";
// Smooth in arc length so short corner segments do not dominate the tangent.
export const fair = (
  path: Point[],
  source: Side,
  target: Side,
  boxes: Box[],
  radii = [12, 8, 5, 3],
) => {
  const first = required(path[0]),
    last = required(path[path.length - 1]);
  const u = move(first, source, 14),
    v = move(last, target, 14);
  const lens = [0];
  let length = 0,
    sharp = false;
  for (let i = 1; i < path.length; i++) {
    const a = required(path[i - 1]),
      b = required(path[i]);
    length += distance(a, b);
    lens.push(length);
    const c = path[i + 1];
    if (c) {
      const dx = b.x - a.x,
        dy = b.y - a.y,
        vx = c.x - b.x,
        vy = c.y - b.y;
      if (
        dx * vx + dy * vy <
        0.98 *
          Math.hypot(dx, dy) *
          Math.hypot(vx, vy)
      )
        sharp = true;
    }
  }
  if (!sharp || length < 55) return path;
  const span = length - 28,
    count = Math.ceil(span / 6);
  let idx = 1;
  const samples = Array.from(
    { length: count + 1 },
    (_, i) => {
      const at = 14 + (span * i) / count;
      while (
        idx + 1 < lens.length &&
        required(lens[idx]) < at
      )
        idx++;
      const a = required(path[idx - 1]),
        b = required(path[idx]),
        lo = required(lens[idx - 1]),
        f =
          (at - lo) /
          (required(lens[idx]) - lo || 1);
      return pt(
        a.x + (b.x - a.x) * f,
        a.y + (b.y - a.y) * f,
      );
    },
  );
  for (const radius of radii) {
    const smooth = samples.map((p, i) => {
      let x = 0,
        y = 0,
        sum = 0;
      for (let k = -radius; k <= radius; k++) {
        const q =
            samples[
              Math.min(count, Math.max(0, i + k))
            ] ?? p,
          w = radius + 1 - Math.abs(k);
        x += q.x * w;
        y += q.y * w;
        sum += w;
      }
      return pt(x / sum, y / sum);
    });
    const k = Math.min(
        radius,
        Math.floor(count / 3),
      ),
      arm = Math.min(12, span / 8);
    const shoulder = (
      start: Point,
      side: Side,
      i: number,
      j: number,
    ) => {
      const p = required(smooth[i]),
        q = required(smooth[j]),
        d = distance(p, q) || 1;
      return bezier(
        start,
        move(start, side, arm),
        pt(
          p.x + ((p.x - q.x) * arm) / d,
          p.y + ((p.y - q.y) * arm) / d,
        ),
        p,
        6,
      );
    };
    const result = [
      first,
      ...shoulder(u, source, k, k + 1),
      ...smooth.slice(k + 1, count - k),
      ...shoulder(
        v,
        target,
        count - k,
        count - k - 1,
      ).reverse(),
      last,
    ];
    if (free(result, boxes)) return result;
  }
  return path;
};

// Positive is below a horizontal chord and right of a vertical one.
const centerSign = (
  offset: number,
  clearance: number,
  obstacle: string,
  edge: Edge,
) =>
  Math.abs(offset) > clearance / 2
    ? Math.sign(offset)
    : obstacle >
        (edge.source < edge.target
          ? edge.source
          : edge.target)
      ? 1
      : -1;

// Ease the shoulders into the clearance band before a card reaches the wire.
const softCorridor = (
  s: Point & { side: Side },
  t: Point,
  boxes: Box[],
  clearance: number,
  edge: Edge,
) => {
  const upright = vertical(s.side);
  const along = upright ? "y" : "x",
    across = upright ? "x" : "y";
  const advance = t[along] - s[along],
    rise = t[across] - s[across];
  if (
    advance * normal[s.side][along] <= 0 ||
    Math.abs(rise) > Math.abs(advance)
  )
    return;
  const baseline = (x: number) => {
    const f = Math.max(
      0,
      Math.min(1, (x - s[along]) / advance),
    );
    return s[across] + rise * f * f * (3 - 2 * f);
  };
  const low = Math.min(s[along], t[along]),
    high = Math.max(s[along], t[along]);

  const bands: {
    left: number;
    right: number;
    push: number;
    obstacle: Box;
  }[] = [];
  for (const q of boxes) {
    const pad = Math.min(
      clearance,
      pointGap(s, q),
      pointGap(t, q),
    );
    const left = (upright ? q.t : q.l) - pad,
      right = (upright ? q.b : q.r) + pad;
    if (right <= low || left >= high) continue;
    const atLeft = baseline(left),
      atRight = baseline(right);
    const top =
        (upright ? q.l : q.t) -
        Math.max(atLeft, atRight),
      bottom =
        (upright ? q.r : q.b) -
        Math.min(atLeft, atRight);
    const center =
      (upright ? q.l + q.r : q.t + q.b) / 2;
    const chord =
      s[across] +
      (rise * ((left + right) / 2 - s[along])) /
        advance;
    const separation = center - chord;
    const above =
      centerSign(
        separation,
        clearance,
        q.id,
        edge,
      ) > 0;
    const push = above
      ? Math.min(0, top - pad)
      : Math.max(0, bottom + pad);
    if (!push) continue;
    if (left <= low || right >= high) return;
    bands.push({
      left,
      right,
      push,
      obstacle: q,
    });
  }
  if (!bands.length)
    return rise ? undefined : [s, t];
  // Ease into a clear level beside the obstacle without overshooting either socket.
  if (
    bands.length === 1 &&
    Math.abs(rise) > 2 * clearance
  ) {
    const band = required(bands[0]);
    const obstacle = band.obstacle;
    if (
      !boxes.some(
        (q) =>
          q !== obstacle &&
          (upright ? q.t : q.l) < high &&
          (upright ? q.b : q.r) > low &&
          (upright ? q.l : q.t) <
            Math.max(s[across], t[across]) &&
          (upright ? q.r : q.b) >
            Math.min(s[across], t[across]),
      )
    ) {
      const fromLow =
        advance > 0 ? s[across] : t[across];
      const fromHigh =
        advance > 0 ? t[across] : s[across];
      const near =
        (upright ? obstacle.l : obstacle.t) -
        clearance;
      const far =
        (upright ? obstacle.r : obstacle.b) +
        clearance;
      const level =
        fromLow < fromHigh ? near - 1 : far + 1;
      if (
        level > Math.min(fromLow, fromHigh) &&
        level < Math.max(fromLow, fromHigh)
      ) {
        const ease = (f: number) =>
          f * f * (3 - 2 * f);
        // Shift the inflection of a single smoothstep until its value
        // at the far rim is the required clearance level.
        const height =
          (level - fromLow) /
          (fromHigh - fromLow);
        let lower = 0,
          upper = 1;
        for (let i = 0; i < 12; i++) {
          const mid = (lower + upper) / 2;
          if (ease(mid) < height) lower = mid;
          else upper = mid;
        }
        const rim =
          (band.right - low) / (high - low);
        const t = Math.max(1e-6, lower);
        const weight =
          (rim * (1 - t)) / (t * (1 - rim));
        return Array.from(
          { length: 65 },
          (_, i) => {
            const x =
              s[along] + (advance * i) / 64;
            const f = (x - low) / (high - low);
            const y =
              fromLow +
              (fromHigh - fromLow) *
                ease(f / (f + weight * (1 - f)));
            return upright ? pt(y, x) : pt(x, y);
          },
        );
      }
    }
  }
  // A single smooth arch can clear several cards on the same level.
  if (Math.abs(rise) < 1 && bands.length > 1) {
    const arch = (x: number) => {
      const wave =
        Math.sin(
          (Math.PI * (x - low)) / (high - low),
        ) ** 2;
      return (
        0.4 * wave + (0.6 * wave) / (0.03 + wave)
      );
    };
    const dir = Math.sign(
      required(bands[0]).push,
    );
    if (bands.every((b) => dir * b.push > 0)) {
      const height = Math.max(
        ...bands.map(
          (b) =>
            (dir * b.push) /
            Math.min(arch(b.left), arch(b.right)),
        ),
      );
      if (height < 90)
        return Array.from(
          { length: 65 },
          (_, i) => {
            const x =
              s[along] + (advance * i) / 64;
            const y =
              baseline(x) +
              dir * height * arch(x);
            return upright ? pt(y, x) : pt(x, y);
          },
        );
    }
  }
  const coords = new Set([low, high]);
  for (const band of bands) {
    coords.add(band.left);
    coords.add(band.right);
  }
  for (let i = 1; i < 48; i++)
    coords.add(low + ((high - low) * i) / 48);
  return [...coords]
    .sort(
      (a, b) =>
        (a - b) * Math.sign(t[along] - s[along]),
    )
    .map((x) => {
      let above = 0,
        below = 0;
      for (const { left, right, push } of bands) {
        const shoulder = Math.max(
          48,
          Math.min(160, 3 * Math.abs(push) + 32),
        );
        const f = Math.max(
          0,
          Math.min(
            1,
            1 -
              (left - x) /
                Math.min(shoulder, left - low),
            1 -
              (x - right) /
                Math.min(shoulder, high - right),
          ),
        );
        const v = push * f * f * (3 - 2 * f);
        above = Math.min(above, v);
        below = Math.max(below, v);
      }
      const offset = above + below;
      return upright
        ? pt(baseline(x) + offset, x)
        : pt(x, baseline(x) + offset);
    });
};
export type Base = Wire & {
  spine?: Point[];
  settled?: boolean;
};
export type Socket = Point3 & { side: Side };
// A branch peeling away from a facing bundle must clear the
// outermost lane before turning toward the diagonal neighbour.
export const bundleBranch = (
  edge: Edge,
  s: Socket,
  t: Socket,
  boxes: Box[],
  radius: number,
  leavesBundle: boolean,
): Base | undefined => {
  if (
    edge.waypoints?.length ||
    edge.route === "straight"
  )
    return;
  const socket = leavesBundle ? s : t,
    far = leavesBundle ? t : s;
  const along = vertical(socket.side) ? "y" : "x",
    across = along === "y" ? "x" : "y";
  const forward =
    (far[along] - socket[along]) *
    normal[socket.side][along];
  if (forward < 32) return;
  let path: Point[],
    corners = 0;
  if (edge.route === "step") {
    if (
      !leavesBundle ||
      vertical(s.side) === vertical(t.side)
    )
      return;
    const l = move(s, s.side, 16),
      r = move(t, t.side, 22);
    const corner = vertical(s.side)
      ? pt(r.x, l.y)
      : pt(l.x, r.y);
    path = rounded(
      [s, l, corner, r, t],
      Math.min(radius, 8),
    );
    corners = 3;
  } else if (leavesBundle) {
    if (vertical(s.side) === vertical(t.side))
      return;
    const control = {
      ...s,
      [along]:
        s[along] + (t[along] - s[along]) / 3,
      [across]: (s[across] + t[across]) / 2,
    };
    path = [
      s,
      ...bezier(
        move(s, s.side, 10),
        control,
        move(t, t.side, 32),
        move(t, t.side, 12),
      ),
      t,
    ];
  } else {
    path = bezier(
      s,
      move(s, s.side, forward * 0.85),
      move(t, t.side, Math.min(22, forward / 4)),
      t,
    );
  }
  if (free(path, boxes))
    return {
      ...materialize(edge, s, t, path, corners),
      settled: true,
    };
  return undefined;
};
// Nested page arcs turn from the same stem. The deeper arc keeps its
// vertical tangent longer, so a shallow sibling peels away inside it.
export const archStep = (
  s: Socket,
  t: Socket,
  level: number,
  radius: number,
) => {
  const along = vertical(s.side) ? "y" : "x",
    across = along === "x" ? "y" : "x";
  if (!radius)
    return [
      s,
      { ...s, [along]: level },
      { ...t, [along]: level },
      t,
    ];
  const shoulder = (p: Socket, q: Socket) => {
    const stem = move(p, p.side, 14);
    const width =
      Math.sign(q[across] - p[across]) *
      Math.min(
        radius,
        Math.abs(q[across] - p[across]) / 3,
      );
    const depth = level - stem[along];
    const count = Math.max(
      6,
      Math.ceil(
        Math.max(
          Math.abs(depth),
          Math.abs(width),
        ) / 3,
      ),
    );
    return [
      p,
      ...Array.from(
        { length: count + 1 },
        (_, i) => {
          const a = (Math.PI * i) / (2 * count);
          return {
            ...stem,
            [along]:
              stem[along] + depth * Math.sin(a),
            [across]:
              stem[across] +
              width * (1 - Math.cos(a)),
          };
        },
      ),
    ];
  };
  return [
    ...shoulder(s, t),
    ...shoulder(t, s).reverse(),
  ];
};
export const archCurve = (
  s: Socket,
  t: Socket,
  level: number,
  baseLevel = level,
) => {
  const axis = vertical(s.side) ? "y" : "x",
    across = axis === "x" ? "y" : "x";
  const shoulder = (p: Socket, q: Socket) => {
    const u = move(p, p.side, 14);
    const depth = level - u[axis];
    const width = Math.min(
      Math.abs(p[across] - q[across]) / 3,
      Math.max(
        18,
        Math.abs(baseLevel - u[axis]) * 2,
      ),
    );
    const shift =
      width * Math.sign(q[across] - p[across]);
    const end = {
      ...p,
      [axis]: level,
      [across]: p[across] + shift,
    };
    return [
      p,
      ...bezier(
        u,
        { ...u, [axis]: u[axis] + depth * 0.8 },
        {
          ...end,
          [across]: end[across] - shift * 0.6,
        },
        end,
      ),
    ];
  };
  return [
    ...shoulder(s, t),
    ...shoulder(t, s).reverse(),
  ];
};
const routeBase = (
  edge: Edge,
  s: Socket,
  t: Socket,
  boxes: Box[],
  clearance: number,
  radius: number,
): Base => {
  const step = edge.route === "step";
  const span = distance(s, t);
  const forward =
    (t.x - s.x) * normal[s.side].x +
    (t.y - s.y) * normal[s.side].y;
  const opposite =
    s.side !== t.side &&
    vertical(s.side) === vertical(t.side) &&
    forward > 0;
  const stem = Math.min(
    14,
    (opposite ? forward : span) / 3,
  );
  const u = move(s, s.side, stem),
    v = move(t, t.side, stem);
  const make = (path: Point[], corners = 0) =>
    materialize(edge, s, t, path, corners);
  if (edge.waypoints?.length) {
    if (edge.route === "step") {
      // Keep authored knots at their original depth while rounding the spans between them.
      const anchors = [
        { ...u, z: s.z },
        ...edge.waypoints,
        { ...v, z: t.z },
      ];
      const guides = anchors.map((p, i) => {
        const prev = anchors[i - 1],
          next = anchors[i + 1];
        if (!prev || !next)
          return { before: p, after: p };
        const side = facing(
          next.x - prev.x,
          next.y - prev.y,
        );
        const reach = Math.min(
          24,
          distance(p, prev) / 4,
          distance(p, next) / 4,
          ...boxes.map((q) => pointGap(p, q)),
        );
        return {
          before: move(p, side, -reach),
          after: move(p, side, reach),
        };
      });
      const points: Point3[] = [
        s,
        required(anchors[0]),
      ];
      let corners = 0;
      for (let i = 1; i < anchors.length; i++) {
        const left = required(anchors[i - 1]),
          right = required(anchors[i]);
        const begin = required(
            guides[i - 1],
          ).after,
          end = required(guides[i]).before;
        const core = search(
          begin,
          end,
          boxes,
          true,
        ) ?? [begin, pt(begin.x, end.y), end];
        const raw = simplify([
          left,
          ...core,
          right,
        ]);
        const arc = rounded(raw, radius);
        const span = free(arc, boxes) ? arc : raw;
        corners += Math.max(0, raw.length - 2);
        const length = span.reduce(
          (sum, p, j) =>
            sum +
            (j
              ? distance(p, required(span[j - 1]))
              : 0),
          0,
        );
        let along = 0;
        for (let j = 1; j < span.length; j++) {
          const p = required(span[j]),
            q = required(span[j - 1]),
            d = distance(p, q),
            n = Math.ceil(d / 12);
          for (let k = 1; k <= n; k++) {
            const f = k / n;
            points.push({
              x: q.x + (p.x - q.x) * f,
              y: q.y + (p.y - q.y) * f,
              z:
                left.z +
                ((right.z - left.z) *
                  (along + d * f)) /
                  (length || 1),
            });
          }
          along += d;
        }
        if (length)
          points[points.length - 1] = right;
        else points.push(right);
      }
      points.push(t);
      const wire = {
        edge,
        points,
        corners,
        source: s,
        target: t,
        arrow: {
          at: t,
          toward: {
            ...move(t, t.side, -1),
            z: t.z,
          },
        },
        sourceSide: s.side,
        targetSide: t.side,
      };

      return wire;
    }
    const manual = materialize(edge, s, t, [], 0);

    return manual;
  }

  const foreign = boxes.filter(
    (q) =>
      q.id !== edge.source &&
      q.id !== edge.target,
  );
  const padded = boxes.map((q) => {
    const own = !foreign.includes(q);
    const limits = {
      ...inflate(
        q,
        own ? Math.min(14, stem) : clearance,
      ),
    };
    // A stem constrains only the face it approaches.
    for (const p of own ? [u, v] : [s, u, v, t]) {
      if (
        p.x <= limits.l ||
        p.x >= limits.r ||
        p.y <= limits.t ||
        p.y >= limits.b
      )
        continue;
      const gap = Math.max(
        q.l - p.x,
        p.x - q.r,
        q.t - p.y,
        p.y - q.b,
      );
      if (gap < 0) continue;
      if (gap === q.l - p.x) limits.l = p.x;
      else if (gap === p.x - q.r) limits.r = p.x;
      else if (gap === q.t - p.y) limits.t = p.y;
      else limits.b = p.y;
    }
    for (const n of boxes) {
      if (n === q) continue;
      if (n.t < q.b && n.b > q.t) {
        if (n.l >= q.r)
          limits.r = Math.min(
            limits.r,
            (q.r + n.l) / 2,
          );
        if (n.r <= q.l)
          limits.l = Math.max(
            limits.l,
            (q.l + n.r) / 2,
          );
      }
      if (n.l < q.r && n.r > q.l) {
        if (n.t >= q.b)
          limits.b = Math.min(
            limits.b,
            (q.b + n.t) / 2,
          );
        if (n.b <= q.t)
          limits.t = Math.max(
            limits.t,
            (q.t + n.b) / 2,
          );
      }
    }
    return limits;
  });
  const safe = (path: Point[]) =>
    free(path, boxes) &&
    free(path.slice(1, -1), padded);
  const axis = vertical(s.side) ? "x" : "y";
  if (
    opposite &&
    Math.abs(s[axis] - t[axis]) < 1e-6 &&
    free(
      [s, t],
      padded.filter(
        (q) =>
          q.id !== edge.source &&
          q.id !== edge.target,
      ),
    )
  )
    return { ...make([s, t]), spine: [s, t] };
  if (opposite && span < 60) {
    const arm = forward * (step ? 0.8 : 1 / 3);
    const path = bezier(
      s,
      move(s, s.side, arm),
      move(t, t.side, arm),
      t,
    );
    if (free(path, boxes)) return make(path);
  }
  if (edge.source === edge.target) {
    const l = move(s, s.side, step ? 18 : 32),
      r = move(t, t.side, step ? 18 : 32);
    const corner = vertical(s.side)
      ? pt(r.x, l.y)
      : pt(l.x, r.y);
    const path = rounded(
      [s, l, corner, r, t],
      step ? radius : 24,
    );
    if (free(path, boxes)) return make(path, 3);
  }
  if (
    opposite &&
    !step &&
    edge.route !== "straight"
  ) {
    const middle = softCorridor(
      { ...u, side: s.side },
      v,
      foreign,
      clearance,
      edge,
    );
    if (middle && safe([s, ...middle, t]))
      return make([s, ...middle, t]);
  }
  if (
    step &&
    vertical(s.side) !== vertical(t.side)
  ) {
    const corner = vertical(s.side)
      ? pt(s.x, t.y)
      : pt(t.x, s.y);
    if (
      (corner.x - u.x) * normal[s.side].x +
        (corner.y - u.y) * normal[s.side].y >=
        0 &&
      (corner.x - v.x) * normal[t.side].x +
        (corner.y - v.y) * normal[t.side].y >=
        0
    ) {
      const spine = [s, corner, t],
        path = rounded(spine, radius);
      if (
        free([u, corner, v], padded) &&
        free(path, boxes)
      )
        return { ...make(path, 1), spine };
    }
  }
  const room = distance(u, v);
  if (!step && s.side !== t.side) {
    if (
      edge.route === "straight" &&
      safe([s, u, v, t])
    )
      return make([s, u, v, t]);
    for (const arm of [
      Math.min(
        Math.max(40, room * 0.45),
        Math.max(16, forward * 0.48),
      ),
      room * 0.32,
      room * 0.2,
      room * 0.6,
    ]) {
      const l = move(u, s.side, arm),
        r = move(v, t.side, arm);
      const path = [
        s,
        ...bezier(
          u,
          l,
          r,
          v,
          Math.max(
            2,
            Math.ceil(
              (3 *
                Math.max(arm, distance(l, r))) /
                12,
            ),
          ),
        ),
        t,
      ];
      if (safe(path) && !crossesItself(path))
        return make(path);
    }
  }
  const along = axis === "x" ? "y" : "x";
  // Enter and leave a blocked straight run on short, equal stems.
  if (
    step &&
    opposite &&
    Math.abs(s[axis] - t[axis]) < 1 &&
    forward > 80
  ) {
    const barriers = padded.filter(
      (q) =>
        q.id !== edge.source &&
        q.id !== edge.target &&
        cuts(u, v, q),
    );
    if (barriers.length >= 2) {
      const levels = [
        Math.min(
          ...barriers.map((q) =>
            axis === "x" ? q.l : q.t,
          ),
        ),
        Math.max(
          ...barriers.map((q) =>
            axis === "x" ? q.r : q.b,
          ),
        ),
      ];
      const anchor = barriers.reduce((a, b) =>
        a.id < b.id ? a : b,
      );
      const wall = required(
        foreign.find((q) => q.id === anchor.id),
      );
      const center =
        axis === "x"
          ? (wall.l + wall.r) / 2
          : (wall.t + wall.b) / 2;
      if (
        centerSign(
          center - s[axis],
          clearance,
          wall.id,
          edge,
        ) < 0
      )
        levels.reverse();
      const left = move(s, s.side, 24),
        right = move(t, t.side, 24);
      for (const level of levels) {
        const spine = [
          s,
          left,
          { ...left, [axis]: level },
          { ...right, [axis]: level },
          right,
          t,
        ];
        const arc = rounded(spine, radius);
        if (safe(arc))
          return { ...make(arc, 4), spine };
      }
    }
  }
  if (s.side === t.side || (step && opposite)) {
    let mid = (u[along] + v[along]) / 2;
    if (s.side === t.side) {
      const sign = normal[s.side][along];
      mid =
        sign *
        (Math.max(
          sign * s[along],
          sign * t[along],
        ) +
          Math.max(38, clearance));
      // Grow the arch continuously when an intervening card rises into it.
      for (const q of foreign) {
        const lo = along === "y" ? q.l : q.t,
          hi = along === "y" ? q.r : q.b;
        const margin = Math.max(
          0,
          Math.min(s[axis], t[axis]) - hi,
          lo - Math.max(s[axis], t[axis]),
        );
        const rim =
          along === "y"
            ? sign > 0
              ? q.b
              : -q.t
            : sign > 0
              ? q.r
              : -q.l;
        if (margin === 0)
          mid =
            sign *
            Math.max(sign * mid, rim + clearance);
      }
    }
    const raw = simplify([
      s,
      u,
      { ...u, [along]: mid },
      { ...v, [along]: mid },
      v,
      t,
    ]);
    const arc =
      step || s.side !== t.side
        ? rounded(raw, step ? radius : 38)
        : archCurve(s, t, mid);
    if (safe(arc))
      return {
        ...make(arc, raw.length - 2),
        spine: raw,
      };
  }
  if (step && opposite) {
    // Slide the middle leg to the nearest clear strip before adding bends.
    const lo = Math.min(u[along], v[along]),
      hi = Math.max(u[along], v[along]);
    const mid = (lo + hi) / 2;
    const levels = new Set([lo, hi]);
    for (const q of padded.filter((box) => {
      const lower = axis === "x" ? box.l : box.t,
        upper = axis === "x" ? box.r : box.b;
      return (
        upper >= Math.min(s[axis], t[axis]) &&
        lower <= Math.max(s[axis], t[axis])
      );
    }))
      for (const wall of along === "x"
        ? [q.l, q.r]
        : [q.t, q.b]) {
        if (wall >= lo && wall <= hi)
          levels.add(wall);
      }
    const walls = [...levels].sort(
      (a, b) => a - b,
    );
    const centers = walls
      .slice(1)
      .map(
        (upper, i) =>
          (upper + required(walls[i])) / 2,
      );
    const byDistance = (a: number, b: number) =>
      Math.abs(a - mid) - Math.abs(b - mid);
    for (const level of [
      ...centers.sort(byDistance),
      ...walls.sort(byDistance),
    ]) {
      const core = [
        u,
        { ...u, [along]: level },
        { ...v, [along]: level },
        v,
      ];
      if (!free(core, padded)) continue;
      const spine = simplify([s, ...core, t]);
      const path = rounded(spine, radius);
      if (free(path, boxes))
        return {
          ...make(path, spine.length - 2),
          spine,
        };
    }
  }
  if (
    step &&
    opposite &&
    Math.abs(t[axis] - s[axis]) > forward * 0.5 &&
    forward > 64
  ) {
    const bend = Math.min(48, forward * 0.28);
    const left = move(s, s.side, bend),
      right = move(t, t.side, bend);
    const middle = (s[axis] + t[axis]) / 2;
    const raw = simplify([
      s,
      left,
      { ...left, [axis]: middle },
      { ...right, [axis]: middle },
      right,
      t,
    ]);
    const arc = rounded(raw, radius);
    if (safe(arc))
      return {
        ...make(arc, raw.length - 2),
        spine: raw,
      };
  }
  // Use a consistently oriented normal so reversing an edge keeps
  // the preferred side of the same physical obstacle.
  const dx = v.x - u.x,
    dy = v.y - u.y;
  const orientation =
    (Math.abs(dx) >= Math.abs(dy)
      ? Math.sign(dx)
      : -Math.sign(dy)) || 1;
  const nx = (-dy * orientation) / (room || 1),
    ny = (dx * orientation) / (room || 1);
  const cornerAllowed = (p: Point, q: Box) => {
    if (
      q.id === edge.source ||
      q.id === edge.target ||
      !cuts(u, v, q)
    )
      return true;
    const wall =
      foreign.find((b) => b.id === q.id) ?? q;
    const x = (wall.l + wall.r) / 2,
      y = (wall.t + wall.b) / 2;
    const signed =
      (x - u.x) * nx + (y - u.y) * ny;
    const sign = centerSign(
      signed,
      clearance,
      q.id,
      edge,
    );
    return (
      sign * ((p.x - x) * nx + (p.y - y) * ny) <=
      0
    );
  };
  if (
    !step &&
    vertical(s.side) !== vertical(t.side)
  ) {
    for (const fraction of [1, 0.5, 0.25]) {
      const walls =
        fraction === 1
          ? padded
          : padded.map((p, i) => {
              const q = required(boxes[i]);
              return {
                id: q.id,
                l: q.l + (p.l - q.l) * fraction,
                r: q.r + (p.r - q.r) * fraction,
                t: q.t + (p.t - q.t) * fraction,
                b: q.b + (p.b - q.b) * fraction,
              };
            });
      const core =
        search(
          u,
          v,
          walls,
          false,
          true,
          cornerAllowed,
        ) ?? search(u, v, walls, false, true);
      if (!core || core.length < 3) continue;
      const path = [
        s,
        ...throughKnots(core, s.side, t.side),
        t,
      ];
      if (
        free(path, boxes) &&
        (fraction === 1 ||
          free(
            path,
            foreign.map((q) =>
              inflate(
                q,
                Math.min(
                  7,
                  clearance,
                  pointGap(s, q),
                  pointGap(t, q),
                ),
              ),
            ),
          )) &&
        !crossesItself(path)
      )
        return make(path, core.length - 2);
    }
  }
  for (const buffer of [
    padded,
    boxes,
    boxes.filter(
      (q) => !cuts(u, u, q) && !cuts(v, v, q),
    ),
  ]) {
    const core =
      search(
        u,
        v,
        buffer,
        step,
        false,
        cornerAllowed,
      ) ?? search(u, v, buffer, step);
    if (!core) continue;
    const raw = simplify([s, ...core, t]);
    if (!step) {
      const smooth = [
        s,
        ...throughKnots(core, s.side, t.side),
        t,
      ];
      if (safe(smooth) && !crossesItself(smooth))
        return make(smooth, raw.length - 2);
    }
    const arc = rounded(raw, step ? radius : 36);
    const path = free(arc, boxes) ? arc : raw;
    if (step)
      return {
        ...make(path, raw.length - 2),
        spine: raw,
      };
    return make(
      fair(
        path,
        s.side,
        t.side,
        boxes.map((q) =>
          q.id === edge.source ||
          q.id === edge.target
            ? q
            : inflate(
                q,
                Math.min(
                  6,
                  clearance,
                  pointGap(s, q),
                  pointGap(t, q),
                ),
              ),
        ),
      ),
      raw.length - 2,
    );
  }
  throw new Error(
    "No free path between socket stems",
  );
};

const pathLength = (path: readonly Point[]) =>
  path.reduce(
    (sum, p, i) =>
      sum +
      (i
        ? distance(required(path[i - 1]), p)
        : 0),
    0,
  );
export const basePath = (
  edge: Edge,
  s: Socket,
  t: Socket,
  boxes: Box[],
  clearance: number,
  radius: number,
): Base => {
  const base = routeBase(
    edge,
    s,
    t,
    boxes,
    clearance,
    radius,
  );
  if (
    edge.waypoints?.length ||
    edge.source === edge.target ||
    base.corners < 4
  )
    return base;
  const length = pathLength(base.points);
  if (length < distance(s, t) * 1.25) return base;
  // Choose a shorter corridor before sibling lanes acquire their offsets.
  const walls = boxes.map((q) =>
    q.id === edge.source || q.id === edge.target
      ? q
      : inflate(q, Math.min(clearance, 7)),
  );
  let best = base,
    limit = length * 0.84;
  for (const spine of shortcuts(
    s,
    t,
    boxes,
    edge.source,
    edge.target,
    base.spine,
  )) {
    const cost = pathLength(spine);
    if (cost >= limit) continue;
    const path = rounded(
      spine,
      edge.route === "step" ? radius : 32,
    );
    if (!free(path, walls) || crossesItself(path))
      continue;
    best = {
      ...materialize(
        edge,
        s,
        t,
        path,
        spine.length - 2,
      ),
      spine,
    };
    limit = cost;
  }
  return best;
};
