import {
  project,
  worldDelta,
  type Camera,
  type Point3,
} from "plgg-board";
import {
  type Direction,
  type RoomLayout,
  roomFor,
} from "plgg-flow/autoLayout";
import type { Flow } from "./model";
export const directions: readonly Direction[] = [
  "x",
  "y",
  "z",
];
export const roomFilter = (flow: Flow) =>
  flow.roomHover
    ? {
        ...flow.roomPins,
        [flow.roomHover[0]]: flow.roomHover[1],
      }
    : (flow.roomPins ?? {});
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
export const roomStack = (
  layout: RoomLayout,
  camera: Camera,
  pins: Flow["roomPins"] = {},
) => {
  const face = faceAxes(camera);
  const hidden = directions.find(
    (d) => face && !face.includes(d),
  );
  if (!hidden) return;
  const index = directions.indexOf(hidden);
  const nearHigh =
    project(camera)({
      x: 0,
      y: 0,
      z: 0,
      [hidden]: 1,
    }).z > 0;
  const increasing =
    hidden === "y" ? !nearHigh : nearHigh;
  const last = layout.rooms.reduce(
    (max, r) => Math.max(max, r.index[index]!),
    0,
  );
  const axis = layout.axes[hidden];
  const pin = axis && pins[axis.attribute];
  return {
    hidden,
    index,
    pin,
    margin: pin === undefined ? 12 * last : 0,
    offset: (level: number) =>
      pin !== undefined
        ? 0
        : 12 *
          (increasing ? last - level : level),
  };
};
export const roomFaceView = (
  flow: Flow,
): Flow => {
  if (!flow.rooms) return flow;
  const camera = flow.camera.perspective
    ? { ...flow.camera, perspective: 0 }
    : flow.camera;
  const layout = flow.rooms;
  const stack = roomStack(
    layout,
    camera,
    flow.roomPins,
  );
  if (!stack) {
    if (
      Object.keys(layout.axes).some((key) =>
        key.startsWith("pin:"),
      )
    )
      return {
        ...flow,
        camera,
        nodes: flow.nodes.map((n) =>
          roomFor(layout, n)
            ? n
            : { ...n, hidden: true },
        ),
      };
    return camera === flow.camera
      ? flow
      : { ...flow, camera };
  }
  const { index, pin } = stack;
  return {
    ...flow,
    camera,
    nodes: flow.nodes.map((n) => {
      const room = roomFor(layout, n);
      if (!room) return { ...n, hidden: true };
      const offset = stack.offset(
        room.index[index]!,
      );
      const delta = worldDelta(camera, {
        x: offset,
        y: -offset,
      });
      return {
        ...n,
        roomReceded: offset !== 0,
        hidden:
          !!n.hidden ||
          (pin !== undefined &&
            pin !== room.values[index]),
        position: {
          x: n.position.x + delta.x,
          y: n.position.y + delta.y,
          z: n.position.z + delta.z,
        },
      };
    }),
  };
};
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
  if (motion.duration === 350)
    return roomFaceView({ ...flow, camera });
  const before = new Map(
    from.nodes.map((n) => [n.id, n.position]),
  );
  const rooms = to.rooms;
  return roomFaceView({
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
