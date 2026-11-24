import { routeSpace } from "plgg-flow/space";
import { quietEdge } from "plgg-flow/model";
import {
  project,
  type Camera,
  type Point3,
} from "plgg-board";
import {
  type Direction,
  roomFor,
} from "plgg-flow/autoLayout";
import type { Flow } from "./model";
export const roomViews = [
  ["正面", 0.22, -0.2],
  ["上", 0.22, -1.05],
  ["横", 1.3, -0.2],
  ["立体", -Math.PI / 6, -0.55],
] satisfies [string, number, number][];
export const directions: readonly Direction[] = [
  "x",
  "y",
  "z",
];
export const roomFilter = (flow: Flow) =>
  flow.roomPins ?? {};
export const inSlab = (
  values: Readonly<Record<string, string>>,
  filter: Readonly<Record<string, string>>,
) =>
  Object.entries(filter).every(
    ([key, value]) => values[key] === value,
  );
export const faceAxes = (
  camera: Camera,
):
  | readonly [Direction, Direction]
  | undefined => {
  const at = project(camera);
  const hidden = directions.find(
    (axis) =>
      Math.abs(
        at({ x: 0, y: 0, z: 0, [axis]: 1 }).z,
      ) >
      1 - 1e-10,
  );
  if (hidden === "x") return ["z", "y"];
  if (hidden === "y") return ["x", "z"];
  if (hidden === "z") return ["x", "y"];
  return undefined;
};
export const roomFaceView = (
  flow: Flow,
): Flow => {
  const layout = flow.rooms;
  if (!layout) return flow;
  const camera = flow.camera.perspective
    ? { ...flow.camera, perspective: 0 }
    : flow.camera;
  const filter = Object.entries(roomFilter(flow));
  let changed = false;
  const nodes = flow.nodes.map((n) => {
    if (!roomFor(layout, n)) {
      if (n.hidden) return n;
      changed = true;
      return { ...n, hidden: true };
    }
    const quiet = filter.some(
      ([k, v]) => (n.data?.[k] ?? "—") !== v,
    );
    if (!!n.quiet === quiet) return n;
    changed = true;
    return { ...n, quiet };
  });
  const quietIds = new Set(
    nodes.filter((n) => n.quiet).map((n) => n.id),
  );
  return {
    ...flow,
    ...(quietIds.size && {
      edges: flow.edges.map((e) =>
        quietIds.has(e.source) ||
        quietIds.has(e.target)
          ? quietEdge(e)
          : e,
      ),
    }),
    camera,
    nodes: changed ? nodes : flow.nodes,
  };
};
export const roomFoot = (
  node: Flow["nodes"][number],
  floor: number,
) => ({
  ...node.position,
  y: floor,
});
export const movingRooms = (flow: Flow): Flow => {
  const motion = flow.roomMotion;
  if (!motion) return roomFaceView(flow);
  const { from, to, progress: t } = motion;
  const mix = (a: number, b: number) =>
    a + (b - a) * t;
  const point = (a: Point3, b: Point3) => ({
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    z: mix(a.z, b.z),
  });
  const angle = (a: number, b: number) =>
    a +
    t *
      Math.atan2(
        Math.sin(b - a),
        Math.cos(b - a),
      );
  const camera = {
    ...to.camera,
    yaw: angle(from.camera.yaw, to.camera.yaw),
    pitch: angle(
      from.camera.pitch,
      to.camera.pitch,
    ),
    scale: mix(
      from.camera.scale,
      to.camera.scale,
    ),
    perspective: mix(
      Number(from.camera.perspective ?? 0),
      Number(to.camera.perspective ?? 0),
    ),
    origin: {
      x: mix(
        from.camera.origin.x,
        to.camera.origin.x,
      ),
      y: mix(
        from.camera.origin.y,
        to.camera.origin.y,
      ),
    },
  };
  if (
    from.rooms === to.rooms &&
    from.nodes === to.nodes
  )
    return roomFaceView({ ...flow, camera });
  const before = new Map(
    from.nodes.map((n) => [n.id, n.position]),
  );
  const rooms = to.rooms;
  const scene = {
    ...flow,
    camera,
    nodes: to.nodes.map((n) => ({
      ...n,
      position: point(
        before.get(n.id) ?? n.position,
        n.position,
      ),
    })),
    ...(rooms && {
      rooms: {
        ...rooms,
        rooms: rooms.rooms.map((r, i) => {
          const prev = from.rooms?.rooms[i] ?? r;
          return {
            ...r,
            min: point(prev.min, r.min),
            max: point(prev.max, r.max),
          };
        }),
      },
    }),
  };
  if (!scene.rooms) return roomFaceView(scene);
  const routes = routeSpace(
    scene,
    scene.rooms.rooms,
  );
  return roomFaceView({
    ...scene,
    edges: scene.edges.map((e, i) => {
      const path = routes.get(e.id ?? i);
      if (path) return { ...e, path };
      const { path: old, ...rest } = e;
      return old ? rest : e;
    }),
  });
};
export const turnRooms = (
  from: Flow,
  to: Flow,
  duration: number,
): Flow => ({
  ...to,
  roomMotion: {
    from: { ...from, roomMotion: undefined },
    to: { ...to, roomMotion: undefined },
    progress: 0,
    duration,
  },
});
