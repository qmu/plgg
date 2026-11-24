import {
  grid,
  nodeSize,
} from "plgg-flow/nodeSize";
import { ok, err, type Result } from "plgg";
import { matchesData } from "plgg-flow/metadata";
import { adjacency } from "plgg-flow/topology";
import type { JsonValue } from "./metadata";
import { reserveId } from "plgg-flow/connections";
import type {
  FlowNode,
  Graph,
  Edge,
} from "./model";
import type { Point3 } from "plgg-board";

/** Iterative traversal handles deeply nested or malformed imported diagrams. */
export const hierarchyIndex = (
  nodes: readonly FlowNode[],
) => {
  const children = new Map<string, string[]>();
  for (const n of nodes)
    if (n.parent !== undefined) {
      const siblings = children.get(n.parent);
      if (siblings) siblings.push(n.id);
      else children.set(n.parent, [n.id]);
    }
  return (
    roots: Iterable<string>,
  ): ReadonlySet<string> => {
    const result = new Set(roots);
    for (const id of result)
      for (const child of children.get(id) ?? [])
        result.add(child);
    return result;
  };
};
export const subtree = (
  nodes: readonly FlowNode[],
  roots: Iterable<string>,
) => hierarchyIndex(nodes)(roots);
const withParent = (
  node: FlowNode,
  parent?: string,
): FlowNode => {
  const { parent: old, ...rest } = node;
  return parent === undefined
    ? rest
    : { ...rest, parent };
};
export const moveBranch = (
  nodes: readonly FlowNode[],
  roots: Iterable<string>,
  delta: Point3,
): readonly FlowNode[] => {
  const moved = subtree(nodes, roots);
  return nodes.map((n) =>
    moved.has(n.id)
      ? {
          ...n,
          position: {
            x: n.position.x + delta.x,
            y: n.position.y + delta.y,
            z: n.position.z + delta.z,
          },
        }
      : n,
  );
};
/** World coordinates are invariant when a subtree changes ownership. */
export const reparent = (
  graph: Graph,
  id: string,
  parent?: string,
): Graph => {
  if (
    !graph.nodes.some((n) => n.id === id) ||
    (parent !== undefined &&
      (!graph.nodes.some(
        (n) => n.id === parent,
      ) ||
        subtree(graph.nodes, [id]).has(parent)))
  )
    return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === id ? withParent(n, parent) : n,
    ),
  };
};
export const enclose = (
  graph: Graph,
  ids: readonly string[],
  group: FlowNode,
): Graph => {
  const members = new Set(ids),
    nodes = graph.nodes.filter((n) =>
      members.has(n.id),
    );
  const first = nodes[0];
  if (
    !first ||
    nodes.length !== members.size ||
    nodes.some(
      (n) => n.parent !== first.parent,
    ) ||
    graph.nodes.some((n) => n.id === group.id)
  )
    return graph;
  return {
    ...graph,
    nodes: [
      ...graph.nodes.map((n) =>
        members.has(n.id)
          ? withParent(n, group.id)
          : n,
      ),
      withParent(
        { ...group, group: true },
        first.parent,
      ),
    ],
  };
};
/** Dissolve the container, promoting its direct children one level. */
export const dissolve = (
  graph: Graph,
  id: string,
): Graph => {
  const group = graph.nodes.find(
    (n) => n.id === id,
  );
  if (!group) return graph;
  return {
    nodes: graph.nodes
      .filter((n) => n.id !== id)
      .map((n) =>
        n.parent === id
          ? withParent(n, group.parent)
          : n,
      ),
    edges: graph.edges.filter(
      (e) => e.source !== id && e.target !== id,
    ),
  };
};
export const prune = (
  graph: Graph,
  roots: readonly string[],
): Graph => {
  const removed = subtree(graph.nodes, roots);
  return {
    nodes: graph.nodes.filter(
      (n) => !removed.has(n.id),
    ),
    edges: graph.edges.filter(
      (e) =>
        !removed.has(e.source) &&
        !removed.has(e.target),
    ),
  };
};
export const foldGroup = (
  graph: Graph,
  id: string,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map((n) =>
    n.id === id
      ? { ...n, collapsed: !n.collapsed }
      : n,
  ),
});
/** Boundary edges retain the identity of their underlying connection. */
export const visibleScene = (
  graph: Graph & {
    camera?: { scale: number };
    spatial?: { overview?: boolean } | undefined;
  },
  isolatedBranch?: string,
) => {
  if (
    graph.spatial?.overview &&
    graph.camera &&
    graph.camera.scale < 0.5
  ) {
    const parents = new Set(
      graph.nodes.map((n) => n.parent),
    );
    graph = {
      ...graph,
      nodes: graph.nodes.map((n) =>
        parents.has(n.id) &&
        n.id !== isolatedBranch &&
        !n.collapsed
          ? { ...n, collapsed: true }
          : n,
      ),
    };
  }
  if (
    isolatedBranch !== undefined &&
    graph.nodes.some(
      (n) => n.id === isolatedBranch,
    )
  ) {
    const included = subtree(graph.nodes, [
      isolatedBranch,
    ]);
    graph = {
      nodes: graph.nodes
        .filter((n) => included.has(n.id))
        .map((n) =>
          n.id === isolatedBranch && n.collapsed
            ? { ...n, collapsed: false }
            : n,
        ),
      edges: graph.edges.filter(
        (e) =>
          included.has(e.source) &&
          included.has(e.target),
      ),
    };
  }
  if (
    graph.nodes.some((n) => n.hidden) ||
    graph.edges.some((e) => e.hidden)
  ) {
    const omitted = subtree(
      graph.nodes,
      graph.nodes
        .filter((n) => n.hidden)
        .map((n) => n.id),
    );
    graph = {
      nodes: graph.nodes.filter(
        (n) => !omitted.has(n.id),
      ),
      edges: graph.edges.filter(
        (e) =>
          !e.hidden &&
          !omitted.has(e.source) &&
          !omitted.has(e.target),
      ),
    };
  }
  const closed = graph.nodes.filter(
    (n) => n.collapsed,
  );
  if (!closed.length)
    return {
      nodes: graph.nodes,
      edges: graph.edges.map((edge) => ({
        edge,
        original: edge,
      })),
    };
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const representatives = new Map<
    string,
    string
  >();
  const representative = (id: string) => {
    const path: FlowNode[] = [],
      seen = new Set<string>();
    let node = byId.get(id);
    while (
      node &&
      !seen.has(node.id) &&
      !representatives.has(node.id)
    ) {
      seen.add(node.id);
      path.push(node);
      node =
        node.parent === undefined
          ? undefined
          : byId.get(node.parent);
    }
    let boundary = node
      ? representatives.get(node.id)
      : undefined;
    if (
      node &&
      boundary === node.id &&
      !node.collapsed
    )
      boundary = undefined;
    for (const n of path.reverse()) {
      representatives.set(n.id, boundary ?? n.id);
      if (boundary === undefined && n.collapsed)
        boundary = n.id;
    }
    return representatives.get(id) ?? id;
  };
  const nodes = graph.nodes.filter(
    (n) => representative(n.id) === n.id,
  );
  const edges = graph.edges.flatMap(
    (original: Edge) => {
      const source = representative(
          original.source,
        ),
        target = representative(original.target);
      return source === target &&
        original.source !== original.target
        ? []
        : [
            {
              original,
              edge: {
                ...original,
                source,
                target,
              },
            },
          ];
    },
  );
  return { nodes, edges };
};

