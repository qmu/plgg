import { clip, side } from "plgg-board/geometry";
import type { Drawing } from "plgg-board/drawing";
import type { Point3 } from "plgg-board/index";

const area = (points: readonly Point3[]) =>
  points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length]!;
    return sum + p.x * q.y - q.x * p.y;
  }, 0) / 2;

// BSP emits convex faces back to front. Subtract later faces in
// that order so two foreground cards never double-count a pixel.
export const coveredFractions = (
  drawing: Drawing,
) => {
  const faces = drawing.fills.map((f) => {
    const xs = f.points.map((p) => p.x),
      ys = f.points.map((p) => p.y);
    return {
      ...f,
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
      area: area(f.points),
    };
  });
  const totals = new Map<
    string,
    { area: number; covered: number }
  >();
  for (const [i, f] of faces.entries()) {
    if (!f.area) continue;
    let pieces = [f.points];
    for (
      let j = i + 1;
      j < faces.length && pieces.length;
      j++
    ) {
      const g = faces[j]!;
      if (
        f.id === g.id ||
        f.left >= g.right ||
        g.left >= f.right ||
        f.top >= g.bottom ||
        g.top >= f.bottom ||
        !g.area
      )
        continue;
      pieces = pieces.flatMap((piece) => {
        const outside: Point3[][] = [];
        let inside = piece;
        for (const [k, a] of g.points.entries()) {
          const b =
            g.points[(k + 1) % g.points.length]!;
          const distance = (p: Point3) =>
            Math.sign(g.area) * side(a, b, p);
          const part = clip(
            inside,
            (p) => -distance(p),
          );
          if (part.length >= 3)
            outside.push(part);
          inside = clip(inside, distance);
          if (inside.length < 3) return [piece];
        }
        return outside;
      });
    }
    const total = totals.get(f.id) ?? {
      area: 0,
      covered: 0,
    };
    total.area += Math.abs(f.area);
    total.covered += Math.max(
      0,
      Math.abs(f.area) -
        pieces.reduce(
          (s, p) => s + Math.abs(area(p)),
          0,
        ),
    );
    totals.set(f.id, total);
  }
  return Array.from(totals, ([id, t]) => ({
    id,
    fraction: t.covered / t.area,
  }));
};

// Screen-space wire over a visible face, irrespective of which is nearer.
export const crossesFill = (
  from: Point3,
  to: Point3,
  polygon: readonly Point3[],
) => {
  const sign = Math.sign(area(polygon));
  let lo = 0,
    hi = 1;
  for (const [i, a] of polygon.entries()) {
    const b = polygon[(i + 1) % polygon.length]!;
    const start = sign * side(a, b, from),
      end = sign * side(a, b, to);
    if (start <= 0 && end <= 0) return false;
    if (start < 0)
      lo = Math.max(lo, start / (start - end));
    if (end < 0)
      hi = Math.min(hi, start / (start - end));
    if (lo >= hi) return false;
  }
  return hi > lo;
};
