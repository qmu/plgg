import type { Base, Socket } from "./wireBase";
import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import type { planPorts } from "./wirePorts";
import { materialize } from "plgg-flow/wirePath";
import {
  conflict,
  profile,
} from "plgg-flow/wireInteraction";
import {
  normal,
  bezier,
  frame,
  free,
  inflate,
  move,
  pt,
  required,
  rounded,
  simplify,
  vertical,
  type Box,
} from "plgg-flow/wireGeometry";

const stepBranch = (
  root: Point,
  shoulder: Point,
  far: Point,
  lane: number,
  rank: number,
  count: number,
  radius: number,
) => {
  const offset = shoulder.y - root.y;
  if (!offset)
    return simplify([root, shoulder, far]);
  const stem =
    1 + (13 * rank) / Math.max(1, count - 1);
  const rise =
    Math.sign(offset) *
    Math.min(
      Math.abs(offset) * 0.35,
      Math.max(10, 25 - rank * 2),
    );
  const start = pt(root.x + stem, root.y);
  const path = [root, start];
  // Different shoulder widths separate the turns within the common approach.
  for (let j = 1; j <= 12; j++) {
    const angle = (j * Math.PI) / 24;
    path.push(
      pt(
        start.x + (lane - stem) * Math.sin(angle),
        root.y + rise * (1 - Math.cos(angle)),
      ),
    );
  }
  const tail = rounded(
    simplify([
      required(path[path.length - 1]),
      pt(root.x + lane, shoulder.y),
      shoulder,
      far,
    ]),
    radius,
  );
  return [...path, ...tail.slice(1)];
};

