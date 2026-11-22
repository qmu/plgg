import {
  facingXYPlane,
  project,
  projectedScale,
  type Camera,
  type Point3,
} from "plgg-board";
import type { FlowNode } from "./model";

const faces = [
  {
    side: "front",
    indices: [4, 5, 6, 7],
    light: 95,
  },
  {
    side: "back",
    indices: [3, 2, 1, 0],
    light: 78,
  },
  {
    side: "top",
    indices: [0, 1, 5, 4],
    light: 87,
  },
  {
    side: "bottom",
    indices: [2, 3, 7, 6],
    light: 66,
  },
  {
    side: "left",
    indices: [3, 0, 4, 7],
    light: 73,
  },
  {
    side: "right",
    indices: [1, 2, 6, 5],
    light: 81,
  },
] as const;

export const portPosition = (
  node: FlowNode,
  direction: "source" | "target",
  offset: number,
): Point3 => ({
  x:
    node.position.x +
    ((direction === "source" ? 1 : -1) *
      (node.width ?? 104)) /
      2,
  y: node.position.y + offset,
  z: node.position.z,
});

/** Near an edge-on view, fan the controls out onto two readable rails.
 * The short leader keeps each socket attached to its physical port. */
export const projectSocket = (
  node: FlowNode,
  camera: Camera,
  direction: "source" | "target",
  offset: number,
) => {
  const at = project(camera),
    anchor = at(
      portPosition(node, direction, offset),
    ),
    c = at(node.position);
  const scale = projectedScale(camera, c.z);
  const fan = Math.max(
    0,
    1 -
      Math.abs(
        facingXYPlane(camera, node.position.z),
      ) /
        0.28,
  );
  const railX =
    c.x +
    (direction === "source" ? 1 : -1) *
      ((node.width ?? 104) * 0.5 + 7) *
      scale;
  return {
    anchor,
    x: anchor.x + fan * (railX - anchor.x),
    y:
      anchor.y +
      fan * (c.y + offset * scale - anchor.y),
    fan,
  };
};
/** Project one closed solid. Counterclockwise screen faces are hidden.
 * Local coordinates share the viewport's translated/scaled SVG node group. */
export const projectNodeBody = (
  node: FlowNode,
  camera: Camera,
) => {
  const at = project(camera),
    center = at(node.position),
    scale = projectedScale(camera, center.z);
  const local = (p: Point3) => ({
    x: (p.x - center.x) / scale,
    y: (p.y - center.y) / scale,
    z: p.z,
  });
  const w = (node.width ?? 104) / 2,
    h = (node.height ?? 36) / 2,
    d = Math.min(18, Math.max(7, h * 0.7));
  const corners = [-d, d].flatMap((z) =>
    [
      [-w, -h],
      [w, -h],
      [w, h],
      [-w, h],
    ].map(([x, y]) =>
      local(
        at({
          x: node.position.x + x!,
          y: node.position.y + y!,
          z: node.position.z + z,
        }),
      ),
    ),
  );
  const visible = faces.flatMap((face) => {
    const points = face.indices.map(
      (i) => corners[i]!,
    );
    const area = points.reduce((sum, p, i) => {
      const q = points[(i + 1) % 4]!;
      return sum + p.x * q.y - q.x * p.y;
    }, 0);
    return area > 1e-7
      ? [{ ...face, points }]
      : [];
  });
  const front = local(
      at({
        ...node.position,
        z: node.position.z + d,
      }),
    ),
    back = local(
      at({
        ...node.position,
        z: node.position.z - d,
      }),
    );
  const wide = visible.find(
    (f) =>
      f.side === "front" || f.side === "back",
  );
  const span = wide
    ? Math.max(...wide.points.map((p) => p.x)) -
      Math.min(...wide.points.map((p) => p.x))
    : 0;
  const height = wide
    ? Math.max(...wide.points.map((p) => p.y)) -
      Math.min(...wide.points.map((p) => p.y))
    : 0;
  // Ease the caption above the silhouette as its reading surface narrows.
  const room = Math.min(
    1,
    Math.max(
      0,
      (Math.min(
        span / Math.max(w, 1),
        height / 16,
      ) -
        0.65) /
        0.55,
    ),
  );
  const weight = room * room * (3 - 2 * room);
  const surface =
    front.z >= back.z ? front : back;
  const above =
    Math.min(...corners.map((p) => p.y)) - 10;
  const caption = {
    x: surface.x * weight,
    y: above + (surface.y - above) * weight,
  };
  return {
    visible,
    caption,
    depth: Math.max(...corners.map((p) => p.z)),
  };
};
