import {
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

/** Wire endpoints and sockets share a world-space attachment point. */
export const projectSocket = (
  node: FlowNode,
  camera: Camera,
  direction: "source" | "target",
  offset: number,
) =>
  project(camera)(
    portPosition(node, direction, offset),
  );
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
  const wide = visible.find(
    (f) =>
      f.side === "front" || f.side === "back",
  );
  // The reverse face reads from its own left to right. Sample the local
  // tangent axes at the face centre so perspective affects the lettering.
  const caption =
    wide &&
    (() => {
      const sign = wide.side === "front" ? 1 : -1;
      const face = {
        ...node.position,
        z: node.position.z + sign * d,
      };
      const origin = local(at(face));
      const x = local(
          at({ ...face, x: face.x + sign }),
        ),
        y = local(at({ ...face, y: face.y + 1 }));
      return [
        x.x - origin.x,
        x.y - origin.y,
        y.x - origin.x,
        y.y - origin.y,
        origin.x,
        origin.y,
      ];
    })();
  return {
    visible,
    caption,
    depth: Math.max(...corners.map((p) => p.z)),
  };
};