/** Ordered ownership path including the node itself. Invalid parent chains
 * terminate at their first missing or repeated entry. */
const pathFromIndex = (
  byId: ReadonlyMap<string, FlowNode>,
  id: string,
): readonly FlowNode[] => {
  const seen = new Set<string>(),
    path: FlowNode[] = [];
  let node = byId.get(id);
  while (node && !seen.has(node.id)) {
    seen.add(node.id);
    path.push(node);
    node =
      node.parent === undefined
        ? undefined
        : byId.get(node.parent);
  }
  return path.reverse();
};

export const ownershipPath = (
  nodes: readonly FlowNode[],
  id: string,
): readonly FlowNode[] =>
  pathFromIndex(
    new Map(nodes.map((n) => [n.id, n])),
    id,
  );

/** Deepest common owner, including an explicitly selected ancestor. */
export const commonContainer = (
  nodes: readonly FlowNode[],
  selection: readonly string[],
): FlowNode | undefined => {
  const ids = [...new Set(selection)];
  if (ids.length < 2) return undefined;
  const byId = new Map(
    nodes.map((n) => [n.id, n]),
  );
  const first = pathFromIndex(byId, ids[0]!);
  let shared = first.length;
  for (const id of ids.slice(1)) {
    const path = pathFromIndex(byId, id);
    let i = 0;
    while (
      i < shared &&
      i < path.length &&
      first[i] === path[i]
    )
      i++;
    if (!i) return undefined;
    shared = i;
  }
  return first[shared - 1];
};

/** Reveal one descendant without expanding any unrelated branches. */
export const revealNode = (
  graph: Graph,
  id: string,
): Graph => {
  const path = ownershipPath(graph.nodes, id);
  const changes = new Set(
    path.filter(
      (n) =>
        n.hidden || (n.id !== id && n.collapsed),
    ),
  );
  if (!changes.size) return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      changes.has(n)
        ? {
            ...n,
            ...(n.hidden
              ? { hidden: false }
              : {}),
            ...(n.id !== id && n.collapsed
              ? { collapsed: false }
              : {}),
          }
        : n,
    ),
  };
};

