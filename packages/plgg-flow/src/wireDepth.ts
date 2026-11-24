import type { Point3 } from "plgg-board";
type Sample = Point3 & { scale: number };
export type Occluder = Readonly<{
  left: number;
  right: number;
  top: number;
  bottom: number;
  depth: number;
}>;

// Clip the projected segment before comparing depths. A wire can cross
// the plane of a distant card without crossing the card itself.
const interval = (
  start: number,
  end: number,
  low: number,
  high: number,
): readonly [number, number] => {
  if (start === end)
    return start >= low && start <= high
      ? [0, 1]
      : [1, 0];
  const a = (low - start) / (end - start),
    b = (high - start) / (end - start);
  return [Math.min(a, b), Math.max(a, b)];
};
const straddles = (
  points: readonly Sample[],
  box: Occluder,
) => {
  if (
    box.left > box.right ||
    box.top > box.bottom
  )
    return false;
  let front = false,
    behind = false;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!;
    const x = interval(
        a.x,
        b.x,
        box.left,
        box.right,
      ),
      y = interval(a.y, b.y, box.top, box.bottom);
    const lo = Math.max(0, x[0], y[0]),
      hi = Math.min(1, x[1], y[1]);
    if (lo > hi) continue;
    const near = a.z + (b.z - a.z) * lo,
      far = a.z + (b.z - a.z) * hi;
    behind ||= Math.min(near, far) < box.depth;
    front ||= Math.max(near, far) > box.depth;
    if (front && behind) return true;
  }
  return false;
};
export const wireDepthRuns = (
  points: readonly Sample[],
  boxes: readonly Occluder[],
): readonly (readonly Sample[])[] => {
  if (points.length < 2) return [];
  const planes = [
    ...new Set(
      boxes
        .filter((box) => straddles(points, box))
        .map((box) => box.depth),
    ),
  ].sort((a, b) => a - b);
  if (!planes.length) return [points];
  const runs: Sample[][] = [];
  let band = -1;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!,
      b = points[i]!;
    const crossings = planes
      .map((z) => (z - a.z) / (b.z - a.z))
      .filter((t) => t > 0 && t < 1)
      .sort((a, b) => a - b);
    let start = a;
    for (const t of [...crossings, 1]) {
      const end =
        t === 1
          ? b
          : {
              x: a.x + (b.x - a.x) * t,
              y: a.y + (b.y - a.y) * t,
              z: a.z + (b.z - a.z) * t,
              scale:
                a.scale + (b.scale - a.scale) * t,
            };
      const next = planes.filter(
        (z) => z <= (start.z + end.z) / 2,
      ).length;
      if (next !== band) runs.push([start]);
      runs[runs.length - 1]!.push(end);
      start = end;
      band = next;
    }
  }
  return runs;
};
