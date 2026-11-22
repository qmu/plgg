import {
  ok,
  err,
  isErr,
  isSome,
  some,
  type Result,
} from "plgg";
import {
  isJsonObject,
  type JsonObject,
} from "plgg-flow/metadata";
import {
  connectBatch,
  portsFor,
  edgeIndex,
  reserveId,
  edgeIds,
} from "plgg-flow/connections";
import type {
  Edge,
  Graph,
  FlowNode,
  Flow,
} from "./model";
import type { Point3 } from "plgg-board";
import { subtree } from "plgg-flow/hierarchy";
import {
  components,
  shortestPath,
} from "plgg-flow/topology";

/** Copy the induced subgraph, retaining descendants but detaching external parents. */
export const extract = (
  graph: Graph,
  roots: readonly string[],
): Graph => {
  const ids = subtree(graph.nodes, roots);
  return {
    nodes: graph.nodes
      .filter((n) => ids.has(n.id))
      .map((n) => {
        if (
          n.parent === undefined ||
          ids.has(n.parent)
        )
          return n;
        const { parent, ...orphan } = n;
        return orphan;
      }),
    edges: graph.edges.filter(
      (e) =>
        ids.has(e.source) && ids.has(e.target),
    ),
  };
};
/** Export an editable branch with terminals representing its external neighbors. */
export const extractModule = (
  graph: Graph,
  roots: readonly string[],
): Graph => {
  const fragment = extract(graph, roots);
  const members = new Set(
    fragment.nodes.map((n) => n.id),
  );
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const used = new Set(byId.keys());
  const terminals = new Map<string, string>();
  const handles = new Map<string, Set<string>>();
  const edges: Edge[] = [];
  for (const edge of graph.edges) {
    const insideSource = members.has(edge.source);
    const insideTarget = members.has(edge.target);
    if (insideSource && insideTarget) {
      edges.push(edge);
      continue;
    }
    if (!insideSource && !insideTarget) continue;
    const side = insideSource
      ? "target"
      : "source";
    const outside = edge[side];
    if (!byId.has(outside)) continue;
    const terminal =
      terminals.get(outside) ??
      reserveId(
        used,
        "terminal-" + (terminals.size + 1),
      );
    terminals.set(outside, terminal);
    const port = insideSource
      ? edge.targetHandle
      : edge.sourceHandle;
    if (port !== undefined) {
      const referenced =
        handles.get(outside) ?? new Set<string>();
      referenced.add(
        JSON.stringify([side, port]),
      );
      handles.set(outside, referenced);
    }
    edges.push({ ...edge, [side]: terminal });
  }
  const nodes = [...fragment.nodes];
  for (const [outside, id] of terminals) {
    const original = byId.get(outside)!;
    nodes.push({
      id,
      label: "外部端子 · " + original.label,
      type: "terminal",
      data: { externalNodeId: outside },
      position: original.position,
      ports:
        original.ports?.filter((p) =>
          handles
            .get(outside)
            ?.has(
              JSON.stringify([p.direction, p.id]),
            ),
        ) ?? [],
    });
  }
  return { nodes, edges };
};
/** Resolve exported module terminals after insertion into a host drawing. */
export const bindModuleTerminals = (
  flow: Flow,
  selection: readonly string[],
) => {
  const selected = new Set(selection);
  const nodes = new Map(
    flow.nodes.map((n) => [n.id, n]),
  );
  const bindings = new Map<string, string>();
  for (const node of flow.nodes) {
    if (
      !selected.has(node.id) ||
      node.type !== "terminal"
    )
      continue;
    const target = node.data?.externalNodeId;
    if (
      typeof target !== "string" ||
      !nodes.has(target) ||
      nodes.get(target)?.type === "terminal"
    )
      return err(
        "外部端子 " +
          node.id +
          " の接続先がありません",
      );
    bindings.set(node.id, target);
  }
  if (!bindings.size)
    return err(
      "接続先 ID を持つ外部端子を選択してください",
    );
  const ports = portsFor(flow);
  const changed: Edge[] = [],
    kept: Edge[] = [];
  const edges: Edge[] = [];
  for (const edge of flow.edges) {
    const next = { ...edge };
    let moved = false;
    for (const end of [
      "source",
      "target",
    ] as const) {
      const target = bindings.get(edge[end]);
      if (target === undefined) continue;
      const handle =
        end === "source"
          ? edge.sourceHandle
          : edge.targetHandle;
      if (
        handle !== undefined &&
        !ports
          .get(target)
          ?.some(
            (p) =>
              p.direction === end &&
              p.id === handle,
          )
      )
        return err(
          target +
            " にポート " +
            handle +
            " がありません",
        );
      next[end] = target;
      moved = true;
    }
    (moved ? changed : kept).push(
      moved ? next : edge,
    );
    edges.push(moved ? next : edge);
  }
  if (!changed.length)
    return err("選択した端子に配線がありません");
  const checked = connectBatch(
    { ...flow, edges: kept },
    changed,
    flow.allowConnection,
  );
  if (isErr(checked)) return checked;
  return ok({ ...flow, edges });
};
/** Remap identities before appending; retries never overwrite an existing node. */
export const paste = (
  graph: Graph,
  fragment: Graph,
  offset: Point3,
): Graph => {
  const occupied = new Set(
      graph.nodes.map((n) => n.id),
    ),
    ids = new Map<string, string>();
  for (const n of fragment.nodes) {
    if (ids.has(n.id)) return graph;
    let id = n.id,
      serial = 1;
    while (occupied.has(id))
      id = n.id + " (" + ++serial + ")";
    occupied.add(id);
    ids.set(n.id, id);
  }
  const nodes = fragment.nodes.map((n) => {
    const { parent, ...rest } = n,
      owner =
        parent === undefined
          ? undefined
          : ids.get(parent);
    return {
      ...rest,
      id: ids.get(n.id) ?? n.id,
      ...(owner === undefined
        ? {}
        : { parent: owner }),
      position: {
        x: n.position.x + offset.x,
        y: n.position.y + offset.y,
        z: n.position.z + offset.z,
      },
    };
  });
  const used = edgeIds(graph.edges);
  const edges = fragment.edges.flatMap((e) => {
    const source = ids.get(e.source),
      target = ids.get(e.target);
    return source !== undefined &&
      target !== undefined
      ? [
          {
            ...e,
            source,
            target,
            ...(e.id === undefined
              ? {}
              : { id: reserveId(used, e.id) }),
          },
        ]
      : [];
  });
  return {
    nodes: [...graph.nodes, ...nodes],
    edges: [...graph.edges, ...edges],
  };
};
export const mergeNodes = (
  graph: Graph,
  ids: readonly string[],
  survivor: string,
): Graph => {
  const valid = new Set(ids);
  if (
    !valid.has(survivor) ||
    !graph.nodes.some((n) => n.id === survivor)
  )
    return graph;
  const removed = new Set(
    ids.filter((id) => id !== survivor),
  );
  const inherited = new Map(
    graph.nodes.map((n) => [n.id, n.parent]),
  );
  const nodes = graph.nodes
    .filter((n) => !removed.has(n.id))
    .map((n) => {
      if (
        n.parent === undefined ||
        !removed.has(n.parent)
      )
        return n;
      const { parent, ...rest } = n;
      if (
        n.id !== survivor &&
        !subtree(graph.nodes, [n.id]).has(
          survivor,
        )
      )
        return { ...rest, parent: survivor };
      const seen = new Set<string>();
      let next = inherited.get(parent);
      while (
        next !== undefined &&
        removed.has(next) &&
        !seen.has(next)
      ) {
        seen.add(next);
        next = inherited.get(next);
      }
      return next !== undefined &&
        next !== n.id &&
        !seen.has(next)
        ? { ...rest, parent: next }
        : rest;
    });
  const seen = new Set<string>();
  const edges = graph.edges.flatMap((e) => {
    const source = removed.has(e.source)
        ? survivor
        : e.source,
      target = removed.has(e.target)
        ? survivor
        : e.target;
    const key = JSON.stringify([
      source,
      target,
      e.sourceHandle,
      e.targetHandle,
      e.id,
    ]);
    if (
      (source === target &&
        e.source !== e.target) ||
      seen.has(key)
    )
      return [];
    seen.add(key);
    return [{ ...e, source, target }];
  });
  return { nodes, edges };
};
export const reverseConnections = (
  graph: Graph,
  ids: readonly string[],
): Graph => {
  const selected = new Set(ids),
    reversed = graph.edges.filter(
      (e) =>
        selected.has(e.source) &&
        selected.has(e.target),
    );
  const reverse = new Set(reversed);
  return {
    ...graph,
    edges: graph.edges.map((e) => {
      if (!reverse.has(e)) return e;
      const {
        sourceHandle,
        targetHandle,
        ...rest
      } = e;
      return {
        ...rest,
        source: e.target,
        target: e.source,
        ...(sourceHandle === undefined
          ? {}
          : { targetHandle: sourceHandle }),
        ...(targetHandle === undefined
          ? {}
          : { sourceHandle: targetHandle }),
      };
    }),
  };
};
/** A DAG's transitive reduction preserves reachability. Cyclic input is left intact. */
export const reduceTransitive = (
  graph: Graph,
): Graph => {
  if (
    components(graph).some((c) => c.length > 1) ||
    graph.edges.some((e) => e.source === e.target)
  )
    return graph;
  let edges: readonly Edge[] = graph.edges;
  for (const e of graph.edges) {
    const rest = edges.filter(
      (other) => other !== e,
    );
    if (
      shortestPath(
        { ...graph, edges: rest },
        e.source,
        e.target,
      ).length
    )
      edges = rest;
  }
  return { ...graph, edges };
};
export const alignNodes = (
  graph: Graph,
  ids: readonly string[],
  axis: keyof Point3,
): Graph => {
  const selected = new Set(ids),
    members = graph.nodes.filter((n) =>
      selected.has(n.id),
    );
  if (!members.length) return graph;
  const target =
    members.reduce(
      (sum, n) => sum + n.position[axis],
      0,
    ) / members.length;
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      selected.has(n.id) && !n.locked
        ? {
            ...n,
            position: {
              ...n.position,
              [axis]: target,
            },
          }
        : n,
    ),
  };
};
export const distribute = (
  graph: Graph,
  ids: readonly string[],
  axis: keyof Point3,
  spacing: "centers" | "gaps" = "centers",
): Graph => {
  const selected = new Set(ids),
    members = graph.nodes
      .filter((n) => selected.has(n.id))
      .sort(
        (a, b) =>
          a.position[axis] - b.position[axis],
      );
  if (members.length < 3) return graph;
  const size = (n: FlowNode) =>
    spacing === "centers" || axis === "z"
      ? 0
      : axis === "x"
        ? (n.width ?? 104)
        : (n.height ?? 36);
  const values = new Map<string, number>();
  let start = 0;
  for (let end = 1; end < members.length; end++) {
    const first = members[start],
      last = members[end];
    if (
      !first ||
      !last ||
      (!last.locked && end !== members.length - 1)
    )
      continue;
    const middle = members.slice(start + 1, end);
    const gap =
      (last.position[axis] -
        first.position[axis] -
        (size(first) + size(last)) / 2 -
        middle.reduce(
          (total, n) => total + size(n),
          0,
        )) /
      (end - start);
    let cursor =
      first.position[axis] + size(first) / 2;
    for (const n of middle) {
      const center = cursor + gap + size(n) / 2;
      if (center !== n.position[axis])
        values.set(n.id, center);
      cursor = center + size(n) / 2;
    }
    start = end;
  }
  return values.size
    ? {
        ...graph,
        nodes: graph.nodes.map((n) => {
          const value = values.get(n.id);
          return value === undefined
            ? n
            : {
                ...n,
                position: {
                  ...n.position,
                  [axis]: value,
                },
              };
        }),
      }
    : graph;
};
export const transformSelection = (
  graph: Graph,
  ids: readonly string[],
  transform: (relative: Point3) => Point3,
): Graph => {
  const movable = graph.nodes.filter(
    (n) => ids.includes(n.id) && !n.locked,
  );
  if (!movable.length) return graph;
  const center = movable.reduce(
    (sum, n) => ({
      x: sum.x + n.position.x / movable.length,
      y: sum.y + n.position.y / movable.length,
      z: sum.z + n.position.z / movable.length,
    }),
    { x: 0, y: 0, z: 0 },
  );
  const selected = new Set(
    movable.map((n) => n.id),
  );
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (!selected.has(n.id)) return n;
      const r = transform({
        x: n.position.x - center.x,
        y: n.position.y - center.y,
        z: n.position.z - center.z,
      });
      return {
        ...n,
        position: {
          x: center.x + r.x,
          y: center.y + r.y,
          z: center.z + r.z,
        },
      };
    }),
  };
};
export const lockNodes = (
  graph: Graph,
  ids: readonly string[],
  locked: boolean,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map((n) =>
    ids.includes(n.id) ? { ...n, locked } : n,
  ),
});
export const conceal = (
  graph: Graph,
  ids: readonly string[],
  hidden: boolean,
): Graph => ({
  ...graph,
  nodes: graph.nodes.map((n) =>
    ids.includes(n.id) ? { ...n, hidden } : n,
  ),
});
export const renameIdentity = (
  graph: Graph,
  old: string,
  id: string,
): Graph => {
  if (
    !id ||
    !graph.nodes.some((n) => n.id === old) ||
    graph.nodes.some((n) => n.id === id)
  )
    return graph;
  return {
    nodes: graph.nodes.map((n) => ({
      ...n,
      ...(n.id === old ? { id } : {}),
      ...(n.parent === old ? { parent: id } : {}),
    })),
    edges: graph.edges.map((e) => ({
      ...e,
      source: e.source === old ? id : e.source,
      target: e.target === old ? id : e.target,
    })),
  };
};
/** Rename graph and editor-owned references together; application data is opaque. */
export const renameFlowIdentity = (
  flow: Flow,
  old: string,
  id: string,
): Flow => {
  if (id.length > 1024 || !id.trim()) return flow;
  const graph = renameIdentity(flow, old, id);
  if (graph === flow) return flow;
  const ref = (v: string) => (v === old ? id : v);
  const edge =
    flow.activeEdge &&
    graph.edges[
      edgeIndex(flow.edges, flow.activeEdge)
    ];
  return {
    ...flow,
    ...graph,
    selected: isSome(flow.selected)
      ? some(ref(flow.selected.content))
      : flow.selected,
    source: isSome(flow.source)
      ? some(ref(flow.source.content))
      : flow.source,
    drag: isSome(flow.drag)
      ? some({
          ...flow.drag.content,
          node: ref(flow.drag.content.node),
        })
      : flow.drag,
    ...(edge ? { activeEdge: edge } : {}),
    ...(flow.selection
      ? { selection: flow.selection.map(ref) }
      : {}),
    ...(flow.isolatedBranch
      ? {
          isolatedBranch: ref(
            flow.isolatedBranch,
          ),
        }
      : {}),
    ...(flow.sets
      ? {
          sets: flow.sets.map((set) => ({
            ...set,
            members: set.members.map(ref),
          })),
        }
      : {}),
    ...(flow.marks
      ? {
          marks: flow.marks.map((mark) =>
            mark.kind === "review" &&
            mark.node === old
              ? { ...mark, node: id }
              : mark,
          ),
        }
      : {}),
    ...(flow.spatial
      ? {
          spatial: {
            ...flow.spatial,
            ...(flow.spatial.pivot
              ? { pivot: ref(flow.spatial.pivot) }
              : {}),
            ...(flow.spatial.dimensions
              ? {
                  dimensions:
                    flow.spatial.dimensions.map(
                      (d) => ({
                        ...d,
                        nodes: d.nodes.map(ref),
                      }),
                    ),
                }
              : {}),
          },
        }
      : {}),
  };
};
export const relabel = (
  graph: Graph,
  find: string,
  replacement: string,
): Graph =>
  find
    ? {
        ...graph,
        nodes: graph.nodes.map((n) => ({
          ...n,
          label: n.label
            .split(find)
            .join(replacement),
        })),
        edges: graph.edges.map((e) =>
          typeof e.label === "string"
            ? {
                ...e,
                label: e.label
                  .split(find)
                  .join(replacement),
              }
            : e,
        ),
      }
    : graph;

