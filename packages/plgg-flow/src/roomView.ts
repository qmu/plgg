import { project, type Camera } from "plgg-board";
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
const limitsOf = (layout: RoomLayout) => {
  const limits = { x: 0, y: 0, z: 0 };
  for (const room of layout.rooms)
    for (const axis of directions)
      limits[axis] = Math.max(
        limits[axis],
        room.max[axis],
      );
  return limits;
};
export const roomLabels = (
  layout: RoomLayout,
  camera: Camera,
) => {
  const limits = limitsOf(layout),
    at = project(camera);
  const corners = [0, limits.x].flatMap((x) =>
    [0, limits.y].flatMap((y) =>
      [0, limits.z].map((z) => ({ x, y, z })),
    ),
  );
  const projected = corners.map(at);
  const labels: {
    x: number;
    y: number;
    dx: number;
    dy: number;
    anchor: string;
    value: string;
  }[] = [];
  for (const [
    index,
    axis,
  ] of directions.entries()) {
    const [a, b] = directions.filter(
      (d) => d !== axis,
    );
    if (!a || !b) continue;
    const definition = layout.axes[axis];
    if (!definition) continue;
    // Follow the nearest parallel edge, moving its labels together
    // along the shortest screen normal that clears the cuboid.
    const edges = corners
      .filter((p) => !p[axis])
      .flatMap((p) => {
        const start = at(p),
          end = at({
            ...p,
            [axis]: limits[axis],
          });
        const dx = end.x - start.x,
          dy = end.y - start.y,
          length = Math.hypot(dx, dy);
        if (length < 1e-6) return [];
        const tx = dx / length,
          ty = dy / length;
        return [-1, 1].map((sign) => {
          const nx = -ty * sign,
            ny = tx * sign;
          const shift = Math.max(
            ...projected.map(
              (q) =>
                (q.x - start.x) * nx +
                (q.y - start.y) * ny,
            ),
          );
          return {
            p,
            tx,
            ty,
            nx,
            ny,
            shift,
            depth: start.z + end.z,
          };
        });
      })
      .sort(
        (l, r) =>
          r.depth - l.depth || l.shift - r.shift,
      );
    const edge = edges[0];
    if (!edge) continue;
    const label = (
      value: string,
      coordinate: number,
      beyond: number,
    ) => {
      const q = at({
        ...edge.p,
        [axis]: coordinate,
      });
      labels.push({
        x: q.x + edge.shift * edge.nx,
        y: q.y + edge.shift * edge.ny,
        dx: 12 * edge.nx + beyond * edge.tx,
        dy: 12 * edge.ny + beyond * edge.ty,
        anchor:
          edge.nx < -0.25
            ? "end"
            : edge.nx > 0.25
              ? "start"
              : "middle",
        value,
      });
    };
    for (const room of layout.rooms)
      if (!room.min[a] && !room.min[b])
        label(
          room.values[index]!,
          (room.min[axis] + room.max[axis]) / 2,
          0,
        );
    label(definition.attribute, limits[axis], 16);
  }
  return labels;
};
export const roomView = (
  layout: RoomLayout,
  camera: Camera,
): Html<Change> => {
  const at = project(camera);
  const limits = limitsOf(layout);
  const lines = new Map<
    string,
    {
      d: string;
      kind: "outer" | "inner" | "empty";
    }
  >();
  const floors: Html<Change>[] = [];
  for (const axis of directions) {
    const [a, b] = directions.filter(
      (d) => d !== axis,
    );
    if (!a || !b) continue;
    for (const room of layout.rooms) {
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
          const outer =
            (u === 0 || u === limits[a]) &&
            (v === 0 || v === limits[b]);
          if (
            lines.has(key) &&
            !(
              room.occupied &&
              lines.get(key)?.kind === "empty"
            )
          )
            continue;
          const start = at(p),
            end = at({
              ...p,
              [axis]: room.max[axis],
            });
          lines.set(key, {
            d: `M${start.x} ${start.y}L${end.x} ${end.y}`,
            kind: outer
              ? "outer"
              : room.occupied
                ? "inner"
                : "empty",
          });
        }
      if (
        axis === "z" &&
        !room.min.x &&
        !room.min.y
      ) {
        const points = [
          [0, 0],
          [limits.x, 0],
          [limits.x, limits.y],
          [0, limits.y],
        ]
          .map(([x, y]) => {
            const p = at({
              x: x!,
              y: y!,
              z: room.min.z,
            });
            return p.x + "," + p.y;
          })
          .join(" ");
        floors.push(
          el(
            "polygon",
            [
              attr("class", "room-floor"),
              attr("points", points),
              attr("fill", "#dbe5dd"),
              attr("fill-opacity", "0.4"),
            ],
            [],
          ),
        );
      }
    }
  }
  const path = (
    kind: "outer" | "inner" | "empty",
    stroke: string,
  ) =>
    el<Change>(
      "path",
      [
        attr("class", "room-" + kind),
        attr(
          "d",
          [...lines.values()]
            .filter((l) => l.kind === kind)
            .map((l) => l.d)
            .join(""),
        ),
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
      ...floors,
      path("empty", "#d3dcda"),
      path("inner", "#96a4a2"),
      path("outer", "#404c4c"),
      ...roomLabels(layout, camera).map((l) =>
        el<Change>(
          "text",
          [
            attr("x", String(l.x + l.dx)),
            attr("y", String(l.y + l.dy)),
            attr("text-anchor", l.anchor),
            attr("dominant-baseline", "middle"),
          ],
          [text(l.value)],
        ),
      ),
    ],
  );
};