/** Fit stored group dimensions in world XY, including hidden descendants.
 * Relative export coordinates follow from the group's new center. */
export const fitContainer = (
  graph: Graph,
  id: string,
  padding = grid,
): Graph => {
  const group = graph.nodes.find(
    (n) => n.id === id,
  );
  if (
    !group ||
    group.locked ||
    !Number.isFinite(padding) ||
    padding < 0
  )
    return graph;
  const members = subtree(graph.nodes, [id]);
  if (members.size < 2) return graph;
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  for (const n of graph.nodes) {
    if (n === group || !members.has(n.id))
      continue;
    const w = nodeSize(n).width / 2,
      h = nodeSize(n).height / 2;
    left = Math.min(left, n.position.x - w);
    right = Math.max(right, n.position.x + w);
    top = Math.min(top, n.position.y - h);
    bottom = Math.max(bottom, n.position.y + h);
  }
  left =
    Math.floor((left - padding) / grid) * grid;
  right =
    Math.ceil((right + padding) / grid) * grid;
  top = Math.floor((top - padding) / grid) * grid;
  bottom =
    Math.ceil((bottom + padding) / grid) * grid;
  const width = right - left,
    height = bottom - top,
    x = (left + right) / 2,
    y = (top + bottom) / 2;
  if (
    ![width, height, x, y].every(Number.isFinite)
  )
    return graph;
  if (
    group.group &&
    group.width === width &&
    group.height === height &&
    group.position.x === x &&
    group.position.y === y
  )
    return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n === group
        ? {
            ...n,
            group: true,
            width,
            height,
            position: { ...n.position, x, y },
          }
        : n,
    ),
  };
};

/** Enclose direct members from the leaves up, preserving authored room. */
export const encloseTrays = (
  nodes: readonly FlowNode[],
): readonly FlowNode[] => {
  if (!nodes.some((n) => n.group && !n.collapsed))
    return nodes;
  const index = new Map(
    nodes.map((n) => [n.id, n]),
  );
  const remaining = new Map<string, number>();
  for (const n of nodes)
    if (n.parent !== undefined)
      remaining.set(
        n.parent,
        (remaining.get(n.parent) ?? 0) + 1,
      );
  const queue = nodes
    .filter((n) => !remaining.has(n.id))
    .map((n) => n.id);
  let changed = false;
  for (const id of queue) {
    let child = index.get(id)!;
    if (
      child.group &&
      !child.collapsed &&
      child.grow
    ) {
      const { grow, ...frame } = child;
      const size = nodeSize(frame);
      const x = grid * Math.ceil(grow.x / grid),
        y = grid * Math.ceil(grow.y / grid);
      child = {
        ...frame,
        width: size.width + x,
        height: size.height + y,
        position: {
          ...frame.position,
          x: frame.position.x + x / 2,
          y: frame.position.y + y / 2,
        },
      };
      index.set(id, child);
      changed = true;
    }
    if (child.parent === undefined) continue;
    const parent = index.get(child.parent);
    if (!parent) continue;
    const pending =
      (remaining.get(parent.id) ?? 1) - 1;
    remaining.set(parent.id, pending);
    if (!pending) queue.push(parent.id);
    if (!parent.group || parent.collapsed)
      continue;
    const p = nodeSize(parent),
      c = nodeSize(child);
    const span = (
      axis: "x" | "y",
      size: number,
      member: number,
    ) => {
      const left =
        grid *
        Math.floor(
          Math.min(
            parent.position[axis] - size / 2,
            child.position[axis] -
              member / 2 -
              grid,
          ) / grid,
        );
      const right =
        grid *
        Math.ceil(
          Math.max(
            parent.position[axis] + size / 2,
            child.position[axis] +
              member / 2 +
              grid,
          ) / grid,
        );
      return {
        center: (left + right) / 2,
        size: right - left,
      };
    };
    const x = span("x", p.width, c.width),
      y = span("y", p.height, c.height);
    if (
      x.size === parent.width &&
      y.size === parent.height &&
      x.center === parent.position.x &&
      y.center === parent.position.y
    )
      continue;
    changed = true;
    index.set(parent.id, {
      ...parent,
      width: x.size,
      height: y.size,
      position: {
        ...parent.position,
        x: x.center,
        y: y.center,
      },
    });
  }
  // Visit parents before children to carry the supporting plane through nested trays.
  for (const id of queue.reverse()) {
    const child = index.get(id)!;
    const parent =
      child.parent === undefined
        ? undefined
        : index.get(child.parent);
    if (
      parent?.group &&
      !parent.collapsed &&
      child.position.z < parent.position.z
    ) {
      changed = true;
      index.set(id, {
        ...child,
        position: {
          ...child.position,
          z: parent.position.z,
        },
      });
    }
  }
  return changed
    ? nodes.map((n) => index.get(n.id)!)
    : nodes;
};

