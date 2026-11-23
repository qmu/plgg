import { nodeSize } from "plgg-flow/nodeSize";
import { islands } from "plgg-flow/analysis";
import type { Graph } from "./model";
import { dependencyLevels } from "plgg-flow/topology";
import {
  moveBranch,
  hierarchyIndex,
} from "plgg-flow/hierarchy";
import type { Point3 } from "plgg-board";

/** Arrange sibling branches as units, including links crossing their boundaries.
 * Bounding boxes include descendants, so nested groups retain their contents. */
export const arrangeHierarchy = (
  graph: Graph,
  parent?: string,
): Graph => {
  const roots = graph.nodes.filter(
    (n) => n.parent === parent,
  );
  if (!roots.length) return graph;
  const byId = new Map(
      graph.nodes.map((n) => [n.id, n]),
    ),
    owner = new Map<string, string>();
  const branch = hierarchyIndex(graph.nodes);
  const boxes = new Map(
    roots.map((root) => {
      const ids = branch([root.id]);
      const bounds = {
        x: Infinity,
        y: Infinity,
        right: -Infinity,
        bottom: -Infinity,
      };
      for (const id of ids) {
        owner.set(id, root.id);
        const n = byId.get(id);
        if (!n) continue;
        bounds.x = Math.min(
          bounds.x,
          n.position.x - nodeSize(n).width / 2,
        );
        bounds.right = Math.max(
          bounds.right,
          n.position.x + nodeSize(n).width / 2,
        );
        bounds.y = Math.min(
          bounds.y,
          n.position.y - nodeSize(n).height / 2,
        );
        bounds.bottom = Math.max(
          bounds.bottom,
          n.position.y + nodeSize(n).height / 2,
        );
      }
      return [root.id, bounds];
    }),
  );
  const edges = graph.edges.flatMap((e) => {
    const source = owner.get(e.source),
      target = owner.get(e.target);
    return source && target && source !== target
      ? [{ source, target }]
      : [];
  });
  const levels = dependencyLevels({
    nodes: roots,
    edges,
  });
  const columns = new Map<number, string[]>();
  for (const n of roots) {
    const l = levels.get(n.id) ?? 0;
    const column = columns.get(l);
    if (column) column.push(n.id);
    else columns.set(l, [n.id]);
  }
  const offsets = new Map<string, Point3>(),
    anchor = parent
      ? byId.get(parent)?.position
      : undefined;
  let x = anchor ? anchor.x + 100 : 0;
  for (const [, column] of [...columns].sort(
    ([a], [b]) => a - b,
  )) {
    let y = anchor?.y ?? 0,
      width = 0;
    for (const id of column) {
      const b = boxes.get(id);
      if (!b) continue;
      offsets.set(id, {
        x: x - b.x,
        y: y - b.y,
        z: 0,
      });
      width = Math.max(width, b.right - b.x);
      y += b.bottom - b.y + 60;
    }
    x += width + 92;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const d = offsets.get(
        owner.get(n.id) ?? "",
      );
      return d
        ? {
            ...n,
            position: {
              x: n.position.x + d.x,
              y: n.position.y + d.y,
              z: n.position.z,
            },
          }
        : n;
    }),
  };
};
/** Place dependency levels on concentric rings around the origin. */
export const radialLayout = (
  graph: Graph,
): Graph => {
  const levels = dependencyLevels(graph),
    rings = new Map<number, string[]>();
  for (const n of graph.nodes) {
    const l = levels.get(n.id) ?? 0;
    const ring = rings.get(l);
    if (ring) ring.push(n.id);
    else rings.set(l, [n.id]);
  }
  const positions = new Map<string, Point3>();
  let radius = 0;
  for (const [, ring] of [...rings].sort(
    ([a], [b]) => a - b,
  )) {
    radius = Math.max(
      radius,
      ring.length > 1
        ? (ring.length * 150) / (2 * Math.PI)
        : 0,
    );
    ring.forEach((id, i) => {
      const a = (2 * Math.PI * i) / ring.length;
      positions.set(id, {
        x: radius * Math.cos(a),
        y: radius * Math.sin(a),
        z: 0,
      });
    });
    radius += 170;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      position: {
        ...n.position,
        ...positions.get(n.id),
        z: n.position.z,
      },
    })),
  };
};
/** Separate dependency tiers along Z while preserving the plan drawing. */
export const depthLayers = (
  graph: Graph,
  spacing = 110,
): Graph => {
  const levels = dependencyLevels(graph);
  return {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      position: {
        ...n.position,
        z: (levels.get(n.id) ?? 0) * spacing,
      },
    })),
  };
};
/** Move intersecting sibling branches apart in the plan view. */
export const removeOverlaps = (
  graph: Graph,
  gap = 24,
): Graph => {
  let nodes = graph.nodes;
  for (const original of graph.nodes) {
    const n = nodes.find(
      (v) => v.id === original.id,
    );
    if (!n) continue;
    const before = nodes
      .slice(0, nodes.indexOf(n))
      .filter(
        (other) =>
          other.parent === n.parent &&
          Math.abs(
            other.position.x - n.position.x,
          ) <
            (nodeSize(other).width +
              nodeSize(n).width) /
              2 +
              gap,
      )
      .sort(
        (a, b) =>
          a.position.y -
          nodeSize(a).height / 2 -
          (b.position.y - nodeSize(b).height / 2),
      );
    let y = n.position.y;
    for (const b of before) {
      const spacing =
        (nodeSize(n).height +
          nodeSize(b).height) /
          2 +
        gap;
      if (Math.abs(y - b.position.y) < spacing)
        y = b.position.y + spacing;
    }
    if (y !== n.position.y)
      nodes = moveBranch(nodes, [n.id], {
        x: 0,
        y: y - n.position.y,
        z: 0,
      });
  }
  return { ...graph, nodes };
};

