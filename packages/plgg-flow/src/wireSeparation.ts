import { shortcuts } from "plgg-flow/wireShortcuts";
import { mendFans } from "plgg-flow/wireFanRepair";
import { fitCurves } from "plgg-flow/wireSpline";
import {
  profile,
  chordGap,
  conflict,
} from "plgg-flow/wireInteraction";
import { type Point } from "plgg-board";
import { type Side } from "plgg-flow/nodeBody";
import {
  vertical,
  required,
  pt,
  distance,
  crossesItself,
  rounded,
  normal,
  move,
  free,
  inflate,
  simplify,
  type Box,
} from "plgg-flow/wireGeometry";
import {
  type Base,
  type Socket,
  archCurve,
} from "plgg-flow/wireBase";
import type { planPorts } from "./wirePorts";
import { curvedChannels } from "plgg-flow/wireChannels";
import { materialize } from "plgg-flow/wirePath";
// Two tangent arcs enter a parallel lane without two full right-angle turns.
const socketJog = (
  s: Socket,
  delta: number,
  radius: number,
  reach: number,
  width: number,
) => {
  if (!delta || radius <= 0) return [s];
  const amount = Math.abs(delta);
  // Outer lanes turn first. Inner shoulders use progressively larger circles.
  let entrance = Math.min(
    reach / 2,
    width || radius,
  );
  let r = Math.min(radius, reach - entrance);
  if (amount <= 20) {
    // Shallow offsets need a longer shoulder to avoid doubling the turn at both ends.
    const along = Math.min(
      reach,
      Math.max(
        20,
        (amount < 16 ? 34 : 27) - amount / 5,
      ),
    );
    entrance =
      (along * along + amount * amount) /
      (4 * amount);
    r = entrance;
  }
  const requested = Math.acos(
    Math.max(0, 1 - amount / (entrance + r)),
  );
  let count = Math.max(
    1,
    Math.ceil((requested * 12) / Math.PI),
  );
  if (amount <= 20) {
    // Use the shallowest pair of arcs that fits between the stem and its first bend.
    for (let k = 1; k < count; k++) {
      const theta = (k * Math.PI) / 12,
        reachNeeded =
          amount / Math.tan(theta / 2);
      const arcLength =
        (amount * theta) / (1 - Math.cos(theta));
      if (
        reachNeeded <= Math.min(48, reach) &&
        (arcLength * (k - 1)) / k < 26
      ) {
        count = k;
        break;
      }
    }
  }
  const angle = (count * Math.PI) / 12;
  if (count < 6 || amount < entrance + r) {
    const scale =
      amount /
      ((1 - Math.cos(angle)) * (entrance + r));
    entrance *= scale;
    r *= scale;
  }
  const along = (entrance + r) * Math.sin(angle);
  const arc = (k: number, r: number) => {
    const a = (k / count) * angle;
    return {
      x: r * Math.sin(a),
      y: Math.sign(delta) * r * (1 - Math.cos(a)),
    };
  };
  const path = [s, move(s, s.side, 14)];
  for (let j = 1; j <= 2 * count; j++) {
    if (
      j === count + 1 &&
      amount > entrance + r &&
      angle === Math.PI / 2
    ) {
      const q = arc(count, r);
      path.push(
        move(
          s,
          s.side,
          14 + along - q.x,
          delta - q.y,
        ),
      );
    }
    const q = arc(
      j <= count ? j : 2 * count - j,
      j <= count ? entrance : r,
    );
    path.push(
      move(
        s,
        s.side,
        14 + (j <= count ? q.x : along - q.x),
        j <= count ? q.y : delta - q.y,
      ),
    );
  }
  // Keep the chord direction when a shallow arc needs a larger radius.
  return path.flatMap((p, i) => {
    const q = path[i - 1];
    if (!q || q.x === p.x || q.y === p.y)
      return [p];
    const count = Math.ceil(
      distance(q, p) /
        (2 * radius * Math.sin(Math.PI / 24)),
    );
    return Array.from({ length: count }, (_, j) =>
      pt(
        q.x + ((p.x - q.x) * (j + 1)) / count,
        q.y + ((p.y - q.y) * (j + 1)) / count,
      ),
    );
  });
};
// Leave room for the next bend when a short channel compresses the fan.
const busJog = (
  socket: Socket,
  offset: number,
  radius: number,
  reach: number,
  setback = 0,
) => {
  if (!offset || reach <= 0) return [socket];
  const r = Math.min(
    radius,
    Math.abs(offset) / 2,
    reach / 4,
  );
  const stem =
    14 + Math.min(reach - 2 * r, setback);
  const end = stem + 2 * r;
  const points: Point[] = [socket];
  for (let i = 0; i <= 6; i++) {
    const angle = (i * Math.PI) / 12;
    points.push(
      move(
        socket,
        socket.side,
        stem + r * Math.sin(angle),
        Math.sign(offset) *
          r *
          (1 - Math.cos(angle)),
      ),
    );
  }
  for (let i = 6; i >= 0; i--) {
    const angle = (i * Math.PI) / 12;
    points.push(
      move(
        socket,
        socket.side,
        end - r * Math.sin(angle),
        offset -
          Math.sign(offset) *
            r *
            (1 - Math.cos(angle)),
      ),
    );
  }
  return points;
};
export const separate = (
  bases: Base[],
  ports: ReturnType<typeof planPorts>,
  boxes: Box[],
  radius: number,
) => {
  const runs = bases.flatMap((w, index) =>
    (w.spine ?? []).slice(1).map((b, j) => {
      const a = required(w.spine?.[j]);
      const axis: "x" | "y" =
          Math.abs(a.x - b.x) <
          Math.abs(a.y - b.y)
            ? "x"
            : "y",
        along = axis === "x" ? "y" : "x";
      return {
        index,
        socket:
          j === 0
            ? w.edge.source
            : j === required(w.spine).length - 2
              ? w.edge.target
              : undefined,
        j,
        axis,
        level: a[axis],
        hand:
          Math.sign(b[along] - a[along]) *
          (axis === "x" ? -1 : 1),
        lo: Math.min(a[along], b[along]),
        hi: Math.max(a[along], b[along]),
        arch:
          w.sourceSide === w.targetSide &&
          w.spine?.length === 4 &&
          j === 1
            ? normal[w.sourceSide][axis]
            : 0,
        heading:
          j === 0
            ? w.target[axis] - a[axis]
            : j === required(w.spine).length - 2
              ? w.source[axis] - a[axis]
              : 0,
      };
    }),
  );
  // Allocate one order throughout overlapping stretches of a channel.
  const byRun = new Map<
    (typeof runs)[number],
    number
  >();
  const visited = new Set<
    (typeof runs)[number]
  >();
  const shares = (
    p: (typeof runs)[number],
    q: (typeof runs)[number],
  ) =>
    p.axis === q.axis &&
    Math.abs(p.level - q.level) < 7 &&
    Math.min(p.hi, q.hi) - Math.max(p.lo, q.lo) >
      (p.socket && p.socket === q.socket
        ? 1
        : 14);
  const groups: (typeof runs)[] = [];
  for (const first of runs) {
    if (visited.has(first)) continue;
    const group = [first];
    visited.add(first);
    for (const r of group)
      for (const q of runs)
        if (!visited.has(q) && shares(r, q)) {
          visited.add(q);
          group.push(q);
        }
    if (group.length < 2) continue;
    // Follow equal bends until the branches leave on different sides.
    const exitOrder = (
      p: (typeof runs)[number],
      q: (typeof runs)[number],
      direction: number,
    ) => {
      const branch = (
        r: (typeof runs)[number],
      ) => {
        const path = required(
          required(bases[r.index]).spine,
        );
        const along = r.axis === "x" ? "y" : "x";
        const forward =
          (required(path[r.j + 1])[along] -
            required(path[r.j])[along]) *
            direction >
          0;
        return {
          path,
          j: forward ? r.j + 1 : r.j,
          step: forward ? 1 : -1,
        };
      };
      const a = branch(p),
        b = branch(q);
      let axis = p.axis,
        sign = 1;
      for (;;) {
        const along = axis === "x" ? "y" : "x";
        const x = required(a.path[a.j]),
          y = required(b.path[b.j]);
        const next = a.path[a.j + a.step],
          other = b.path[b.j + b.step];
        const u = Math.sign(
            (next?.[axis] ?? x[axis]) - x[axis],
          ),
          v = Math.sign(
            (other?.[axis] ?? y[axis]) - y[axis],
          );
        const diff =
          (x[along] - y[along]) * direction;
        if (Math.abs(diff) > 0.01)
          return sign * (diff < 0 ? u : -v);
        if (u !== v || !next || !other)
          return sign * (u - v);
        sign *= -direction * u;
        direction = u;
        axis = along;
        a.j += a.step;
        b.j += b.step;
      }
    };
    const order = (
      p: (typeof runs)[number],
      q: (typeof runs)[number],
    ) => {
      const left = exitOrder(p, q, -1),
        right = exitOrder(p, q, 1);
      return (
        (p.arch && p.arch === q.arch
          ? p.arch * (q.lo - p.lo || p.hi - q.hi)
          : 0) ||
        p.level - q.level ||
        left + right ||
        left ||
        p.heading - q.heading ||
        (p.index - q.index) *
          (p.hand === q.hand ? p.hand : 1) ||
        p.j - q.j
      );
    };
    group.sort(order);
    // Transitive channel groups can contain disjoint runs. Repair touching neighbours first.
    for (let pass = 0; pass < 3; pass++) {
      let changed = false;
      for (let j = 1; j < group.length; j++) {
        const p = required(group[j - 1]),
          q = required(group[j]);
        if (shares(p, q) && order(p, q) > 0) {
          group[j - 1] = q;
          group[j] = p;
          changed = true;
        }
      }
      if (!changed) break;
    }
    groups.push(group);
    const ranks = group.map(() => 0);
    let anchor: number | undefined;
    const limits: {
      rank: number;
      low: number;
      high: number;
    }[] = [];
    for (const [j, r] of group.entries()) {
      for (let k = 0; k < j; k++)
        if (shares(r, required(group[k])))
          ranks[j] = Math.max(
            ranks[j] ?? 0,
            (ranks[k] ?? 0) + 1,
          );
      const wire = required(bases[r.index]),
        spine = required(wire.spine);
      if (spine.length === 2) anchor = j;
      let low = -Infinity,
        high = Infinity;
      // A wall limits the bundle only along the part that faces it.
      for (const box of boxes) {
        const lo = r.axis === "x" ? box.t : box.l,
          hi = r.axis === "x" ? box.b : box.r;
        if (
          Math.min(r.hi, hi) -
            Math.max(r.lo, lo) <=
          0
        )
          continue;
        const left =
            r.axis === "x" ? box.l : box.t,
          right = r.axis === "x" ? box.r : box.b;
        if (right <= r.level)
          low = Math.max(
            low,
            right + Math.min(10, r.level - right),
          );
        if (left >= r.level)
          high = Math.min(
            high,
            left - Math.min(10, left - r.level),
          );
      }
      for (const [socket, side] of [
        [
          r.j === 1 ? wire.source : undefined,
          wire.sourceSide,
        ],
        [
          r.j === spine.length - 3
            ? wire.target
            : undefined,
          wire.targetSide,
        ],
      ] satisfies [Point | undefined, Side][]) {
        if (!socket) continue;
        const sign = normal[side][r.axis];
        const stem = Math.min(
          14,
          Math.abs(r.level - socket[r.axis]),
        );
        if (sign > 0)
          low = Math.max(
            low,
            socket[r.axis] + stem,
          );
        if (sign < 0)
          high = Math.min(
            high,
            socket[r.axis] - stem,
          );
      }
      limits.push({
        low,
        high,
        rank: required(ranks[j]),
      });
    }
    const top = Math.max(...ranks);
    let pitch = 10;
    for (const lower of limits)
      for (const upper of limits) {
        if (upper.rank > lower.rank)
          pitch = Math.min(
            pitch,
            (upper.high - lower.low) /
              (upper.rank - lower.rank),
          );
      }
    pitch = Math.max(6, pitch);
    const low = Math.max(
        ...limits.map(
          (r) => r.low - r.rank * pitch,
        ),
      ),
      high = Math.min(
        ...limits.map(
          (r) => r.high - r.rank * pitch,
        ),
      );
    const middle = required(
      group[Math.floor(group.length / 2)],
    ).level;
    const centre = middle - (top * pitch) / 2;
    const origin =
      anchor === undefined
        ? Math.max(low, Math.min(high, centre))
        : required(group[anchor]).level -
          required(ranks[anchor]) * pitch;
    group.forEach((r, j) =>
      byRun.set(
        r,
        (ranks[j] ?? 0) * pitch +
          origin -
          r.level,
      ),
    );
  }
  // A displaced corner can extend into a second bundle.
  const ordered = bases.map((_, i) =>
    runs.filter((r) => r.index === i),
  );
  for (let pass = 0; pass < 3; pass++) {
    const shifted = runs.map((r) => {
      const w = required(bases[r.index]),
        raw = required(w.spine),
        first = required(raw[r.j]),
        last = required(raw[r.j + 1]);
      const along = r.axis === "x" ? "y" : "x";
      const sibling = required(ordered[r.index]);
      const delta = (j: number) => {
        const run = sibling[j];
        return run ? (byRun.get(run) ?? 0) : 0;
      };
      const a = first[along] + delta(r.j - 1),
        b = last[along] + delta(r.j + 1);
      const fixed =
        raw.length === 2 ||
        ((r.j === 0 || r.j === raw.length - 2) &&
          Math.abs(b - a) <= 22);
      return {
        r,
        lo: Math.min(a, b),
        hi: Math.max(a, b),
        level: r.level + delta(r.j),
        fixed,
      };
    });
    let changed = false;
    for (const [j, p] of shifted.entries())
      for (let k = 0; k < j; k++) {
        const q = required(shifted[k]);
        if (
          p.r.index === q.r.index ||
          p.r.axis !== q.r.axis ||
          Math.min(p.hi, q.hi) -
            Math.max(p.lo, q.lo) <
            20 ||
          (p.fixed && q.fixed)
        )
          continue;
        const gap = p.level - q.level;
        if (Math.abs(gap) >= 6) continue;
        const sign =
          Math.sign(gap) ||
          Math.sign(p.r.level - q.r.level) ||
          Math.sign(p.r.heading - q.r.heading) ||
          1;
        const push =
          (sign * (8 - Math.abs(gap))) /
          (p.fixed || q.fixed ? 1 : 2);
        if (!p.fixed) {
          p.level += push;
          byRun.set(p.r, p.level - p.r.level);
        }
        if (!q.fixed) {
          q.level -= push;
          byRun.set(q.r, q.level - q.r.level);
        }
        changed = true;
      }
    if (!changed) break;
  }
  // Bends reached from the same stem can exchange axial slots within their clear fan.
  const elbows = new Map<
    string,
    {
      r: (typeof runs)[number];
      depth: number;
      sign: number;
    }[]
  >();
  for (const r of runs) {
    const w = required(bases[r.index]),
      raw = w.spine;
    if (
      !raw ||
      w.edge.route !== "step" ||
      raw.length < 4 ||
      !r.socket
    )
      continue;
    const end = r.j !== 0,
      step = end ? -1 : 1,
      j = end ? r.j : r.j + 1;
    const run = required(ordered[r.index])[
        r.j + step
      ],
      next = raw[j + 2 * step];
    if (!run || !next) continue;
    const corner = required(raw[j]),
      turn = required(raw[j + step]),
      root = end ? w.target : w.source;
    const sign = Math.sign(
        corner[run.axis] - root[run.axis],
      ),
      depth = turn[r.axis] - root[r.axis];
    if (
      (next[run.axis] - turn[run.axis]) * sign <=
      0
    )
      continue;
    const key = JSON.stringify([
      r.socket,
      r.axis,
      sign,
      Math.sign(depth),
    ]);
    const peers = elbows.get(key) ?? [];
    peers.push({
      r: run,
      depth: Math.abs(depth),
      sign,
    });
    elbows.set(key, peers);
  }
  for (const peers of elbows.values()) {
    if (peers.length < 2) continue;
    const sign = required(peers[0]).sign;
    const slots = peers
      .map(
        ({ r }) => r.level + (byRun.get(r) ?? 0),
      )
      .sort((a, b) => (a - b) * sign);
    peers.sort((a, b) => b.depth - a.depth);
    const fits = peers.every(({ r }, j) => {
      const w = required(bases[r.index]),
        raw = required(w.spine),
        a = required(raw[r.j]),
        b = required(raw[r.j + 1]),
        level = required(slots[j]);
      return free(
        [
          required(raw[r.j - 1]),
          { ...a, [r.axis]: level },
          { ...b, [r.axis]: level },
          required(raw[r.j + 2]),
        ],
        boxes,
      );
    });
    if (fits)
      peers.forEach(({ r }, j) =>
        byRun.set(
          r,
          required(slots[j]) - r.level,
        ),
      );
  }
  for (const group of groups) {
    const sockets = new Map<
      string,
      typeof runs
    >();
    for (const run of group) {
      if (
        !run.socket ||
        bases[run.index]?.edge.route !== "step"
      )
        continue;
      const g = sockets.get(run.socket) ?? [];
      g.push(run);
      sockets.set(run.socket, g);
    }
    for (const fan of sockets.values()) {
      if (
        fan.length < 2 ||
        fan.some(
          (r) =>
            bases[r.index]?.spine?.length === 2,
        )
      )
        continue;
      const levels = fan
        .map((r) => r.level + (byRun.get(r) ?? 0))
        .sort((a, b) => a - b);
      const bend = (r: (typeof runs)[number]) => {
        const raw = required(
            required(bases[r.index]).spine,
          ),
          end = r.j !== 0;
        const n = required(ordered[r.index])[
            r.j + (end ? -1 : 1)
          ],
          point = required(
            raw[end ? r.j : r.j + 1],
          ),
          root = required(
            raw[end ? r.j + 1 : r.j],
          );
        const side = Math.sign(
          required(raw[end ? r.j - 1 : r.j + 2])[
            r.axis
          ] - point[r.axis],
        );
        const along = r.axis === "x" ? "y" : "x",
          depth = Math.abs(
            point[along] +
              (n ? (byRun.get(n) ?? 0) : 0) -
              root[along],
          );
        return { side, depth };
      };
      fan.sort((p, q) => {
        const a = bend(p),
          b = bend(q);
        return (
          a.side - b.side ||
          a.side * (b.depth - a.depth) ||
          p.heading - q.heading
        );
      });
      fan.forEach((r, j) =>
        byRun.set(
          r,
          required(levels[j]) - r.level,
        ),
      );
    }
  }
  // Spread only shoulders whose natural fan leaves less than one lane.
  const fans = new Map<
    string,
    {
      i: number;
      start: boolean;
      position: number;
      angle: number;
      exit: number;
    }[]
  >();
  const shoulders = bases.map(() => ({
    start: 0,
    end: 0,
  }));
  for (const [i, w] of bases.entries())
    for (const start of [true, false]) {
      const p = start ? w.source : w.target,
        side = start
          ? w.sourceSide
          : w.targetSide,
        far = start ? w.target : w.source;
      const axis = vertical(side) ? "x" : "y";
      const samples = start
        ? w.points
        : [...w.points].reverse();
      const tip =
        samples.find(
          (q) => distance(p, q) >= 52,
        ) ?? far;
      const position =
        ((tip[axis] - p[axis]) * 52) /
        Math.max(1, distance(p, tip));
      const plan = required(ports.plans[i]);
      const angle = start
        ? plan.a.rank
        : plan.b.rank;
      const key = JSON.stringify([
        start ? w.edge.source : w.edge.target,
        side,
      ]);
      const group = fans.get(key) ?? [];
      const branch =
        samples.find(
          (q) => distance(p, q) >= 110,
        ) ?? far;
      const exit =
        (branch[axis] - p[axis]) /
        Math.max(1, distance(p, branch));
      group.push({
        i,
        start,
        position,
        angle,
        exit,
      });
      fans.set(key, group);
    }
  for (const group of fans.values()) {
    group.sort(
      (a, b) =>
        a.exit - b.exit ||
        a.angle - b.angle ||
        a.position - b.position,
    );
    // Pool adjacent shoulders until their centres are a pitch apart.
    const blocks: {
      sum: number;
      count: number;
    }[] = [];
    // Larger fans need their neighbours separated before the shoulder is fully extended.
    const pitch =
      10 +
      Math.min(
        3,
        Math.max(0, group.length - 3) * 0.5,
      );
    group.forEach((end, j) => {
      let sum = end.position - j * pitch,
        count = 1;
      while (blocks.length) {
        const last = required(
          blocks[blocks.length - 1],
        );
        if (last.sum / last.count <= sum / count)
          break;
        sum += last.sum;
        count += last.count;
        blocks.pop();
      }
      blocks.push({ sum, count });
    });
    let j = 0;
    for (const block of blocks)
      for (let k = 0; k < block.count; k++, j++) {
        const end = required(group[j]);
        required(shoulders[end.i])[
          end.start ? "start" : "end"
        ] =
          block.sum / block.count +
          j * pitch -
          end.position;
      }
  }
  // Relax nested arch levels continuously when an obstacle releases a shared channel.
  const arches = runs.filter(
    (r) =>
      r.arch &&
      bases[r.index]?.edge.route !== "step",
  );
  const archLevels = new Map(
    arches.map((r) => [r, r.level]),
  );
  const bands = arches.flatMap((p, i) =>
    arches.slice(i + 1).flatMap((q) => {
      if (p.arch !== q.arch || p.axis !== q.axis)
        return [];
      const overlap =
          Math.min(p.hi, q.hi) -
          Math.max(p.lo, q.lo),
        delta = p.level - q.level;
      const weight =
        Math.min(1, Math.max(0, overlap / 18)) *
        Math.min(
          1,
          Math.max(
            0,
            (28 - Math.abs(delta)) / 16,
          ),
        );
      if (!weight) return [];
      const order =
        Math.sign(
          p.arch * (q.lo - p.lo || p.hi - q.hi),
        ) || Math.sign(p.index - q.index);
      const gap = order * delta;
      return [
        {
          p,
          q,
          order,
          space:
            gap + weight * Math.max(0, 10 - gap),
        },
      ];
    }),
  );
  for (let pass = 0; pass < 10; pass++) {
    let moved = false;
    for (const { p, q, order, space } of bands) {
      const a = required(archLevels.get(p)),
        b = required(archLevels.get(q));
      const shift = (space - (a - b) * order) / 2;
      if (shift < 0.01) continue;
      archLevels.set(p, a + order * shift);
      archLevels.set(q, b - order * shift);
      moved = true;
    }
    if (!moved) break;
  }
  const fanWidths = new Map<string, number>();
  const firstLanes = new Map<string, number>();
  for (const r of runs)
    if (r.socket) {
      const wire = required(bases[r.index]);
      const offset = byRun.get(r) ?? 0,
        key = JSON.stringify([
          r.socket,
          r.j === 0
            ? wire.sourceSide
            : wire.targetSide,
          Math.sign(offset),
        ]);
      firstLanes.set(
        key,
        Math.min(
          firstLanes.get(key) ?? Infinity,
          Math.abs(offset),
        ),
      );
      fanWidths.set(
        key,
        Math.max(
          fanWidths.get(key) ?? 0,
          Math.abs(offset),
        ),
      );
    }

  // A bend between two facing fans can move by half their allocated lane span.
  const bendLimits = bases.map((w, i) => {
    const { a, b } = required(ports.plans[i]);
    const facing =
      w.spine?.length === 4 &&
      a.side !== b.side &&
      vertical(a.side) === vertical(b.side);
    const compact =
      facing &&
      a.count > 1 &&
      b.count > 1 &&
      distance(w.source, w.target) < 200;
    const span = Math.max(
      7,
      (Math.max(a.count, b.count) - 1) * 5,
    );
    return { facing, compact, span };
  });
  // The facing wall bounds the space available for staggered branches.
  const stemRoom = (
    socket: Point,
    side: Side,
  ) => {
    let gap = Infinity;
    const upright = vertical(side),
      across = upright ? socket.x : socket.y;
    for (const box of boxes) {
      if (
        across < (upright ? box.l : box.t) ||
        across > (upright ? box.r : box.b)
      )
        continue;
      const d =
        side === "right"
          ? box.l - socket.x
          : side === "left"
            ? socket.x - box.r
            : side === "bottom"
              ? box.t - socket.y
              : socket.y - box.b;
      if (d >= 0) gap = Math.min(gap, d);
    }
    return gap / 2;
  };
  const room = bases.map((w) => [
    stemRoom(w.source, w.sourceSide),
    stemRoom(w.target, w.targetSide),
  ]);
  const render = (
    w: Base,
    i: number,
    guides?: Point[][],
  ) => {
    const { edge, a, b } = required(
      ports.plans[i],
    );
    if (
      edge.waypoints?.length ||
      edge.source === edge.target
    )
      return w;
    const pair = required(
      ports.parallels.get(
        JSON.stringify(
          [edge.source, edge.target].sort(),
        ),
      ),
    );
    const reciprocal =
      pair.length === 2 &&
      pair[0]?.source !== pair[1]?.source;
    const s = { ...w.source, side: a.side },
      t = { ...w.target, side: b.side };
    const across = vertical(a.side) ? "x" : "y";
    const flat =
      a.side !== b.side &&
      vertical(a.side) === vertical(b.side) &&
      w.points.every(
        (p) =>
          Math.abs(p[across] - s[across]) < 1e-6,
      );
    let centre = (pair.length - 1) / 2;
    if (flat && pair.length > 2) {
      // Leave the outside of a straight bundle free for the adjacent fan.
      let demand = 0;
      for (const other of bases) {
        if (pair.includes(other.edge)) continue;
        for (const end of [true, false]) {
          const root = end
            ? other.source
            : other.target;
          if (
            ![s, t].some(
              (p) => distance(p, root) < 1,
            )
          )
            continue;
          const points = end
            ? other.points
            : [...other.points].reverse();
          const exit =
            points.find(
              (q) => distance(root, q) > 40,
            ) ??
            required(points[points.length - 1]);
          demand += Math.sign(
            exit[across] - root[across],
          );
        }
      }
      centre = Math.max(
        0,
        Math.min(
          pair.length - 1,
          Math.round(centre + demand / 2),
        ),
      );
      const single = pair.findIndex(
        (e) =>
          pair.filter(
            (p) => p.source === e.source,
          ).length === 1,
      );
      if (single >= 0) centre = single;
    }
    const peer = reciprocal
      ? bases.find(
          (v) =>
            v.edge ===
            pair.find((e) => e !== edge),
        )
      : undefined;
    const sameSockets =
      !peer ||
      (distance(peer.source, t) < 1 &&
        distance(peer.target, s) < 1);
    const spread = reciprocal
      ? 2.9 +
        7.1 *
          Math.min(
            1,
            Math.abs(t[across] - s[across]) / 24,
          )
      : 10;
    const lens = sameSockets
      ? (pair.indexOf(edge) - centre) * spread
      : 0;
    if (flat && !lens) return w;
    if (w.spine && !flat) {
      const raw = w.spine;
      const offsets = runs
        .filter((r) => r.index === i)
        .map((r) => byRun.get(r) ?? 0);
      const { compact, span } = required(
        bendLimits[i],
      );
      if (edge.route === "step" && compact)
        offsets[1] = Math.min(
          span,
          Math.max(-span, offsets[1] ?? 0),
        );
      if (
        edge.route !== "step" &&
        s.side === t.side &&
        raw.length === 4
      ) {
        const along = vertical(s.side)
          ? "y"
          : "x";
        const level = required(raw[1])[along],
          run = required(required(ordered[i])[1]),
          delta =
            (archLevels.get(run) ?? level) -
            level;
        for (const scale of [1, 0.65, 0.35, 0]) {
          const path = archCurve(
            s,
            t,
            level + delta * scale,
            level,
          );
          if (free(path, boxes))
            return materialize(
              edge,
              s,
              t,
              path,
              2,
            );
        }
        return w;
      }
      // Extend a short stem before reducing its corner radius.
      for (const [j, side, reach, end] of [
        [
          1,
          s.side,
          distance(s, required(raw[1])),
          0,
        ],
        [
          raw.length - 3,
          t.side,
          distance(
            t,
            required(raw[raw.length - 2]),
          ),
          1,
        ],
      ] satisfies [
        number,
        Side,
        number,
        number,
      ][]) {
        if (j < 0 || j >= offsets.length)
          continue;
        const sign = vertical(side)
          ? normal[side].y
          : normal[side].x;
        const shift = Math.abs(
          offsets[
            end === 0 ? 0 : offsets.length - 1
          ] ?? 0,
        );
        const stem =
          edge.route === "step" && shift
            ? Math.max(
                Math.min(14, reach),
                Math.min(
                  required(
                    required(room[i])[end],
                  ),
                  14 +
                    Math.min(shift, 2 * radius),
                ),
              )
            : Math.min(14, reach);
        offsets[j] =
          sign *
          Math.max(
            stem - reach,
            sign * (offsets[j] ?? 0),
          );
      }
      for (const scale of [1, 0.65, 0.35]) {
        if (!offsets.some(Boolean)) break;
        const path: Point[] = [s];
        for (let j = 0; j < raw.length - 1; j++) {
          const a = required(raw[j]),
            b = required(raw[j + 1]),
            axis =
              Math.abs(a.x - b.x) <
              Math.abs(a.y - b.y)
                ? "x"
                : "y",
            along = axis === "x" ? "y" : "x";
          const delta = (offsets[j] ?? 0) * scale;
          if (j === 0 && delta) {
            const tip = move(s, s.side, 14);
            path.push(tip, {
              ...tip,
              [axis]: tip[axis] + delta,
            });
          }
          if (j === raw.length - 2) {
            if (delta) {
              const tip = move(t, t.side, 14);
              path.push(
                {
                  ...tip,
                  [axis]: tip[axis] + delta,
                },
                tip,
              );
            }
            path.push(t);
          } else
            path.push({
              ...b,
              [axis]: b[axis] + delta,
              [along]:
                b[along] +
                (offsets[j + 1] ?? 0) * scale,
            });
        }
        if (guides) guides.push(simplify(path));
        const first = (offsets[0] ?? 0) * scale,
          last =
            (offsets[offsets.length - 1] ?? 0) *
            scale;
        const mid = path.slice(
          first ? 3 : 1,
          last ? -3 : -1,
        );
        const shoulder = (
          socket: Socket,
          offset: number,
          bend: Point | undefined,
        ) => {
          if (!bend) return [socket];
          const along =
            (bend.x - socket.x) *
              normal[socket.side].x +
            (bend.y - socket.y) *
              normal[socket.side].y;
          const key = JSON.stringify([
            socket === s
              ? w.edge.source
              : w.edge.target,
            socket.side,
            Math.sign(offset),
          ]);
          const spare =
            (fanWidths.get(key) ?? 0) -
            Math.abs(offset);
          const reach = Math.max(0, along - 14);
          if (edge.route === "step")
            return busJog(
              socket,
              offset,
              radius,
              reach,
              Math.min(
                along / 2,
                Math.max(
                  0,
                  Math.abs(offset) -
                    (firstLanes.get(key) ??
                      Math.abs(offset)),
                ) * 0.5,
              ),
            );
          return socketJog(
            socket,
            offset,
            Math.min(8, radius, reach / 2),
            reach,
            Math.min(
              20,
              Math.max(4, 5 + spare * 0.8),
            ),
          );
        };
        const left = shoulder(s, first, mid[0]),
          right = shoulder(
            t,
            last,
            mid[mid.length - 1],
          );
        const l = required(left[left.length - 1]),
          r = required(right[right.length - 1]);
        const ahead = (
          a: Point,
          b: Point,
          side: Side,
        ) =>
          (b.x - a.x) * normal[side].x +
            (b.y - a.y) * normal[side].y >=
          0;
        if (
          mid.length &&
          (!first || left.length > 1) &&
          (!last || right.length > 1) &&
          ahead(l, required(mid[0]), s.side) &&
          ahead(
            r,
            required(mid[mid.length - 1]),
            t.side,
          )
        ) {
          const arc = [
            ...left,
            ...rounded(
              simplify([l, ...mid, r]),
              edge.route === "step" ? radius : 24,
            ).slice(1, -1),
            ...right.reverse(),
          ];
          if (free(arc, boxes))
            return materialize(
              edge,
              s,
              t,
              arc,
              path.length - 2,
            );
        }
        const arc = rounded(
          simplify(path),
          edge.route === "step" ? radius : 24,
        );
        if (free(arc, boxes))
          return materialize(
            edge,
            s,
            t,
            arc,
            path.length - 2,
          );
      }
      return w;
    }
    const { start, end } = required(shoulders[i]);
    if (!start && !end && !lens) return w;
    if (
      !lens &&
      vertical(a.side) === vertical(b.side) &&
      Math.abs(s[across] - t[across]) < 8
    )
      return w;

    const span = distance(s, t);
    if (span < 50) return w;
    const ease = (x: number) => {
      const f = Math.max(0, Math.min(1, x));
      return f * f * (3 - 2 * f);
    };
    if (flat && lens && edge.route !== "step") {
      // A broad lens keeps parallel curves distinct through the middle of a span.
      const n = normal[s.side],
        axis = vertical(s.side) ? "x" : "y";
      const ramp = reciprocal ? 20 : 24,
        stem = reciprocal ? 6 : 14;
      const count = Math.max(
        4,
        Math.ceil(span / 4),
      );
      const path = Array.from(
        { length: count + 1 },
        (_, j) => {
          const f = j / count,
            d = f * span,
            offset =
              lens *
              ease((d - stem) / ramp) *
              ease((span - d - stem) / ramp) *
              (reciprocal
                ? 1
                : 1 + 2.8 * f * (1 - f));
          const p = pt(
            s.x + n.x * d,
            s.y + n.y * d,
          );
          return {
            ...p,
            [axis]: p[axis] + offset,
          };
        },
      );
      if (free(path, boxes))
        return materialize(
          edge,
          s,
          t,
          path,
          w.corners,
        );
    }
    const path = w.points.map((p) => {
      const ds = distance(s, p),
        dt = distance(t, p);
      const shoulder = (
        d: number,
        count: number,
      ) => {
        const reach =
          30 -
          Math.min(8, Math.max(0, count - 3));
        return (
          ease((d - 14) / reach) *
          (1 -
            ease(
              (d - 32) /
                Math.max(40, span * 0.45),
            ))
        );
      };
      const l = flat
          ? 0
          : start * shoulder(ds, a.count),
        r = flat
          ? 0
          : end * shoulder(dt, b.count);
      const offset =
        lens *
        (1 +
          (2.8 * ds * dt) /
            ((ds + dt) * (ds + dt))) *
        ease((ds - 10) / 24) *
        ease((dt - 10) / 24);
      return pt(
        p.x +
          (vertical(a.side) ? l + offset : 0) +
          (vertical(b.side) ? r : 0),
        p.y +
          (vertical(a.side) ? 0 : l + offset) +
          (vertical(b.side) ? 0 : r),
      );
    });
    if (edge.route === "step") {
      if (!flat) return w;
      const shoulder = (p: Socket) =>
        busJog(
          p,
          lens,
          Math.min(radius, 3),
          Math.max(1, span / 2 - 14),
          Math.max(
            0,
            Math.max(
              centre,
              pair.length - 1 - centre,
            ) *
              spread -
              Math.abs(lens),
          ) * 0.45,
        );
      const arc = [
        ...shoulder(s),
        ...shoulder(t).reverse(),
      ];
      if (free(arc, boxes))
        return materialize(edge, s, t, arc, 4);
      return w;
    }
    // Reduce separation where an obstacle pinches the available channel.
    for (const scale of [1, 0.7, 0.4, 0.2]) {
      const shifted =
        scale === 1
          ? path
          : path.map((p, j) => {
              const base = required(w.points[j]);
              return pt(
                base.x + (p.x - base.x) * scale,
                base.y + (p.y - base.y) * scale,
              );
            });
      if (
        free(shifted, boxes) &&
        !crossesItself(shifted)
      )
        return materialize(
          edge,
          s,
          t,
          shifted,
          w.corners,
        );
    }
    return w;
  };
  let wires = bases.map((w, i) => render(w, i));
  for (const [i, w] of wires.entries()) {
    if (
      w.edge.source !== w.edge.target ||
      w.edge.waypoints?.length
    )
      continue;
    const s = { ...w.source, side: w.sourceSide },
      t = { ...w.target, side: w.targetSide };
    const peers = wires
      .filter(
        (q, j) =>
          i !== j &&
          [q.edge.source, q.edge.target].includes(
            w.edge.source,
          ),
      )
      .map(profile);
    const cost = (w: Base) =>
      peers.reduce(
        (sum, p) => sum + conflict(p, profile(w)),
        0,
      );
    let best = cost(w);
    if (best < 1) continue;
    for (const reach of w.edge.route === "step"
      ? [18, 24, 40]
      : [18, 24]) {
      const l = move(s, s.side, reach),
        r = move(t, t.side, reach),
        corner = vertical(s.side)
          ? pt(r.x, l.y)
          : pt(l.x, r.y);
      const arc = rounded(
        [s, l, corner, r, t],
        w.edge.route === "step" ? radius : 24,
      );
      if (!free(arc, boxes)) continue;
      const candidate = materialize(
          w.edge,
          s,
          t,
          arc,
          3,
        ),
        value = cost(candidate);
      if (value + 1 < best) {
        best = value;
        wires[i] = candidate;
      }
    }
  }
  if (
    bases.some((w) => w.edge.route === "step")
  ) {
    const profiles = wires.map(profile);
    const score = (
      p: ReturnType<typeof profile>,
      i: number,
      skip = -1,
    ) =>
      profiles.reduce(
        (sum, q, j) =>
          sum +
          (i === j || skip === j
            ? 0
            : conflict(p, q)),
        0,
      );
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      for (const group of groups) {
        group.sort(
          (a, b) =>
            a.level +
            (byRun.get(a) ?? 0) -
            b.level -
            (byRun.get(b) ?? 0),
        );
        for (let j = 1; j < group.length; j++) {
          const p = required(group[j - 1]),
            q = required(group[j]),
            a = p.index,
            b = q.index;
          if (
            a === b ||
            !shares(p, q) ||
            required(bases[a]).edge.route !==
              "step" ||
            required(bases[b]).edge.route !==
              "step" ||
            bases[a]?.spine?.length === 2 ||
            bases[b]?.spine?.length === 2
          )
            continue;
          const u = required(profiles[a]),
            v = required(profiles[b]),
            old = conflict(u, v);
          if (old < 1) continue;
          const l = byRun.get(p) ?? 0,
            r = byRun.get(q) ?? 0;
          byRun.set(p, q.level + r - p.level);
          byRun.set(q, p.level + l - q.level);
          const x = profile(
              render(required(bases[a]), a),
            ),
            y = profile(
              render(required(bases[b]), b),
            );
          const improvement =
            old - conflict(x, y);
          if (
            improvement > 1 &&
            score(x, a, b) + score(y, b, a) <
              score(u, a, b) +
                score(v, b, a) +
                improvement -
                1
          ) {
            profiles[a] = x;
            profiles[b] = y;
            wires[a] = x.wire;
            wires[b] = y.wire;
            group[j] = p;
            group[j - 1] = q;
            changed = true;
          } else {
            byRun.set(p, l);
            byRun.set(q, r);
          }
        }
      }
      if (!changed) break;
    }
    // Retract shoulders and slide shared bends within the allocated channel.
    const initial = new Map(byRun);
    for (let pass = 0; pass < 2; pass++) {
      let changed = false;
      for (const [i, w] of bases.entries()) {
        const raw = w.spine;
        if (
          w.edge.route !== "step" ||
          !raw ||
          raw.length < 3
        )
          continue;
        const clearance = boxes.map((q) =>
          q.id === w.edge.source ||
          q.id === w.edge.target
            ? q
            : inflate(q, 6),
        );
        const cost = (
          p: ReturnType<typeof profile>,
        ) =>
          score(p, i) +
          p.turn * 1.8 +
          Math.max(0, p.turn - 6.3) * 10 +
          p.length * 0.005;
        const start = required(profiles[i]);
        const penalty = score(start, i);
        if (
          penalty < 2 &&
          (start.turn < 6.6 || raw.length <= 4)
        )
          continue;
        const fan = Math.max(
          ...[w.source, w.target].map(
            (s) =>
              bases.filter((v) =>
                [v.source, v.target].some(
                  (t) =>
                    s.x === t.x && s.y === t.y,
                ),
              ).length,
          ),
        );
        let best = cost(start);
        for (const run of required(ordered[i])) {
          const original = byRun.get(run) ?? 0;
          let picked = original;
          const candidates = new Set([
            0,
            original - 7,
            original + 7,
            original - 4,
            original + 4,
            original - 10,
            original + 10,
          ]);
          if (
            run.j === 1 ||
            run.j === raw.length - 3
          ) {
            for (const [socket, side] of [
              [w.source, w.sourceSide],
              [w.target, w.targetSide],
            ] satisfies [Point, Side][]) {
              const sign = normal[side][run.axis];
              if (sign)
                for (const reach of [18, 28, 38])
                  candidates.add(
                    socket[run.axis] +
                      sign * reach -
                      run.level,
                  );
            }
          }
          // A sibling's next bend marks the usable width of the shared fan.
          const alternatives = new Set<number>();
          const touches = (p: Point, q: Point) =>
            p.x === q.x && p.y === q.y;
          for (const peer of runs) {
            if (
              peer.index === i ||
              peer.axis !== run.axis ||
              run.socket ||
              peer.socket
            )
              continue;
            const other = required(
              bases[peer.index],
            );
            if (
              ![other.source, other.target].some(
                (p) =>
                  touches(p, w.source) ||
                  touches(p, w.target),
              )
            )
              continue;
            if (
              Math.min(peer.hi, run.hi) <=
              Math.max(peer.lo, run.lo)
            )
              continue;
            const level =
              peer.level +
              (byRun.get(peer) ?? 0) -
              run.level;
            if (Math.abs(level - original) > 80)
              continue;
            for (const delta of [-10, 10]) {
              alternatives.add(level + delta);
              candidates.add(level + delta);
            }
          }
          for (const offset of candidates) {
            if (
              offset === original ||
              (!alternatives.has(offset) &&
                Math.abs(
                  offset -
                    (initial.get(run) ?? 0),
                ) > Math.max(7, (fan - 1) * 7))
            )
              continue;
            byRun.set(run, offset);
            const candidate = render(w, i);
            if (
              !free(
                candidate.points,
                clearance,
              ) ||
              crossesItself([...candidate.points])
            )
              continue;
            const next = profile(candidate);
            const value = cost(next);
            if (value + 0.25 < best) {
              best = value;
              picked = offset;
              profiles[i] = next;
              wires[i] = candidate;
              changed = true;
            }
          }
          byRun.set(run, picked);
        }
      }
      if (!changed) break;
    }
    // Move the shoulder and its adjacent bend together when separate swaps conflict.
    for (const group of fans.values()) {
      if (group.length < 2) continue;
      for (const [j, left] of group.entries())
        for (const right of group.slice(j + 1)) {
          const i = left.i,
            k = right.i,
            u = required(profiles[i]),
            v = required(profiles[k]);
          if (
            i === k ||
            u.wire.edge.route !== "step" ||
            v.wire.edge.route !== "step" ||
            conflict(u, v) < 20
          )
            continue;
          const ends = (
            n: number,
            start: boolean,
          ) =>
            start
              ? required(ordered[n])
              : [
                  ...required(ordered[n]),
                ].reverse();
          const a = ends(i, left.start),
            b = ends(k, right.start);
          if (a.length < 3 || b.length < 3)
            continue;
          const pairs = [0, 1].map((j) => [
            required(a[j]),
            required(b[j]),
          ]);
          const orig = pairs.map(([p, q]) => [
            byRun.get(required(p)) ?? 0,
            byRun.get(required(q)) ?? 0,
          ]);
          let best =
            conflict(u, v) +
            score(u, i, k) +
            score(v, k, i) +
            2 * (u.turn + v.turn);
          let mask = 0;
          for (const trial of [1, 2, 3]) {
            let legal = true;
            pairs.forEach((pair, n) => {
              const p = required(pair[0]),
                q = required(pair[1]),
                l = required(
                  required(orig[n])[0],
                ),
                r = required(
                  required(orig[n])[1],
                );
              if (!(trial & (1 << n))) {
                byRun.set(p, l);
                byRun.set(q, r);
                return;
              }
              if (
                p.axis !== q.axis ||
                Math.abs(
                  p.level + l - q.level - r,
                ) > Math.max(16, 8 * group.length)
              )
                legal = false;
              byRun.set(p, q.level + r - p.level);
              byRun.set(q, p.level + l - q.level);
            });
            if (!legal) continue;
            const x = profile(
                render(required(bases[i]), i),
              ),
              y = profile(
                render(required(bases[k]), k),
              );
            if (
              crossesItself(x.path) ||
              crossesItself(y.path)
            )
              continue;
            const cost =
              conflict(x, y) +
              score(x, i, k) +
              score(y, k, i) +
              2 * (x.turn + y.turn);
            if (cost + 1 < best) {
              best = cost;
              mask = trial;
              profiles[i] = x;
              profiles[k] = y;
              wires[i] = x.wire;
              wires[k] = y.wire;
            }
          }
          pairs.forEach((pair, n) => {
            const p = required(pair[0]),
              q = required(pair[1]),
              l = required(required(orig[n])[0]),
              r = required(required(orig[n])[1]);
            byRun.set(
              p,
              mask & (1 << n)
                ? q.level + r - p.level
                : l,
            );
            byRun.set(
              q,
              mask & (1 << n)
                ? p.level + l - q.level
                : r,
            );
          });
        }
    }
    for (let pass = 0; pass < 2; pass++)
      for (const [i, w] of wires.entries()) {
        const old = required(profiles[i]);
        if (
          w.edge.route !== "step" ||
          old.turn < 0.01 ||
          (old.turn < 4 && score(old, i) < 2) ||
          !bases[i]?.spine
        )
          continue;
        const paths: Point[][] = [];
        render(required(bases[i]), i, paths);
        const raw = paths[0] ?? bases[i]?.spine;
        if (!raw) continue;
        const cost = (
          p: ReturnType<typeof profile>,
        ) =>
          score(p, i) +
          p.turn * 2 +
          Math.max(0, p.turn - 6.4) * 16 +
          p.length * 0.008;
        let best = cost(old);
        const s = {
            ...w.source,
            side: w.sourceSide,
          },
          t = { ...w.target, side: w.targetSide };
        const clear = boxes.map((q) =>
          q.id === w.edge.source ||
          q.id === w.edge.target
            ? q
            : inflate(q, 6),
        );

        const socketWalls = boxes
          .filter(
            (q) =>
              q.id === w.edge.source ||
              q.id === w.edge.target,
          )
          .map((q) => inflate(q, 5));
        const baseSpine = required(
          required(bases[i]).spine,
        );
        const { facing, compact, span } =
          required(bendLimits[i]);
        const arch =
          w.sourceSide === w.targetSide &&
          baseSpine.length === 4;
        for (const guide of shortcuts(
          s,
          t,
          boxes,
          w.edge.source,
          w.edge.target,
          raw,
        )) {
          if (facing) {
            const across = vertical(s.side)
              ? "x"
              : "y";
            if (
              guide.some(
                (p) =>
                  p[across] <
                    Math.min(
                      s[across],
                      t[across],
                    ) -
                      span ||
                  p[across] >
                    Math.max(
                      s[across],
                      t[across],
                    ) +
                      span,
              )
            )
              continue;
          }
          if (
            compact &&
            guide.some(
              (p) =>
                !baseSpine.some(
                  (q, j) =>
                    j > 0 &&
                    chordGap(
                      p,
                      required(baseSpine[j - 1]),
                      q,
                    ) <= span,
                ),
            )
          )
            continue;

          const arc = rounded(guide, radius, 0.8);
          if (
            !free(arc, clear) ||
            !free(
              arc.slice(1, -1),
              socketWalls,
            ) ||
            crossesItself(arc)
          )
            continue;
          const next = profile(
            materialize(
              w.edge,
              s,
              t,
              arc,
              guide.length - 2,
            ),
          );
          if (
            next.length > old.length * 0.84 &&
            old.path.some(
              (p) =>
                !next.segments.some(
                  (seg) =>
                    chordGap(p, seg.a, seg.b) <=
                    (arch ? 10 : 100),
                ),
            )
          )
            continue;
          const value = cost(next);
          if (value + 1 < best) {
            best = value;
            wires[i] = next.wire;
            profiles[i] = next;
          }
        }
        for (let j = 0; j + 3 < raw.length; j++) {
          for (
            let k = j + 3;
            k < raw.length;
            k++
          ) {
            const a = required(raw[j]),
              d = required(raw[k]);
            for (const elbow of [
              pt(a.x, d.y),
              pt(d.x, a.y),
            ]) {
              if (
                raw
                  .slice(j + 1, k)
                  .some(
                    (p) =>
                      Math.min(
                        chordGap(p, a, elbow),
                        chordGap(p, elbow, d),
                      ) > 40,
                  )
              )
                continue;
              const knots = simplify([
                ...raw.slice(0, j + 1),
                elbow,
                ...raw.slice(k),
              ]);
              const head = required(knots[1]),
                tail = required(
                  knots[knots.length - 2],
                );
              const valid = (
                p: Point,
                s: Socket,
              ) => {
                const n = normal[s.side];
                return (
                  (p.x - s.x) * n.x +
                    (p.y - s.y) * n.y >=
                    14 &&
                  Math.abs(
                    (p.x - s.x) * n.y -
                      (p.y - s.y) * n.x,
                  ) < 0.01
                );
              };
              if (
                !valid(head, s) ||
                !valid(tail, t)
              )
                continue;
              const arc = rounded(
                knots,
                radius,
                0.8,
              );
              if (
                !free(arc, clear) ||
                !free(
                  arc.slice(1, -1),
                  socketWalls,
                ) ||
                crossesItself(arc)
              )
                continue;
              const next = profile(
                  materialize(
                    w.edge,
                    s,
                    t,
                    arc,
                    knots.length - 2,
                  ),
                ),
                value = cost(next);
              if (value + 0.5 < best) {
                best = value;
                wires[i] = next.wire;
                profiles[i] = next;
              }
            }
          }
        }
      }
  }
  if (wires.some((w) => w.edge.route === "step"))
    wires = mendFans(wires, boxes, radius);
  const laneOrigins = wires;
  // Resolve residual crowding on the fanned curves before fixing their samples.
  for (let pass = 0; pass < 4; pass++) {
    if (
      wires.every((w) => w.edge.route === "step")
    )
      break;
    const channel = curvedChannels(wires);
    wires = wires.map((w, i) => {
      if (
        w.edge.route === "step" ||
        w.edge.waypoints?.length ||
        w.edge.source === w.edge.target ||
        w.points.every(
          (p) => p.x === w.source.x,
        ) ||
        w.points.every((p) => p.y === w.source.y)
      )
        return w;
      const across = vertical(w.sourceSide)
        ? "x"
        : "y";
      if (
        vertical(w.sourceSide) ===
          vertical(w.targetSide) &&
        Math.abs(
          w.source[across] - w.target[across],
        ) < 8 &&
        ports.parallels.get(
          JSON.stringify(
            [w.edge.source, w.edge.target].sort(),
          ),
        )?.length === 1
      )
        return w;
      if (
        (bases[i]?.spine &&
          w.sourceSide === w.targetSide) ||
        bases[i]?.spine?.length === 2 ||
        distance(w.source, w.target) < 60
      )
        return w;
      const shifts = channel(i);
      if (
        !shifts.some(
          (q) =>
            Math.abs(q.x) + Math.abs(q.y) > 0.05,
        )
      )
        return w;
      const path = w.points.map((p, j) => {
        const f = Math.max(
          0,
          Math.min(
            1,
            (Math.min(
              distance(p, w.source),
              distance(p, w.target),
            ) -
              14) /
              20,
          ),
        );
        const q = required(shifts[j]);
        const origin = required(
          required(laneOrigins[i]).points[j],
        );
        const dx = p.x + q.x * f * f - origin.x,
          dy = p.y + q.y * f * f - origin.y;
        // Successive passes share a lane allowance.
        const factor = Math.min(
          1,
          9 / (Math.hypot(dx, dy) || 1),
        );
        return {
          ...p,
          x: origin.x + factor * dx,
          y: origin.y + factor * dy,
        };
      });
      return free(path, boxes) &&
        !crossesItself(path)
        ? { ...w, points: path }
        : w;
    });
  }
  if (wires.every((w) => w.edge.route === "step"))
    return wires;
  return fitCurves(wires, bases, boxes);
};