/** Grow ancestor rectangles around moved branches, retaining sibling world positions. */
export const moveExpandingParents = (
  nodes: readonly FlowNode[],
  roots: readonly string[],
  delta: Point3,
): readonly FlowNode[] => {
  const moved = moveBranch(nodes, roots, delta);
  if (
    !roots.length ||
    (!delta.x && !delta.y) ||
    !moved.some((n) => n.expandParent)
  )
    return moved;
  const index = new Map(
      moved.map((n) => [n.id, n]),
    ),
    moving = subtree(nodes, roots);
  for (const id of roots) {
    let child = index.get(id);
    const visited = new Set<string>([id]);
    while (
      child?.expandParent &&
      child.parent !== undefined &&
      !visited.has(child.parent) &&
      !moving.has(child.parent)
    ) {
      const parent = index.get(child.parent);
      if (!parent || parent.locked) break;
      visited.add(parent.id);
      const pw = nodeSize(parent).width,
        ph = nodeSize(parent).height,
        cw = nodeSize(child).width,
        ch = nodeSize(child).height;
      const left = Math.min(
          parent.position.x - pw / 2,
          child.position.x - cw / 2,
        ),
        right = Math.max(
          parent.position.x + pw / 2,
          child.position.x + cw / 2,
        );
      const top = Math.min(
          parent.position.y - ph / 2,
          child.position.y - ch / 2,
        ),
        bottom = Math.max(
          parent.position.y + ph / 2,
          child.position.y + ch / 2,
        );
      if (
        right - left === pw &&
        bottom - top === ph
      )
        break;
      child = {
        ...parent,
        width: right - left,
        height: bottom - top,
        position: {
          ...parent.position,
          x: (right + left) / 2,
          y: (top + bottom) / 2,
        },
      };
      index.set(child.id, child);
    }
  }
  return moved.map((n) => index.get(n.id) ?? n);
};

/** Inspect the original wires crossing a selection of complete branches. */
export const boundaryConnections = (
  graph: Graph,
  roots: readonly string[],
): Readonly<{
  inputs: readonly Edge[];
  outputs: readonly Edge[];
}> => {
  const members = subtree(graph.nodes, roots);
  const inputs: Edge[] = [],
    outputs: Edge[] = [];
  for (const edge of graph.edges) {
    const source = members.has(edge.source),
      target = members.has(edge.target);
    if (source !== target)
      (source ? outputs : inputs).push(edge);
  }
  return { inputs, outputs };
};

/** Exchange sibling branches as rigid 3D assemblies, including internal bends. */
export const swapBranches = (
  graph: Graph,
  first: string,
  second: string,
): Graph => {
  const a = graph.nodes.find(
      (n) => n.id === first,
    ),
    b = graph.nodes.find((n) => n.id === second);
  if (
    !a ||
    !b ||
    a === b ||
    a.parent !== b.parent ||
    a.locked ||
    b.locked
  )
    return graph;
  const parent = graph.nodes.find(
    (n) => n.id === a.parent,
  );
  const fits = (
    node: FlowNode,
    position: Point3,
  ) =>
    !parent ||
    node.extent !== "parent" ||
    (Math.abs(position.x - parent.position.x) *
      2 +
      nodeSize(node).width <=
      nodeSize(parent).width &&
      Math.abs(position.y - parent.position.y) *
        2 +
        nodeSize(node).height <=
        nodeSize(parent).height);
  if (
    !fits(a, b.position) ||
    !fits(b, a.position)
  )
    return graph;
  const branch = hierarchyIndex(graph.nodes),
    left = branch([first]),
    right = branch([second]);
  if (left.has(second) || right.has(first))
    return graph;
  const shift = (
    p: Point3,
    sign: number,
  ): Point3 => ({
    x: p.x + sign * (b.position.x - a.position.x),
    y: p.y + sign * (b.position.y - a.position.y),
    z: p.z + sign * (b.position.z - a.position.z),
  });
  const direction = (id: string) =>
    left.has(id) ? 1 : right.has(id) ? -1 : 0;
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      const sign = direction(n.id);
      return sign
        ? {
            ...n,
            position: shift(n.position, sign),
          }
        : n;
    }),
    edges: graph.edges.map((e) => {
      const sign = direction(e.source);
      return sign &&
        direction(e.target) === sign &&
        e.waypoints?.length
        ? {
            ...e,
            waypoints: e.waypoints.map((p) =>
              shift(p, sign),
            ),
          }
        : e;
    }),
  };
};

