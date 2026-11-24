import { boardNames } from "plgg-flow/boardNames";
import { roomFor } from "plgg-flow/autoLayout";
import {
  cardBounds,
  corners,
} from "plgg-flow/nodeBody";
import {
  project,
  unproject,
  type Camera,
  type Point3,
} from "plgg-board";
import type {
  Flow,
  Scenery,
  Change,
} from "./model";
import type {
  RoomLayout,
  Direction,
} from "./autoLayout";
import {
  directions,
  faceAxes,
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
// Remove the part of a screen-space stroke inside each card.
const clearLine = (
  x: number,
  y: number,
  dx: number,
  dy: number,
  cards: Box[],
) => {
  let spans = [[0, 1]];
  for (const box of cards) {
    let low = 0,
      high = 1;
    for (const [start, delta, min, max] of [
      [x, dx, box.left, box.right],
      [y, dy, box.top, box.bottom],
    ] satisfies [
      number,
      number,
      number,
      number,
    ][]) {
      if (delta === 0) {
        if (start < min || start > max) high = -1;
      } else {
        const a = (min - start) / delta,
          b = (max - start) / delta;
        low = Math.max(low, Math.min(a, b));
        high = Math.min(high, Math.max(a, b));
      }
    }
    if (low < high)
      spans = spans.flatMap(([a = 0, b = 1]) =>
        [
          [a, Math.min(b, low)],
          [Math.max(a, high), b],
        ].filter(([u = 0, v = 1]) => u < v),
      );
  }
  return spans.map(([a = 0, b = 1]) => [
    { x: x + a * dx, y: y + a * dy },
    { x: x + b * dx, y: y + b * dy },
  ]);
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
  z: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  anchor: string;
  value: string;
  attribute: string;
  clear: boolean;
  size: number;
  span?: { from: Point3; to: Point3 };
};
const axisGeometry = (
  layout: RoomLayout,
  camera: Camera,
  cards: Box[],
  blocks: ReturnType<typeof blockLabels>,
) => {
  const at = project(camera);
  const face = faceAxes(camera);
  const occupied = [
    ...cards,
    ...blocks.map(labelBox),
  ];
  const mark = (
    x: number,
    y: number,
    dx: number,
    dy: number,
  ) => clearLine(x, y, dx, dy, cards);
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
    ).map(({ min, max, cells }) => {
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
        const boxes = [...occupied];
        const labels: AxisLabel[] = [];
        let blocked = false;
        // Every value of one axis sits at the same distance, so
        // their dimension lines run in one row.
        const reach = (value: string) =>
          8 +
          (Math.abs(dx) * 13 * value.length) / 2 +
          Math.abs(dy) * 7;
        const row = Math.max(
          0,
          ...slabs.map((r) =>
            reach(r.values[index]!),
          ),
        );
        const add = (
          p: Point3,
          value: string,
          clear: boolean,
          span?: { from: Point3; to: Point3 },
        ) => {
          const gap = clear
            ? Math.max(
                row,
                ...labels.map((l) =>
                  Math.hypot(l.dx, l.dy),
                ),
              ) + 16
            : row;
          const l: AxisLabel = {
            axis,
            z: p.z,
            x: p.x,
            y: p.y,
            dx: dx * gap,
            dy: dy * gap,
            anchor: "middle",
            value,
            attribute: definition.attribute,
            clear,
            size: 10,
            ...(span && { span }),
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
            {
              from: position(r.min[axis]),
              to: position(r.max[axis]),
            },
          );
        if (
          axis !== "x" ||
          cells[0]!.block ===
            groups[0]!.cells[0]!.block
        )
          add(
            position((min[axis] + max[axis]) / 2),
            definition.attribute,
            true,
            {
              from: position(min[axis]),
              to: position(max[axis]),
            },
          );
        return {
          position,

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
      const { position, labels } = chosen;
      occupied.push(...labels.map(labelBox));
      const path = hidden
        ? []
        : [
            ...labels
              .flatMap((l) => {
                if (!l.span) return [];
                // A dimension line: from both ends of the value's
                // stretch toward its name, which sits in the middle.
                const { from, to } = l.span;
                const length = Math.hypot(
                  to.x - from.x,
                  to.y - from.y,
                );
                if (!length) return [];
                const ux =
                    (to.x - from.x) / length,
                  uy = (to.y - from.y) / length;
                const run =
                  length / 2 -
                  (Math.abs(ux) *
                    l.size *
                    l.value.length) /
                    2 -
                  Math.abs(uy) * (l.size / 2) -
                  4;
                const out = Math.hypot(
                  l.dx,
                  l.dy,
                );
                const over = out
                  ? (out + 3) / out
                  : 0;
                const tickStart = (p: Point3) => {
                  const value =
                    l.clear &&
                    labels.find(
                      (v) =>
                        !v.clear &&
                        v.span &&
                        [
                          v.span.from,
                          v.span.to,
                        ].some(
                          (q) =>
                            q.x === p.x &&
                            q.y === p.y,
                        ),
                    );
                  return {
                    x: value ? value.dx : 0,
                    y: value ? value.dy : 0,
                  };
                };
                const first = tickStart(from),
                  last = tickStart(to);
                return [
                  mark(
                    from.x + first.x,
                    from.y + first.y,
                    l.dx * over - first.x,
                    l.dy * over - first.y,
                  ),
                  mark(
                    to.x + last.x,
                    to.y + last.y,
                    l.dx * over - last.x,
                    l.dy * over - last.y,
                  ),
                  ...(run > 2
                    ? [
                        mark(
                          from.x + l.dx,
                          from.y + l.dy,
                          ux * run,
                          uy * run,
                        ),
                        mark(
                          to.x + l.dx,
                          to.y + l.dy,
                          -ux * run,
                          -uy * run,
                        ),
                      ]
                    : []),
                ];
              })
              .flat(),
          ];
      return {
        axis,
        block: cells[0]!.block,
        position,
        mark,
        path,
        labels,
      };
    });
  });
};
const blockLabels = (
  layout: RoomLayout,
  camera: Camera,
  cards: Box[],
  edges: Flow["edges"] = [],
) => {
  const at = project(camera);
  const occupied = [...cards];
  const blocks = groupsOf(layout)
    .filter((c) => c[0]?.caption)
    .map((c) => {
      const { min, max } = stageBounds(c);
      const points = corners(min, max).map(at);
      return {
        points: corners(min, max),
        value: c[0]!.caption,
        address: c[0]!.blockAddress,
        left: Math.min(...points.map((p) => p.x)),
        right: Math.max(
          ...points.map((p) => p.x),
        ),
        bottom: Math.max(
          ...points.map((p) => p.y),
        ),
      };
    });
  const names = boardNames(
    blocks.map((b) => ({
      points: b.points,
      text: b.value,
    })),
    cards,
    edges,
    camera,
    layout,
  );
  const labels = [];
  const baseline =
    Math.max(...blocks.map((b) => b.bottom)) + 24;
  const add = (
    value: string,
    left: number,
    right: number,
    y: number,
    outer: boolean,
    tick?: { x: number; y: number; z: number },
    centre = (left + right) / 2,
  ) => {
    const label = {
      x: centre,
      tick,
      y,
      z: 0,
      dx: 0,
      dy: 0,
      anchor: "middle",
      value,
      left,
      right,
      outer,
    };
    while (
      occupied.some((b) =>
        meets(b, labelBox(label)),
      )
    )
      label.dy += 4;
    occupied.push(labelBox(label));
    return label;
  };
  let y = baseline;
  for (const role of ["column", "row"] satisfies (
    | "column"
    | "row"
  )[]) {
    const axis = layout.axes[role];
    if (!axis || !blocks.length) continue;
    const spans = new Map<
      string,
      { left: number; right: number }
    >();
    for (const block of blocks) {
      const value =
        block.address?.[role] ?? block.value;
      const span = spans.get(value);
      spans.set(value, {
        left: Math.min(
          block.left,
          span?.left ?? Infinity,
        ),
        right: Math.max(
          block.right,
          span?.right ?? -Infinity,
        ),
      });
    }
    for (const [value, span] of spans) {
      const block = blocks.findIndex(
        (b) => b.value === value,
      );
      const place = names[block];
      labels.push(
        add(
          value,
          span.left,
          span.right,
          place?.y ?? y,
          false,
          place?.anchor,
          place?.x,
        ),
      );
    }
    const name = add(
      axis.attribute,
      Math.min(...blocks.map((b) => b.left)),
      Math.max(...blocks.map((b) => b.right)),
      Math.max(...labels.map((l) => l.y + l.dy)) +
        16,
      true,
    );
    labels.push(name);
    y = name.y + name.dy + 20;
  }
  return labels;
};
export const roomLabels = (
  layout: RoomLayout,
  camera: Camera,
  nodes: Flow["nodes"] = [],
  edges: Flow["edges"] = [],
): (
  | AxisLabel
  | ReturnType<typeof blockLabels>[number]
)[] => {
  const local = {
    ...camera,
    origin: { x: 0, y: 0 },
  };
  const cards = cardBounds(local, nodes);
  const blocks = blockLabels(
    layout,
    local,
    cards,
    edges,
  );
  return [
    ...axisGeometry(
      layout,
      local,
      cards,
      blocks,
    ).flatMap((a) => a.labels),
    ...blocks,
  ].map((l) => ({
    ...l,
    x: l.x + camera.origin.x,
    y: l.y + camera.origin.y,
  }));
};
const pencil = "var(--pencil,gray)",
  ink = "var(--ink,black)";
