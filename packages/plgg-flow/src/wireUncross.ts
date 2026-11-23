import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import type { laneIndex } from "./wireLanes";
import { materialize } from "plgg-flow/wirePath";
import {
  bezier,
  crossesItself,
  distance,
  free,
  pt,
  required,
  simplify,
  type Box,
} from "plgg-flow/wireGeometry";

// Trim both branches at a crossing so the exchanged paths turn without touching.
const join = (
  left: Point[],
  right: Point[],
  p: Point,
  radius: number,
  step: boolean,
) => {
  if (!step) {
    while (
      left.length > 2 &&
      distance(
        required(left[left.length - 1]),
        p,
      ) < radius
    )
      left.pop();
    while (
      right.length > 2 &&
      distance(required(right[0]), p) < radius
    )
      right.shift();
    const a = required(left[left.length - 1]),
      b = required(right[0]),
      prev = left[left.length - 2] ?? p,
      next = right[1] ?? p;
    const arm = distance(a, b) / 3;
    const ca = arm / (distance(prev, a) || 1),
      cb = arm / (distance(b, next) || 1);
    return [
      ...left,
      ...bezier(
        a,
        pt(
          a.x + (a.x - prev.x) * ca,
          a.y + (a.y - prev.y) * ca,
        ),
        pt(
          b.x - (next.x - b.x) * cb,
          b.y - (next.y - b.y) * cb,
        ),
        b,
      ).slice(1, -1),
      ...right,
    ];
  }
  const a = required(left[left.length - 1]),
    b = required(right[0]);
  const da = distance(a, p),
    db = distance(b, p);
  const trim = Math.min(radius, da, db);
  if (trim < 1) return;
  const dx = (a.x - p.x) / da,
    dy = (a.y - p.y) / da,
    x = (b.x - p.x) / db,
    y = (b.y - p.y) / db;
  if (
    Math.abs(dx * dy) > 1e-7 ||
    Math.abs(x * y) > 1e-7 ||
    Math.abs(dx * x + dy * y) > 1e-7
  )
    return;
  const corner = Array.from(
    { length: 7 },
    (_, i) => {
      const t = (i * Math.PI) / 12;
      return pt(
        p.x +
          trim *
            (dx * (1 - Math.sin(t)) +
              x * (1 - Math.cos(t))),
        p.y +
          trim *
            (dy * (1 - Math.sin(t)) +
              y * (1 - Math.cos(t))),
      );
    },
  );
  return [...left, ...corner, ...right];
};
export const uncross = (
  wires: Wire[],
  boxes: Box[],
  lanes: ReturnType<typeof laneIndex>,
  radius: number,
) => {
  let changed = false;
  const tracks = wires.map((w) =>
    simplify(w.points),
  );
  const order = new Map(
    wires.map((w, i) => [w.edge, i]),
  );
  for (let i = 0; i < wires.length; i++) {
    const wire = required(wires[i]),
      partners = new Set<number>();
    lanes.score(
      wire.points,
      wire.edge,
      wire.source,
      wire.target,
      Infinity,
      (edge) => {
        const j = order.get(edge);
        if (j !== undefined && j > i)
          partners.add(j);
      },
    );
    for (const j of partners) {
      const first = required(wires[i]),
        second = required(wires[j]),
        a = first.edge,
        b = second.edge;
      if (
        a.source === a.target ||
        b.source === b.target ||
        a.waypoints?.length ||
        b.waypoints?.length ||
        (a.route === "step") !==
          (b.route === "step") ||
        b.route === "straight" ||
        a.route === "straight"
      )
        continue;
      const shared =
        a.source === b.source ||
        a.target === b.target;
      const reverse =
        a.source !== b.source &&
        a.target === b.target;
      let previous:
        | { p: Point; h: number; k: number }
        | undefined;
      const step = a.route === "step";
      const l = reverse
          ? [...required(tracks[i])].reverse()
          : required(tracks[i]),
        r = reverse
          ? [...required(tracks[j])].reverse()
          : required(tracks[j]);
      const quality = (w: Wire) => {
        const score = lanes.score(
          w.points,
          w.edge,
          w.source,
          w.target,
        );
        return {
          issues:
            score.conflicts +
            Number(score.stiff) +
            Number(score.turn > 6.8) +
            Number(!step && score.kink > 0.72),
          overlap: score.overlap,
        };
      };
      let tried = false;
      for (
        let h = 1;
        h < l.length && !tried;
        h++
      ) {
        const u = required(l[h - 1]),
          v = required(l[h]),
          dx = v.x - u.x,
          dy = v.y - u.y;
        for (
          let k = 1;
          k < r.length && !tried;
          k++
        ) {
          const z = required(r[k - 1]),
            w = required(r[k]);
          if (
            Math.min(z.x, w.x) >
              Math.max(u.x, v.x) ||
            Math.max(z.x, w.x) <
              Math.min(u.x, v.x) ||
            Math.min(z.y, w.y) >
              Math.max(u.y, v.y) ||
            Math.max(z.y, w.y) <
              Math.min(u.y, v.y)
          )
            continue;
          const x = w.x - z.x,
            y = w.y - z.y,
            den = dx * y - dy * x;
          if (!den) continue;
          const t =
              ((z.x - u.x) * y -
                (z.y - u.y) * x) /
              den,
            f =
              ((z.x - u.x) * dy -
                (z.y - u.y) * dx) /
              den;
          if (
            t <= 0 ||
            t >= 1 ||
            f <= 0 ||
            f >= 1
          )
            continue;
          const p = pt(
            u.x + dx * t,
            u.y + dy * t,
          );
          if (
            distance(p, required(l[0])) < 30 ||
            distance(p, required(r[0])) < 30
          )
            continue;
          const rounded = (
            prefix: Point[],
            at: number,
            suffix: Point[],
            after: number,
          ) => {
            let left = at - 1,
              right = after;
            if (!step) {
              while (
                left > 1 &&
                distance(
                  required(prefix[left]),
                  p,
                ) < 28
              )
                left--;
              while (
                right < suffix.length - 2 &&
                distance(
                  required(suffix[right]),
                  p,
                ) < 28
              )
                right++;
            }
            return join(
              prefix.slice(0, left + 1),
              suffix.slice(right),
              p,
              step ? radius : 28,
              step,
            );
          };
          let pathA: Point[] | undefined,
            pathB: Point[] | undefined;
          if (shared) {
            pathA = rounded(r, k, l, h);
            pathB = rounded(l, h, r, k);
          } else {
            const last = previous;
            previous = { p, h, k };
            if (
              !last ||
              h === last.h ||
              k === last.k
            )
              continue;
            // Exchange the middle runs to remove both crossings in a lens.
            const exchange = (
              prefix: Point[],
              lo: number,
              hi: number,
              middle: Point[],
              start: Point,
              end: Point,
            ) => {
              if (!middle.length) return;
              const head = join(
                prefix.slice(0, lo),
                middle,
                start,
                step ? radius : 24,
                step,
              );
              return (
                head &&
                join(
                  head,
                  prefix.slice(hi),
                  end,
                  step ? radius : 24,
                  step,
                )
              );
            };
            const left = l.slice(last.h, h),
              right = r.slice(
                Math.min(k, last.k),
                Math.max(k, last.k),
              );
            pathA = exchange(
              l,
              last.h,
              h,
              k > last.k
                ? right
                : right.reverse(),
              last.p,
              p,
            );
            pathB = exchange(
              r,
              Math.min(k, last.k),
              Math.max(k, last.k),
              k > last.k ? left : left.reverse(),
              k > last.k ? last.p : p,
              k > last.k ? p : last.p,
            );
          }
          if (
            !pathA ||
            !pathB ||
            !free(pathA, boxes) ||
            !free(pathB, boxes) ||
            crossesItself(pathA) ||
            crossesItself(pathB)
          )
            continue;
          const swap = (
            own: Wire,
            peer: Wire,
            path: Point[],
          ) => {
            const from =
                !shared || reverse ? own : peer,
              to =
                !shared || !reverse ? own : peer;
            return materialize(
              own.edge,
              {
                ...from.source,
                side: from.sourceSide,
              },
              {
                ...to.target,
                side: to.targetSide,
              },
              reverse ? path.reverse() : path,
              own.corners,
            );
          };
          const wa = swap(first, second, pathA),
            wb = swap(second, first, pathB);
          const prev =
            quality(first).issues +
            quality(second).issues;
          lanes.remove(first.edge);
          lanes.remove(second.edge);
          lanes.insert(wa);
          lanes.insert(wb);
          const qa = quality(wa),
            qb = quality(wb);
          if (
            qa.overlap < 14 &&
            qb.overlap < 14 &&
            qa.issues + qb.issues < prev
          ) {
            changed = true;
            wires[i] = wa;
            wires[j] = wb;
            tracks[i] = simplify(wa.points);
            tracks[j] = simplify(wb.points);
          } else {
            lanes.insert(first);
            lanes.insert(second);
          }
          tried = true;
        }
      }
    }
  }
  return changed;
};
