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
  Direction,
} from "./autoLayout";
import {
  directions,
  limitsOf,
  cornersOf,
  faceAxes,
  roomFilter,
  inSlab,
} from "plgg-flow/roomCamera";
const origin = { x: 0, y: 0, z: 0 };
// Each short subpath restarts the two-pixel dash. The tick and arrow
// strokes stay continuous while sharing the dotted shaft's SVG path.
const axisMark = (
  x: number,
  y: number,
  dx: number,
  dy: number,
) => {
  const parts = Math.max(
    1,
    Math.ceil(Math.hypot(dx, dy) / 2),
  );
  const step = `l${dx / parts} ${dy / parts}`;
  return (
    `M${x} ${y}` +
    Array.from(
      { length: parts },
      () => step,
    ).join("m0 0")
  );
};
const axisGeometry = (
  layout: RoomLayout,
  camera: Camera,
) => {
  const at = project(camera),
    start = at(origin),
    limits = limitsOf(layout);
  const face = faceAxes(camera);
  const center = at({
    x: limits.x / 2,
    y: limits.y / 2,
    z: limits.z / 2,
  });
  return directions.flatMap((axis, index) => {
    const definition =
      layout.axes[axis] ??
      (axis === "z"
        ? layout.tableHidden
        : undefined);
    if (!definition) return [];
    const position = (v: number) =>
      at({ ...origin, [axis]: v });
    const tip = position(limits[axis] + 40);
    const hidden = face?.includes(axis) === false;
    const length = Math.hypot(
      tip.x - start.x,
      tip.y - start.y,
    );
    const tx =
      hidden || !length
        ? -1
        : (tip.x - start.x) / length;
    const ty =
      hidden || !length
        ? 0
        : (tip.y - start.y) / length;
    const sign =
      -ty * (center.x - start.x) +
        tx * (center.y - start.y) >
      0
        ? -1
        : 1;
    const nx = -ty * sign,
      ny = tx * sign;
    const slabs = layout.rooms
      .filter((r) =>
        directions.every(
          (d) =>
            d === axis ||
            r.index[directions.indexOf(d)] === 0,
        ),
      )
      .sort(
        (a, b) =>
          a.index[index]! - b.index[index]!,
      );
    const ticks = [
      ...slabs.map((r) => r.min[axis]),
      slabs[slabs.length - 1]?.max[axis] ?? 0,
    ];
    const path = hidden
      ? `M${start.x} ${start.y}h0`
      : `M${start.x} ${start.y}L${tip.x} ${tip.y}` +
        axisMark(
          tip.x,
          tip.y,
          -6 * tx + 3 * nx,
          -6 * ty + 3 * ny,
        ) +
        axisMark(
          tip.x,
          tip.y,
          -6 * tx - 3 * nx,
          -6 * ty - 3 * ny,
        ) +
        ticks
          .map((v) => {
            const p = position(v);
            return axisMark(
              p.x - 3 * nx,
              p.y - 3 * ny,
              6 * nx,
              6 * ny,
            );
          })
          .join("");
    return [
      {
        axis,
        letter: layout.tableAxes?.[index] ?? axis,
        definition,
        slabs,
        index,
        tip: hidden ? start : tip,
        position,
        hidden,
        tx,
        ty,
        nx,
        ny,
        path,
      },
    ];
  });
};
type AxisLabel = {
  axis: Direction;
  letter: Direction;
  x: number;
  y: number;
  dx: number;
  dy: number;
  anchor: string;
  value: string;
  attribute: string;
  clear: boolean;
  size: number;
};
const axisLabels = (
  axes: ReturnType<typeof axisGeometry>,
) => {
  const labels: AxisLabel[] = [];
  const left = (l: AxisLabel) =>
    l.x +
    l.dx -
    (l.anchor === "end"
      ? 1
      : l.anchor === "middle"
        ? 0.5
        : 0) *
      13 *
      l.value.length;
  for (const {
    axis,
    letter,
    definition,
    slabs,
    index,
    tip,
    position,
    hidden,
    tx,
    ty,
    nx,
    ny,
  } of axes) {
    const add = (
      p: Point3,
      value: string,
      clear: boolean,
      halfSpan = 0,
    ) => {
      const l = {
        axis,
        letter,
        x: p.x,
        y: p.y,
        dx: clear ? tx * 12 : nx * 12,
        dy: clear ? ty * 12 : ny * 12,
        anchor:
          (clear ? tx : nx) < -0.25
            ? "end"
            : (clear ? tx : nx) > 0.25
              ? "start"
              : "middle",
        value,
        attribute: definition.attribute,
        clear,
        size: clear ? 12 : 11,
      };
      const overlap = () =>
        labels.some(
          (other) =>
            Math.abs(
              l.y + l.dy - other.y - other.dy,
            ) < 15 &&
            left(l) <
              left(other) +
                13 * other.value.length +
                2 &&
            left(other) <
              left(l) + 13 * l.value.length + 2,
        );
      if (!clear && overlap()) l.size = 10;
      const dx = l.dx,
        dy = l.dy;
      for (
        let shift = 4;
        overlap() && shift <= halfSpan;
        shift += 4
      ) {
        l.dx = dx + tx * shift;
        l.dy = dy + ty * shift;
        if (overlap()) {
          l.dx = dx - tx * shift;
          l.dy = dy - ty * shift;
        }
      }
      // Edge-on, several projected segments can occupy less than one glyph.
      // Stack those labels outward, retaining their midpoint along the axis.
      if (overlap()) {
        l.dx = dx;
        l.dy = dy;
      }
      while (overlap()) {
        l.dx += nx * 4;
        l.dy += ny * 4;
      }
      labels.push(l);
    };
    if (!hidden)
      for (const room of slabs) {
        const a = position(room.min[axis]),
          b = position(room.max[axis]);
        add(
          position(
            (room.min[axis] + room.max[axis]) / 2,
          ),
          room.values[index]!,
          false,
          Math.hypot(b.x - a.x, b.y - a.y) / 2,
        );
      }
    add(
      tip,
      letter + " " + definition.attribute,
      true,
    );
  }
  return labels;
};
export const roomLabels = (
  layout: RoomLayout,
  camera: Camera,
) => axisLabels(axisGeometry(layout, camera));
const prepareRooms = (layout: RoomLayout) => {
  const limits = limitsOf(layout);
  const points = new Map<string, Point3>();
  const corner = (p: Point3) => {
    const key = [p.x, p.y, p.z].join(",");
    const known = points.get(key);
    if (known) return known;
    points.set(key, p);
    return p;
  };
  return layout.rooms.map((room) => {
    const corners = cornersOf(room).map(corner);
    const floor = [
      room.min,
      { ...room.min, x: room.max.x },
      { ...room.max, z: room.min.z },
      { ...room.min, y: room.max.y },
    ].map(corner);
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
    const edges = directions.flatMap((axis) =>
      corners
        .filter((p) => p[axis] === room.min[axis])
        .map((p) => ({
          axis,
          p,
          q: corner({
            ...p,
            [axis]: room.max[axis],
          }),
          outer: directions.every(
            (d) =>
              d === axis ||
              p[d] === 0 ||
              p[d] === limits[d],
          ),
          key: [axis, p.x, p.y, p.z].join(","),
        })),
    );
    return {
      room,
      corners,
      floor,
      values,
      edges,
    };
  });
};
const geometry = new WeakMap<
  RoomLayout,
  ReturnType<typeof prepareRooms>
