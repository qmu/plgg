import type { Point } from "plgg-board";
import type { Socket } from "./wireBase";
import {
  normal,
  move,
  vertical,
  required,
  simplify,
  free,
  inflate,
  pt,
  type Box,
} from "plgg-flow/wireGeometry";

// Slide the remaining elbows into a clear strip when a detour can be removed.
export const shortcuts = (
  s: Socket,
  t: Socket,
  boxes: Box[],
  source: string,
  target: string,
) => {
  const paths: Point[][] = [];
  const clear = boxes.map((q) =>
    q.id === source || q.id === target
      ? q
      : inflate(q, 7),
  );
  const add = (raw: Point[]) => {
    const path = simplify(raw);
    if (path.length < 3) return;
    const valid = (socket: Socket, p: Point) => {
      const n = normal[socket.side],
        x = p.x - socket.x,
        y = p.y - socket.y;
      return (
        x * n.x + y * n.y >= 14 &&
        Math.abs(x * n.y - y * n.x) < 0.01
      );
    };
    if (
      valid(s, required(path[1])) &&
      valid(t, required(path[path.length - 2])) &&
      free(path, clear)
    )
      paths.push(path);
  };
  const v = vertical(s.side),
    axis = v ? "y" : "x",
    across = v ? "x" : "y";
  if (v !== vertical(t.side)) {
    add([s, { ...s, [axis]: t[axis] }, t]);
    for (const a of [16, 28, 40])
      for (const b of [16, 28, 40]) {
        const l = move(s, s.side, a),
          r = move(t, t.side, b);
        add([
          s,
          l,
          v ? pt(r.x, l.y) : pt(l.x, r.y),
          r,
          t,
        ]);
      }
  } else if (s.side !== t.side) {
    const a = move(s, s.side, 15)[axis],
      b = move(t, t.side, 15)[axis],
      lo = Math.min(a, b),
      hi = Math.max(a, b);
    if ((b - a) * normal[s.side][axis] <= 0)
      return paths;
    const stops = new Set([lo, hi]);
    for (const q of clear) {
      if (
        (v ? q.l : q.t) >
          Math.max(s[across], t[across]) ||
        (v ? q.r : q.b) <
          Math.min(s[across], t[across])
      )
        continue;
      for (const level of v
        ? [q.t, q.b]
        : [q.l, q.r])
        if (level > lo && level < hi)
          stops.add(level);
    }
    const levels = [...stops].sort(
      (a, b) => a - b,
    );
    const trial = new Set([
      a,
      b,
      (a + b) / 2,
      ...levels
        .slice(1)
        .map(
          (x, j) => (x + required(levels[j])) / 2,
        ),
    ]);
    for (const level of trial)
      add([
        s,
        { ...s, [axis]: level },
        { ...t, [axis]: level },
        t,
      ]);
  }
  return paths;
};