/** Create a quotient graph of the immediate branches of a container.
 * Opposite directions remain distinct; internal and external wires disappear. */
export const summarizeBranches = (
  graph: Graph,
  parent?: string,
): Graph => {
  const roots = graph.nodes.filter(
    (n) => n.parent === parent,
  );
  const owner = new Map<string, string>(),
    branch = hierarchyIndex(graph.nodes);
  for (const root of roots)
    for (const id of branch([root.id]))
      owner.set(id, root.id);
  const links = new Map<
    string,
    {
      source: string;
      target: string;
      count: number;
    }
  >();
  for (const edge of graph.edges) {
    const source = owner.get(edge.source),
      target = owner.get(edge.target);
    if (
      source === undefined ||
      target === undefined ||
      source === target
    )
      continue;
    const key = JSON.stringify([source, target]),
      entry = links.get(key);
    if (entry) entry.count++;
    else
      links.set(key, {
        source,
        target,
        count: 1,
      });
  }
  return {
    nodes: roots.map((n) => ({
      id: n.id,
      label: n.label,
      position: n.position,
    })),
    edges: [...links.values()].map(
      ({ source, target, count }) => ({
        source,
        target,
        label: String(count),
        data: { count },
      }),
    ),
  };
};

/** Adopt a branch into the smallest expanded frame enclosing its XY footprint.
 * Coincident frame sizes prefer the plane nearest the branch in depth. */
export const adoptByBounds = (
  graph: Graph,
  id: string,
): Graph => {
  const root = graph.nodes.find(
    (n) => n.id === id,
  );
  if (!root || root.locked) return graph;
  const branch = subtree(graph.nodes, [id]);
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  for (const n of graph.nodes) {
    if (!branch.has(n.id)) continue;
    const w = nodeSize(n).width / 2,
      h = nodeSize(n).height / 2;
    left = Math.min(left, n.position.x - w);
    right = Math.max(right, n.position.x + w);
    top = Math.min(top, n.position.y - h);
    bottom = Math.max(bottom, n.position.y + h);
  }
  let best: FlowNode | undefined,
    area = Infinity,
    depth = Infinity;
  for (const n of visibleScene(graph).nodes) {
    if (
      !n.group ||
      n.collapsed ||
      branch.has(n.id)
    )
      continue;
    const w = nodeSize(n).width,
      h = nodeSize(n).height;
    if (
      n.position.x - w / 2 > left ||
      n.position.x + w / 2 < right ||
      n.position.y - h / 2 > top ||
      n.position.y + h / 2 < bottom
    )
      continue;
    const size = w * h,
      distance = Math.abs(
        n.position.z - root.position.z,
      );
    if (
      size < area ||
      (size === area && distance < depth)
    ) {
      best = n;
      area = size;
      depth = distance;
    }
  }
  return best && best.id !== root.parent
    ? reparent(graph, id, best.id)
    : graph;
};

/** Disconnect selected branches from the rest of the graph as one edit. */
export const detachBoundary = (
  graph: Graph,
  roots: readonly string[],
): Graph => {
  const { inputs, outputs } = boundaryConnections(
    graph,
    roots,
  );
  if (!inputs.length && !outputs.length)
    return graph;
  const removed = new Set([
    ...inputs,
    ...outputs,
  ]);
  return {
    ...graph,
    edges: graph.edges.filter(
      (edge) => !removed.has(edge),
    ),
  };
};

/** Partition direct siblings by scalar metadata without changing world geometry. */
export const groupByAttribute = (
  graph: Graph,
  key: string,
  parent?: string,
): Graph => {
  const buckets = new Map<
    string | number | boolean,
    FlowNode[]
  >();
  for (const node of graph.nodes) {
    if (
      node.parent !== parent ||
      !node.data ||
      !Object.prototype.hasOwnProperty.call(
        node.data,
        key,
      )
    )
      continue;
    const value = node.data[key];
    if (
      typeof value !== "string" &&
      typeof value !== "number" &&
      typeof value !== "boolean"
    )
      continue;
    const bucket = buckets.get(value);
    if (bucket) bucket.push(node);
    else buckets.set(value, [node]);
  }
  let next = graph;
  const used = new Set(
    graph.nodes.map((n) => n.id),
  );
  for (const [value, nodes] of buckets) {
    const first = nodes[0];
    if (!first || nodes.length < 2) continue;
    const label =
        key + " = " + JSON.stringify(value),
      id = reserveId(used, "attribute-group");
    next = fitContainer(
      enclose(
        next,
        nodes.map((n) => n.id),
        { id, label, position: first.position },
      ),
      id,
    );
  }
  return next;
};

