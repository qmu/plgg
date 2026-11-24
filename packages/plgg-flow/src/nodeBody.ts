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
  },
  {
    side: "back",
    indices: [3, 2, 1, 0],
  },
  {
    side: "top",
    indices: [0, 1, 5, 4],
  },
  {
    side: "bottom",
    indices: [2, 3, 7, 6],
  },
  {
    side: "left",
    indices: [3, 0, 4, 7],
  },
  {
    side: "right",
    indices: [1, 2, 6, 5],
  },
] satisfies {
  side: Side | "front" | "back";
  indices: number[];
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
export const captionTagged = (
  camera: Camera,
  previous = false,
) =>
  Math.min(
    Math.abs(Math.cos(camera.yaw)),
    Math.abs(Math.cos(camera.pitch)),
  ) < (previous ? 0.75 : 0.7);

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
  const edges = new Map<
    number,
    { start: number; end: number; count: number }
  >();
  for (const face of visible)
    for (const [
      j,
      start,
    ] of face.indices.entries()) {
      const end = face.indices[(j + 1) % 4]!;
      const key =
        Math.min(start, end) * 8 +
        Math.max(start, end);
      const old = edges.get(key);
      if (old) old.count++;
      else
        edges.set(key, { start, end, count: 1 });
    }
  const outline = [...edges.values()]
    .filter((e) => e.count === 1)
    .map((e) => {
      const a = corners[e.start]!,
        b = corners[e.end]!;
      return `M${a.x} ${a.y}L${b.x} ${b.y}`;
    })
    .join("");
  const back = visible.some(
    (f) => f.side === "back",
  );
  const tagged = captionTagged(camera, wasTagged);
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
    outline,
    caption,
    tagged,
    depth: Math.max(...corners.map((p) => p.z)),
  };
};

export const corners = (
  min: Point3,
  max: Point3,
) =>
  [min.x, max.x].flatMap((x) =>
    [min.y, max.y].flatMap((y) =>
      [min.z, max.z].map((z) => ({ x, y, z })),
    ),
  );
export const cardBounds = (
  camera: Camera,
  nodes: readonly FlowNode[],
) => {
  const at = project(camera);
  const cards: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  }[] = [];
  for (const node of nodes.filter(
    (n) => !n.hidden,
  )) {
    const size = nodeSize(node),
      p = node.position,
      d = bodyDepth(node);
    const pts = corners(
      {
        x: p.x - size.width / 2,
        y: p.y - size.height / 2,
        z: p.z - d,
      },
      {
        x: p.x + size.width / 2,
        y: p.y + size.height / 2,
        z: p.z + d,
      },
    ).map(at);
    const box = {
      left: Math.min(...pts.map((v) => v.x)) - 4,
      right: Math.max(...pts.map((v) => v.x)) + 4,
      top: Math.min(...pts.map((v) => v.y)) - 4,
      bottom:
        Math.max(...pts.map((v) => v.y)) + 4,
    };
    cards.push(box);
    // Reserve the full tag throughout its switching band.
    if (
      projectNodeBody(node, camera, true).tagged
    ) {
      const center = (box.left + box.right) / 2;
      const half =
        (size.width * camera.scale) / 2 + 2;
      cards.push({
        left: center - half,
        right: center + half,
        top:
          box.top -
          (10 + size.height / 2) * camera.scale -
          2,
        bottom: box.top + 4,
      });
    }
  }
  return cards;
};