/** Replace the implementation of selected nodes while retaining the graph's
 * endpoint identities, port contracts, presentation and world coordinates. */
export const replaceNodeType = (
  graph: Graph,
  ids: readonly string[],
  type: string,
  data: unknown,
): Result<Graph, string> => {
  if (
    !type.trim() ||
    type.length > 1024 ||
    !isJsonObject(data)
  )
    return err(
      "有効な型名と JSON オブジェクトが必要です",
    );
  const selected = new Set(ids);
  const nodes = graph.nodes.filter((n) =>
    selected.has(n.id),
  );
  if (
    !selected.size ||
    nodes.length !== selected.size
  )
    return err("対象のノードが見つかりません");
  return ok({
    ...graph,
    nodes: graph.nodes.map((n) =>
      selected.has(n.id)
        ? { ...n, type, data }
        : n,
    ),
  });
};

/** Apply a JSON Merge Patch to selected node data as one immutable edit. */
export const patchNodeData = (
  graph: Graph,
  ids: readonly string[],
  patch: unknown,
): Result<Graph, string> => {
  if (!isJsonObject(patch))
    return err(
      "変更内容は JSON オブジェクトで指定してください",
    );
  const selected = new Set(ids),
    available = new Set(
      graph.nodes.map((n) => n.id),
    );
  if (
    !selected.size ||
    [...selected].some((id) => !available.has(id))
  )
    return err("対象のノードを選択してください");
  const merge = (
    base: JsonObject,
    changes: JsonObject,
  ): JsonObject => {
    const entries = new Map(Object.entries(base));
    for (const [key, value] of Object.entries(
      changes,
    )) {
      if (value === null) {
        entries.delete(key);
        continue;
      }
      const previous = entries.get(key);
      entries.set(
        key,
        isJsonObject(value)
          ? merge(
              isJsonObject(previous)
                ? previous
                : {},
              value,
            )
          : value,
      );
    }
    return Object.fromEntries(entries);
  };
  return ok({
    ...graph,
    nodes: graph.nodes.map((n) =>
      selected.has(n.id)
        ? {
            ...n,
            data: merge(n.data ?? {}, patch),
          }
        : n,
    ),
  });
};

