import type { Point } from "plgg-board";
import {
  required,
  pt,
  distance,
  cuts,
  simplify,
  type Box,
  inflate,
} from "plgg-flow/wireGeometry";
// Discover blocking rectangles lazily so clear corridors need no graph.
export const search = (
  s: Point,
  t: Point,
  boxes: Box[],
  step: boolean,
  monotone: boolean | Point = false,
  cornerAllowed?: (
    corner: Point,
    obstacle: Box,
  ) => boolean,
  cornerPadding = 0,
) => {
  if (
    typeof monotone === "object" &&
    (t.x - s.x) * monotone.x +
      (t.y - s.y) * monotone.y <
      -1e-8
  )
    return;
  const estimate = (p: Point) =>
    step
      ? Math.abs(t.x - p.x) + Math.abs(t.y - p.y)
      : distance(p, t);
  if (
    !boxes.some((q) => cuts(s, t, q)) &&
    (!step || s.x === t.x || s.y === t.y)
  )
    return [s, t];
  if (step && s.x !== t.x && s.y !== t.y) {
    for (const bend of [
      pt(t.x, s.y),
      pt(s.x, t.y),
    ]) {
      if (
        !boxes.some(
          (q) =>
            cuts(s, bend, q) || cuts(bend, t, q),
        )
      )
        return [s, bend, t];
    }
  }
  const vertices = [s, t],
    seen = new Set<Box>();
  const costs = [0, Infinity],
    parent: number[] = [-1, -1],
    turns: (Point | undefined)[] = [];
  const done = new Set<number>(),
    heuristic = [estimate(s), 0],
    expandedCost: number[] = [],
    expandedTo: number[] = [];

  for (;;) {
    let best = Infinity,
      at = -1;
    for (let i = 0; i < vertices.length; i++) {
      const score =
        (costs[i] ?? Infinity) +
        (heuristic[i] ?? Infinity);
      if (!done.has(i) && score < best) {
        best = score;
        at = i;
      }
    }
    if (at < 0) return undefined;
    if (at === 1) {
      const path: Point[] = [];
      while (at >= 0) {
        path.push(required(vertices[at]));
        const bend = turns[at];
        if (bend) path.push(bend);
        at = parent[at] ?? -1;
      }
      return simplify(path.reverse());
    }
    done.add(at);
    const a = required(vertices[at]);
    const cost = costs[at] ?? Infinity;
    const begin =
      expandedCost[at] === cost
        ? (expandedTo[at] ?? 1)
        : 1;
    expandedCost[at] = cost;
    for (
      let i = begin;
      i < vertices.length;
      i++
    ) {
      if (i === at || done.has(i)) continue;
      const b = required(vertices[i]);
      if (
        typeof monotone === "object"
          ? (b.x - a.x) * monotone.x +
              (b.y - a.y) * monotone.y <
            -1e-8
          : monotone &&
            ((b.x - a.x) * (t.x - s.x) < 0 ||
              (b.y - a.y) * (t.y - s.y) < 0)
      )
        continue;
      for (const turn of step &&
      a.x !== b.x &&
      a.y !== b.y
        ? [pt(b.x, a.y), pt(a.x, b.y)]
        : [undefined]) {
        const d =
          (costs[at] ?? 0) +
          (turn
            ? Math.abs(a.x - b.x) +
              Math.abs(a.y - b.y) +
              4
            : distance(a, b));
        if (
          d >= (costs[i] ?? Infinity) ||
          (i !== 1 &&
            d + required(heuristic[i]) >=
              required(costs[1]))
        )
          continue;
        const block = boxes.find(
          (q) =>
            cuts(a, turn ?? b, q) ||
            (turn && cuts(turn, b, q)),
        );
        if (block) {
          if (!seen.has(block)) {
            seen.add(block);
            const rim = cornerPadding
              ? inflate(block, cornerPadding)
              : block;
            const corners = [
              pt(rim.l, rim.t),
              pt(rim.r, rim.t),
              pt(rim.l, rim.b),
              pt(rim.r, rim.b),
            ];
            vertices.push(
              ...(cornerAllowed
                ? corners.filter((p) =>
                    cornerAllowed(p, block),
                  )
                : corners),
            );
            for (
              let j = heuristic.length;
              j < vertices.length;
              j++
            )
              heuristic.push(
                estimate(required(vertices[j])),
              );
            // Previously settled corners can see newly discovered vertices.
            done.clear();
          }
        } else {
          costs[i] = d;
          parent[i] = at;
          turns[i] = turn;
        }
      }
    }
    expandedTo[at] = vertices.length;
  }
};
