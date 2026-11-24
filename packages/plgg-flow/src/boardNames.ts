import {
  project,
  type Camera,
  type Point,
  type Point3,
} from "plgg-board";
import type { Edge } from "./model";
import type { cardBounds } from "plgg-flow/nodeBody";
type Board = { points: Point3[]; text: string };
type Rect = ReturnType<typeof cardBounds>[number];
const overlaps = (a: Rect, b: Rect) =>
  a.left < b.right &&
  b.left < a.right &&
  a.top < b.bottom &&
  b.top < a.bottom;
const intersects = (
  box: Rect,
  points: Point[],
) => {
  const normals = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
  ];
  for (const [i, p] of points.entries()) {
    const q = points[(i + 1) % points.length]!;
    if (p.x !== q.x || p.y !== q.y)
      normals.push({
        x: p.y - q.y,
        y: q.x - p.x,
      });
  }
  return normals.every((n) => {
    const offsets = points.map(
      (p) => n.x * p.x + n.y * p.y,
    );
    const cx = (box.left + box.right) / 2,
      cy = (box.top + box.bottom) / 2;
    const radius =
      (Math.abs(n.x) * (box.right - box.left) +
        Math.abs(n.y) * (box.bottom - box.top)) /
      2;
    const middle = cx * n.x + cy * n.y;
    return (
      middle + radius >= Math.min(...offsets) &&
      middle - radius <= Math.max(...offsets)
    );
  });
};
const previous = new WeakMap<object, number[]>();
export const boardNames = (
  boards: Board[],
  cards: Rect[],
  edges: readonly Edge[],
  camera: Camera,
  key: object,
) => {
  if (!boards.length) return [];
  const at = project(camera),
    polygons = boards.map((b) => {
      const points = b.points.map(at);
      if (points.length <= 4) return points;
      const sorted = points.sort(
        (a, b) => a.x - b.x || a.y - b.y,
      );
      const chain = (input: Point3[]) => {
        const out: Point3[] = [];
        for (const p of input) {
          while (out.length >= 2) {
            const a = out[out.length - 2]!,
              b = out[out.length - 1]!;
            if (
              (b.x - a.x) * (p.y - a.y) >
              (b.y - a.y) * (p.x - a.x)
            )
              break;
            out.pop();
          }
          out.push(p);
        }
        out.pop();
        return out;
      };
      return [
        ...chain(sorted),
        ...chain([...sorted].reverse()),
      ];
    });
  const wires = edges.flatMap((e) => {
    const points = e.path?.map(at) ?? [];
    return points
      .slice(1)
      .map((p, i) => [points[i]!, p]);
  });
  const choices = boards.map((b, i) => {
    const points = polygons[i]!;
    const cx =
        points.reduce((s, p) => s + p.x, 0) /
        points.length,
      cy =
        points.reduce((s, p) => s + p.y, 0) /
        points.length;
    const half =
      (13 * Array.from(b.text).length) / 2;
    return Array.from(
      { length: 8 },
      (_, index) => {
        const k = Math.floor(
          ((index % 4) * points.length) / 4,
        );
        const p = points[k]!,
          q = points[(k + 1) % points.length]!;
        const anchor =
          index < 4
            ? p
            : {
                x: (p.x + q.x) / 2,
                y: (p.y + q.y) / 2,
                z: (p.z + q.z) / 2,
              };
        const dx = anchor.x - cx,
          dy = anchor.y - cy,
          len = Math.hypot(dx, dy) || 1;
        const nx = dx / len,
          ny = dy / len;
        const distance =
          10 +
          half * Math.abs(nx) +
          8 * Math.abs(ny);
        const x = anchor.x + nx * distance,
          y = anchor.y + ny * distance;
        const box = {
          left: x - half,
          right: x + half,
          top: y - 8,
          bottom: y + 8,
        };
        const penalty =
          cards.filter((c) => overlaps(box, c))
            .length *
            1e7 +
          polygons.filter((poly) =>
            intersects(box, poly),
          ).length *
            1e5 +
          wires.filter((w) => intersects(box, w))
            .length *
            100;
        return {
          index,
          anchor,
          x,
          y,
          box,
          penalty,
          score:
            penalty +
            Number(dx > 0) * 10 -
            anchor.z * 0.0001,
        };
      },
    );
  });
  const cost = (indices: number[]) =>
    indices.reduce((s, n, i) => {
      const c = choices[i]![n]!;
      return (
        s +
        c.score +
        indices
          .slice(0, i)
          .filter((j, k) =>
            overlaps(c.box, choices[k]![j]!.box),
          ).length *
          1e7
      );
    }, 0);
  const common = Array.from(
    { length: 8 },
    (_, i) => boards.map(() => i),
  ).sort((a, b) => cost(a) - cost(b));
  let indices = common[0]!;
  const clean = (ids: number[]) =>
    ids.every(
      (n, i) =>
        choices[i]![n]!.penalty === 0 &&
        ids
          .slice(0, i)
          .every(
            (j, k) =>
              !overlaps(
                choices[i]![n]!.box,
                choices[k]![j]!.box,
              ),
          ),
    );
  const old = previous.get(key);
  if (
    old?.length === choices.length &&
    clean(old) &&
    (!clean(indices) ||
      old.every((n) => n === old[0]))
  )
    indices = old;
  else if (!clean(indices)) {
    indices = [...indices];
    for (let i = 0; i < indices.length; i++) {
      let best = cost(indices);
      for (const c of choices[i]!) {
        const trial = indices.slice();
        trial[i] = c.index;
        const score = cost(trial);
        if (score < best) {
          indices = trial;
          best = score;
        }
      }
    }
  }
  previous.set(key, indices);
  return indices.map(
    (index, i) => choices[i]![index]!,
  );
};
