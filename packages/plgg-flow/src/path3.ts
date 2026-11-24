import type { Point3 } from "plgg-board";
import { fillet } from "plgg-flow/wireCurve";
const axes = [
  "x",
  "y",
  "z",
] satisfies (keyof Point3)[];
const length = (p: Point3) =>
  Math.hypot(p.x, p.y, p.z);
const minus = (a: Point3, b: Point3) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const dot = (a: Point3, b: Point3) =>
  a.x * b.x + a.y * b.y + a.z * b.z;
export const simplifyPath = (
  path: readonly Point3[],
) => {
  const result: Point3[] = [];
  for (const p of path) {
    const b = result[result.length - 1],
      a = result[result.length - 2];
    if (b && axes.every((k) => p[k] === b[k]))
      continue;
    if (
      a &&
      b &&
      axes.some(
        (k) =>
          axes.every(
            (j) =>
              j === k ||
              (a[j] === b[j] && b[j] === p[j]),
          ) && (b[k] - a[k]) * (p[k] - b[k]) >= 0,
      )
    )
      result.pop();
    result.push(p);
  }
  return result;
};
// Each corner lies in a plane. Round it with the ordinary wire
// fillet in that plane, then lift its samples back into the sheet.
export const filletPath = (
  path: readonly Point3[],
) => {
  const points = [path[0]!];
  for (let i = 1; i < path.length - 1; i++) {
    const p = path[i]!,
      u = minus(path[i - 1]!, p),
      v = minus(path[i + 1]!, p);
    const a = length(u),
      b = length(v);
    if (!a || !b) continue;
    const x = dot(u, v) / a,
      y = Math.sqrt(Math.max(0, b * b - x * x));
    if (y < 1e-6) {
      points.push(p);
      continue;
    }
    const ex = {
      x: u.x / a,
      y: u.y / a,
      z: u.z / a,
    };
    const ey = {
      x: (v.x - x * ex.x) / y,
      y: (v.y - x * ex.y) / y,
      z: (v.z - x * ex.z) / y,
    };
    const arc = fillet(
      [
        { x: a, y: 0 },
        { x: 0, y: 0 },
        { x, y },
      ],
      Math.min(8, a / 2, b / 2),
    );
    for (const q of arc.slice(1, -1))
      points.push({
        x: p.x + q.x * ex.x + q.y * ey.x,
        y: p.y + q.x * ex.y + q.y * ey.y,
        z: p.z + q.x * ex.z + q.y * ey.z,
      });
  }
  points.push(path[path.length - 1]!);
  return points;
};
export const movePath = (
  path: readonly Point3[],
  source: boolean,
  target: boolean,
  delta: Point3,
) => {
  const translate = (p: Point3) => ({
    x: p.x + delta.x,
    y: p.y + delta.y,
    z: p.z + delta.z,
  });
  if (source && target)
    return path.map(translate);
  const knots = source
    ? [...path]
    : [...path].reverse();
  const result = knots.map((p) => ({ ...p }));
  const start = knots[0]!;
  for (const axis of axes) {
    if (!delta[axis]) continue;
    let end = knots.findIndex(
      (p) => p[axis] !== start[axis],
    );
    if (end < 0) end = 1;
    for (let i = 0; i < end; i++)
      result[i]![axis] += delta[axis];
  }
  // A straight riser becomes a dogleg if its ends cease to line up.
  const joined: Point3[] = [result[0]!];
  for (let i = 1; i < result.length; i++) {
    const a = result[i - 1]!,
      b = result[i]!,
      changed = axes.filter((k) => a[k] !== b[k]);
    if (
      changed.length > 1 &&
      axes.filter(
        (k) => knots[i - 1]![k] !== knots[i]![k],
      ).length === 1
    ) {
      const along = axes.find(
        (k) => knots[i - 1]![k] !== knots[i]![k],
      )!;
      const mid = (a[along] + b[along]) / 2;
      let p = { ...a, [along]: mid };
      joined.push(p);
      for (const k of changed.filter(
        (k) => k !== along,
      )) {
        p = { ...p, [k]: b[k] };
        joined.push(p);
      }
    }
    joined.push(b);
  }
  return simplifyPath(
    source ? joined : joined.reverse(),
  );
};

// Socket stubs may meet. Interior runs reserve their occupied
// interval, so disjoint sections of the same aisle can be reused.
export const aisleRuns = (
  path: readonly Point3[],
) =>
  path.slice(2, -1).flatMap((end, i) => {
    const start = path[i + 1]!,
      axis = axes.find(
        (k) => start[k] !== end[k],
      );
    return axis
      ? [
          {
            axis,
            start,
            lo: Math.min(start[axis], end[axis]),
            hi: Math.max(start[axis], end[axis]),
          },
        ]
      : [];
  });
export const lanesOverlap = (
  a: ReturnType<typeof aisleRuns>,
  b: ReturnType<typeof aisleRuns>,
) =>
  a.some((p) =>
    b.some(
      (q) =>
        p.axis === q.axis &&
        p.lo < q.hi &&
        q.lo < p.hi &&
        axes.reduce(
          (sum, k) =>
            k === p.axis
              ? sum
              : sum +
                (p.start[k] - q.start[k]) ** 2,
          0,
        ) < 64,
    ),
  );
