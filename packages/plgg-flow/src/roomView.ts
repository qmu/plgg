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
  RoomLayout,
  Direction,
} from "./autoLayout";
import {
  directions,
  faceAxes,
  roomStack,
} from "plgg-flow/roomCamera";
const stageBounds = (
  cells: RoomLayout["rooms"],
) => ({
  min: {
    x: Math.min(...cells.map((c) => c.min.x)),
    y: Math.min(...cells.map((c) => c.min.y)),
    z: Math.min(...cells.map((c) => c.min.z)),
  },
  max: {
    x: Math.max(...cells.map((c) => c.max.x)),
    y: Math.max(...cells.map((c) => c.max.y)),
    z: Math.max(...cells.map((c) => c.max.z)),
  },
});
const depthSign = (
  camera: Camera,
  d: Direction,
) =>
  project(camera)({ x: 0, y: 0, z: 0, [d]: 1 }).z;

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
  const cells = layout.rooms.filter(
    (c) => !c.block,
  );
  if (!cells.length) return [];
  const { min, max } = stageBounds(cells);
  const origin = {
    x:
      depthSign(camera, "x") >= 0 ? min.x : max.x,
    y: max.y,
    z:
      depthSign(camera, "z") >= 0 ? min.z : max.z,
  };
  const at = project(camera),
    start = at(origin),
    limits = max;
  const face = faceAxes(camera);
  const center = at({
    x: limits.x / 2,
    y: limits.y / 2,
    z: limits.z / 2,
  });
  return directions.flatMap((axis, index) => {
    const definition = layout.axes[axis];
    if (!definition) return [];
    const position = (v: number) =>
      at({ ...origin, [axis]: v });
    const tip = position(
      origin[axis] === min[axis]
        ? max[axis] + 40
        : min[axis] - 40,
    );
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
    const slabs = cells
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
      max[axis],
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
        letter: axis,
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
      const across = Math.abs(tx) > Math.abs(ty);
      const l = {
        axis,
        letter,
        x: p.x,
        y: p.y,
        // An axis that runs across the sheet carries its name beside
        // the tip, reading back along the axis, so it costs no width.
        dx: clear && !across ? tx * 12 : nx * 12,
        dy: clear && !across ? ty * 12 : ny * 12,
        anchor:
          clear && across
            ? tx > 0
              ? "end"
              : "start"
            : (clear ? tx : nx) < -0.25
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
const axisValueLabels = (
  layout: RoomLayout,
  camera: Camera,
) => axisLabels(axisGeometry(layout, camera));
const blockLabels = (
  layout: RoomLayout,
  camera: Camera,
) => {
  const at = project(camera);
  return layout.rooms
    .filter(
      (c) =>
        c.caption &&
        c.index[0] === 0 &&
        c.index[1] === 0 &&
        c.index[2] === 0,
    )
    .map((c) => {
      const bounds = stageBounds(
        layout.rooms.filter(
          (r) => r.block === c.block,
        ),
      );
      const p = at({
        ...bounds.max,
        x: (bounds.min.x + bounds.max.x) / 2,
      });
      return {
        ...p,
        dx: 0,
        dy: 16,
        anchor: "middle",
        value: c.caption,
      };
    });
};
export const roomLabels = (
  layout: RoomLayout,
  camera: Camera,
) => [
  ...axisValueLabels(layout, camera),
  ...blockLabels(layout, camera),
];
export const roomStage = (
  layout: RoomLayout,
  camera: Camera,
  pins?: Flow["roomPins"],
) => {
  const at = project(camera);
  const stack = roomStack(layout, camera, pins);
  const groups = new Map<
    number,
    RoomLayout["rooms"]
  >();
  for (const cell of layout.rooms) {
    const list = groups.get(cell.block) ?? [];
    list.push(cell);
    groups.set(cell.block, list);
  }
  const path = (kind: string, d: string) =>
    el<Change>(
      "path",
      [attr("class", kind), attr("d", d)],
      [],
    );
  const blocks = [...groups.values()].map(
    (cells) => {
      const { min, max } = stageBounds(cells);
      const points = (p: Point3) => {
        const q = at(p);
        return q.x + " " + q.y;
      };
      const rect = (
        normal: Direction,
        level: number,
      ) => {
        const [u, v] = directions.filter(
          (d) => d !== normal,
        );
        const p = { ...min, [normal]: level };
        return (
          "M" +
          points(p) +
          "L" +
          points({ ...p, [u!]: max[u!] }) +
          "L" +
          points({ ...max, [normal]: level }) +
          "L" +
          points({ ...p, [v!]: max[v!] }) +
          "Z"
        );
      };
      let rulings = "",
        floors = "";
      const faces = directions.map((normal) => {
        const level =
          depthSign(camera, normal) >= 0
            ? min[normal]
            : max[normal];
        for (const u of directions.filter(
          (d) => d !== normal,
        )) {
          const v = directions.find(
            (d) => d !== normal && d !== u,
          )!;
          for (const n of new Set(
            cells.map((c) => c.min[u]),
          )) {
            if (n === min[u]) continue;
            const p = {
              ...min,
              [normal]: level,
              [u]: n,
            };
            rulings +=
              "M" +
              points(p) +
              "L" +
              points({ ...p, [v]: max[v] });
          }
        }
        return path(
          "room-face",
          rect(normal, level),
        );
      });
      for (const y of new Set(
        cells.map((c) => c.min.y),
      ))
        if (y !== min.y) floors += rect("y", y);
      return {
        depth: (at(min).z + at(max).z) / 2,
        items: [
          ...faces,
          path("room-ruling", rulings),
          path("room-storeys", floors),
          ...(stack
            ? cells
                .filter(
                  (c) =>
                    directions.every(
                      (d, i) =>
                        d === stack.hidden ||
                        c.index[i] === 0,
                    ) &&
                    (stack.pin === undefined ||
                      stack.pin ===
                        c.values[stack.index]),
                )
                .map((cell) => {
                  const shift = stack.offset(
                    cell.index[stack.index]!,
                  );
                  return {
                    shift,
                    outline: el<Change>(
                      "path",
                      [
                        attr(
                          "class",
                          shift
                            ? "room-stack"
                            : "room-stack-near",
                        ),
                        attr(
                          "transform",
                          `translate(${shift} ${-shift})`,
                        ),
                        attr(
                          "d",
                          rect(
                            stack.hidden,
                            cell.min[
                              stack.hidden
                            ],
                          ),
                        ),
                      ],
                      [],
                    ),
                  };
                })
                .sort((a, b) => b.shift - a.shift)
                .map((l) => l.outline)
            : []),
        ],
      };
    },
  );
  return el<Change>(
    "g",
    [
      attr("class", "room-stage"),
      attr("pointer-events", "none"),
    ],
    blocks
      .sort((a, b) => a.depth - b.depth)
      .flatMap((b) => b.items),
  );
};
export const roomShadow = (
  node: Flow["nodes"][number],
  floor: number,
  camera: Camera,
) => {
  const w = nodeSize(node).width / 2;
  const coords = [
    [-w, -8],
    [w, -8],
    [w, 8],
    [-w, 8],
  ].map(([dx, dz]) => {
    const p = project(camera)({
      x: node.position.x + dx!,
      y: floor,
      z: node.position.z + dz!,
    });
    return p.x + " " + p.y;
  });
  return el<Change>(
    "path",
    [
      attr("class", "room-shadow"),
      attr("d", "M" + coords.join("L") + "Z"),
      attr("pointer-events", "none"),
    ],
    [],
  );
};
export const roomView = (
  layout: RoomLayout,
  camera: Camera,
  flow?: Flow,
): Html<Change> => {
  const at = project(camera);
  const labelEvents = (label: AxisLabel) => [
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
          : s.roomPins?.[label.attribute] ===
              label.value
            ? Object.fromEntries(
                Object.entries(s.roomPins).filter(
                  ([key]) =>
                    key !== label.attribute,
                ),
              )
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
      ...blockLabels(layout, camera).map((l) =>
        el<Change>(
          "text",
          [
            attr("x", String(l.x)),
            attr("y", String(l.y + l.dy)),
            attr("text-anchor", l.anchor),
          ],
          [text(l.value)],
        ),
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
