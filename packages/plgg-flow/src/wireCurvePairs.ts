import { materialize } from "plgg-flow/wirePath";
import {
  corridor,
  intersects,
  type Bounds,
} from "plgg-flow/wireCorridors";
import type { Wire } from "./wiring";
import {
  canonical,
  blockers,
  curvePath,
} from "plgg-flow/wireCurve";
import {
  type Box,
  distance,
  free,
  inflate,
} from "plgg-flow/wireGeometry";
import { cache, boxId } from "plgg-flow/wireMemo";
import type { FlowNode, Edge } from "./model";
import type { Socket } from "./wireBase";

const cubics = cache<{
  plain: ReturnType<typeof canonical>["plain"];
  bounds: Bounds;
  wire: Wire;
}>(4096);
export const socketRegion = (
  a: FlowNode,
  b: FlowNode,
) =>
  corridor(
    [a.position, b.position],
    Math.max(
      180,
      24 +
        0.13 * distance(a.position, b.position),
      a.width ?? 0,
      b.width ?? 0,
      a.height ?? 0,
      b.height ?? 0,
    ),
  );
const swept = cache<Box[]>(8192);
const geometry = cache<Wire>(8192);
export const fixedCurve = (
  edge: Edge,
  s: Socket,
  t: Socket,
  walls: Box[],
) => {
  const ends = JSON.stringify([
    edge.source,
    edge.target,
    s,
    t,
  ]);
  const cubic = cubics(ends, () => {
    const { plain, p1, p2 } = canonical(s, t);
    const wire: Wire = {
      ...materialize(edge, s, t, plain, 0, false),
      controls: [
        { ...p1, z: s.z },
        { ...p2, z: t.z },
      ],
    };
    return {
      plain,
      bounds: corridor(plain, 10),
      wire,
    };
  });
  const nearby = walls.filter((w) =>
    intersects(w, cubic.bounds),
  );
  const blocked = swept(
    JSON.stringify([ends, nearby.map(boxId)]),
    () => blockers(edge, cubic.plain, nearby),
  );
  if (!blocked.length) return cubic.wire;
  const active = walls.filter(
    (q) =>
      q.id === edge.source ||
      q.id === edge.target ||
      blocked.some((w) => boxId(w) === boxId(q)),
  );
  for (;;) {
    const result = geometry(
      JSON.stringify([ends, active.map(boxId)]),
      () =>
        curvePath(
          edge,
          s,
          t,
          active,
          0,
          1,
          false,
        ),
    );
    const path = result.points;
    const area = corridor(path, 10);
    const extra = walls.filter(
      (q) =>
        !active.includes(q) &&
        intersects(q, area) &&
        !free(path, [inflate(q, 10)]),
    );
    if (!extra.length) return result;
    active.push(...extra);
  }
};