/** Assign sibling branches to swimlanes by metadata and columns by dependency.
 * Descendants travel with their branch. Only scalar lane labels are supported. */
export const swimlaneLayout = (
  graph: Graph,
  key: string,
  parent?: string,
): Graph => {
  if (!key.trim()) return graph;
  const siblings = graph.nodes.filter(
    (n) => n.parent === parent,
  );
  const members = hierarchyIndex(graph.nodes);
  const owner = new Map<string, string>();
  for (const root of siblings)
    for (const id of members([root.id]))
      owner.set(id, root.id);
  const levels = dependencyLevels({
    nodes: siblings,
    edges: graph.edges.flatMap((e) => {
      const source = owner.get(e.source),
        target = owner.get(e.target);
      return source && target && source !== target
        ? [{ source, target }]
        : [];
    }),
  });
  const lanes = new Map<
    string,
    typeof siblings
  >();
  const bounds = new Map<
    string,
    {
      left: number;
      right: number;
      top: number;
      bottom: number;
    }
  >();
  for (const n of graph.nodes) {
    const id = owner.get(n.id);
    if (id === undefined) continue;
    const b = bounds.get(id) ?? {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    };
    const w = nodeSize(n).width / 2,
      h = nodeSize(n).height / 2;
    b.left = Math.min(b.left, n.position.x - w);
    b.right = Math.max(b.right, n.position.x + w);
    b.top = Math.min(b.top, n.position.y - h);
    b.bottom = Math.max(
      b.bottom,
      n.position.y + h,
    );
    bounds.set(id, b);
  }
  const widths: number[] = [];
  for (const n of siblings) {
    const value =
      n.data &&
      Object.prototype.hasOwnProperty.call(
        n.data,
        key,
      )
        ? n.data[key]
        : undefined;
    const label =
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
        ? JSON.stringify(value)
        : "";
    const lane = lanes.get(label);
    if (lane) lane.push(n);
    else lanes.set(label, [n]);
    const level = levels.get(n.id) ?? 0,
      b = bounds.get(n.id);
    if (b)
      widths[level] = Math.max(
        widths[level] ?? 0,
        b.right - b.left,
      );
  }
  const anchor = graph.nodes.find(
    (n) => n.id === parent,
  )?.position;
  let x = anchor ? anchor.x + 100 : 0,
    y = anchor?.y ?? 0;
  const columns = widths.map((w) => {
    const start = x;
    x += w + 92;
    return start;
  });
  const offsets = new Map<
    string,
    { x: number; y: number }
  >();
  for (const lane of lanes.values()) {
    const bottoms = new Map<number, number>();
    let end = y;
    for (const n of lane) {
      const level = levels.get(n.id) ?? 0,
        b = bounds.get(n.id);
      if (!b) continue;
      const top = bottoms.get(level) ?? y;
      offsets.set(n.id, {
        x: (columns[level] ?? 0) - b.left,
        y: top - b.top,
      });
      const bottom = top + b.bottom - b.top;
      bottoms.set(level, bottom + 36);
      end = Math.max(end, bottom);
    }
    y = end + 96;
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const root = owner.get(n.id),
        d =
          root === undefined
            ? undefined
            : offsets.get(root);
      return d
        ? {
            ...n,
            position: {
              x: n.position.x + d.x,
              y: n.position.y + d.y,
              z: n.position.z,
            },
          }
        : n;
    }),
  };
};

