import type { Point } from "plgg-board";
import type { FlowNode } from "./model";
import type { Wire } from "./wiring";
import type { laneIndex } from "./wireLanes";
import { sides } from "plgg-flow/wirePorts";
import {
  portPosition,
  type Side,
} from "plgg-flow/nodeBody";
import {
  throughKnots,
  materialize,
} from "plgg-flow/wirePath";
import {
  required,
  normal,
  move,
  distance,
  bezier,
  free,
  crossesItself,
  pt,
  pointGap,
  inflate,
  vertical,
  rounded,
  simplify,
  type Box,
} from "plgg-flow/wireGeometry";
const nearFace = (
  p: Point,
  end: Point,
  q: Box | undefined,
) => {
  if (
    !q ||
    (p.x - end.x) ** 2 + (p.y - end.y) ** 2 <= 400
  )
    return false;
  const dx = Math.max(0, q.l - p.x, p.x - q.r),
    dy = Math.max(0, q.t - p.y, p.y - q.b);
  return dx * dx + dy * dy < 25;
};
export const refine = (
  wires: Wire[],
  nodes: ReadonlyMap<string, FlowNode>,
  boxes: Box[],
  lanes: ReturnType<typeof laneIndex>,
  rowAxis: string | undefined,
  ordinal: ReadonlyMap<string, number>,
  radius: number,
  clearance: number,
) => {
  // Once every lane is present, a spare face may eliminate a shared-end crossing.
  const padded = boxes.map((q) =>
    inflate(q, Math.min(clearance, 6)),
  );
  const occupied = new Map<string, number>();
  const socketKey = (
    id: string,
    side: Side,
    start: boolean,
  ) => id + "|" + side + "|" + start;
  const mark = (wire: Wire, delta: number) => {
    for (const key of [
      socketKey(
        wire.edge.source,
        wire.sourceSide,
        true,
      ),
      socketKey(
        wire.edge.target,
        wire.targetSide,
        false,
      ),
    ])
      occupied.set(
        key,
        (occupied.get(key) ?? 0) + delta,
      );
  };
  for (const w of wires) mark(w, 1);
  for (let i = 0; i < wires.length; i++) {
    const w = required(wires[i]),
      edge = w.edge;
    if (
      edge.source === edge.target ||
      edge.waypoints?.length ||
      edge.route === "straight"
    )
      continue;
    const baseline = lanes.score(
      w.points,
      edge,
      w.source,
      w.target,
    );
    const defects = (r: typeof baseline) =>
      r.conflicts +
      Number(r.turn > 6.8) +
      Number(
        edge.route !== "step" && r.kink > 0.72,
      ) +
      Number(r.stiff) +
      20 * Number(r.overlap > 16);
    const foreign = padded.filter(
      (q) =>
        q.id !== edge.source &&
        q.id !== edge.target,
    );
    const sourceBox = boxes.find(
        (q) => q.id === edge.source,
      ),
      targetBox = boxes.find(
        (q) => q.id === edge.target,
      );
    const geometry = (
      path: readonly Point[],
      s: Point,
      t: Point,
    ) => {
      let len = 0,
        contact = false;
      for (let i = 0; i < path.length; i++) {
        const p = required(path[i]);
        if (i)
          len += distance(
            p,
            required(path[i - 1]),
          );
        if (!contact)
          contact =
            nearFace(p, s, sourceBox) ||
            nearFace(p, t, targetBox);
      }
      const direct =
        edge.route === "step"
          ? Math.abs(t.x - s.x) +
            Math.abs(t.y - s.y)
          : distance(s, t);
      return (
        Number(!free(path, foreign)) +
        Number(contact) +
        Number(len > Math.max(40, direct) * 1.8)
      );
    };
    let best =
      defects(baseline) +
      geometry(w.points, w.source, w.target);
    if (!best) continue;
    const a = required(nodes.get(edge.source)),
      b = required(nodes.get(edge.target));
    const permissible = (
      end: typeof a,
      peer: typeof a,
      side: Side,
      current: Side,
      start: boolean,
    ) => {
      if (side === current) return true;
      const dx = peer.position.x - end.position.x,
        dy = peer.position.y - end.position.y;
      // A spare face must still point toward its peer in an open corridor.
      if (
        baseline.overlap <= 16 &&
        Math.max(Math.abs(dx), Math.abs(dy)) -
          dx * normal[side].x -
          dy * normal[side].y >
          0.35 * Math.hypot(dx, dy) &&
        free(
          [end.position, peer.position],
          foreign,
        )
      )
        return false;
      if (
        (rowAxis &&
          Math.abs(
            required(ordinal.get(end.id)) -
              required(ordinal.get(peer.id)),
          ) <= 1) ||
        occupied.get(
          socketKey(end.id, side, !start),
        )
      )
        return false;
      return (
        (peer.position.x - end.position.x) *
          normal[side].x +
          (peer.position.y - end.position.y) *
            normal[side].y >=
        0
      );
    };
    let improved: Wire | undefined;
    for (const sa of [
      w.sourceSide,
      ...sides.filter((v) => v !== w.sourceSide),
    ]) {
      if (
        !best ||
        !permissible(a, b, sa, w.sourceSide, true)
      )
        continue;
      for (const sb of [
        w.targetSide,
        ...sides.filter(
          (v) => v !== w.targetSide,
        ),
      ]) {
        if (
          !best ||
          !permissible(
            b,
            a,
            sb,
            w.targetSide,
            false,
          )
        )
          continue;
        const s = {
            ...portPosition(a, sa, 0),
            side: sa,
          },
          t = {
            ...portPosition(b, sb, 0),
            side: sb,
          };
        const u = move(s, sa, 14),
          v = move(t, sb, 14),
          room = distance(u, v),
          arm = Math.max(40, 0.45 * room);
        const buffer = boxes.map((q) =>
          q.id === a.id || q.id === b.id
            ? q
            : inflate(
                q,
                Math.min(
                  clearance,
                  7,
                  pointGap(s, q),
                  pointGap(t, q),
                ),
              ),
        );
        const accept = (
          path: Point[],
          corners: number,
        ) => {
          if (!free(path, buffer)) return;
          const score = lanes.score(
            path,
            edge,
            s,
            t,
            Infinity,
            undefined,
            13,
          );
          if (
            defects(score) >= best ||
            score.overlap > 13
          )
            return;
          const n =
            defects(score) + geometry(path, s, t);
          if (
            n >= best ||
            score.overlap > 13 ||
            crossesItself(path)
          )
            return;
          best = n;
          improved = materialize(
            edge,
            s,
            t,
            path,
            corners,
          );
        };
        if (edge.route === "step") {
          const h = !vertical(sa);
          if (vertical(sa) !== vertical(sb)) {
            const elbow = h
              ? pt(v.x, u.y)
              : pt(u.x, v.y);
            const raw = simplify([
              s,
              u,
              elbow,
              v,
              t,
            ]);
            accept(
              rounded(raw, radius),
              raw.length - 2,
            );
          }
          if (sa === sb) {
            const sign = h
              ? normal[sa].x
              : normal[sa].y;
            for (const f of [0.1, 0.22, 0.36]) {
              if (!best) break;
              const l =
                sign *
                (Math.max(
                  sign * (h ? u.x : u.y),
                  sign * (h ? v.x : v.y),
                ) +
                  Math.max(8, room * f));
              const raw = [
                s,
                h ? pt(l, u.y) : pt(u.x, l),
                h ? pt(l, v.y) : pt(v.x, l),
                t,
              ];
              accept(rounded(raw, radius), 2);
            }
          }
          const mid = (f: number) =>
            h
              ? u.x + (v.x - u.x) * f
              : u.y + (v.y - u.y) * f;
          for (const f of [0.2, 0.5, 0.8]) {
            if (!best) break;
            const m = mid(f),
              raw = simplify([
                s,
                u,
                h ? pt(m, u.y) : pt(u.x, m),
                h ? pt(m, v.y) : pt(v.x, m),
                v,
                t,
              ]);
            accept(
              rounded(raw, radius),
              raw.length - 2,
            );
          }
        } else {
          accept(
            [
              s,
              ...bezier(
                u,
                move(u, sa, arm),
                move(v, sb, arm),
                v,
              ),
              t,
            ],
            0,
          );
          for (const offset of [
            0.1, -0.1, 0.24, -0.24, 0.42, -0.42,
          ]) {
            if (!best) break;
            const mid = pt(
              (u.x + v.x) / 2 -
                (v.y - u.y) * offset,
              (u.y + v.y) / 2 +
                (v.x - u.x) * offset,
            );
            accept(
              [
                s,
                ...throughKnots(
                  [u, mid, v],
                  sa,
                  sb,
                ),
                t,
              ],
              0,
            );
          }
        }
      }
    }
    if (improved) {
      mark(w, -1);
      mark(improved, 1);
      wires[i] = improved;
      lanes.insert(improved);
    }
  }
};