/** Rename data fields simultaneously. Swaps are valid and any collision
 * rejects the whole migration, including changes on preceding nodes. */
export const migrateDataKeys = (
  graph: Graph,
  ids: readonly string[],
  mapping: unknown,
): Result<Graph, string> => {
  if (!isJsonObject(mapping))
    return err(
      "項目名の対応表を JSON オブジェクトで入力してください",
    );
  const names = new Map<string, string>();
  for (const [source, target] of Object.entries(
    mapping,
  )) {
    if (
      typeof target !== "string" ||
      !target.length
    )
      return err(
        "移行先には空でない項目名が必要です",
      );
    if (source !== target)
      names.set(source, target);
  }
  const selected = new Set(ids);
  if (!selected.size)
    return err(
      "移行対象のノードを選択してください",
    );
  const changed = new Map<string, JsonObject>();
  for (const node of graph.nodes) {
    if (!selected.has(node.id) || !node.data)
      continue;
    const entries = Object.entries(node.data);
    if (!entries.some(([key]) => names.has(key)))
      continue;
    const assigned = new Set<string>();
    for (const [key] of entries) {
      const target = names.get(key) ?? key;
      if (assigned.has(target))
        return err(
          node.id +
            " の項目名が競合します：" +
            target,
        );
      assigned.add(target);
    }
    changed.set(
      node.id,
      Object.fromEntries(
        entries.map(([key, value]) => [
          names.get(key) ?? key,
          value,
        ]),
      ),
    );
  }
  return ok(
    changed.size
      ? {
          ...graph,
          nodes: graph.nodes.map((n) => {
            const data = changed.get(n.id);
            return data ? { ...n, data } : n;
          }),
        }
      : graph,
  );
};

