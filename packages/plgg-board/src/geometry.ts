import type {
  Point,
  Point3,
} from "plgg-board/index";
export const epsilon = 1e-8;
export const dot = (a: Point3, b: Point3) =>
  a.x * b.x + a.y * b.y + a.z * b.z;
export const sub = (a: Point3, b: Point3) => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const shift = (
  p: Point3,
  d: Point3,
  t: number,
) => ({
  x: p.x + t * d.x,
  y: p.y + t * d.y,
  z: p.z + t * d.z,
});
export const mix = (
  a: Point3,
  b: Point3,
  t: number,
) => ({
  x: a.x + t * (b.x - a.x),
  y: a.y + t * (b.y - a.y),
  z: a.z + t * (b.z - a.z),
});
export const cross = (a: Point3, b: Point3) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const unit = (p: Point3) => {
  const n = Math.hypot(p.x, p.y, p.z) || 1;
  return { x: p.x / n, y: p.y / n, z: p.z / n };
};
export const side = (
  a: Point,
  b: Point,
  p: Point,
) =>
  (b.x - a.x) * (p.y - a.y) -
  (b.y - a.y) * (p.x - a.x);
export const clip = (
  points: readonly Point3[],
  distance: (p: Point3) => number,
) => {
  const out: Point3[] = [];
  let a = points[points.length - 1];
  if (!a) return out;
  let da = distance(a);
  for (const b of points) {
    const db = distance(b);
    if (da * db < 0)
      out.push(mix(a, b, da / (da - db)));
    if (db >= 0) out.push(b);
    a = b;
    da = db;
  }
  return out;
};