export const spaceScenery = (
  layout: RoomLayout,
  flow: Flow,
): Scenery[] => {
  const camera = flow.camera;
  const result: Scenery[] = [];
  const boards: {
    points: Point3[];
    text: string;
    label: Extract<Scenery, { kind: "label" }>;
  }[] = [];
  for (const cells of groupsOf(layout)) {
    const bounds = stageBounds(cells);
    const rect = (
      d: Direction,
      level: number,
      { min, max } = bounds,
    ): [Point3, Point3, Point3, Point3] => {
      const [u, v] = directions.filter(
        (k) => k !== d,
      );
      const p = { ...min, [d]: level };
      return [
        p,
        { ...p, [u!]: max[u!] },
        { ...max, [d]: level },
        { ...p, [v!]: max[v!] },
      ];
    };
    const frame = (
      box: typeof bounds,
      tone: string,
    ) => {
      const strokes = directions.flatMap((d) =>
        [box.min[d], box.max[d]].map((level) => {
          const points = rect(d, level, box);
          return [...points, points[0]];
        }),
      );
      result.push({
        kind: "line",
        layer: "behind",
        tone,
        points: strokes[0]!,
        strokes: strokes.slice(1),
      });
    };
    const cake = flow.layered?.options.layerAxis;
    if (!cake) frame(bounds, pencil);
    const selected = cells.filter((c) =>
      directions.every((d, i) => {
        const attr = layout.axes[d]?.attribute;
        return (
          !attr ||
          flow.roomPins?.[attr] === undefined ||
          flow.roomPins[attr] === c.values[i]
        );
      }),
    );
    const rulings: Point3[][] = [];
    const grid = (
      axis: Direction,
      level: number,
      tiles: typeof cells,
    ) => {
      const box = stageBounds(tiles);
      for (const across of directions) {
        if (across === axis) continue;
        const along = directions.find(
          (d) => d !== axis && d !== across,
        )!;
        for (const cut of new Set(
          tiles.map((c) => c.max[across]),
        )) {
          if (cut === box.max[across]) continue;
          const start = {
            ...box.min,
            [axis]: level,
            [across]: cut,
          };
          rulings.push([
            start,
            { ...start, [along]: box.max[along] },
          ]);
        }
      }
    };
    const at = project(camera);
    for (const axis of cake ? [] : directions) {
      const far =
        at(bounds.min).z <=
        at({
          ...bounds.min,
          [axis]: bounds.max[axis],
        }).z
          ? bounds.min[axis]
          : bounds.max[axis];
      // The floor grid already rules this face when it is farthest away.
      if (
        axis !== "y" ||
        !selected.some((c) => c.max.y === far)
      )
        grid(axis, far, cells);
    }
    const focus =
      cake &&
      (flow.roomHover?.[0] === cake.attribute
        ? flow.roomHover[1]
        : flow.roomPins?.[cake.attribute]);
    const focusLevel = cells.find(
      (c) => focus && c.values[1] === focus,
    )?.max.y;
    for (const level of new Set(
      (cake ? cells : selected).map(
        (c) => c.max.y,
      ),
    )) {
      const tiles = (
        cake ? cells : selected
      ).filter((c) => c.max.y === level);
      const [p, q, r, t] = rect(
        "y",
        level,
        stageBounds(tiles),
      );
      const tone = cake ? ink : pencil;
      if (
        cake &&
        focusLevel !== undefined &&
        level < focusLevel
      )
        result.push({
          kind: "line",
          layer: "sorted",
          tone: pencil,
          points: [p, q, r, t, p],
        });
      else
        result.push({
          kind: "plane",
          layer: "sorted",
          surface: level,
          thickness: cake ? 6 : 4,
          casts: !!cake,
          order: 1,
          width: 1.25,
          points: [p, q, r, t],
          fill: cake
            ? "var(--paper,white)"
            : "var(--wash,white)",
          opacity: cake ? 1 : 0.14,
          tone,
        });
      if (cake) {
        const value = tiles[0]!.values[1];
        const label: Extract<
          Scenery,
          { kind: "label" }
        > = {
          kind: "label",
          layer: "sorted",
          surface: level,
          anchor: p,
          offset: { x: 0, y: 0 },
          text: value,
          size: 12,
          weight: 600,
          tone: ink,
          enter: (f) => ({
            ...f,
            roomHover: [cake.attribute, value],
          }),
          leave: (f) => ({
            ...f,
            roomHover: undefined,
          }),
          press: (f) => ({
            ...f,
            roomPins:
              f.roomPins?.[cake.attribute] ===
              value
                ? {}
                : { [cake.attribute]: value },
          }),
        };
        boards.push({
          points: [p, q, r, t],
          text: value,
          label,
        });
        continue;
      }
      grid("y", level, tiles);
    }
    if (cake) continue;
    if (rulings.length)
      result.push({
        kind: "line",
        layer: "behind",
        tone: "var(--trace,gray)",
        width: 0.5,
        points: rulings[0]!,
        strokes: rulings.slice(1),
      });
    if (
      selected.length &&
      Object.keys(flow.roomPins ?? {}).length
    )
      frame(stageBounds(selected), ink);
  }
  if (flow.layered?.options.layerAxis) {
    const names = boardNames(
      boards,
      cardBounds(camera, flow.nodes),
      flow.edges,
      camera,
      layout,
    );
    for (const [i, b] of boards.entries()) {
      const { anchor, x, y, box } = names[i]!;
      const end = {
        x: Math.max(
          box.left,
          Math.min(box.right, anchor.x),
        ),
        y: Math.max(
          box.top,
          Math.min(box.bottom, anchor.y),
        ),
      };
      if (
        Math.hypot(
          end.x - anchor.x,
          end.y - anchor.y,
        ) > 14
      )
        result.push({
          kind: "line",
          layer: "front",
          tone: pencil,
          points: [
            unproject(camera, anchor, anchor.z),
            unproject(camera, end, anchor.z),
          ],
        });
      result.push({
        ...b.label,
        anchor: unproject(
          camera,
          { x, y },
          anchor.z,
        ),
        offset: { x: 0, y: 0 },
      });
    }
    return result;
  }
  const cards = cardBounds(camera, flow.nodes);
  const blocks = blockLabels(
    layout,
    camera,
    cards,
    flow.edges,
  );
  const axes = axisGeometry(
    layout,
    camera,
    cards,
    blocks,
  );
  const addLines = (
    segments: ReturnType<typeof clearLine>,
  ) => {
    const strokes = segments.map((segment) =>
      segment.map((p) => unproject(camera, p, 0)),
    );
    if (strokes.length)
      result.push({
        kind: "line",
        layer: "front",
        tone: pencil,
        dotted: true,
        points: strokes[0]!,
        strokes: strokes.slice(1),
      });
  };
  for (const l of blocks) {
    const y = l.y + l.dy,
      half = labelBox(l).right - l.x + 2;
    const segments = [
      ...clearLine(l.left, y - 16, 0, 19, cards),
      ...clearLine(l.right, y - 16, 0, 19, cards),
      ...(l.x - half > l.left
        ? [
            ...clearLine(
              l.left,
              y,
              l.x - half - l.left,
              0,
              cards,
            ),
            ...clearLine(
              l.x + half,
              y,
              l.right - l.x - half,
              0,
              cards,
            ),
          ]
        : []),
    ];
    if (l.tick) {
      const end = {
        x: Math.min(
          l.x + half,
          Math.max(l.x - half, l.tick.x),
        ),
        y: Math.min(
          y + 8,
          Math.max(y - 8, l.tick.y),
        ),
      };
      if (
        Math.hypot(
          end.x - l.tick.x,
          end.y - l.tick.y,
        ) > 14
      )
        addLines([[l.tick, end]]);
    } else addLines(segments);
    result.push({
      kind: "label",
      layer: "front",
      anchor: unproject(camera, l, l.z),
      offset: { x: l.dx, y: l.dy },
      text: l.value,
      size: l.outer ? 10 : 13,
      weight: 600,
      tone: l.outer
        ? "var(--graphite,gray)"
        : ink,
    });
  }
  const node = flow.nodes.find(
    (n) =>
      n.id ===
      (flow.hoveredNode ??
        (flow.selected.__tag === "Some"
          ? flow.selected.content
          : undefined)),
  );
  const cell = node && roomFor(layout, node);
  for (const axis of axes) {
    addLines(axis.path);
    if (
      node &&
      cell &&
      (axis.axis !== "x" ||
        axis.block === cell.block)
    ) {
      const p = project(camera)(node.position),
        q = axis.position(
          (cell.min[axis.axis] +
            cell.max[axis.axis]) /
            2,
        );
      addLines(
        axis.mark(p.x, p.y, q.x - p.x, q.y - p.y),
      );
    }
    for (const l of axis.labels) {
      const pinned =
        flow.roomPins?.[l.attribute] === l.value;
      const press: Change = (s) => ({
        ...s,
        roomHover: undefined,
        roomPins: l.clear
          ? {}
          : s.roomPins?.[l.attribute] === l.value
            ? Object.fromEntries(
                Object.entries(s.roomPins).filter(
                  ([key]) => key !== l.attribute,
                ),
              )
            : {
                ...s.roomPins,
                [l.attribute]: l.value,
              },
      });
      result.push({
        kind: "label",
        layer: "front",
        anchor: unproject(camera, l, l.z),
        offset: { x: l.dx, y: l.dy },
        text: l.value,
        size: l.size,
        weight: l.clear || pinned ? 600 : 400,
        tone: pinned
          ? ink
          : "var(--graphite,gray)",
        press,
        enter: (s) => ({
          ...s,
          roomHover: l.clear
            ? undefined
            : [l.attribute, l.value],
        }),
        leave: (s) => ({
          ...s,
          roomHover: undefined,
        }),
      });
    }
  }
  return result;
};
