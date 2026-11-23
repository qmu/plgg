import { push, pop } from "plgg-flow/frontier";
import type { Point } from "plgg-board";
import {
  required,
  pt,
  distance,
  cuts,
  simplify,
  type Box,
} from "plgg-flow/wireGeometry";
// Discover blocking rectangles lazily so clear corridors need no graph.
export const search = (
  s: Point,
  t: Point,
  boxes: Box[],
  step: boolean,
) => {
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
            vertices.push(
              pt(block.l, block.t),
              pt(block.r, block.t),
              pt(block.l, block.b),
              pt(block.r, block.b),
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
// A congested shortest path needs additional lanes between obstacle corners.
export const laneSearch = (
  s: Point,
  t: Point,
  boxes: Box[],
  step: boolean,
  startNormal: Point,
  endNormal: Point,
  toll: (a: Point, b: Point) => number,
) => {
  const lines = (a: number, b: number) => {
    const lo = Math.min(a, b) - 80,
      hi = Math.max(a, b) + 80;
    const coords = [a, b, (a + b) / 2];
    const stride = Math.max(
      32,
      Math.ceil((hi - lo) / 50),
    );
    for (
      let v = Math.ceil(lo / stride) * stride;
      v < hi;
      v += stride
    )
      if (
        Math.min(
          Math.abs(a - v),
          Math.abs(b - v),
          Math.abs((a + b) / 2 - v),
        ) >= 8
      )
        coords.push(v);
    return [...new Set(coords)].sort(
      (x, y) => x - y,
    );
  };
  const xs = lines(s.x, t.x),
    ys = lines(s.y, t.y),
    width = xs.length;
  const points = ys.flatMap((y) =>
    xs.map((x) => pt(x, y)),
  );
  const start =
      xs.indexOf(s.x) + ys.indexOf(s.y) * width,
    goal =
      xs.indexOf(t.x) + ys.indexOf(t.y) * width;
  const cost = new Float64Array(
      points.length,
    ).fill(Infinity),
    parent = new Int32Array(points.length).fill(
      -1,
    ),
    dir = new Int8Array(points.length).fill(-1);
  const open: { at: number; priority: number }[] =
    [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    ...(step
      ? []
      : [
          [1, 1],
          [-1, 1],
          [1, -1],
          [-1, -1],
        ]),
  ];
  const done = new Uint8Array(points.length);
  cost[start] = 0;
  push(open, { at: start, priority: 0 });
  while (open.length) {
    const { at } = required(pop(open));
    if (done[at]) continue;
    done[at] = 1;
    if (at === goal) {
      const path: Point[] = [];
      let i = at;
      while (i >= 0) {
        path.push(required(points[i]));
        i = parent[i] ?? -1;
      }
      return simplify(path.reverse());
    }
    const a = required(points[at]),
      x = at % width,
      y = Math.floor(at / width);
    for (const [k, pair] of dirs.entries()) {
      const nx = x + required(pair[0]),
        ny = y + required(pair[1]);
      if (
        nx < 0 ||
        nx >= width ||
        ny < 0 ||
        ny >= ys.length
      )
        continue;
      const i = ny * width + nx,
        b = required(points[i]);
      if (done[i]) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        departure =
          dx * startNormal.x + dy * startNormal.y,
        arrival =
          dx * endNormal.x + dy * endNormal.y;
      if (
        (at === start && departure < 0) ||
        (i === goal && arrival > 0)
      )
        continue;
      const bend =
        at === start
          ? departure === 0
          : dir[at] !== k;
      const base =
        required(cost[at]) +
        distance(a, b) +
        (bend ? 30 : 0) +
        (i === goal && arrival === 0 ? 20 : 0);
      if (
        base >= required(cost[i]) ||
        boxes.some((q) => cuts(a, b, q))
      )
        continue;
      const value = base + toll(a, b);
      if (value < required(cost[i])) {
        parent[i] = at;
        dir[i] = k;
        cost[i] = value;
        push(open, {
          at: i,
          priority:
            value +
            (step
              ? Math.abs(t.x - b.x) +
                Math.abs(t.y - b.y)
              : distance(b, t)),
        });
      }
    }
  }
  return undefined;
};