/** Resolve application data through the ownership chain, replacing whole fields
 * at each level. Track the declaring node so editors can locate an override. */
export const inheritedData = (
  graph: Graph,
  id: string,
): ReadonlyMap<
  string,
  Readonly<{ owner: string; value: JsonValue }>
> => {
  const fields = new Map<
    string,
    { owner: string; value: JsonValue }
  >();
  for (const node of ownershipPath(
    graph.nodes,
    id,
  ))
    for (const [key, value] of Object.entries(
      node.data ?? {},
    ))
      fields.set(key, { owner: node.id, value });
  return fields;
};

/** Reverse the ownership path to make a nested container the root of its
 * existing tree. Off-path branches keep their immediate owners. */
export const rerootGroup = (
  graph: Graph,
  id: string,
): Graph => {
  const path = ownershipPath(graph.nodes, id);
  const root = path[0],
    selected = path[path.length - 1];
  if (
    !root ||
    root.parent !== undefined ||
    path.length < 2 ||
    !selected ||
    !(
      selected.group ||
      graph.nodes.some((n) => n.parent === id)
    )
  )
    return graph;
  const changed = new Map<string, FlowNode>();
  for (const [i, node] of path.entries()) {
    const parent = path[i + 1];
    if (parent)
      changed.set(
        node.id,
        withParent(node, parent.id),
      );
    else {
      const {
        parent: old,
        extent,
        expandParent,
        ...top
      } = node;
      changed.set(id, top);
    }
  }
  return {
    ...graph,
    nodes: graph.nodes.map(
      (n) => changed.get(n.id) ?? n,
    ),
  };
};

/** Count descendant cards bottom-up, including hidden and folded content.
 * Containers themselves do not consume a card slot. */
const summarizeLeaves = (
  graph: Graph,
  valueOf: (node: FlowNode) => number | undefined,
) => {
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const children = new Map<string, number>();
  for (const n of graph.nodes)
    if (
      n.parent !== undefined &&
      byId.has(n.parent)
    )
      children.set(
        n.parent,
        (children.get(n.parent) ?? 0) + 1,
      );
  const pending = new Map(children);
  const counts = new Map<string, number>();
  const sums = new Map<string, number>(),
    samples = new Map<string, number>();
  const queue = graph.nodes.filter(
    (n) => !children.has(n.id),
  );
  for (const n of queue) {
    const size =
      counts.get(n.id) ?? (n.group ? 0 : 1);
    counts.set(n.id, size);
    const leafValue =
      !n.group && !children.has(n.id)
        ? valueOf(n)
        : undefined;
    if (leafValue !== undefined) {
      sums.set(n.id, leafValue);
      samples.set(n.id, 1);
    }
    const parent =
      n.parent === undefined
        ? undefined
        : byId.get(n.parent);
    if (!parent) continue;
    sums.set(
      parent.id,
      (sums.get(parent.id) ?? 0) +
        (sums.get(n.id) ?? 0),
    );
    samples.set(
      parent.id,
      (samples.get(parent.id) ?? 0) +
        (samples.get(n.id) ?? 0),
    );
    counts.set(
      parent.id,
      (counts.get(parent.id) ?? 0) + size,
    );
    const left = pending.get(parent.id)! - 1;
    pending.set(parent.id, left);
    if (!left) queue.push(parent);
  }
  return graph.nodes.flatMap((n) =>
    (n.group || children.has(n.id)) &&
    !pending.get(n.id)
      ? [
          {
            id: n.id,
            cards: counts.get(n.id) ?? 0,
            samples: samples.get(n.id) ?? 0,
            total: sums.get(n.id) ?? 0,
          },
        ]
      : [],
  );
};

export const groupLoads = (graph: Graph) =>
  summarizeLeaves(graph, () => undefined).map(
    ({ id, cards }) => ({ id, cards }),
  );

export const groupTotals = (
  graph: Graph,
  key: string,
) =>
  summarizeLeaves(graph, (node) => {
    const value = node.data?.[key];
    return typeof value === "number" &&
      Number.isFinite(value)
      ? value
      : undefined;
  });

/** Partition direct leaf cards along their widest spatial axis until each
 * container meets the requested capacity. Existing subgroups stay intact. */
