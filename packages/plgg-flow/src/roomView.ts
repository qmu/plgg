import {
  project,
  type Camera,
  type Point3,
} from "plgg-board";
import {
  attr,
  el,
  text,
  type Html,
} from "plgg-view";
import type { Change } from "./model";
import type {
  Direction,
  RoomLayout,
} from "./autoLayout";
const directions: readonly Direction[] = [
  "x",
  "y",
  "z",
];
export const roomView = (
  layout: RoomLayout,
  camera: Camera,
): Html<Change> => {
  const at = project(camera);
  const limits = { x: 0, y: 0, z: 0 };
  for (const room of layout.rooms)
    for (const axis of directions)
      limits[axis] = Math.max(
        limits[axis],
        room.max[axis],
      );
  const seen = new Set<string>(),
    labels: Html<Change>[] = [];
  let outer = "",
    inner = "";
  const label = (
    value: string,
    p: Point3,
    dx: number,
    dy: number,
  ) => {
    const q = at(p);
    labels.push(
      el(
        "text",
        [
          attr("x", String(q.x + dx)),
          attr("y", String(q.y + dy)),
          attr(
            "text-anchor",
            dx < 0 ? "end" : "middle",
          ),
        ],
        [text(value)],
      ),
    );
  };
  for (const room of layout.rooms) {
    for (const [
      index,
      axis,
    ] of directions.entries()) {
      const sides = directions.filter(
          (d) => d !== axis,
        ),
        a = sides[0]!,
        b = sides[1]!;
      for (const u of [room.min[a], room.max[a]])
        for (const v of [
          room.min[b],
          room.max[b],
        ]) {
          const p = {
            ...room.min,
            [a]: u,
            [b]: v,
          };
          const key = [axis, p.x, p.y, p.z].join(
            ",",
          );
          if (seen.has(key)) continue;
          seen.add(key);
          const start = at(p),
            end = at({
              ...p,
              [axis]: room.max[axis],
            });
          const segment = `M${start.x} ${start.y}L${end.x} ${end.y}`;
          if (
            (u === 0 || u === limits[a]) &&
            (v === 0 || v === limits[b])
          )
            outer += segment;
          else inner += segment;
        }
      if (
        !layout.axes[axis] ||
        room.min[a] ||
        room.min[b] ||
        (axis === "z" &&
          !camera.yaw &&
          !camera.pitch)
      )
        continue;
      const origin = {
        x: 0,
        y: axis === "y" ? 0 : limits.y,
        z: 0,
      };
      const point = {
        ...origin,
        [axis]:
          (room.min[axis] + room.max[axis]) / 2,
      };
      label(
        room.values[index]!,
        point,
        axis === "x" ? 0 : -6,
        axis === "x" ? 14 : 0,
      );
      if (room.max[axis] === limits[axis])
        label(
          layout.axes[axis]!.attribute,
          { ...origin, [axis]: limits[axis] },
          axis === "x" ? 8 : -6,
          axis === "y" ? 16 : 28,
        );
    }
  }
  const path = (d: string, stroke: string) =>
    el<Change>(
      "path",
      [
        attr("d", d),
        attr("fill", "none"),
        attr("stroke", stroke),
        attr("stroke-width", "0.8"),
      ],
      [],
    );
  return el(
    "g",
    [
      attr("class", "room-lattice"),
      attr("pointer-events", "none"),
      attr("font-size", "11"),
      attr("fill", "#42494a"),
    ],
    [
      path(inner, "#96a4a2"),
      path(outer, "#404c4c"),
      ...labels,
    ],
  );
};
