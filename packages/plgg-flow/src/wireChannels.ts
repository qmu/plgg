import type { Point } from "plgg-board";
import type { Wire } from "./wiring";
import {
  distance,
  pt,
  required,
} from "plgg-flow/wireGeometry";

type Segment = {
  i: number;
  a: Point;
  dx: number;
  dy: number;
  length: number;
};
type Contact = {
  side: number;
  gap: number;
  alignment: number;
};
const cell = (x: number, y: number) =>
  x + "," + y;

// A pair keeps its order through a shared stretch, including small bends.
export const curvedChannels = (wires: Wire[]) => {
  const bins = new Map<string, Segment[]>();
  wires.forEach((w, i) =>
    w.points.forEach((b, j) => {
      const a = w.points[j - 1];
      if (!a) return;
      const length = distance(a, b);
      if (!length) return;
      const seg = {
        i,
        a,
        dx: (b.x - a.x) / length,
        dy: (b.y - a.y) / length,
        length,
      };
      for (
        let x = Math.floor(
          (Math.min(a.x, b.x) - 14) / 32,
        );
        x <=
        Math.floor(
          (Math.max(a.x, b.x) + 14) / 32,
        );
        x++
      )
        for (
          let y = Math.floor(
            (Math.min(a.y, b.y) - 14) / 32,
          );
          y <=
          Math.floor(
            (Math.max(a.y, b.y) + 14) / 32,
          );
          y++
        ) {
          const key = cell(x, y),
            bin = bins.get(key);
          if (bin) bin.push(seg);
          else bins.set(key, [seg]);
        }
    }),
  );
  const sockets = new Map<string, Set<number>>();
  for (const [i, w] of wires.entries())
    for (const p of [w.source, w.target]) {
      const key = cell(p.x, p.y),
        ids =
          sockets.get(key) ?? new Set<number>();
      ids.add(i);
      sockets.set(key, ids);
    }
  return (i: number) => {
    const w = required(wires[i]),
      offsets = w.points.map(() => 0);
    const atSource = required(
        sockets.get(cell(w.source.x, w.source.y)),
      ),
      atTarget = required(
        sockets.get(cell(w.target.x, w.target.y)),
      );
    const encounters = new Map<
      number,
      Map<number, Contact>
    >();
    const normals = w.points.map((p, j) => {
      const a = w.points[j - 1] ?? p,
        b = w.points[j + 1] ?? p,
        d = distance(a, b) || 1;
      const nx = (a.y - b.y) / d,
        ny = (b.x - a.x) / d;
      for (const seg of bins.get(
        cell(
          Math.floor(p.x / 32),
          Math.floor(p.y / 32),
        ),
      ) ?? []) {
        const normalComponent = Math.abs(
          nx * seg.dx + ny * seg.dy,
        );
        if (seg.i === i) continue;
        const alignment =
          atSource.has(seg.i) ||
          atTarget.has(seg.i)
            ? Number(normalComponent <= 0.5)
            : Math.min(
                1,
                Math.max(
                  0,
                  (0.65 - normalComponent) / 0.3,
                ),
              );
        if (!alignment) continue;
        const x = p.x - seg.a.x,
          y = p.y - seg.a.y;
        const t = Math.max(
          0,
          Math.min(
            seg.length,
            x * seg.dx + y * seg.dy,
          ),
        );
        const rx = x - t * seg.dx,
          ry = y - t * seg.dy,
          gap = rx * rx + ry * ry;
        if (gap >= 196) continue;
        let points = encounters.get(seg.i);
        if (!points) {
          points = new Map();
          encounters.set(seg.i, points);
        }
        if (
          gap < (points.get(j)?.gap ?? Infinity)
        )
          points.set(j, {
            side: rx * nx + ry * ny,
            gap,
            alignment,
          });
      }
      return pt(nx, ny);
    });
    for (const [peer, points] of encounters) {
      const indices = [...points.keys()];
      for (
        let begin = 0;
        begin < indices.length;

      ) {
        let end = begin;
        while (
          end + 1 < indices.length &&
          required(indices[end + 1]) ===
            required(indices[end]) + 1
        )
          end++;
        const side = (k: number) =>
          required(
            points.get(required(indices[k])),
          ).side;
        const first = side(begin),
          last = side(end);
        const j = required(indices[begin]),
          n = required(normals[j]),
          v = required(wires[peer]);
        const order =
          (w.source.x +
            w.target.x -
            v.source.x -
            v.target.x) *
            n.x +
          (w.source.y +
            w.target.y -
            v.source.y -
            v.target.y) *
            n.y;
        const tie =
          Math.sign(order) ||
          Math.sign(i - peer) *
            (n.x < 0 || (n.x === 0 && n.y < 0)
              ? -1
              : 1);
        const socket = [w.source, w.target].find(
          (p) =>
            [v.source, v.target].some(
              (q) => p.x === q.x && p.y === q.y,
            ),
        );
        const far =
          socket === w.source
            ? w.target
            : w.source;
        const other =
          socket &&
          socket.x === v.source.x &&
          socket.y === v.source.y
            ? v.target
            : v.source;
        const fan = socket
          ? ((far.x - socket.x) * n.x +
              (far.y - socket.y) * n.y) /
              (distance(socket, far) || 1) -
            ((other.x - socket.x) * n.x +
              (other.y - socket.y) * n.y) /
              (distance(socket, other) || 1)
          : 0;
        // The open end of a shared shoulder fixes its order around obstacles.
        const exit =
          socket === w.source ? last : first;
        const sign =
          (socket && Math.abs(exit) > 2
            ? Math.sign(exit)
            : 0) ||
          Math.sign(fan) ||
          (Math.abs(first) > 2
            ? Math.sign(first)
            : Math.abs(last) > 2
              ? Math.sign(last)
              : tie);
        const crossing =
          !fan && first * last < -4;
        // Passing chords need less displacement than sustained parallel runs.
        let sharedLength = 0;
        for (let k = begin + 1; k <= end; k++) {
          sharedLength += distance(
            required(
              w.points[required(indices[k - 1])],
            ),
            required(
              w.points[required(indices[k])],
            ),
          );
        }
        const strength = socket
          ? Math.min(1, (sharedLength + 8) / 24)
          : Math.min(1, sharedLength / 28);
        const mid = (begin + end) / 2;
        for (let k = begin; k <= end; k++) {
          const j = required(indices[k]),
            desired =
              crossing && k > mid ? -sign : sign;
          offsets[j] =
            required(offsets[j]) +
            strength *
              desired *
              required(points.get(j)).alignment *
              0.7 *
              Math.min(
                1,
                (14 -
                  Math.sqrt(
                    required(points.get(j)).gap,
                  )) /
                  4,
              ) *
              Math.min(
                socket ? 12 : 10,
                Math.max(
                  0,
                  10 - desired * side(k),
                ),
              );
        }
        begin = end + 1;
      }
    }
    return offsets.map((_, j) => {
      let sum = 0,
        weight = 0;
      for (
        let k = Math.max(0, j - 5);
        k <= Math.min(j + 5, offsets.length - 1);
        k++
      ) {
        const f = 6 - Math.abs(j - k);
        sum += f * required(offsets[k]);
        weight += f;
      }
      const n = required(normals[j]);
      return pt(
        (n.x * sum) / weight,
        (n.y * sum) / weight,
      );
    });
  };
};