export const partitionCards = (
  graph: Graph,
  parent: string,
  capacity: number,
): Graph => {
  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    !graph.nodes.some((n) => n.id === parent)
  )
    return graph;
  const parents = new Set(
    graph.nodes.map((n) => n.parent),
  );
  const cards = graph.nodes.filter(
    (n) =>
      n.parent === parent &&
      !n.group &&
      !parents.has(n.id),
  );
  if (cards.length <= capacity) return graph;
  const used = new Set(
      graph.nodes.map((n) => n.id),
    ),
    assignments = new Map<string, string>(),
    groups: FlowNode[] = [];
  const split = (batch: FlowNode[]) => {
    const min = {
        x: Infinity,
        y: Infinity,
        z: Infinity,
      },
      max = {
        x: -Infinity,
        y: -Infinity,
        z: -Infinity,
      };
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    for (const n of batch) {
      for (const axis of [
        "x",
        "y",
        "z",
      ] satisfies (keyof Point3)[]) {
        min[axis] = Math.min(
          min[axis],
          n.position[axis],
        );
        max[axis] = Math.max(
          max[axis],
          n.position[axis],
        );
      }
      const w = nodeSize(n).width / 2,
        h = nodeSize(n).height / 2;
      left = Math.min(left, n.position.x - w);
      right = Math.max(right, n.position.x + w);
      top = Math.min(top, n.position.y - h);
      bottom = Math.max(bottom, n.position.y + h);
    }
    if (batch.length > capacity) {
      const span = (axis: keyof Point3) =>
        max[axis] - min[axis];
      const axis = (
        ["x", "y", "z"] satisfies (keyof Point3)[]
      ).reduce((a, b) =>
        span(a) >= span(b) ? a : b,
      );
      batch.sort(
        (a, b) =>
          a.position[axis] - b.position[axis],
      );
      const cut =
        Math.ceil(
          Math.ceil(batch.length / capacity) / 2,
        ) * capacity;
      split(batch.slice(0, cut));
      split(batch.slice(cut));
      return;
    }
    const number = groups.length + 1,
      id = reserveId(used, "partition-" + number);
    groups.push({
      id,
      label: "区画 " + number,
      group: true,
      parent,
      width: right - left + 48,
      height: bottom - top + 48,
      position: {
        x: (left + right) / 2,
        y: (top + bottom) / 2,
        z: (min.z + max.z) / 2,
      },
    });
    for (const n of batch)
      assignments.set(n.id, id);
  };
  split(cards);
  return {
    ...graph,
    nodes: [
      ...graph.nodes.map((n) =>
        assignments.has(n.id)
          ? withParent(n, assignments.get(n.id))
          : n,
      ),
      ...groups,
    ],
  };
};

/** Minimum endpoint set touching every wire between two disjoint branches.
 * An alternating-path matching yields the corresponding bipartite vertex cover. */
export const interfaceCover = (
  graph: Graph,
  first: string,
  second: string,
): readonly string[] => {
  const branch = hierarchyIndex(graph.nodes),
    left = branch([first]),
    right = branch([second]);
  if (left.has(second) || right.has(first))
    return [];
  const adjacent = new Map<string, Set<string>>();
  for (const e of graph.edges) {
    let a = e.source,
      b = e.target;
    if (right.has(a)) [a, b] = [b, a];
    if (!left.has(a) || !right.has(b)) continue;
    const neighbors =
      adjacent.get(a) ?? new Set<string>();
    neighbors.add(b);
    adjacent.set(a, neighbors);
  }
  const matesL = new Map<string, string>(),
    matesR = new Map<string, string>();
  const walk = (roots: string[]) => {
    const seen = new Set(roots),
      via = new Map<string, string>();
    for (const a of seen)
      for (const b of adjacent.get(a) ?? []) {
        if (matesL.get(a) === b || via.has(b))
          continue;
        via.set(b, a);
        const mate = matesR.get(b);
        if (mate === undefined)
          return { seen, via, end: b };
        seen.add(mate);
      }
    return { seen, via, end: undefined };
  };
  for (const root of adjacent.keys()) {
    const path = walk([root]);
    let b = path.end;
    while (b !== undefined) {
      const a = path.via.get(b)!;
      const previous = matesL.get(a);
      matesL.set(a, b);
      matesR.set(b, a);
      b = previous;
    }
  }
  const reachable = walk(
    [...adjacent.keys()].filter(
      (a) => !matesL.has(a),
    ),
  );
  return [
    ...[...adjacent.keys()].filter(
      (a) => !reachable.seen.has(a),
    ),
    ...reachable.via.keys(),
  ];
};

/** Enclose maximal serial runs at one hierarchy level. Junctions, cycles
 * and existing containers remain available as separate editing units. */
