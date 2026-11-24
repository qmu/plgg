import {
  project,
  type Camera,
  type Point3,
} from "plgg-board";
import {
  planRooms,
  type Direction,
  type Room,
  type RoomLayout,
} from "plgg-flow/autoLayout";
import type { Flow } from "./model";
export const directions: readonly Direction[] = [
  "x",
  "y",
  "z",
];
export const limitsOf = (layout: RoomLayout) => {
  const limits = { x: 0, y: 0, z: 0 };
  for (const room of layout.rooms)
    for (const axis of directions)
      limits[axis] = Math.max(
        limits[axis],
        room.max[axis],
      );
  return limits;
};
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
export const cornersOf = (
  room: Pick<Room, "min" | "max">,
) =>
  [room.min.x, room.max.x].flatMap((x) =>
    [room.min.y, room.max.y].flatMap((y) =>
      [room.min.z, room.max.z].map((z) => ({
        x,
        y,
        z,
      })),
    ),
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
export const faceTable = (flow: Flow): Flow => {
  if (!flow.rooms) return flow;
  // As the last twelve degrees collapse the hidden axis, open up
  // the slots of the table in its two remaining world coordinates.
  const depth = project(flow.camera);
  const hidden = directions.find(
    (d) =>
      d !== "z" &&
      Math.abs(
        depth({ x: 0, y: 0, z: 0, [d]: 1 }).z,
      ) >= Math.cos(Math.PI / 15),
  );
  if (!hidden) return flow;
  const across = hidden === "x" ? "z" : "x";
  const down = hidden === "y" ? "z" : "y";
  const x = flow.rooms.axes[across],
    y = flow.rooms.axes[down];
  const plan = planRooms(flow, {
    ...(x && { x }),
    ...(y && { y }),
  });
  const angle = Math.acos(
    Math.min(
      1,
      Math.abs(
        depth({ x: 0, y: 0, z: 0, [hidden]: 1 })
          .z,
      ),
    ),
  );
  if (angle > 1e-8) {
    const f = 1 - angle / (Math.PI / 15);
    const t = f * f * (3 - 2 * f);
    const orient = (
      axis: Direction,
      screen: "x" | "y",
    ) => {
      const p = { x: 0, y: 0, z: 0, [axis]: 1 };
      const q = project({
        ...flow.camera,
        perspective: 0,
        origin: { x: 0, y: 0 },
      })(p);
      return Math.sign(q[screen]) || 1;
    };
    const sx = orient(across, "x"),
      sy = orient(down, "y");
    const blend = (
      world: Point3,
      table: Point3,
    ) => ({
      ...world,
      [across]:
        world[across] * (1 - t) +
        table.x * sx * t,
      [down]:
        world[down] * (1 - t) + table.y * sy * t,
    });
    const cells = new Map(
      plan.rooms.map((r) => [
        JSON.stringify(r.index.slice(0, 2)),
        r,
      ]),
    );
    return {
      ...flow,
      nodes: flow.nodes.map((n, i) => ({
        ...n,
        position: blend(
          n.position,
          plan.graph.nodes[i]!.position,
        ),
      })),
      rooms: {
        ...flow.rooms,
        rooms: flow.rooms.rooms.map((r) => {
          const cell = cells.get(
            JSON.stringify([
              r.index[directions.indexOf(across)],
              r.index[directions.indexOf(down)],
            ]),
          );
          return cell
            ? {
                ...r,
                min: blend(r.min, cell.min),
                max: blend(r.max, cell.max),
              }
            : r;
        }),
      },
    };
  }
  return {
    ...flow,
    ...plan.graph,
    rooms: { axes: plan.axes, rooms: plan.rooms },
    camera: {
      ...flow.camera,
      yaw: 0,
      pitch: 0,
      perspective: 0,
    },
  };
};
export const movingRooms = (flow: Flow): Flow => {
  const motion = flow.roomMotion;
  if (!motion) return faceTable(flow);
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
    return faceTable({ ...flow, camera });
  const before = new Map(
    from.nodes.map((n) => [n.id, n.position]),
  );
  const rooms = to.rooms;
  return faceTable({
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
export const roomPerspective = (
  layout: RoomLayout,
  camera: Camera,
) => {
  if (faceAxes(camera)) return 0;
  const depths = cornersOf({
    min: { x: 0, y: 0, z: 0 },
    max: limitsOf(layout),
  }).map((p) => project(camera)(p).z);
  return Math.min(
    Number(camera.perspective ?? 0),
    300 /
      Math.max(
        300,
        Math.max(...depths) -
          0.7 * Math.min(...depths),
      ),
  );
};