/** Join application settings by a unique string or numeric business key.
 * Validate both sides before constructing any replacement nodes. */
export const joinNodeData = (
  graph: Graph,
  donor: Graph,
  key: string,
): Result<Graph, string> => {
  if (!key)
    return err(
      "照合に使う項目名を指定してください",
    );
  const index = (
    nodes: readonly FlowNode[],
  ): Result<
    Map<string | number, FlowNode>,
    string
  > => {
    const entries = new Map<
      string | number,
      FlowNode
    >();
    for (const n of nodes) {
      if (
        !n.data ||
        !Object.prototype.hasOwnProperty.call(
          n.data,
          key,
        )
      )
        continue;
      const value = n.data[key];
      if (
        typeof value !== "string" &&
        typeof value !== "number"
      )
        continue;
      if (entries.has(value))
        return err(
          "照合キーが重複しています：" +
            JSON.stringify(value),
        );
      entries.set(value, n);
    }
    return ok(entries);
  };
  const targets = index(graph.nodes),
    sources = index(donor.nodes);
  if (isErr(targets)) return err(targets.content);
  if (isErr(sources)) return err(sources.content);
  const updates = new Map<string, FlowNode>();
  for (const [value, n] of targets.content) {
    const source = sources.content.get(value);
    if (source)
      updates.set(n.id, {
        ...n,
        data: { ...n.data, ...source.data },
      });
  }
  return ok(
    updates.size
      ? {
          ...graph,
          nodes: graph.nodes.map(
            (n) => updates.get(n.id) ?? n,
          ),
        }
      : graph,
  );
};