const curveBranch = (
  root: Point,
  shoulder: Point,
  far: Point,
  lane: number,
) => {
  const bend = shoulder !== far,
    offset = shoulder.y - root.y;
  const reach =
    far.x - root.x - 5 - (bend ? 22 : 14);
  if (reach < 32) return;
  const width = 24 + lane * 0.5;
  const ease = (d: number) =>
    (d * d) / (width * width + d * d);
  const blend = Math.max(
    0,
    1 - Math.abs(offset) / 160,
  );
  const count = Math.ceil(reach / 4);
  const path = [root];
  for (let j = 0; j <= count; j++) {
    const f = j / count,
      end = Math.max(0, (f - 0.8) / 0.2);
    // Ease into the final tangent while shallow branches use the full span.
    const d = reach * (f + end * end * (1 - f));
    const height =
      ((1 - blend) * ease(d)) / ease(reach) +
      blend * f * f * (3 - 2 * f);
    path.push(
      pt(
        root.x + 5 + reach * f,
        root.y + offset * height,
      ),
    );
  }
  if (bend) {
    const start = required(path[path.length - 1]);
    path.push(
      ...bezier(
        start,
        pt(start.x + 12, start.y),
        pt(far.x, shoulder.y),
        far,
      ).slice(1),
    );
  } else path.push(far);
  return path;
};
export const nestedFans = (
  wires: Wire[],
  ports: ReturnType<typeof planPorts>,
  boxes: Box[],
  radius: number,
) => {
  // Lay out crowded leaf fans together so every approach has a single lane.
  for (const end of [
    "source",
    "target",
  ] satisfies ("source" | "target")[]) {
    const groups = new Map<string, number[]>();
    for (const [i, w] of wires.entries()) {
      const plan = required(ports.plans[i]);
      const [hub, leaf] =
        end === "source"
          ? [plan.a, plan.b]
          : [plan.b, plan.a];
      if (
        hub.count < 6 ||
        (w.edge.route === "step" && !radius) ||
        leaf.count !== 1 ||
        w.edge.route === "straight" ||
        w.edge.waypoints?.length ||
        w.edge.source === w.edge.target
      )
        continue;
      const key = JSON.stringify([
        w.edge[end],
        hub.side,
        w[end].x,
        w[end].y,
      ]);
      const ids = groups.get(key) ?? [];
      ids.push(i);
      groups.set(key, ids);
    }
    for (const ids of groups.values()) {
      const first = required(
        wires[required(ids[0])],
      );
      const incoming = end === "target";
      const hub = required(
        ports.plans[required(ids[0])],
      )[incoming ? "b" : "a"];
      if (ids.length !== hub.count) continue;
      const external = wires
        .filter((_, i) => !ids.includes(i))
        .map(profile);
      const side = incoming
        ? first.targetSide
        : first.sourceSide;
      const { local, world } = frame(side);
      const root = local(first[end]);
      const branches = ids.map((i) => {
        const w = required(wires[i]);
        const peer = incoming
          ? w.source
          : w.target;
        const face = incoming
          ? w.sourceSide
          : w.targetSide;
        const far = local(peer);
        const shoulder =
          vertical(face) === vertical(side)
            ? far
            : local(move(peer, face, 18));
        return {
          i,
          w,
          far,
          shoulder,
          offset: shoulder.y - root.y,
          face,
        };
      });
      const gap = Math.min(
        ...branches.map(
          (branch) => branch.shoulder.x - root.x,
        ),
      );
      if (gap < 34) continue;
      for (const sign of [-1, 0, 1]) {
        const half = branches
          .filter(
            (b) => Math.sign(b.offset) === sign,
          )
          .sort(
            (a, b) =>
              Math.abs(b.offset) -
              Math.abs(a.offset),
          );
        const pitch = Math.min(
          10,
          Math.max(
            6,
            (gap - 34) /
              Math.max(1, half.length - 1),
          ),
        );
        for (const [rank, b] of half.entries()) {
          if (
            b.face === side ||
            half.some(
              (peer) =>
                peer !== b &&
                peer.offset === b.offset,
            )
          )
            continue;
          // The longest transverse run must clear the nearer branches' approaches.
          const lane = 14 + rank * pitch;
          if (lane + 14 > b.shoulder.x - root.x)
            continue;
          const path =
            b.w.edge.route === "step"
              ? stepBranch(
                  root,
                  b.shoulder,
                  b.far,
                  lane,
                  rank,
                  half.length,
                  radius,
                )
              : curveBranch(
                  root,
                  b.shoulder,
                  b.far,
                  lane,
                );
          if (!path) continue;
          const points = path.map(world);
          if (
            !free(
              points,
              boxes.map((q) =>
                q.id === b.w.edge.source ||
                q.id === b.w.edge.target
                  ? q
                  : inflate(q, 6),
              ),
            )
          )
            continue;
          const candidate = materialize(
            b.w.edge,
            {
              ...b.w.source,
              side: b.w.sourceSide,
            },
            {
              ...b.w.target,
              side: b.w.targetSide,
            },
            incoming ? points.reverse() : points,
            sign
              ? 2 + Number(b.shoulder !== b.far)
              : 0,
          );
          const contour = profile(candidate),
            original = profile(b.w);
          if (
            external.every(
              (p) =>
                conflict(p, contour) <=
                conflict(p, original) + 0.5,
            )
          )
            wires[b.i] = candidate;
        }
      }
    }
  }
  return wires;
};