/** Pack independent components into rows. Ownership links keep nested nodes
 * together and routed bends contribute to each component's footprint. */
export const packComponents = (
  graph: Graph,
  rowWidth = 900,
  gap = 48,
): Graph => {
  if (
    !Number.isFinite(rowWidth) ||
    rowWidth <= 0 ||
    !Number.isFinite(gap) ||
    gap < 0
  )
    return graph;
  const groups = islands({
    ...graph,
    edges: [
      ...graph.edges,
      ...graph.nodes.flatMap((n) =>
        n.parent === undefined
          ? []
          : [{ source: n.parent, target: n.id }],
      ),
    ],
  });
  if (groups.length < 2) return graph;
  const boxes = groups.map(() => ({
    left: Infinity,
    right: -Infinity,
    top: Infinity,
    bottom: -Infinity,
    pinned: false,
    dx: 0,
    dy: 0,
  }));
  const owner = new Map<string, number>();
  groups.forEach((ids, i) =>
    ids.forEach((id) => owner.set(id, i)),
  );
  const boxFor = (id: string) =>
    boxes[owner.get(id) ?? -1];
  const include = (
    id: string,
    p: Point3,
    w: number,
    h: number,
  ) => {
    const b = boxFor(id);
    if (!b) return;
    b.left = Math.min(b.left, p.x - w / 2);
    b.right = Math.max(b.right, p.x + w / 2);
    b.top = Math.min(b.top, p.y - h / 2);
    b.bottom = Math.max(b.bottom, p.y + h / 2);
  };
  for (const n of graph.nodes) {
    include(
      n.id,
      n.position,
      nodeSize(n).width,
      nodeSize(n).height,
    );
    const box = boxFor(n.id);
    if (box && n.locked) box.pinned = true;
  }
  for (const e of graph.edges)
    for (const p of e.waypoints ?? [])
      include(e.source, p, 0, 0);
  let x = 0,
    y = 0,
    height = 0;
  for (const b of boxes)
    if (b.pinned) y = Math.max(y, b.bottom + gap);
  for (const b of boxes) {
    if (b.pinned) continue;
    const width = b.right - b.left;
    if (x > 0 && x + width > rowWidth) {
      x = 0;
      y += height + gap;
      height = 0;
    }
    b.dx = x - b.left;
    b.dy = y - b.top;
    x += width + gap;
    height = Math.max(height, b.bottom - b.top);
  }
  const shift = (
    id: string,
    p: Point3,
  ): Point3 => {
    const box = boxFor(id);
    return box && (box.dx || box.dy)
      ? {
          x: p.x + box.dx,
          y: p.y + box.dy,
          z: p.z,
        }
      : p;
  };
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const position = shift(n.id, n.position);
      return position === n.position
        ? n
        : { ...n, position };
    }),
    edges: graph.edges.map((e) =>
      e.waypoints?.length
        ? {
            ...e,
            waypoints: e.waypoints.map((p) =>
              shift(e.source, p),
            ),
          }
        : e,
    ),
  };
};

/** Transfer absolute positions from another drawing by stable node identity.
 * Both graphs may have evolved independently since the layout was recorded. */
