import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import type { laneIndex } from "./wireLanes";
import { simplifyTrace } from "plgg-flow/polyline";
import {
  materialize,
  throughKnots,
} from "plgg-flow/wirePath";
import {
  move,
  normal,
  vertical,
  pt,
  rounded,
  distance,
  free,
  simplify,
  crossesItself,
  inflate,
  pointGap,
  required,
  type Box,
} from "plgg-flow/wireGeometry";

// Shorten congested detours after the surrounding lanes have settled.
export const shorten = (
  wires: Wire[],
  boxes: Box[],
  lanes: ReturnType<typeof laneIndex>,
  radius: number,
  clearance: number,
) => {
  wires.forEach((w, i) => {
    const edge = w.edge,
      step = edge.route === "step";
    if (
      edge.source === edge.target ||
      edge.waypoints?.length ||
      edge.route === "straight"
    )
      return;
    const s = { ...w.source, side: w.sourceSide },
      t = { ...w.target, side: w.targetSide };
    const before = lanes.score(
      w.points,
      edge,
      s,
      t,
    );
    const shape = (r: typeof before) =>
      Number(r.turn > 6.8) +
      Number(!step && r.kink > 0.72) +
      Number(r.stiff);
    const best = shape(before);
    if (!best) return;
    const u = move(s, s.side, 14),
      v = move(t, t.side, 14),
      room = distance(u, v);
    const buffer = boxes.map((q) =>
      q.id === edge.source || q.id === edge.target
        ? q
        : inflate(
            q,
            Math.min(
              clearance,
              6,
              pointGap(s, q),
              pointGap(t, q),
            ),
          ),
    );
    const accept = (
      path: Point[],
      corners: number,
    ) => {
      if (!free(path, buffer)) return false;
      const r = lanes.score(
        path,
        edge,
        s,
        t,
        Infinity,
        undefined,
        13,
      );
      if (
        shape(r) >= best ||
        r.overlap > 13 ||
        r.conflicts > before.conflicts ||
        crossesItself(path)
      )
        return false;
      const updated = materialize(
        edge,
        s,
        t,
        path,
        corners,
      );
      wires[i] = updated;
      lanes.insert(updated);
      return true;
    };
    if (!step) {
      // Relax a tight join locally so a distant constrained bend stays in its lane.
      let smooth = [...w.points].map((p) =>
        pt(p.x, p.y),
      );
      for (let pass = 1; pass <= 32; pass++) {
        smooth = smooth.map((p, i) => {
          const a = smooth[i - 1],
            b = smooth[i + 1];
          if (
            !a ||
            !b ||
            distance(p, s) < 15 ||
            distance(p, t) < 15
          )
            return p;
          const left = distance(a, p),
            right = distance(p, b);
          const f = left / (left + right || 1);
          const q = pt(
            (p.x + a.x + (b.x - a.x) * f) / 2,
            (p.y + a.y + (b.y - a.y) * f) / 2,
          );
          return free([a, q, b], buffer) ? q : p;
        });
        if (
          (pass === 4 ||
            pass === 12 ||
            pass === 32) &&
          accept(smooth, w.corners)
        )
          return;
      }
      const core = [
        { ...u, z: s.z },
        ...w.points.filter(
          (p) =>
            distance(p, s) > 14 &&
            distance(p, t) > 14,
        ),
        { ...v, z: t.z },
      ];
      for (const f of [
        0.2, 0.1, 0.05, 0.025, 0.01,
      ]) {
        const knots = Array.from(
          simplifyTrace(
            core,
            Math.max(2, room * f),
          ),
        );
        // The original guides may carry a bend around another occupied lane.
        if (
          accept(
            [
              s,
              ...throughKnots(
                knots,
                s.side,
                t.side,
              ),
              t,
            ],
            knots.length - 2,
          )
        )
          return;
        for (
          let j = knots.length - 2;
          j > 0;
          j--
        ) {
          if (
            free(
              [
                required(knots[j - 1]),
                required(knots[j + 1]),
              ],
              buffer,
            )
          )
            knots.splice(j, 1);
        }
        if (
          accept(
            [
              s,
              ...throughKnots(
                knots,
                s.side,
                t.side,
              ),
              t,
            ],
            knots.length - 2,
          )
        )
          return;
      }
      return;
    }
    // Replace only the winding middle, retaining the occupied lanes at either end.
    const trace = simplify([...w.points]);
    const runs = trace.flatMap((p, i) => {
      const q = trace[i + 1];
      if (
        !q ||
        (p.x !== q.x && p.y !== q.y) ||
        distance(p, q) < 24
      )
        return [];
      return [
        {
          i,
          mid: pt(
            (p.x + q.x) / 2,
            (p.y + q.y) / 2,
          ),
        },
      ];
    });
    for (const a of runs) {
      for (const b of [...runs].reverse()) {
        if (b.i <= a.i + 1) break;
        for (const elbow of [
          pt(a.mid.x, b.mid.y),
          pt(b.mid.x, a.mid.y),
        ]) {
          const bridge = rounded(
            simplify([
              required(trace[a.i]),
              a.mid,
              elbow,
              b.mid,
              required(trace[b.i + 1]),
            ]),
            radius,
          );
          if (
            accept(
              [
                ...trace.slice(0, a.i),
                ...bridge,
                ...trace.slice(b.i + 2),
              ],
              Math.max(0, w.corners - 2),
            )
          )
            return;
        }
      }
    }
    const h = !vertical(s.side),
      pos = (x: number, y: number) =>
        h ? pt(x, y) : pt(y, x);
    const x = (p: Point) => (h ? p.x : p.y),
      y = (p: Point) => (h ? p.y : p.x);
    const along = h
      ? normal[s.side].x
      : normal[s.side].y;
    const parallel =
      vertical(s.side) === vertical(t.side);
    const end = parallel
      ? h
        ? normal[t.side].x
        : normal[t.side].y
      : h
        ? normal[t.side].y
        : normal[t.side].x;
    const ys = w.points.map(y);
    const levels = [
      (y(u) + y(v)) / 2,
      Math.min(...ys) - 8,
      Math.max(...ys) + 8,
      Math.min(y(u), y(v)) - 26,
      Math.max(y(u), y(v)) + 26,
    ];
    for (const arm of [4, 16, 32, room * 0.25]) {
      const left = x(u) + along * arm;
      for (const level of levels) {
        if (!parallel && (level - y(v)) * end < 0)
          continue;
        const right =
          x(v) + (parallel ? end * arm : 0);
        const raw = simplify([
          s,
          pos(left, y(u)),
          pos(left, level),
          pos(right, level),
          ...(parallel ? [pos(right, y(v))] : []),
          t,
        ]);
        if (
          accept(
            rounded(raw, radius),
            raw.length - 2,
          )
        )
          return;
      }
    }
  });
};