// Leave room for the next bend when a short channel compresses the fan.
export const busJog = (
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

export const nestLayerFans = (
  wires: Wire[],
  bases: Base[],
  ports: ReturnType<typeof planPorts>,
  fans: Iterable<{ i: number; start: boolean }[]>,
  walls: Box[][],
  radius: number,
) => {
  // Across a layer gap, order the middle legs and the socket offsets
  // together. An outer sibling turns first when viewed from the hub.
  for (const fan of fans)
    for (const direction of [-1, 1]) {
      if (fan.length < 3) continue;
      const group = fan.filter(({ i, start }) => {
        const w = required(bases[i]),
          p = start ? w.source : w.target,
          q = start ? w.target : w.source;
        const axis = vertical(
          start ? w.sourceSide : w.targetSide,
        )
          ? "x"
          : "y";
        return (
          Math.sign(q[axis] - p[axis]) ===
          direction
        );
      });
      if (group.length < 3 || !radius) continue;
      const initial = required(group[0]);

      const base = required(bases[initial.i]);
      const root = initial.start
          ? base.source
          : base.target,
        face = initial.start
          ? base.sourceSide
          : base.targetSide;
      const along = vertical(face) ? "y" : "x",
        across = along === "x" ? "y" : "x";
      const extent =
        ((initial.start
          ? base.target
          : base.source)[along] -
          root[along]) *
        normal[face][along];
      if (
        extent < 95 ||
        !group.every(({ i, start }) => {
          const w = required(bases[i]),
            peer = start ? w.target : w.source;
          return (
            w.edge.route === "step" &&
            w.spine?.length === 4 &&
            Math.abs(
              (peer[along] - root[along]) *
                normal[face][along] -
                extent,
            ) < 2
          );
        })
      )
        continue;
      const original = group.map(({ i }) =>
        profile(required(wires[i])),
      );
      const cost = (shapes: typeof original) =>
        shapes.reduce(
          (sum, a, i) =>
            sum +
            shapes
              .slice(0, i)
              .reduce(
                (n, b) => n + conflict(a, b),
                0,
              ),
          0,
        );
      const before = cost(original);
      if (before < 45) continue;
      let best = before,
        chosen: typeof original | undefined;
      const ids = new Set(group.map((e) => e.i));
      const outside = wires
        .filter((_, i) => !ids.has(i))
        .map(profile);
      for (const offset of [
        0, -10, 10, -20, 20,
      ]) {
        const candidates = group.map(
          ({ start, i }) => {
            const w = required(bases[i]),
              plan = required(ports.plans[i]);
            const s = {
                ...w.source,
                side: w.sourceSide,
              },
              t = {
                ...w.target,
                side: w.targetSide,
              };
            const far = start ? t : s,
              rank = start
                ? plan.a.rank
                : plan.b.rank;
            const channel =
              root[along] +
              normal[face][along] *
                (extent / 2 +
                  offset -
                  Math.sign(
                    far[across] - root[across],
                  ) *
                    rank *
                    10);
            const left = busJog(
              s,
              plan.a.rank * 10,
              Math.min(3, radius),
              extent / 3,
            );
            const right = busJog(
              t,
              plan.b.rank * 10,
              Math.min(3, radius),
              extent / 3,
            );
            const l = required(
                left[left.length - 1],
              ),
              r = required(
                right[right.length - 1],
              );
            if (
              (channel - l[along]) *
                normal[s.side][along] <
                8 ||
              (channel - r[along]) *
                normal[t.side][along] <
                8
            )
              return;
            const core = rounded(
              [
                l,
                { ...l, [along]: channel },
                { ...r, [along]: channel },
                r,
              ],
              radius,
            );
            const arc = [
              ...left,
              ...core.slice(1, -1),
              ...right.reverse(),
            ];
            if (!free(arc, required(walls[i])))
              return;
            return profile(
              materialize(
                w.edge,
                s,
                t,
                arc,
                2 +
                  2 * Number(left.length > 1) +
                  2 * Number(right.length > 1),
              ),
            );
          },
        );
        const next = candidates.filter(
          (v) => v !== undefined,
        );
        const internal = cost(next);
        if (
          next.length !== group.length ||
          internal >= before - 5
        )
          continue;
        let penalty = 0;
        for (const shape of outside) {
          for (const [j, n] of next.entries())
            penalty +=
              conflict(n, shape) -
              conflict(
                required(original[j]),
                shape,
              );
        }
        const value = internal + penalty;
        if (value < best) {
          best = value;
          chosen = next;
        }
      }
      if (chosen)
        for (const [j, { i }] of group.entries())
          wires[i] = required(chosen[j]).wire;
    }
};
