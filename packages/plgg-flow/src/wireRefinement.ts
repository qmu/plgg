import {
  search,
  laneSearch,
} from "plgg-flow/wireSearch";
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
    const defects = (
      r: typeof baseline,
      arch: boolean,
      span: number,
    ) =>
      r.conflicts * 1.2 +
      2 * Number(span < 60 && r.turn > 1.8) +
      Math.max(0, r.turn - 5.8) +
      (edge.route === "step"
        ? 0
        : Math.max(0, r.kink - 0.55) * 5) +
      Number(!arch && r.stiff) +
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
    const a = required(nodes.get(edge.source)),
      b = required(nodes.get(edge.target));
    const bounds = sourceBox &&
      targetBox && {
        id: "",
        l: Math.min(sourceBox.l, targetBox.l),
        r: Math.max(sourceBox.r, targetBox.r),
        t: Math.min(sourceBox.t, targetBox.t),
        b: Math.max(sourceBox.b, targetBox.b),
      };
    const open = free(
      [a.position, b.position],
      foreign,
    );
    const sideCost = (
      side: Side,
      node: typeof a,
      peer: typeof a,
    ) => {
      const dx =
          peer.position.x - node.position.x,
        dy = peer.position.y - node.position.y;
      const loss =
        (Math.max(Math.abs(dx), Math.abs(dy)) -
          dx * normal[side].x -
          dy * normal[side].y) /
        (Math.hypot(dx, dy) || 1);
      return open
        ? Math.max(0, loss - 0.15) * 3
        : 0;
    };
    const outgoing = wires.filter(
      (other) =>
        other !== w &&
        other.edge.source === edge.source,
    );
    const incoming = wires.filter(
      (other) =>
        other !== w &&
        other.edge.target === edge.target,
    );
    const single = !wires.some(
      (v) =>
        v !== w &&
        v.edge.source === edge.source &&
        v.edge.target === edge.target,
    );
    const bendsInOpenLane = (
      path: readonly Point[],
      s: Point,
      t: Point,
      sa: Side,
      sb: Side,
    ) => {
      const axis = vertical(sa) ? "x" : "y";
      return (
        single &&
        sa !== sb &&
        vertical(sa) === vertical(sb) &&
        s[axis] === t[axis] &&
        free([s, t], foreign) &&
        path.some(
          (p) => Math.abs(p[axis] - s[axis]) > 1,
        )
      );
    };
    const geometry = (
      path: readonly Point[],
      s: Point,
      t: Point,
      sa: Side,
      sb: Side,
    ) => {
      let len = 0,
        contact = false,
        excursion = 0;
      for (let i = 0; i < path.length; i++) {
        const p = required(path[i]);
        if (i)
          len += distance(
            p,
            required(path[i - 1]),
          );
        if (bounds)
          excursion = Math.max(
            excursion,
            pointGap(p, bounds),
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
        4 *
          Number(
            bendsInOpenLane(path, s, t, sa, sb),
          ) +
        (outgoing.some(
          (other) => other.sourceSide === sa,
        )
          ? 0
          : 2 * sideCost(sa, a, b)) +
        (incoming.some(
          (other) => other.targetSide === sb,
        )
          ? 0
          : 2 * sideCost(sb, b, a)) +
        Math.max(
          0,
          len / Math.max(40, direct) - 1.25,
        ) *
          0.15 +
        Math.max(0, excursion - 60) / 30 +
        Number(
          open &&
            path.some(
              (p) =>
                distance(p, t) >
                distance(s, t) + 30,
            ),
        ) +
        Number(!free(path, foreign)) +
        Number(contact) +
        Number(len > Math.max(40, direct) * 1.8) +
        Number(
          distance(s, t) < 60 &&
            len > distance(s, t) * 1.6 + 8,
        )
      );
    };
    const congestion = (crossings: number) =>
      crossings * 0.18;
    let best =
      congestion(baseline.crossings) +
      defects(
        baseline,
        w.sourceSide === w.targetSide,
        distance(w.source, w.target),
      ) +
      geometry(
        w.points,
        w.source,
        w.target,
        w.sourceSide,
        w.targetSide,
      );
    if (best < 1) continue;
    const permissible = (
      end: typeof a,
      peer: typeof a,
      side: Side,
      current: Side,
    ) => {
      if (side === current) return true;
      if (
        wires.some((other) =>
          end === a
            ? other.edge.target === end.id &&
              other.targetSide === side &&
              other.edge.source === peer.id
            : other.edge.source === end.id &&
              other.sourceSide === side &&
              other.edge.target === peer.id,
        )
      )
        return false;
      // A spare face must still point toward its peer in an open corridor.
      if (
        rowAxis &&
        Math.abs(
          required(ordinal.get(end.id)) -
            required(ordinal.get(peer.id)),
        ) <= 1
      )
        return false;
      return (
        (peer.position.x - end.position.x) *
          normal[side].x +
          (peer.position.y - end.position.y) *
            normal[side].y >=
        -0.25 *
          distance(end.position, peer.position)
      );
    };
    let improved: Wire | undefined;
    for (const sa of [
      w.sourceSide,
      ...sides.filter((v) => v !== w.sourceSide),
    ]) {
      if (
        !best ||
        !permissible(a, b, sa, w.sourceSide)
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
          !permissible(b, a, sb, w.targetSide)
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
        // Short gaps need enough room between the stems to turn.
        const span = distance(s, t);
        const stem =
          span < 90 ? Math.min(14, span / 6) : 14;
        const u = move(s, sa, stem),
          v = move(t, sb, stem),
          room = distance(u, v),
          arm = Math.min(
            room * 0.45,
            Math.max(18, room * 0.35),
          );
        const padding =
          clearance > 18 || free([u, v], foreign)
            ? clearance
            : Math.min(clearance, 8);
        const buffer = boxes.map((q) =>
          q.id === a.id || q.id === b.id
            ? q
            : inflate(
                q,
                Math.min(
                  padding,
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
          if (bendsInOpenLane(path, s, t, sa, sb))
            return;
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
            score.crossings >
              baseline.crossings +
                (wires.length > 4 ? 2 : 0) ||
            congestion(score.crossings) +
              defects(score, sa === sb, span) >=
              best ||
            score.overlap > 13
          )
            return;
          const n =
            congestion(score.crossings) +
            defects(score, sa === sb, span) +
            geometry(path, s, t, sa, sb);
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
        if (
          bounds &&
          sa === w.sourceSide &&
          sb === w.targetSide &&
          w.points.some(
            (p) => pointGap(p, bounds) > 65,
          )
        ) {
          // Compress only the part outside the endpoint span, preserving both shoulders.
          const scaleBeyond = (
            x: number,
            low: number,
            high: number,
            scale: number,
          ) => {
            const anchor = Math.max(
              low - 14,
              Math.min(high + 14, x),
            );
            return anchor + (x - anchor) * scale;
          };
          for (const scale of [
            0.12, 0.25, 0.4, 0.6, 0.8,
          ]) {
            accept(
              w.points.map((p) =>
                pt(
                  scaleBeyond(
                    p.x,
                    bounds.l,
                    bounds.r,
                    scale,
                  ),
                  scaleBeyond(
                    p.y,
                    bounds.t,
                    bounds.b,
                    scale,
                  ),
                ),
              ),
              w.corners,
            );
          }
        }
        // Try open channels beside obstacles before accepting a longer reversal.
        const local = buffer.filter(
          (q) =>
            q.id !== edge.source &&
            q.id !== edge.target &&
            q.r >= Math.min(u.x, v.x) - 50 &&
            q.l <= Math.max(u.x, v.x) + 50 &&
            q.b >= Math.min(u.y, v.y) - 50 &&
            q.t <= Math.max(u.y, v.y) + 50,
        );
        const step = edge.route === "step";
        const candidate = (knots: Point[]) => {
          const raw = simplify([s, ...knots, t]);
          if (step && !free(raw, buffer)) return;
          const path = step
            ? rounded(raw, radius)
            : [
                s,
                ...throughKnots(knots, sa, sb),
                t,
              ];
          accept(
            path,
            Math.max(0, raw.length - 2),
          );
        };
        // Try lanes on either side of the chord, including unequal approaches.
        if (!step) {
          for (const along of [0.25, 0.5, 0.75]) {
            for (const across of [
              -80, -40, -16, 16, 40, 80,
            ]) {
              if (best < 0.01) break;
              const vx = v.x - u.x,
                vy = v.y - u.y;
              const mid = pt(
                u.x +
                  along * vx -
                  (across * vy) / (room || 1),
                u.y +
                  along * vy +
                  (across * vx) / (room || 1),
              );
              candidate([u, mid, v]);
            }
          }
        }
        const shortest =
          local.length &&
          search(u, v, buffer, step);
        if (shortest && shortest.length > 1)
          candidate(shortest);
        if (best >= 1 && local.length) {
          // Search occupied channels when the shortest clear path shares a lane.
          const channel = laneSearch(
            u,
            v,
            buffer,
            step,
            normal[sa],
            normal[sb],
            (p, q) => lanes.toll(p, q, edge),
          );
          if (channel) candidate(channel);
        }
        for (const q of local) {
          if (best < 0.01) break;
          for (const x of [q.l - 6, q.r + 6]) {
            if (best < 0.01) break;
            if (step)
              candidate([
                u,
                pt(x, u.y),
                pt(x, v.y),
                v,
              ]);
            for (const y of [q.t - 6, q.b + 6]) {
              if (best < 0.01) break;
              if (!step)
                candidate([u, pt(x, y), v]);
              else {
                candidate([
                  u,
                  pt(x, u.y),
                  pt(x, y),
                  pt(v.x, y),
                  v,
                ]);
                candidate([
                  u,
                  pt(u.x, y),
                  pt(x, y),
                  pt(x, v.y),
                  v,
                ]);
                candidate([
                  u,
                  pt(u.x, y),
                  pt(v.x, y),
                  v,
                ]);
              }
            }
          }
        }
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
              if (best < 0.01) break;
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
            if (best < 0.01) break;
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
          if (span < 90) {
            // A short connection can turn directly between its two normals.
            for (const ratio of [0.25, 0.4, 0.6])
              accept(
                bezier(
                  s,
                  move(s, sa, span * ratio),
                  move(t, sb, span * ratio),
                  t,
                ),
                0,
              );
          }
          // Unequal shoulders can clear a near corner without widening the far end.
          for (const left of [
            0.12, 0.32, 0.65, 0.95,
          ]) {
            for (const right of [
              0.12, 0.32, 0.65, 0.95,
            ]) {
              if (best < 0.01) break;
              accept(
                [
                  s,
                  ...bezier(
                    u,
                    move(u, sa, room * left),
                    move(v, sb, room * right),
                    v,
                  ),
                  t,
                ],
                0,
              );
            }
          }
          for (const scale of [
            1, 0.5, 1.6, 2.5,
          ]) {
            if (best < 0.01) break;
            accept(
              [
                s,
                ...bezier(
                  u,
                  move(u, sa, arm * scale),
                  move(v, sb, arm * scale),
                  v,
                ),
                t,
              ],
              0,
            );
          }
          for (const offset of [
            0.04, -0.04, 0.1, -0.1, 0.24, -0.24,
            0.42, -0.42,
          ]) {
            if (best < 0.01) break;
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
      wires[i] = improved;
      lanes.insert(improved);
    }
  }
};
