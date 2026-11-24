import type { Point3 } from "plgg-board/index";
import type {
  Scene,
  Light,
} from "plgg-board/scene";
import type { Shadow } from "plgg-board/drawing";
import {
  dot,
  side,
  clip,
  shift,
  epsilon,
} from "plgg-board/geometry";
import {
  bounds,
  overlaps,
  depth,
  type Surface,
} from "plgg-board/visibility";
const hull = (points: Point3[]) => {
  const sorted = points.sort(
    (a, b) => a.x - b.x || a.y - b.y,
  );
  const half = (pts: Point3[]) => {
    const out: Point3[] = [];
    for (const p of pts) {
      while (
        out.length >= 2 &&
        side(
          out[out.length - 2]!,
          out[out.length - 1]!,
          p,
        ) <= epsilon
      )
        out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [
    ...half(sorted),
    ...half(sorted.reverse()),
  ];
};
export const shadows = (
  scene: Scene,
  light: Light,
  surfaces: Surface[],
  at: (p: Point3) => Point3,
  near: (p: Point3) => number,
) => {
  const out: Shadow[] = [];
  const casters = [
    ...scene.solids,
    ...scene.sheets,
  ].filter((s) => s.casts);
  for (const r of surfaces) {
    const { face } = r;
    if (!face.item.receives) continue;
    const denom = dot(
      face.normal,
      light.direction,
    );
    if (Math.abs(denom) < epsilon) continue;
    const travel = (p: Point3) =>
      (face.offset - dot(face.normal, p)) / denom;
    for (const caster of casters) {
      if (caster === face.item) continue;
      const loops =
        "vertices" in caster
          ? caster.faces.map((loop) =>
              loop.map(
                (i) => caster.vertices[i]!,
              ),
            )
          : [caster.points];
      let polygon = hull(
        loops.flatMap((loop) =>
          clip(
            clip(loop, travel).map((p) =>
              shift(
                p,
                light.direction,
                travel(p),
              ),
            ),
            near,
          ).map(at),
        ),
      );
      for (const e of r.planes)
        polygon = clip(
          polygon,
          (p) => e.x * p.x + e.y * p.y + e.c,
        );
      if (polygon.length < 3) continue;
      const box = bounds(polygon);
      let parts = [polygon];
      for (const blocker of surfaces) {
        if (
          blocker === r ||
          !overlaps(box, blocker.box)
        )
          continue;
        const cuts = [
          (p: Point3) =>
            depth(blocker, p) -
            depth(r, p) -
            epsilon,
          ...blocker.planes.map(
            (e) => (p: Point3) =>
              e.x * p.x + e.y * p.y + e.c,
          ),
        ];
        parts = parts.flatMap((part) => {
          if (
            cuts.some((c) =>
              part.every((p) => c(p) <= 0),
            )
          )
            return [part];
          let rest = part;
          const kept: Point3[][] = [];
          for (const cut of cuts) {
            const outside = clip(
              rest,
              (p) => -cut(p),
            );
            if (outside.length >= 3)
              kept.push(outside);
            rest = clip(rest, cut);
            if (!rest.length) break;
          }
          return kept;
        });
      }
      for (const points of parts.filter(
        (poly) =>
          Math.abs(
            poly.reduce((area, a, i) => {
              const b =
                poly[(i + 1) % poly.length]!;
              return area + a.x * b.y - a.y * b.x;
            }, 0),
          ) > epsilon,
      ))
        out.push({
          id: caster.id,
          style: caster.style,
          receiver: face.item.id,
          points,
        });
    }
  }
  return out;
};
