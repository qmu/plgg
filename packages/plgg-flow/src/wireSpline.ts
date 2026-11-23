import { shortcuts } from "plgg-flow/wireShortcuts";
import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import type { Base, Socket } from "./wireBase";
import {
  profile,
  outline,
  chordGap,
  conflict,
} from "plgg-flow/wireInteraction";
import {
  materialize,
  throughKnots,
} from "plgg-flow/wirePath";
import {
  distance,
  move,
  rounded,
  required,
  free,
  crossesItself,
  normal,
  pt,
  gap,
  inflate,
  type Box,
} from "plgg-flow/wireGeometry";
// Measure turn in arc length so dense spline samples have equal influence.
const sampleCurve = (path: Point[]) => {
  const result = [required(path[0])];
  let target = 5,
    total = 0;
  for (let j = 1; j < path.length; j++) {
    const a = required(path[j - 1]),
      b = required(path[j]),
      d = distance(a, b);
    while (target <= total + d) {
      const f = (target - total) / d;
      result.push(
        pt(
          a.x + (b.x - a.x) * f,
          a.y + (b.y - a.y) * f,
        ),
      );
      target += 5;
    }
    total += d;
  }
  result.push(required(path[path.length - 1]));
  return result;
};
const aligned = (path: Point[], s: Socket) => {
  let remain = 14;
  const n = normal[s.side];
  for (let j = 1; j < path.length; j++) {
    const a = required(path[j - 1]),
      b = required(path[j]),
      d = distance(a, b);
    if (!d) continue;
    const f = Math.min(1, remain / d),
      x = a.x - s.x + f * (b.x - a.x),
      y = a.y - s.y + f * (b.y - a.y);
    if (
      Math.abs(x * n.y - y * n.x) > 1.5 ||
      x * n.x + y * n.y < 0
    )
      return false;
    remain -= d;
    if (remain <= 0) break;
  }
  return true;
};
const neighboursClear = (
  p: ReturnType<typeof profile>,
  others: ReturnType<typeof profile>[],
  i: number,
) =>
  others.every(
    (q, j) => i === j || conflict(p, q) < 1,
  );
