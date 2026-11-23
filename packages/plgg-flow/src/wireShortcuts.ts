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
  guide?: Point[],
) => {
  const paths: Point[][] = [];
  const clear = boxes.map((q) =>
    q.id === source || q.id === target
      ? q
      : inflate(q, 7),
  );
  const seen = new Set<string>();
  const add = (raw: Point[]) => {
    const path = simplify(raw);
    if (
      path.length < 3 ||
      path.some((p, j) => {
        const prev = path[j - 1],
          before = path[j - 2];
        return (
          prev !== undefined &&
          before !== undefined &&
          (p.x - prev.x) * (prev.x - before.x) +
            (p.y - prev.y) * (prev.y - before.y) <
            0
        );
      })
    )
      return;
    const valid = (socket: Socket, p: Point) => {
      const n = normal[socket.side],
        x = p.x - socket.x,
        y = p.y - socket.y;
      return (
        x * n.x + y * n.y >= 14 &&
        Math.abs(x * n.y - y * n.x) < 0.01
      );
    };
    const key = path
      .slice(1, -1)
      .map((p) => [p.x, p.y].join(","))
      .join("|");
    if (seen.has(key)) return;
    seen.add(key);
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

    // A card across both approaches can be bypassed along either clear face.
    for (const wall of clear) {
      if (
        wall.id === source ||
        wall.id === target
      )
        continue;
      const near = v ? wall.t : wall.l,
        far = v ? wall.b : wall.r;
      const low = v ? wall.l : wall.t,
        high = v ? wall.r : wall.b;
      if (
        near <= lo ||
        far >= hi ||
        low > Math.max(s[across], t[across]) ||
        high < Math.min(s[across], t[across])
      )
        continue;
      for (const level of [low, high]) {
        const first = { ...s, [axis]: a },
          last = { ...t, [axis]: b };
        add([
          s,
          first,
          { ...first, [across]: level },
          { ...last, [across]: level },
          last,
          t,
        ]);
      }
    }
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
      ...[6, 12, 20, 30, 44]
        .flatMap((d) => [lo + d, hi - d])
        .filter((x) => x >= lo && x <= hi),
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
  if (guide) {
    // Reuse nearby clear tracks while moving the first and last bends together.
    const exits = (socket: Socket) => {
      const along = vertical(socket.side)
        ? "y"
        : "x";
      const levels = new Set([14, 32]);
      // Keep the existing shoulder available beside the standard reaches.
      const bend =
        socket === s
          ? guide[1]
          : guide[guide.length - 2];
      if (bend) {
        const reach =
          (bend[along] - socket[along]) *
          normal[socket.side][along];
        if (reach >= 14) levels.add(reach);
      }
      return [...levels];
    };
    const starts = exits(s),
      ends = exits(t);
    const lanes = new Set(
      guide.map((p) => p[across]),
    );
    for (const box of clear) {
      for (const level of v
        ? [box.l, box.r]
        : [box.t, box.b]) {
        if (
          guide.some(
            (p) =>
              Math.abs(level - p[across]) < 44,
          )
        )
          lanes.add(level);
      }
    }
    if (s.side === t.side) {
      const n = normal[s.side][axis];
      const outside =
        n > 0
          ? Math.max(s[axis], t[axis])
          : Math.min(s[axis], t[axis]);
      for (const d of [14, 20, 28, 38, 50, 64])
        add([
          s,
          { ...s, [axis]: outside + d * n },
          { ...t, [axis]: outside + d * n },
          t,
        ]);
    }
    if (v !== vertical(t.side)) {
      for (const left of starts)
        for (const right of ends) {
          const a = move(s, s.side, left),
            b = move(t, t.side, right);
          add([
            s,
            a,
            { ...a, [across]: b[across] },
            b,
            t,
          ]);
        }
    } else {
      for (const lane of lanes)
        for (const left of starts)
          for (const right of ends) {
            const a = move(s, s.side, left),
              b = move(t, t.side, right);
            if (
              (b[axis] - a[axis]) *
                normal[s.side][axis] >=
                0 &&
              (lane === s[across] ||
                lane === t[across])
            )
              continue;
            add([
              s,
              a,
              { ...a, [across]: lane },
              { ...b, [across]: lane },
              b,
              t,
            ]);
          }
    }
  }
  return paths;
};