/** Format labels atomically from literal text and scalar data fields. */
export const formatNodeLabels = (
  graph: Graph,
  selection: readonly string[],
  format: string,
): Result<Graph, string> => {
  const parts = format.split(/(\{[^{}]+\})/u);
  if (
    !parts.some((_, i) => i % 2 === 1) ||
    parts.some(
      (part, i) =>
        i % 2 === 0 && /[{}]/u.test(part),
    )
  )
    return err(
      "項目名を {品番} の形式で指定してください",
    );
  const members = new Set(selection),
    nodes: FlowNode[] = [];
  for (const node of graph.nodes) {
    if (!members.has(node.id)) {
      nodes.push(node);
      continue;
    }
    const tokens: string[] = [];
    for (const [i, part] of parts.entries()) {
      if (i % 2 === 0) {
        tokens.push(part);
        continue;
      }
      const key = part.slice(1, -1);
      const value =
        node.data &&
        Object.prototype.hasOwnProperty.call(
          node.data,
          key,
        )
          ? node.data[key]
          : undefined;
      if (
        typeof value !== "string" &&
        typeof value !== "number" &&
        typeof value !== "boolean"
      )
        return err(
          node.id +
            " で表示に使える項目がありません：" +
            key,
        );
      tokens.push(String(value));
    }
    const label = tokens.join("");
    nodes.push(
      label === node.label
        ? node
        : { ...node, label },
    );
  }
  return ok({ ...graph, nodes });
};