export const fitCurves = (
  wires: Wire[],
  bases: Base[],
  boxes: Box[],
) => {
  const contours = wires.map(profile);
  const candidates = wires.map((w, i) => {
    if (
      w.edge.route === "step" ||
      bases[i]?.spine?.length === 2 ||
      (w.points === bases[i]?.points &&
        !w.corners) ||
      w.edge.route === "straight" ||
      w.edge.waypoints?.length ||
      (w.edge.source !== w.edge.target &&
        distance(w.source, w.target) < 60) ||
      w.points.every((p) => p.x === w.source.x) ||
      w.points.every((p) => p.y === w.source.y)
    )
      return [
        {
          wire: w,
          shape: 0,
          contour: required(contours[i]),
        },
      ];
    const s = { ...w.source, side: w.sourceSide },
      t = { ...w.target, side: w.targetSide };
    // Fit in arc length so uneven sampling cannot pinch a lane at a corner.
    const lengths = [0];
    let length = 0;
    for (let j = 1; j < w.points.length; j++) {
      length += distance(
        required(w.points[j - 1]),
        required(w.points[j]),
      );
      lengths.push(length);
    }
    // A neighbour entering the fan must not add a spline span.
    const base = required(bases[i]);
    const baseLength = base.points.reduce(
      (sum, p, j) =>
        sum +
        (j
          ? distance(
              p,
              required(base.points[j - 1]),
            )
          : 0),
      0,
    );
    const backwards =
      (t.x - s.x) * normal[s.side].x +
        (t.y - s.y) * normal[s.side].y <
        0 && s.side !== t.side;
    const span = distance(s, t);
    const current = required(contours[i]);
    const foreign = boxes.filter(
      (q) =>
        q.id !== w.edge.source &&
        q.id !== w.edge.target &&
        q.l < current.r + 16 &&
        q.r > current.l - 16 &&
        q.t < current.b + 16 &&
        q.b > current.t - 16,
    );
    const band = boxes.map((q) =>
      q.id === w.edge.source ||
      q.id === w.edge.target
        ? q
        : inflate(q, 7),
    );
    const sample = (at: number) => {
      let lo = 0,
        hi = lengths.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (required(lengths[mid]) < at) lo = mid;
        else hi = mid;
      }
      const a = required(w.points[lo]),
        b = required(w.points[hi]),
        f =
          (at - required(lengths[lo])) /
          (required(lengths[hi]) -
            required(lengths[lo]) || 1);
      return pt(
        a.x + (b.x - a.x) * f,
        a.y + (b.y - a.y) * f,
      );
    };
    const choices = [];
    if (
      current.length > distance(s, t) * 1.65 &&
      w.edge.source !== w.edge.target
    ) {
      for (const raw of shortcuts(
        s,
        t,
        boxes,
        w.edge.source,
        w.edge.target,
      )) {
        const l = raw.reduce(
          (sum, p, j) =>
            sum +
            (j
              ? distance(p, required(raw[j - 1]))
              : 0),
          0,
        );
        if (l > current.length * 0.84) continue;
        const first = move(s, s.side, 14),
          last = move(t, t.side, 14);
        const middle = rounded(
          [first, ...raw.slice(1, -1), last],
          24,
        );
        const knots = outline(middle, 2);
        const path = [
          s,
          ...throughKnots(knots, s.side, t.side),
          t,
        ];
        if (
          !free(path, band) ||
          crossesItself(path)
        )
          continue;
        const wire = materialize(
            w.edge,
            s,
            t,
            path,
            raw.length - 2,
          ),
          contour = profile(wire);
        choices.push({
          wire,
          contour,
          shape:
            contour.turn * 1.5 +
            contour.length * 0.002,
        });
      }
    }
    // Shorter spans follow tight walls. Wider spans fair the open parts of a lane.
    for (const [
      spacing,
      stem,
      lane,
      shortcut,
    ] of [
      [32, 8, 0, 0],
      [44, 12, 0, 0],
      [24, 10, 0, 0],
      [64, 8, 0, 0],
      [16, 14, 0, 0],
      [30, 9, 0, 14],
      [22, 8, 0, 8],
      [26, 12, 0, 40],
      [36, 11, 6, 0],
      [36, 11, -6, 0],
      [54, 10, 6, 0],
      [54, 10, -6, 0],
      [20, 6, 3, 0],
      [20, 6, -3, 0],
      [38, 6, 0, 0],
      [48, 6, 0, 0],
    ] satisfies [
      number,
      number,
      number,
      number,
    ][]) {
      const count = Math.max(
        2,
        Math.round(
          (baseLength - 2 * stem) / spacing,
        ),
      );
      const knots = Array.from(
        { length: count + 1 },
        (_, k) => {
          const at =
              stem +
              ((length - 2 * stem) * k) / count,
            p = sample(at);
          const radius = Math.min(
            spacing,
            at - stem,
            length - stem - at,
          );
          const left = sample(at - radius),
            right = sample(at + radius);
          const d = distance(left, right) || 1,
            offset =
              lane * Math.min(1, radius / 28);
          return pt(
            (offset * (left.y - right.y)) / d +
              (2 * p.x + left.x + right.x) / 4,
            (offset * (right.x - left.x)) / d +
              (2 * p.y + left.y + right.y) / 4,
          );
        },
      );
      for (const [k, socket] of [
        [1, s],
        [count - 1, t],
      ] satisfies [number, Socket][]) {
        const p = required(knots[k]),
          n = normal[socket.side],
          x = p.x - socket.x,
          y = p.y - socket.y;
        const side = Math.min(
          16,
          Math.abs(x * n.y - y * n.x),
        );
        const push = Math.max(
          0,
          Math.min(
            16,
            stem +
              Math.sqrt(side * (32 - side)) -
              x * n.x -
              y * n.y,
          ),
        );
        knots[k] = pt(
          p.x + n.x * push,
          p.y + n.y * push,
        );
      }
      // Leave a clearance band for the cubic between adjacent guides.
      for (const [j, p] of knots.entries()) {
        if (!j || j === knots.length - 1)
          continue;
        for (const wall of boxes) {
          const x = Math.max(
              wall.l,
              Math.min(wall.r, p.x),
            ),
            y = Math.max(
              wall.t,
              Math.min(wall.b, p.y),
            );
          const dx = p.x - x,
            dy = p.y - y,
            d = Math.hypot(dx, dy);
          if (d <= 0 || d >= 10) continue;
          knots[j] = pt(
            p.x + (dx * (10 - d)) / d,
            p.y + (dy * (10 - d)) / d,
          );
        }
      }
      let guides =
        spacing >= 40 && knots.length > 5
          ? [
              required(knots[0]),
              ...outline(knots.slice(1, -1), 2),
              required(knots[knots.length - 1]),
            ]
          : knots;
      if (shortcut && knots.length > 2) {
        const clean = [required(knots[0])];
        for (let j = 0; j < knots.length - 1; ) {
          const a = required(knots[j]);
          let k = knots.length - 1;
          while (k > j + 1) {
            const b = required(knots[k]);
            if (
              free([a, b], band) &&
              knots
                .slice(j + 1, k)
                .every(
                  (p) =>
                    chordGap(p, a, b) < shortcut,
                )
            )
              break;
            k--;
          }
          clean.push(required(knots[k]));
          j = k;
        }
        guides = clean;
      }
      const path = [
        s,
        ...throughKnots(guides, s.side, t.side),
        t,
      ];
      if (
        !free(path, boxes) ||
        crossesItself(path)
      )
        continue;
      const candidate = materialize(
          w.edge,
          s,
          t,
          path,
          w.corners,
        ),
        contour = profile(candidate);
      if (
        shortcut &&
        contour.path.some(
          (p) =>
            !current.segments.some(
              (seg) =>
                chordGap(p, seg.a, seg.b) <= 9,
            ),
        )
      )
        continue;
      const samples = sampleCurve(path);
      if (
        !aligned(path, s) ||
        !aligned([...path].reverse(), t)
      )
        continue;
      let peak = 0;
      for (
        let j = 1;
        j + 1 < samples.length;
        j++
      ) {
        const a = required(samples[j - 1]),
          b = required(samples[j]),
          c = required(samples[j + 1]);
        const x = b.x - a.x,
          y = b.y - a.y,
          u = c.x - b.x,
          v = c.y - b.y;
        peak = Math.max(
          peak,
          Math.abs(
            Math.atan2(
              x * v - y * u,
              x * u + y * v,
            ),
          ),
        );
      }
      const clearance = Math.min(
        8,
        ...foreign.map((q) =>
          Math.min(
            8,
            ...contour.segments.map((seg) =>
              gap(seg.a, seg.b, q),
            ),
          ),
        ),
      );
      // Prefer nearby fits when two splines clear the same obstacles and lanes.
      let drift = 0;
      for (
        let j = 1;
        j < samples.length - 1;
        j += 4
      ) {
        const at = Math.min(
          length,
          (length * j) / (samples.length - 1),
        );
        drift = Math.max(
          drift,
          distance(
            required(samples[j]),
            sample(at),
          ),
        );
      }
      // A backward-facing socket needs room to turn without widening the detour.
      const retreat = backwards
        ? Math.max(
            0,
            ...contour.path.map(
              (p) => distance(p, t) - span - 20,
            ),
          )
        : 0;
      const shape =
        retreat * 16 +
        Math.max(0, drift - 4) * 2.5 +
        Math.max(0, 7 - clearance) * 8 +
        Math.max(0, peak - 0.46) * 45 +
        contour.turn * 1.5 +
        contour.length * 0.002 +
        Math.abs(lane) * 0.45;
      choices.push({
        wire: candidate,
        shape,
        contour,
      });
      if (
        peak < 0.5 &&
        clearance >= 7 &&
        contour.turn < 4 &&
        neighboursClear(contour, contours, i)
      )
        break;
    }
    if (!choices.length)
      choices.push({
        wire: materialize(
          w.edge,
          s,
          t,
          [...w.points],
          w.corners,
        ),
        shape: 0,
        contour: current,
      });
    return choices;
  });
  const result = [...wires];
  for (let pass = 0; pass < 2; pass++) {
    for (const [
      i,
      choices,
    ] of candidates.entries()) {
      if (choices.length === 1) {
        const choice = required(choices[0]);
        result[i] = choice.wire;
        contours[i] = choice.contour;
        continue;
      }
      let best = Infinity;
      for (const choice of choices) {
        const cost =
          choice.shape +
          contours.reduce(
            (sum, c, j) =>
              sum +
              (i === j
                ? 0
                : conflict(choice.contour, c)),
            0,
          );
        if (cost < best) {
          best = cost;
          result[i] = choice.wire;
          contours[i] = choice.contour;
        }
      }
    }
  }
  for (const [i, w] of result.entries()) {
    if (
      w.edge.route === "step" ||
      w.edge.route === "straight" ||
      w.edge.waypoints?.length ||
      !w.corners
    )
      continue;
    const s = { ...w.source, side: w.sourceSide },
      t = { ...w.target, side: w.targetSide };
    const samples = sampleCurve([...w.points]);
    const walls = boxes.filter(
      (q) =>
        q.id !== w.edge.source &&
        q.id !== w.edge.target &&
        q.r >= required(contours[i]).l - 8 &&
        q.l <= required(contours[i]).r + 8 &&
        q.b >= required(contours[i]).t - 8 &&
        q.t <= required(contours[i]).b + 8,
    );
    const quality = (path: Point[]) => {
      let peak = 0,
        clearance = 8;
      for (const [j, p] of path.entries()) {
        const a = path[j - 1],
          b = path[j + 1];
        if (!a || !b) continue;
        const x = p.x - a.x,
          y = p.y - a.y,
          u = b.x - p.x,
          v = b.y - p.y;
        peak = Math.max(
          peak,
          Math.abs(
            Math.atan2(
              x * v - y * u,
              x * u + y * v,
            ),
          ),
        );
        for (const wall of walls)
          clearance = Math.min(
            clearance,
            gap(a, p, wall),
          );
      }
      return (
        Math.max(0, peak - 0.52) * 30 +
        Math.max(0, 7 - clearance) * 2
      );
    };
    let best = quality(samples);
    if (best < 1) continue;
    let path = samples;
    const others = contours.filter(
      (_, j) => j !== i,
    );
    const cost = (
      wire: ReturnType<typeof profile>,
    ) =>
      others.reduce(
        (n, p) => n + conflict(wire, p),
        0,
      );
    const initial = cost(required(contours[i]));
    // Fair only the crowded bend, keeping each sample inside its original lane.
    for (let pass = 0; pass < 10; pass++) {
      path = path.map((p, j) => {
        const a = path[j - 1],
          b = path[j + 1],
          origin = required(samples[j]);
        if (
          !a ||
          !b ||
          distance(p, s) < 14 ||
          distance(p, t) < 14
        )
          return p;
        let x = (a.x + 2 * p.x + b.x) / 4,
          y = (a.y + 2 * p.y + b.y) / 4;
        for (const q of walls) {
          const dx =
              x - Math.max(q.l, Math.min(q.r, x)),
            dy =
              y - Math.max(q.t, Math.min(q.b, y));
          const d = Math.hypot(dx, dy);
          if (d > 0 && d < 8) {
            x += ((dx * (8 - d)) / d) * 0.5;
            y += ((dy * (8 - d)) / d) * 0.5;
          }
        }
        const dx = x - origin.x,
          dy = y - origin.y,
          scale = Math.min(
            1,
            7 / (Math.hypot(dx, dy) || 1),
          );
        return pt(
          origin.x + scale * dx,
          origin.y + scale * dy,
        );
      });
      if (pass % 3 !== 0) continue;
      const knots = path.filter(
        (_, j) =>
          j % 2 === 0 || j === path.length - 1,
      );
      const fitted = throughKnots(
        knots,
        s.side,
        t.side,
      );
      if (
        !aligned(fitted, s) ||
        !aligned([...fitted].reverse(), t) ||
        !free(fitted, boxes) ||
        crossesItself(fitted)
      )
        continue;
      const value = quality(sampleCurve(fitted));
      if (value + 0.3 >= best) continue;
      const candidate = materialize(
          w.edge,
          s,
          t,
          fitted,
          w.corners,
        ),
        contour = profile(candidate);
      if (cost(contour) > initial + 1) continue;
      best = value;
      result[i] = candidate;
      contours[i] = contour;
    }
  }
  return result;
};
