import { nodeSize } from "plgg-flow/nodeSize";
import {
  project,
  projectedScale,
  type Camera,
  type Point3,
} from "plgg-board";
import type { FlowNode } from "./model";

export type Side =
  | "right"
  | "left"
  | "top"
  | "bottom";

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
] satisfies {
  side: Side | "front" | "back";
  indices: number[];
  light: number;
}[];

/** How far each face stands off the node's centre plane. */
export const bodyDepth = (node: FlowNode) =>
  Math.min(
    18,
    Math.max(
      7,
      (nodeSize(node).height / 2) * 0.7,
    ),
  );

/** Mid-depth keeps the socket on the physical flank. */
export const portPosition = (
  node: FlowNode,
  direction: Side | "source" | "target",
  offset: number,
): Point3 => ({
  x:
    node.position.x +
    (direction === "top" || direction === "bottom"
      ? offset
      : ((direction === "source" ||
        direction === "right"
          ? 1
          : -1) *
          nodeSize(node).width) /
        2),
  y:
    node.position.y +
    (direction === "top"
      ? -nodeSize(node).height / 2
      : direction === "bottom"
        ? nodeSize(node).height / 2
        : offset),
  z: node.position.z,
});

/** Wire endpoints and sockets share a world-space attachment point. */
export const projectSocket = (
  node: FlowNode,
  camera: Camera,
  direction: Side | "source" | "target",
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
  wasTagged = false,
) => {
  const at = project(camera),
    center = at(node.position),
    scale = projectedScale(camera, center.z);
  const local = (p: Point3) => ({
    x: (p.x - center.x) / scale,
    y: (p.y - center.y) / scale,
    z: p.z,
  });
  const w = nodeSize(node).width / 2,
    h = nodeSize(node).height / 2,
    d = bodyDepth(node);
  const plane = (z: number) =>
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
    );
  if (node.group && !node.collapsed) {
    const tray = plane(0);
    const corner = tray[0]!;
    const atCorner = (dx: number, dy: number) =>
      local(
        at({
          x: node.position.x - w + dx,
          y: node.position.y - h + dy,
          z: node.position.z,
        }),
      );
    const x = atCorner(1, 0),
      y = atCorner(0, 1);
    const handle = [
      [-5, -5],
      [5, -5],
      [5, 5],
      [-5, 5],
    ].map(([dx, dy]) =>
      atCorner(2 * w + dx!, 2 * h + dy!),
    );
    return {
      tray,
      handle,
      label: [
        x.x - corner.x,
        x.y - corner.y,
        y.x - corner.x,
        y.y - corner.y,
        corner.x,
        corner.y,
      ],
      visible: [],
      depth: center.z,
    };
  }
  const corners = [-d, d].flatMap(plane);
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
  const back = visible.some(
    (f) => f.side === "back",
  );
  const i = back ? 0 : 4;
  const origin = corners[i]!,
    right = corners[i + 1]!,
    bottom = corners[i + 3]!;
  const ratio = Math.min(
    Math.abs(right.x - origin.x) / (2 * w),
    Math.abs(bottom.y - origin.y) / (2 * h),
  );
  const tagged = ratio < (wasTagged ? 0.75 : 0.7);
  const face = {
    ...node.position,
    z: node.position.z + (back ? -d : d),
  };
  const centerFace = local(at(face));
  const x = local(
    at({ ...face, x: face.x + (back ? -1 : 1) }),
  );
  const y = local(at({ ...face, y: face.y + 1 }));
  const xs = corners.map((p) => p.x);
  const caption = tagged
    ? [
        1,
        0,
        0,
        1,
        (Math.min(...xs) + Math.max(...xs)) / 2,
        Math.min(...corners.map((p) => p.y)) - 10,
      ]
    : [
        x.x - centerFace.x,
        x.y - centerFace.y,
        y.x - centerFace.x,
        y.y - centerFace.y,
        centerFace.x,
        centerFace.y,
      ];
  return {
    visible,
    caption,
    tagged,
    depth: Math.max(...corners.map((p) => p.z)),
  };
};
