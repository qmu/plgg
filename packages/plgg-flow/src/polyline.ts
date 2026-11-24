import type { Point3 } from "plgg-board";
export const polylineSampler = (
  points: readonly Point3[],
) => {
  const lengths = [0];
  let length = 0;
  points.forEach((p, i) => {
    const previous = points[i - 1];
    if (previous) {
      length += Math.hypot(
        p.x - previous.x,
        p.y - previous.y,
        p.z - previous.z,
      );
      lengths.push(length);
    }
  });
  return (t: number): Point3 => {
    const target =
      Math.min(1, Math.max(0, t)) * length;
    let lo = 0,
      hi = lengths.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if ((lengths[mid] ?? 0) < target)
        lo = mid + 1;
      else hi = mid;
    }
    const p = points[lo] ?? { x: 0, y: 0, z: 0 },
      q = points[lo - 1] ?? p,
      start = lengths[lo - 1] ?? 0,
      span = (lengths[lo] ?? 0) - start,
      f = span ? (target - start) / span : 0;
    return {
      x: q.x + (p.x - q.x) * f,
      y: q.y + (p.y - q.y) * f,
      z: q.z + (p.z - q.z) * f,
    };
  };
};

/** Simplify a world-space trace. Each omitted sample lies within tolerance
 * of its replacement segment. Balanced fallback bounds subdivision depth. */
export const simplifyTrace = (
  points: readonly Point3[],
  tolerance: number,
): readonly Point3[] => {
  if (
    points.length < 3 ||
    !Number.isFinite(tolerance) ||
    tolerance < 0
  )
    return points;
  const last = points.length - 1,
    keep = new Set([0, last]),
    stack: [number, number][] = [[0, last]];
  while (stack.length) {
    const range = stack.pop();
    if (!range) break;
    const [lo, hi] = range,
      a = points[lo],
      b = points[hi];
    if (!a || !b || hi - lo < 2) continue;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      dz = b.z - a.z,
      span = dx * dx + dy * dy + dz * dz;
    let max = tolerance * tolerance,
      split = lo;
    for (let i = lo + 1; i < hi; i++) {
      const p = points[i];
      if (!p) continue;
      const x = p.x - a.x,
        y = p.y - a.y,
        z = p.z - a.z;
      const t = span
        ? Math.min(
            1,
            Math.max(
              0,
              (x * dx + y * dy + z * dz) / span,
            ),
          )
        : 0;
      const distance =
        (x - t * dx) ** 2 +
        (y - t * dy) ** 2 +
        (z - t * dz) ** 2;
      if (distance > max) {
        max = distance;
        split = i;
      }
    }
    if (split === lo) continue;
    if (
      Math.min(split - lo, hi - split) <
      (hi - lo) / 8
    )
      split = Math.floor((hi + lo) / 2);
    keep.add(split);
    stack.push([lo, split], [split, hi]);
  }
  return keep.size === points.length
    ? points
    : points.filter((_, i) => keep.has(i));
};

export const bridgePoints = (
  points: readonly Point3[],
  lift: number | undefined,
  flat: boolean,
) => {
  const first = points[0],
    last = points[points.length - 1];
  if (flat || !lift || !first || !last)
    return points;
  const z = Math.max(first.z, last.z) + lift;
  return [
    first,
    ...points.map((p) => ({ ...p, z })),
    last,
  ];
};