export const transferLayout = (
  graph: Graph,
  reference: Graph,
): Graph => {
  const positions = new Map(
    reference.nodes.map((n) => [
      n.id,
      n.position,
    ]),
  );
  let changed = false;
  const nodes = graph.nodes.map((n) => {
    const p = positions.get(n.id);
    if (
      n.locked ||
      !p ||
      (p.x === n.position.x &&
        p.y === n.position.y &&
        p.z === n.position.z)
    )
      return n;
    changed = true;
    return { ...n, position: p };
  });
  return changed ? { ...graph, nodes } : graph;
};

/** Relax edge lengths in world space. Unselected endpoints and containers act as anchors. */
export const relaxWiring = (
  graph: Graph,
  selection: readonly string[],
  restLength = 180,
): Graph => {
  if (
    !Number.isFinite(restLength) ||
    restLength <= 0
  )
    return graph;
  const selected = new Set(selection);
  const parents = new Set(
    graph.nodes.map((n) => n.parent),
  );
  const points = graph.nodes.map((n) => ({
    ...n.position,
  }));
  const movable = graph.nodes.map(
    (n) =>
      selected.has(n.id) &&
      !parents.has(n.id) &&
      !n.locked,
  );
  const index = new Map(
    graph.nodes.map((n, i) => [n.id, i]),
  );
  const springs = graph.edges.flatMap((edge) => {
    const a = index.get(edge.source),
      b = index.get(edge.target);
    return a !== undefined &&
      b !== undefined &&
      a !== b &&
      (movable[a] || movable[b])
      ? [[a, b] satisfies [number, number]]
      : [];
  });
  if (!springs.length) return graph;
  for (let step = 0; step < 32; step++) {
    const forces = new Map<
      number,
      {
        x: number;
        y: number;
        z: number;
        count: number;
      }
    >();
    const add = (
      i: number,
      x: number,
      y: number,
      z: number,
    ) => {
      if (!movable[i]) return;
      const f = forces.get(i) ?? {
        x: 0,
        y: 0,
        z: 0,
        count: 0,
      };
      f.x += x;
      f.y += y;
      f.z += z;
      f.count++;
      forces.set(i, f);
    };
    for (const [a, b] of springs) {
      const p = points[a]!,
        q = points[b]!;
      const dx = q.x - p.x,
        dy = q.y - p.y,
        dz = q.z - p.z;
      const length = Math.hypot(dx, dy, dz);
      const scale =
        (0.35 * (length - restLength)) /
        (length || 1);
      const x =
          scale * (length ? dx : a < b ? 1 : -1),
        y = scale * dy,
        z = scale * dz;
      add(a, x, y, z);
      add(b, -x, -y, -z);
    }
    for (const [i, f] of forces) {
      const p = points[i]!;
      p.x += f.x / f.count;
      p.y += f.y / f.count;
      p.z += f.z / f.count;
    }
  }
  return {
    ...graph,
    nodes: graph.nodes.map((n, i) =>
      movable[i]
        ? { ...n, position: points[i]! }
        : n,
    ),
  };
};

/** Reorder the occupied slots of each selected sibling column by its
 * external neighbors' mean height. Unwired cards retain their slots. */