>();
export const roomView = (
  layout: RoomLayout,
  camera: Camera,
  flow?: Flow,
): Html<Change> => {
  const transform = project(camera);
  const projected = new Map<Point3, Point3>();
  const at = (p: Point3) => {
    const known = projected.get(p);
    if (known) return known;
    const q = transform(p);
    projected.set(p, q);
    return q;
  };
  const cells =
    geometry.get(layout) ?? prepareRooms(layout);
  geometry.set(layout, cells);
  const face = faceAxes(camera);
  const limits = limitsOf(layout);
  const filter = flow ? roomFilter(flow) : {};
  const active = Object.keys(filter).length > 0;
  const lines = new Map<
    string,
    { d: string; kind: string }
  >();
  const shadows = new Map<Room, string[]>();
  for (const node of flow?.nodes ?? []) {
    const room = roomFor(layout, node);
    if (!room || node.hidden || face) continue;
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
    members.push("M" + points + "Z");
    shadows.set(room, members);
  }
  const centerDepth = at({
    x: limits.x / 2,
    y: limits.y / 2,
    z: limits.z / 2,
  }).z;
  const rooms = (face ? cells : []).map(
    ({ room, corners, floor, values, edges }) => {
      const far = corners.reduce((best, p) =>
        at(p).z < at(best).z ? p : best,
      );
      const selected =
        active && inSlab(values, filter);
      for (const {
        axis,
        p,
        q,
        outer,
        key,
      } of edges) {
        const midDepth = (at(p).z + at(q).z) / 2;
        const kind = outer
          ? midDepth >= centerDepth
            ? "outer"
            : "far"
          : "inner";
        if (
          !room.occupied &&
          !selected &&
          !outer
        ) {
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
      const points = floor
        .map((p) => at(p))
        .map((p) => p.x + "," + p.y)
        .join(" ");
      const near = floor
        .map((p) => at(p))
        .sort(
          (a, b) => b.z - a.z || b.y - a.y,
        )[0]!;
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
              "path",
              [
                attr(
                  "class",
                  selected
                    ? "room-selected"
                    : room.occupied
                      ? "room-floor"
                      : "room-clear",
                ),
                attr("d", "M" + points + "Z"),
                attr("pointer-events", "all"),
              ],
              [],
            ),
            ...(shadows.has(room)
              ? [
                  el<Change>(
                    "path",
                    [
                      attr(
                        "class",
                        "room-shadow",
                      ),
                      attr(
                        "d",
                        shadows
                          .get(room)
                          ?.join("") ?? "",
                      ),
                    ],
                    [],
                  ),
                ]
              : []),
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
    },
  );
  function segment(p: Point3, q: Point3) {
    const a = at(p),
      b = at(q);
    return `M${a.x} ${a.y}L${b.x} ${b.y}`;
  }
  const plates = (face ? [] : cells)
    .filter(
      ({ room }) =>
        room.index[0] === 0 &&
        room.index[1] === 0,
    )
    .map(({ room }) => {
      const z = room.min.z;
      const point = (x: number, y: number) => ({
        x,
        y,
        z,
      });
      const corners = [
        point(0, 0),
        point(limits.x, 0),
        point(limits.x, limits.y),
        point(0, limits.y),
      ].map(at);
      const polygon = (
        points: readonly Point3[],
      ) =>
        "M" +
        points
          .map((p) => p.x + "," + p.y)
          .join("L") +
        "Z";
      const nearEdge =
        corners[3]!.z >= corners[0]!.z
          ? corners.slice(2)
          : corners.slice(0, 2);
      const near = nearEdge.reduce((left, p) =>
        p.x < left.x ? p : left,
      );
      const floor = cells.filter(
        (c) => c.room.index[2] === room.index[2],
      );
      const rulings = floor
        .map(
          ({ room: r }) =>
            (r.index[0] && !r.index[1]
              ? segment(
                  point(r.min.x, 0),
                  point(r.min.x, limits.y),
                )
              : "") +
            (r.index[1] && !r.index[0]
              ? segment(
                  point(0, r.min.y),
                  point(limits.x, r.min.y),
                )
              : ""),
        )
        .join("");
      const path = (kind: string, d: string) =>
        el<Change>(
          "path",
          [attr("class", kind), attr("d", d)],
          [],
        );
      const highlight = active
        ? floor
            .filter((c) =>
              inSlab(c.values, filter),
            )
            .map((c) => polygon(c.floor.map(at)))
            .join("")
        : "";
      return {
        depth: at(
          point(limits.x / 2, limits.y / 2),
        ).z,
        view: el<Change>(
          "g",
          [],
          [
            path("room-plate", polygon(corners)),
            ...(highlight
              ? [path("room-selected", highlight)]
              : []),
            path("room-ruling", rulings),
            path(
              "room-shadow",
              floor
                .flatMap(
                  (c) =>
                    shadows.get(c.room) ?? [],
                )
                .join(""),
            ),
            ...(layout.axes.z
              ? [
                  el<Change>(
                    "text",
                    [
                      attr(
                        "class",
                        "room-floor-value",
                      ),
                      attr("x", String(near.x)),
                      attr(
                        "y",
                        String(near.y - 4),
                      ),
                      attr(
                        "text-anchor",
                        "start",
                      ),
                    ],
                    [text(room.values[2]!)],
                  ),
                ]
              : []),
          ],
        ),
      };
    });
  const uprights = [0, limits.x]
    .flatMap((x) =>
      [0, limits.y].map((y) =>
        segment(
          { x, y, z: 0 },
          { x, y, z: limits.z },
        ),
      ),
    )
    .join("");
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
  const axes = axisGeometry(layout, camera);
  const node = flow?.nodes.find(
    (n) =>
      n.id ===
      (flow.roomNode ??
        (flow.selected.__tag === "Some"
          ? flow.selected.content
          : undefined)),
  );
  const room = node && roomFor(layout, node);
  const guides =
    node && room
      ? axes
          .map(({ axis, position }) => {
            const p = at(node.position),
              q = position(
                (room.min[axis] +
                  room.max[axis]) /
                  2,
              );
            return `M${p.x} ${p.y}L${q.x} ${q.y}`;
          })
          .join("")
      : "";
  return el(
    "g",
    [
      attr("class", "room-scene"),
      attr("pointer-events", "none"),
    ],
    [
      ...(face ? rooms : plates)
        .sort((a, b) => a.depth - b.depth)
        .map((r) => r.view),
      face
        ? el(
            "g",
            [attr("class", "room-lattice")],
            [
              "empty",
              "inner",
              "far",
              "outer",
            ].map((kind) =>
              el<Change>(
                "path",
                [
                  attr("class", "room-" + kind),
                  attr(
                    "d",
                    [...lines.values()]
                      .filter(
                        (l) => l.kind === kind,
                      )
                      .map((l) => l.d)
                      .join(""),
                  ),
                  attr("fill", "none"),
                ],
                [],
              ),
            ),
          )
        : el(
            "path",
            [
              attr("class", "room-uprights"),
              attr("d", uprights),
            ],
            [],
          ),
      ...axes.map((a) =>
        el<Change>(
          "path",
          [
            attr("data-room-axis", a.letter),
            attr("d", a.path),
            attr("fill", "none"),
            attr("stroke", "var(--ink)"),
            attr("stroke-width", "1.25"),
            attr("stroke-linecap", "round"),
            attr("stroke-dasharray", "2 4"),
          ],
          [],
        ),
      ),
      ...(guides
        ? [
            el<Change>(
              "path",
              [
                attr("class", "room-guides"),
                attr("d", guides),
                attr("stroke", "var(--pencil)"),
                attr("stroke-dasharray", "2 4"),
                attr("fill", "none"),
              ],
              [],
            ),
          ]
        : []),
      ...axisLabels(axes).map((l) =>
        el<Change>(
          "text",
          [
            attr("x", String(l.x + l.dx)),
            attr("y", String(l.y + l.dy)),
            attr("text-anchor", l.anchor),
            attr("dominant-baseline", "middle"),
            ...labelEvents(l),
            attr(
              "style",
              `font-size:${l.size}px;font-weight:${l.clear ? 600 : 500};fill:var(--${l.clear || flow?.roomPins?.[l.attribute] === l.value || node?.data?.[l.attribute] === l.value ? "ink" : "graphite"}) !important;text-decoration:${!l.clear && flow?.roomPins?.[l.attribute] === l.value ? "underline" : "none"}`,
            ),
          ],
          l.clear
            ? [
                el(
                  "tspan",
                  [
                    attr(
                      "style",
                      "font-size:10px;fill:var(--pencil)",
                    ),
                  ],
                  [text(l.letter + " ")],
                ),
                text(l.attribute),
              ]
            : [text(l.value)],
        ),
      ),
    ],
  );
};