export const groupSerialRuns = (
  graph: Graph,
  parent?: string,
): Graph => {
  const { incoming, outgoing } = adjacency(graph);
  const parents = new Set(
    graph.nodes.map((n) => n.parent),
  );
  const candidates = graph.nodes.filter(
    (n) =>
      n.parent === parent &&
      !parents.has(n.id) &&
      !n.group &&
      (incoming.get(n.id)?.size ?? 0) <= 1 &&
      (outgoing.get(n.id)?.size ?? 0) <= 1,
  );
  const ids = new Set(
    candidates.map((n) => n.id),
  );
  const used = new Set(
    graph.nodes.map((n) => n.id),
  );
  let next = graph;
  for (const start of candidates) {
    const predecessor = incoming
      .get(start.id)
      ?.values()
      .next().value;
    if (
      predecessor !== undefined &&
      ids.has(predecessor)
    )
      continue;
    const run = [start.id];
    for (const id of run) {
      const successor = outgoing
        .get(id)
        ?.values()
        .next().value;
      if (
        successor !== undefined &&
        ids.has(successor)
      )
        run.push(successor);
    }
    if (run.length < 2) continue;
    const id = reserveId(
      used,
      "sequence-" + start.id,
    );
    next = fitContainer(
      enclose(next, run, {
        id,
        label: start.label + " からの直列処理",
        position: start.position,
      }),
      id,
    );
  }
  return next;
};

/** Follow a setting from its declaring node, stopping at each first override.
 * Presence, including an explicit null, determines ownership. */
export const settingImpact = (
  graph: Graph,
  owner: string,
  key: string,
) => {
  const children = new Map<string, FlowNode[]>(),
    affected: string[] = [],
    overrides: string[] = [];
  const declares = (n: FlowNode) =>
    Object.prototype.hasOwnProperty.call(
      n.data ?? {},
      key,
    );
  if (
    !graph.nodes.some(
      (n) => n.id === owner && declares(n),
    )
  )
    return {
      declared: false,
      affected,
      overrides,
    };
  for (const n of graph.nodes)
    if (n.parent !== undefined) {
      const list = children.get(n.parent) ?? [];
      list.push(n);
      children.set(n.parent, list);
    }
  const seen = new Set([owner]),
    queue = [owner];
  for (const parent of queue)
    for (const n of children.get(parent) ?? []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      if (declares(n)) overrides.push(n.id);
      else {
        affected.push(n.id);
        queue.push(n.id);
      }
    }
  return { declared: true, affected, overrides };
};

/** Move a branch without changing its effective data. New inherited keys
 * cannot be masked by this data model, so reject such a move atomically. */
export const reparentWithSettings = (
  graph: Graph,
  id: string,
  parent?: string,
): Result<Graph, string> => {
  const node = graph.nodes.find(
    (n) => n.id === id,
  );
  if (!node)
    return err("移動するカードがありません");
  if (node.parent === parent) return ok(graph);
  const moved = reparent(graph, id, parent);
  if (moved === graph)
    return err(
      "移動先が存在しないか、親子関係が循環します",
    );
  const before = inheritedData(graph, id),
    after = inheritedData(moved, id);
  for (const key of after.keys())
    if (!before.has(key))
      return err(
        "移動先で新しい項目を継承するため設定を保持できません：" +
          key,
      );
  const additions = new Map<string, JsonValue>();
  for (const [key, { value }] of before) {
    const next = after.get(key);
    if (
      !next ||
      !matchesData(value, next.value) ||
      !matchesData(next.value, value)
    )
      additions.set(key, value);
  }
  if (!additions.size) return ok(moved);
  return ok({
    ...moved,
    nodes: moved.nodes.map((n) =>
      n.id === id
        ? {
            ...n,
            data: {
              ...n.data,
              ...Object.fromEntries(additions),
            },
          }
        : n,
    ),
  });
};

/** Hoist a common direct-child setting without changing descendant values.
 * An existing, different effective value on the parent is a conflict. */
export const hoistSetting = (
  graph: Graph,
  parent: string,
  key: string,
): Result<Graph, string> => {
  const group = graph.nodes.find(
      (n) => n.id === parent,
    ),
    children = graph.nodes.filter(
      (n) => n.parent === parent,
    );
  if (!group || children.length < 2 || !key)
    return err(
      "直下に二枚以上のカードがあるグループと項目名を指定してください",
    );
  if (
    children.some(
      (n) =>
        !Object.prototype.hasOwnProperty.call(
          n.data ?? {},
          key,
        ),
    )
  )
    return err(
      "直下のすべてのカードに明示された項目を指定してください",
    );
  const value = children[0]!.data![key]!;
  const equal = (other: JsonValue) =>
    matchesData(value, other) &&
    matchesData(other, value);
  if (children.some((n) => !equal(n.data![key]!)))
    return err("子カードの設定値が一致しません");
  const prior = inheritedData(graph, parent).get(
    key,
  );
  if (prior && !equal(prior.value))
    return err("親の既存設定と競合します");
  return ok({
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (n === group)
        return prior
          ? n
          : {
              ...n,
              data: { ...n.data, [key]: value },
            };
      if (n.parent !== parent) return n;
      const { [key]: old, ...data } = n.data!;
      return { ...n, data };
    }),
  });
};