export const orderByNeighbors = (
  graph: Graph,
  selection: readonly string[],
): Graph => {
  const selected = new Set(selection);
  const parents = new Set(
    graph.nodes.map((n) => n.parent),
  );
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const columns = new Map<string, string[]>();
  const columnOf = new Map<string, string>();
  for (const node of graph.nodes) {
    if (
      !selected.has(node.id) ||
      node.locked ||
      node.group ||
      parents.has(node.id)
    )
      continue;
    const key = JSON.stringify([
      node.parent,
      node.position.x,
      node.position.z,
    ]);
    columnOf.set(node.id, key);
    const column = columns.get(key) ?? [];
    column.push(node.id);
    columns.set(key, column);
  }
  const heights = new Map<
    string,
    { sum: number; count: number }
  >();
  const include = (id: string, other: string) => {
    const column = columnOf.get(id),
      neighbor = byId.get(other);
    if (
      column === undefined ||
      column === columnOf.get(other) ||
      !neighbor
    )
      return;
    const value = heights.get(id) ?? {
      sum: 0,
      count: 0,
    };
    value.sum += neighbor.position.y;
    value.count++;
    heights.set(id, value);
  };
  for (const e of graph.edges) {
    include(e.source, e.target);
    include(e.target, e.source);
  }
  const moved = new Map<string, number>();
  for (const column of columns.values()) {
    const ranks = column
      .flatMap((id) => {
        const h = heights.get(id);
        return h
          ? [
              {
                id,
                y: byId.get(id)!.position.y,
                score: h.sum / h.count,
              },
            ]
          : [];
      })
      .sort((a, b) => a.y - b.y);
    const slots = ranks.map((r) => r.y);
    ranks.sort(
      (a, b) => a.score - b.score || a.y - b.y,
    );
    ranks.forEach((r, i) => {
      if (r.y !== slots[i])
        moved.set(r.id, slots[i]!);
    });
  }
  return moved.size
    ? {
        ...graph,
        nodes: graph.nodes.map((n) =>
          moved.has(n.id)
            ? {
                ...n,
                position: {
                  ...n.position,
                  y: moved.get(n.id)!,
                },
              }
            : n,
        ),
      }
    : graph;
};

const difference = (
  a: Point3,
  b: Point3,
): Point3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
const dot = (a: Point3, b: Point3) =>
  a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Point3, b: Point3): Point3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const unit = (p: Point3) => {
  const len = Math.hypot(p.x, p.y, p.z);
  return len > 1e-12
    ? { x: p.x / len, y: p.y / len, z: p.z / len }
    : undefined;
};
const basis = (
  a: Point3,
  b: Point3,
  c: Point3,
) => {
  const x = unit(difference(b, a)),
    v = unit(difference(c, a));
  if (!x || !v) return undefined;
  const z = unit(cross(x, v));
  return z ? { x, y: cross(z, x), z } : undefined;
};
/** Register a branch rigidly to a reference triangle, without scaling or
 * reflection. Reject unequal triangles and locked members before editing. */
export const registerBranch = (
  graph: Graph,
  reference: Graph,
  root: string,
  landmarks: readonly string[],
) => {
  const members = hierarchyIndex(graph.nodes)([
    root,
  ]);
  if (
    landmarks.length !== 3 ||
    landmarks.some((id) => !members.has(id))
  )
    return undefined;
  const points = (g: Graph) =>
    landmarks.map(
      (id) =>
        g.nodes.find((n) => n.id === id)
          ?.position,
    );
  const [a, b, c] = points(graph),
    [p, q, r] = points(reference);
  if (!a || !b || !c || !p || !q || !r)
    return undefined;
  const from = basis(a, b, c),
    to = basis(p, q, r);
  if (
    !from ||
    !to ||
    graph.nodes.some(
      (n) => members.has(n.id) && n.locked,
    )
  )
    return undefined;
  const transform = (point: Point3): Point3 => {
    const v = difference(point, a),
      u = dot(v, from.x),
      w = dot(v, from.y),
      t = dot(v, from.z);
    const coord = (axis: keyof Point3) =>
      p[axis] +
      u * to.x[axis] +
      w * to.y[axis] +
      t * to.z[axis];
    return {
      x: coord("x"),
      y: coord("y"),
      z: coord("z"),
    };
  };
  const length = (v: Point3) =>
    Math.hypot(v.x, v.y, v.z);
  const tolerance =
    1e-8 *
    Math.max(
      1,
      length(difference(a, b)),
      length(difference(a, c)),
    );
  if (
    length(difference(transform(b), q)) >
      tolerance ||
    length(difference(transform(c), r)) >
      tolerance
  )
    return undefined;
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      members.has(n.id)
        ? {
            ...n,
            position: transform(n.position),
          }
        : n,
    ),
    edges: graph.edges.map((e) =>
      e.waypoints &&
      members.has(e.source) &&
      members.has(e.target)
        ? {
            ...e,
            waypoints: e.waypoints.map(transform),
          }
        : e,
    ),
  };
};
