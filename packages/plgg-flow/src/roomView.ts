import { nodeSize } from "plgg-flow/nodeSize";
import { roomFor } from "plgg-flow/autoLayout";
import { some, none } from "plgg";
import {
  project,
  type Camera,
  type Point3,
} from "plgg-board";
import {
  onEvent,
  attr,
  el,
  text,
  type Html,
} from "plgg-view";
import type { Change, Flow } from "./model";
import type {
  Room,
  RoomLayout,
} from "./autoLayout";
import {
  directions,
  limitsOf,
  cornersOf,
  faceAxes,
  roomFilter,
  inSlab,
} from "plgg-flow/roomCamera";
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
    attribute: string;
    clear: boolean;
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
    if (
      !definition ||
      faceAxes(camera)?.includes(axis) === false
    )
      continue;
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
      const anchorAt = (
        edge: (typeof edges)[number],
      ) => {
        const q = at({
          ...edge.p,
          [axis]: coordinate,
        });
        return {
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
          attribute: definition.attribute,
          clear: beyond !== 0,
        };
      };
      let item = anchorAt(edge);
      const bounds = (l: typeof item) => {
        const width = 13 * l.value.length;
        const x =
          l.x +
          l.dx -
          (l.anchor === "end"
            ? width
            : l.anchor === "middle"
              ? width / 2
              : 0);
        return { x, y: l.y + l.dy, width };
      };
      const collides = (
        item: ReturnType<typeof anchorAt>,
      ) =>
        labels.some((l) => {
          const a = bounds(l),
            b = bounds(item);
          return (
            a.x < b.x + b.width + 3 &&
            b.x < a.x + a.width + 3 &&
            Math.abs(a.y - b.y) < 16
          );
        });
      if (beyond && collides(item))
        item =
          edges
            .map(anchorAt)
            .find(
              (candidate) => !collides(candidate),
            ) ?? item;
      while (collides(item)) {
        item.dx += edge.tx * 8;
        item.dy += edge.ty * 8;
      }
      labels.push(item);
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
  flow?: Flow,
): Html<Change> => {
  const at = project(camera);
  const limits = limitsOf(layout);
  const filter = flow ? roomFilter(flow) : {};
  const active = Object.keys(filter).length > 0;
  const lines = new Map<
    string,
    { d: string; kind: string }
  >();
  const shadows = new Map<Room, Html<Change>[]>();
  for (const node of flow?.nodes ?? []) {
    const room = roomFor(layout, node);
    if (!room || node.hidden || faceAxes(camera))
      continue;
    const { width, height } = nodeSize(node);
    const points = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]
      .map(([x, y]) => {
        const p = at({
          x: node.position.x + (x! * width) / 2,
          y: node.position.y + (y! * height) / 2,
          z: room.min.z,
        });
        return p.x + "," + p.y;
      })
      .join(" ");
    const members = shadows.get(room) ?? [];
    members.push(
      el(
        "polygon",
        [
          attr("class", "room-shadow"),
          attr("points", points),
        ],
        [],
      ),
    );
    shadows.set(room, members);
  }
  const rooms = layout.rooms.map((room) => {
    const corners = cornersOf(room).sort(
      (a, b) => at(a).z - at(b).z,
    );
    const floor = [
      room.min,
      { ...room.min, x: room.max.x },
      { ...room.max, z: room.min.z },
      { ...room.min, y: room.max.y },
    ];
    const values = Object.fromEntries(
      directions.flatMap((axis, i) => {
        const definition = layout.axes[axis];
        return definition
          ? [
              [
                definition.attribute,
                room.values[i]!,
              ],
            ]
          : [];
      }),
    );
    const selected =
      active && inSlab(values, filter);
    for (const axis of directions) {
      for (const p of corners.filter(
        (p) => p[axis] === room.min[axis],
      )) {
        const q = {
          ...p,
          [axis]: room.max[axis],
        };
        const outer = directions
          .filter((d) => d !== axis)
          .every(
            (d) =>
              p[d] === 0 || p[d] === limits[d],
          );
        const midDepth = (at(p).z + at(q).z) / 2;
        const centerDepth = at({
          x: limits.x / 2,
          y: limits.y / 2,
          z: limits.z / 2,
        }).z;
        const kind = outer
          ? midDepth >= centerDepth
            ? "outer"
            : "far"
          : "inner";
        const key = [axis, p.x, p.y, p.z].join(
          ",",
        );
        if (
          !room.occupied &&
          !selected &&
          !outer
        ) {
          const far = corners[0]!;
          if (
            directions.some(
              (d) =>
                d !== axis && far[d] !== p[d],
            ) ||
            lines.has(key)
          )
            continue;
          const end = {
            ...far,
            [axis]:
              far[axis] +
              (far[axis] === p[axis] ? 8 : -8),
          };
          lines.set(key, {
            kind: "empty",
            d: segment(far, end),
          });
        } else
          lines.set(key, {
            kind,
            d: segment(p, q),
          });
      }
    }
    const points = floor
      .map((p) => at(p))
      .map((p) => p.x + "," + p.y)
      .join(" ");
    const near = floor
      .map((p) => at(p))
      .sort((a, b) => b.z - a.z || b.y - a.y)[0]!;
    return {
      depth: floor.reduce(
        (sum, p) => sum + at(p).z,
        0,
      ),
      view: el<Change>(
        "g",
        [attr("class", "room-cell")],
        [
          el(
            "polygon",
            [
              attr(
                "class",
                selected
                  ? "room-selected"
                  : room.occupied
                    ? "room-floor"
                    : "room-clear",
              ),
              attr("points", points),
              attr("pointer-events", "all"),
            ],
            [],
          ),
          ...(shadows.get(room) ?? []),
          el(
            "text",
            [
              attr("class", "room-caption"),
              attr("x", String(near.x)),
              attr("y", String(near.y - 4)),
              attr("text-anchor", "end"),
            ],
            [
              text(
                room.values
                  .filter((v) => v !== "—")
                  .join(" · "),
              ),
            ],
          ),
        ],
      ),
    };
  });
  function segment(p: Point3, q: Point3) {
    const a = at(p),
      b = at(q);
    return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  }
  const labelEvents = (
    label: ReturnType<typeof roomLabels>[number],
  ) => [
    attr("class", "room-label"),
    attr("pointer-events", "all"),
    onEvent<Change>("pointerdown", (e) => {
      e.stopPropagation();
      return none();
    }),
    onEvent<Change>("pointerenter", () =>
      some((s) => ({
        ...s,
        roomHover: label.clear
          ? undefined
          : [label.attribute, label.value],
      })),
    ),
    onEvent<Change>("pointerleave", () =>
      some((s) => ({
        ...s,
        roomHover: undefined,
      })),
    ),
    onEvent<Change>("click", (e) => {
      e.stopPropagation();
      return some((s) => ({
        ...s,
        roomHover: undefined,
        roomPins: label.clear
          ? {}
          : {
              ...s.roomPins,
              [label.attribute]: label.value,
            },
      }));
    }),
  ];
  return el(
    "g",
    [
      attr("class", "room-lattice"),
      attr("pointer-events", "none"),
    ],
    [
      ...rooms
        .sort((a, b) => a.depth - b.depth)
        .map((r) => r.view),
      ...["empty", "inner", "far", "outer"].map(
        (kind) =>
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
            ],
            [],
          ),
      ),
      ...roomLabels(layout, camera).map((l) =>
        el<Change>(
          "text",
          [
            attr("x", String(l.x + l.dx)),
            attr("y", String(l.y + l.dy)),
            attr("text-anchor", l.anchor),
            attr("dominant-baseline", "middle"),
            ...labelEvents(l),
          ],
          [text(l.value)],
        ),
      ),
    ],
  );
};
