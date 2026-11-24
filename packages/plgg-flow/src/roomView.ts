import { bodyDepth } from "plgg-flow/nodeBody";
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
const groupsOf = (layout: RoomLayout) => {
  const groups = new Map<
    number,
    RoomLayout["rooms"]
  >();
  for (const room of layout.rooms) {
    const group = groups.get(room.block);
    if (group) group.push(room);
    else groups.set(room.block, [room]);
  }
  return [...groups.values()];
};
type Box = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};
const meets = (a: Box, b: Box) =>
  a.left < b.right + 1 &&
  b.left < a.right + 1 &&
  a.top < b.bottom + 1 &&
  b.top < a.bottom + 1;
const corners = (min: Point3, max: Point3) =>
  [min.x, max.x].flatMap((x) =>
    [min.y, max.y].flatMap((y) =>
      [min.z, max.z].map((z) => ({ x, y, z })),
    ),
  );
const labelBox = (l: {
  x: number;
  y: number;
  dx: number;
  dy: number;
  value: string;
  anchor: string;
}) => {
  const width = 13 * l.value.length;
  const left =
    l.x +
    l.dx -
    (l.anchor === "middle"
      ? width / 2
      : l.anchor === "end"
        ? width
        : 0);
  return {
    left,
    right: left + width,
    top: l.y + l.dy - 7,
    bottom: l.y + l.dy + 7,
  };
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
const axisGeometry = (
  layout: RoomLayout,
  camera: Camera,
  nodes: Flow["nodes"] = [],
) => {
  const at = project(camera);
  const face = faceAxes(camera);
  const occupied: Box[] = blockLabels(
    layout,
    camera,
  ).map(labelBox);
  for (const node of nodes.filter(
    (n) => !n.hidden,
  )) {
    const { width, height } = nodeSize(node);
    const p = node.position,
      d = bodyDepth(node);
    const points = corners(
      {
        x: p.x - width / 2,
        y: p.y - height / 2,
        z: p.z - d,
      },
      {
        x: p.x + width / 2,
        y: p.y + height / 2,
        z: p.z + d,
      },
    ).map(at);
    const center = at(p);
    occupied.push({
      left: Math.min(
        center.x - (width * camera.scale) / 2,
        ...points.map((q) => q.x),
      ),
      right: Math.max(
        center.x + (width * camera.scale) / 2,
        ...points.map((q) => q.x),
      ),
      top: Math.min(
        center.y - (height * camera.scale) / 2,
        ...points.map((q) => q.y),
      ),
      bottom: Math.max(
        center.y + (height * camera.scale) / 2,
        ...points.map((q) => q.y),
      ),
    });
  }
  const groups = groupsOf(layout).map(
    (cells) => ({ cells, ...stageBounds(cells) }),
  );
  const zero = at({ x: 0, y: 0, z: 0 });
  const unit = (axis: Direction) =>
    at({ x: 0, y: 0, z: 0, [axis]: 1 });
  // A rectangle misses a projected cuboid if their intervals separate
  // along a screen axis or the normal of a projected cuboid edge.
  const normals = [
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    ...directions
      .map((d) => {
        const q = unit(d);
        return {
          x: zero.y - q.y,
          y: q.x - zero.x,
        };
      })
      .filter((n) => Math.hypot(n.x, n.y) > 1e-8),
  ];
  const hulls = groups.map(({ min, max }) => {
    const points = corners(min, max).map(at);
    return normals.map((n) => {
      const offsets = points.map(
        (q) => q.x * n.x + q.y * n.y,
      );
      return {
        ...n,
        low: Math.min(...offsets),
        high: Math.max(...offsets),
      };
    });
  });
  const touchesHull = (box: Box) =>
    hulls.some((hull) =>
      hull.every((n) => {
        const cx = (box.left + box.right) / 2,
          cy = (box.top + box.bottom) / 2;
        const middle = cx * n.x + cy * n.y;
        const radius =
          ((box.right - box.left) *
            Math.abs(n.x) +
            (box.bottom - box.top) *
              Math.abs(n.y)) /
          2;
        return (
          middle + radius > n.low &&
          middle - radius < n.high
        );
      }),
    );
  const z = unit("z");
  const side =
    (zero.y - z.y) * (z.x - zero.x) >= 0 ? 1 : -1;
  // Max/min support parallel to an axis identifies its two outline edges.
  return directions.flatMap((axis, index) => {
    const definition = layout.axes[axis];
    if (!definition || !groups.length) return [];
    const u = unit(axis),
      dir = axis === "y" ? -1 : 1;
    const length = Math.hypot(
      u.x - zero.x,
      u.y - zero.y,
    );
    const hidden =
      face !== undefined && !face.includes(axis);
    const tx = hidden
        ? 1
        : (dir * (u.x - zero.x)) / length,
      ty = hidden
        ? 0
        : (dir * (u.y - zero.y)) / length;
    const sign =
      axis !== "y" && Math.abs(tx) > 1e-8
        ? tx >= 0
          ? 1
          : -1
        : -ty * (axis === "z" ? side : -side) >= 0
          ? 1
          : -1;
    const nx = hidden ? 0 : -ty * sign,
      ny = hidden ? 1 : tx * sign;
    const support = (p: Point3) => {
      const q = at(p);
      return q.x * nx + q.y * ny;
    };
    const ordered = groups
      .map((group) => ({
        ...group,
        extent: Math.max(
          ...corners(group.min, group.max).map(
            support,
          ),
        ),
      }))
      .sort((a, b) => b.extent - a.extent);
    return (
      axis === "x" ? ordered : ordered.slice(0, 1)
    ).map(({ min, max, cells }, i) => {
      const origins = corners(min, max)
        .filter(
          (p) =>
            p[axis] ===
            (dir === 1 ? min : max)[axis],
        )
        .sort(
          (a, b) =>
            support(b) - support(a) ||
            at(b).z - at(a).z,
        );
      const slabs = cells
        .filter((r) =>
          directions.every(
            (d, j) =>
              d === axis || r.index[j] === 0,
          ),
        )
        .sort(
          (a, b) =>
            a.index[index]! - b.index[index]!,
        );
      const edge = (
        opposite: boolean,
        shift: boolean,
      ) => {
        const origin = (
          opposite
            ? origins[origins.length - 1]
            : origins[0]
        )!;
        const normal = opposite ? -1 : 1,
          dx = nx * normal,
          dy = ny * normal;
        const position = (v: number) =>
          at({ ...origin, [axis]: v });
        const start = at(origin),
          tip = position(
            (dir === 1 ? max : min)[axis] +
              dir * 40,
          );
        const boxes = [...occupied];
        const labels: AxisLabel[] = [];
        let blocked = false;
        const add = (
          p: Point3,
          value: string,
          clear: boolean,
        ) => {
          const gap =
            8 +
            (Math.abs(dx) * 13 * value.length) /
              2 +
            Math.abs(dy) * 7;
          const l = {
            axis,
            letter: axis,
            x: p.x,
            y: p.y,
            dx: dx * gap,
            dy: dy * gap,
            anchor: "middle",
            value,
            attribute: definition.attribute,
            clear,
            size: clear ? 12 : 13,
          };
          let box = labelBox(l);
          while (
            touchesHull(box) ||
            boxes.some((b) => meets(box, b))
          ) {
            blocked = true;
            if (!shift) break;
            l.dx += 4 * dx;
            l.dy += 4 * dy;
            box = labelBox(l);
          }
          boxes.push(box);
          labels.push(l);
        };
        for (const r of slabs)
          add(
            position(
              (r.min[axis] + r.max[axis]) / 2,
            ),
            r.values[index]!,
            false,
          );
        if (!i)
          add(
            tip,
            axis + " " + definition.attribute,
            true,
          );
        return {
          position,
          start,
          tip,
          dx,
          dy,
          labels,
          blocked,
        };
      };
      let chosen = edge(false, false);
      if (chosen.blocked) {
        const other = edge(true, false);
        chosen = other.blocked
          ? edge(false, true)
          : other;
      }
      const {
        start,
        tip,
        position,
        dx,
        dy,
        labels,
      } = chosen;
      occupied.push(...labels.map(labelBox));
      const ticks = [
        ...new Set(
          slabs.flatMap((r) => [
            r.min[axis],
            r.max[axis],
          ]),
        ),
      ];
      const path = hidden
        ? `M${start.x} ${start.y}h0`
        : `M${start.x} ${start.y}L${tip.x} ${tip.y}` +
          axisMark(
            tip.x,
            tip.y,
            -6 * tx + 3 * dx,
            -6 * ty + 3 * dy,
          ) +
          axisMark(
            tip.x,
            tip.y,
            -6 * tx - 3 * dx,
            -6 * ty - 3 * dy,
          ) +
          ticks
            .map((v) => {
              const p = position(v);
              return axisMark(
                p.x,
                p.y,
                6 * dx,
                6 * dy,
              );
            })
            .join("");
      return {
        axis,
        letter: axis,
        block: cells[0]!.block,
        position,
        path,
        labels,
      };
    });
  });
};
const blockLabels = (
  layout: RoomLayout,
  camera: Camera,
) => {
  const at = project(camera);
  const occupied: Box[] = [];
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
        z:
          at(bounds.max).y >=
          at({ ...bounds.max, z: bounds.min.z }).y
            ? bounds.max.z
            : bounds.min.z,
      });
      const label = {
        ...p,
        dx: 0,
        dy: 44,
        anchor: "middle",
        value: c.caption,
      };
      while (
        occupied.some((b) =>
          meets(b, labelBox(label)),
        )
      )
        label.dy += 4;
      occupied.push(labelBox(label));
      return label;
    });
};
export const roomLabels = (
  layout: RoomLayout,
  camera: Camera,
  nodes: Flow["nodes"] = [],
) => [
  ...axisGeometry(layout, camera, nodes).flatMap(
    (a) => a.labels,
  ),
  ...blockLabels(layout, camera),
];
export const roomStage = (
  layout: RoomLayout,
  camera: Camera,
  pins?: Flow["roomPins"],
) => {
  const at = project(camera);
  const stack = roomStack(layout, camera, pins);
  const path = (kind: string, d: string) =>
    el<Change>(
      "path",
      [attr("class", kind), attr("d", d)],
      [],
    );
  const blocks = groupsOf(layout).map((cells) => {
    const { min, max } = stageBounds(cells);
    const points = (p: Point3) => {
      const q = at(p);
      return q.x + " " + q.y;
    };
    const rect = (
      normal: Direction,
      level: number,
      lo = min,
      hi = max,
    ) => {
      const [u, v] = directions.filter(
        (d) => d !== normal,
      );
      const p = { ...lo, [normal]: level };
      return (
        "M" +
        points(p) +
        "L" +
        points({ ...p, [u!]: hi[u!] }) +
        "L" +
        points({ ...hi, [normal]: level }) +
        "L" +
        points({ ...p, [v!]: hi[v!] }) +
        "Z"
      );
    };
    const levels = (axis: Direction) =>
      [
        ...new Set(cells.map((c) => c.max[axis])),
      ].sort((a, b) => b - a);
    const line = (p: Point3, q: Point3) =>
      "M" + points(p) + "L" + points(q);
    const faces = directions.map((d) =>
      path(
        "room-face",
        rect(
          d,
          depthSign(camera, d) >= 0
            ? min[d]
            : max[d],
        ),
      ),
    );
    const plates = levels("y").map((y) => {
      let grid = "";
      for (const x of levels("x").filter(
        (x) => x < max.x,
      ))
        grid += line(
          { x, y, z: min.z },
          { x, y, z: max.z },
        );
      for (const z of levels("z").filter(
        (z) => z < max.z,
      ))
        grid += line(
          { x: min.x, y, z },
          { x: max.x, y, z },
        );
      return [
        path("room-storeys", rect("y", y)),
        path("room-ruling", grid),
      ];
    });
    let hull = "";
    for (const cell of cells) {
      for (const axis of [
        "x",
        "z",
      ] satisfies Direction[]) {
        const side = axis === "x" ? "z" : "x";
        if (cell.max[axis] === max[axis])
          continue;
        for (const level of [
          min[side],
          max[side],
        ]) {
          if (
            cell.min[side] !== level &&
            cell.max[side] !== level
          )
            continue;
          const p = {
            ...cell.max,
            [side]: level,
          };
          hull += line(p, {
            ...p,
            y: cell.min.y,
          });
        }
      }
    }
    const selected = cells.filter((c) =>
      directions.every((d, i) => {
        const attribute =
          layout.axes[d]?.attribute;
        return (
          !attribute ||
          pins?.[attribute] === undefined ||
          pins[attribute] === c.values[i]
        );
      }),
    );
    const pinned =
      pins &&
      Object.keys(pins).length &&
      selected.length
        ? stageBounds(selected)
        : undefined;
    return {
      depth: (at(min).z + at(max).z) / 2,
      items: [
        ...faces,
        ...plates.flat(),
        path(
          "room-hull",
          directions
            .map((d) =>
              rect(
                d,
                depthSign(camera, d) >= 0
                  ? max[d]
                  : min[d],
              ),
            )
            .join(""),
        ),
        path("room-ruling", hull),
        ...(pinned
          ? directions.flatMap((d) =>
              [pinned.min[d], pinned.max[d]].map(
                (level) =>
                  path(
                    "room-pinned",
                    rect(
                      d,
                      level,
                      pinned.min,
                      pinned.max,
                    ),
                  ),
              ),
            )
          : []),
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
                          cell.min[stack.hidden],
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
  });
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
  const axes = axisGeometry(
    layout,
    camera,
    flow?.nodes,
  );
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
          .filter(
            (a) =>
              a.axis !== "x" ||
              a.block === room.block,
          )
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
            attr("dominant-baseline", "middle"),
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
      ...axes
        .flatMap((a) => a.labels)
        .map((l) =>
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