/** Join two drawings at a common root card, translating donor world geometry
 * by the anchor displacement. Other matching IDs refer to independent cards. */
export const stitchDrawing = (
  host: Flow,
  donor: import("./interchange").Drawing,
  anchor: string,
) => {
  const destination = host.nodes.find(
      (n) => n.id === anchor,
    ),
    origin = donor.nodes.find(
      (n) => n.id === anchor,
    );
  if (
    !origin ||
    !destination ||
    origin.parent !== undefined
  )
    return err(
      "取り込む図面の最上位に同じ ID のカードが必要です",
    );
  const translated = (p: Point3) => ({
    x:
      p.x +
      (destination.position.x -
        origin.position.x),
    y:
      p.y +
      (destination.position.y -
        origin.position.y),
    z:
      p.z +
      (destination.position.z -
        origin.position.z),
  });
  const used = new Set(
      host.nodes.map((n) => n.id),
    ),
    mapping = new Map([[anchor, anchor]]);
  const others = donor.nodes.filter(
    (n) => n.id !== anchor,
  );
  for (const n of others)
    mapping.set(n.id, reserveId(used, n.id));
  const ref = (id: string) => mapping.get(id)!;
  const nodes = [
    ...host.nodes,
    ...others.map((n) => ({
      ...n,
      id: ref(n.id),
      position: translated(n.position),
      ...(n.parent !== undefined
        ? { parent: ref(n.parent) }
        : {}),
    })),
  ];
  const handles =
    portsFor(host).get(anchor) ?? [];
  const edgeNames = edgeIds(host.edges);
  const wires: Edge[] = [];
  for (const e of donor.edges) {
    for (const side of [
      "source",
      "target",
    ] as const) {
      const handle =
        side === "source"
          ? e.sourceHandle
          : e.targetHandle;
      if (
        e[side] === anchor &&
        handle !== undefined &&
        !handles.some(
          (p) =>
            p.direction === side &&
            p.id === handle,
        )
      )
        return err(
          "合流先にポート " +
            handle +
            " がありません",
        );
    }
    wires.push({
      ...e,
      source: ref(e.source),
      target: ref(e.target),
      ...(e.id !== undefined
        ? { id: reserveId(edgeNames, e.id) }
        : {}),
      ...(e.waypoints
        ? {
            waypoints:
              e.waypoints.map(translated),
          }
        : {}),
    });
  }
  const graph = connectBatch(
    { nodes, edges: host.edges },
    wires,
    host.allowConnection,
  );
  if (isErr(graph)) return graph;
  const markNames = new Set(
      host.marks?.map((m) => m.id),
    ),
    setNames = new Set(
      host.sets?.map((s) => s.name),
    );
  const marks = (donor.marks ?? []).map((m) => {
    const id = reserveId(markNames, m.id);
    return m.kind === "stroke"
      ? {
          ...m,
          id,
          points: m.points.map(translated),
        }
      : {
          ...m,
          id,
          position: translated(m.position),
          ...(m.node !== undefined
            ? { node: ref(m.node) }
            : {}),
        };
  });
  return ok({
    ...host,
    ...graph.content,
    marks: [...(host.marks ?? []), ...marks],
    sets: [
      ...(host.sets ?? []),
      ...(donor.sets ?? []).map((s) => ({
        ...s,
        name: reserveId(setNames, s.name),
        members: s.members.map(ref),
      })),
    ],
    spatial: {
      ...host.spatial,
      dimensions: [
        ...(host.spatial?.dimensions ?? []),
        ...(donor.spatial?.dimensions ?? []).map(
          (d) => ({
            ...d,
            nodes: d.nodes.map(ref),
          }),
        ),
      ],
    },
  });
};
