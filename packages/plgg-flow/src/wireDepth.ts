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

// Group crossing parameters by projected segment. The small span on
// either side of a crossing sorts at the depth of the intersection.
export const crossingSpans = (
  paths: readonly (readonly Point3[])[],
) => {
  const crossings = paths.map((path) =>
    path.slice(1).map(
      () =>
        new Array<{
          t: number;
          over: boolean;
        }>(),
    ),
  );
  for (const [i, path] of paths.entries()) {
    for (let j = 1; j < path.length; j++) {
      const a = path[j - 1]!,
        b = path[j]!,
        dx = b.x - a.x,
        dy = b.y - a.y;
      for (let k = 0; k < i; k++) {
        const other = paths[k]!;
        for (let n = 1; n < other.length; n++) {
          const c = other[n - 1]!,
            d = other[n]!,
            ex = d.x - c.x,
            ey = d.y - c.y;
          const det = dx * ey - dy * ex;
          if (Math.abs(det) < 1e-8) continue;
          const x = c.x - a.x,
            y = c.y - a.y,
            t = (x * ey - y * ex) / det,
            u = (x * dy - y * dx) / det;
          if (
            t <= 0 ||
            t >= 1 ||
            u <= 0 ||
            u >= 1
          )
            continue;
          const over =
            a.z + t * (b.z - a.z) >=
            c.z + u * (d.z - c.z);
          crossings[i]![j - 1]!.push({ t, over });
          crossings[k]![n - 1]!.push({
            t: u,
            over: !over,
          });
        }
      }
    }
  }
  return crossings;
};
export const crossingRuns = (
  points: readonly Sample[],
  spans: ReturnType<typeof crossingSpans>[number],
  boxes: readonly Occluder[],
) => {
  const runs: {
    run: readonly Sample[];
    halo: boolean;
    depth: number;
  }[] = [];
  let arc: Sample[] = [];
  const flush = () => {
    if (arc.length > 1)
      for (const run of wireDepthRuns(arc, boxes))
        runs.push({
          run,
          halo: false,
          depth:
            (run[0]!.z + run[run.length - 1]!.z) /
            2,
        });
    arc = [];
  };
  points.slice(1).forEach((b, i) => {
    const a = points[i]!,
      cuts = spans[i]!,
      len = Math.hypot(b.x - a.x, b.y - a.y);
    // Keep the samples of an uninterrupted fillet in one SVG path.
    if (
      !cuts.length &&
      Math.hypot(
        b.x - a.x,
        b.y - a.y,
        b.z - a.z,
      ) < 4
    ) {
      if (!arc.length) arc.push(a);
      arc.push(b);
      return;
    }
    flush();
    const breaks = [
      0,
      ...cuts.flatMap(({ t }) => [
        Math.max(0, t - 3 / len),
        Math.min(1, t + 3 / len),
      ]),
      1,
    ].sort((x, y) => x - y);
    const at = (t: number) => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      scale: a.scale + (b.scale - a.scale) * t,
    });
    runs.push(
      ...breaks.slice(1).flatMap((hi, j) => {
        const lo = breaks[j]!;
        if (hi === lo) return [];
        const mid = (lo + hi) / 2,
          cross = cuts.find(
            (c) => Math.abs(c.t - mid) * len <= 3,
          );
        return wireDepthRuns(
          [at(lo), at(hi)],
          boxes,
        ).map((run) => ({
          run,
          halo: cross?.over ?? false,
          depth: cross
            ? at(cross.t).z
            : (run[0]!.z +
                run[run.length - 1]!.z) /
              2,
        }));
      }),
    );
  });
  flush();
  return runs;
};
