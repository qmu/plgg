import { ok, err, isErr } from "plgg";
import type { Edge, Graph } from "./model";

/** Older diagrams may omit IDs. Match their edge object first, then
 * fall back to its endpoints for callers holding a structural copy. */
export const edgeIndex = (
  edges: readonly Edge[],
  edge: Edge,
): number => {
  if (edge.id !== undefined)
    return edges.findIndex(
      (e) => e.id === edge.id,
    );
  const exact = edges.indexOf(edge);
  return exact >= 0
    ? exact
    : edges.findIndex(
        (e) =>
          e.id === undefined &&
          e.source === edge.source &&
          e.target === edge.target &&
          e.sourceHandle === edge.sourceHandle &&
          e.targetHandle === edge.targetHandle,
      );
};
export const reserveId = (
  used: Set<string>,
  base: string,
): string => {
  let id = base,
    i = 1;
  while (used.has(id))
    id = base + " (" + ++i + ")";
  used.add(id);
  return id;
};
export const edgeIds = (edges: readonly Edge[]) =>
  new Set(
    edges.flatMap((e) =>
      e.id === undefined ? [] : [e.id],
    ),
  );
export type Port = Readonly<{
  id: string;
  direction: "source" | "target";
  description?: string;
  payload?: string;
  capacity?: number;
}>;
export const portsFor = (graph: Graph) => {
  const nodes = new Map<
    string,
    Map<string, Port>
  >();
  const add = (
    node: string,
    id: string | undefined,
    direction: Port["direction"],
  ) => {
    if (id === undefined) return;
    const ports =
      nodes.get(node) ?? new Map<string, Port>();
    ports.set(JSON.stringify([direction, id]), {
      direction,
      id,
    });
    nodes.set(node, ports);
  };
  for (const n of graph.nodes)
    for (const port of n.ports ?? [])
      add(n.id, port.id, port.direction);
  for (const edge of graph.edges) {
    add(edge.source, edge.sourceHandle, "source");
    add(edge.target, edge.targetHandle, "target");
  }
  return new Map(
    [...nodes].map(([id, ports]) => [
      id,
      [...ports.values()],
    ]),
  );
};
export const portOffset = (
  ports: readonly Port[],
  direction: Port["direction"],
  id?: string,
): number => {
  const list = ports.filter(
    (p) => p.direction === direction,
  );
  const index =
    id === undefined
      ? 0
      : list.findIndex((p) => p.id === id) + 1;
  return (
    32 * ((index + 1) / (list.length + 2) - 0.5)
  );
};

export const addPort = (
  graph: Graph,
  node: string,
  port: Port,
): Graph => {
  const n = graph.nodes.find(
    (n) => n.id === node,
  );
  if (
    !n ||
    !port.id ||
    n.ports?.some(
      (p) =>
        p.id === port.id &&
        p.direction === port.direction,
    )
  )
    return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((v) =>
      v === n
        ? {
            ...v,
            ports: [...(n.ports ?? []), port],
          }
        : v,
    ),
  };
};
/** Renaming a handle keeps existing connections attached. */
export const renamePort = (
  graph: Graph,
  node: string,
  port: Port,
  name: string,
): Graph => {
  const n = graph.nodes.find(
    (n) => n.id === node,
  );
  if (
    !name ||
    !n?.ports?.some(
      (p) =>
        p.direction === port.direction &&
        p.id === port.id,
    ) ||
    n.ports.some(
      (p) =>
        p.direction === port.direction &&
        p.id === name,
    )
  )
    return graph;
  const field =
    port.direction === "source"
      ? "sourceHandle"
      : "targetHandle";
  return {
    ...graph,
    nodes: graph.nodes.map((v) =>
      v === n
        ? {
            ...v,
            ports:
              v.ports?.map((p) =>
                p.direction === port.direction &&
                p.id === port.id
                  ? { ...p, id: name }
                  : p,
              ) ?? [],
          }
        : v,
    ),
    edges: graph.edges.map((e) =>
      e[port.direction] === node &&
      e[field] === port.id
        ? { ...e, [field]: name }
        : e,
    ),
  };
};
export const removePort = (
  graph: Graph,
  node: string,
  port: Port,
): Graph => {
  const field =
    port.direction === "source"
      ? "sourceHandle"
      : "targetHandle";
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id !== node
        ? n
        : {
            ...n,
            ports: (n.ports ?? []).filter(
              (p) =>
                p.direction !== port.direction ||
                p.id !== port.id,
            ),
          },
    ),
    edges: graph.edges.filter(
      (e) =>
        e[port.direction] !== node ||
        e[field] !== port.id,
    ),
  };
};
/** Compile ancestor membership once per audit, including the group itself. */
const blockedBoundaries = (graph: Graph) => {
  const rules = graph.nodes.filter(
    (n) => n.boundary,
  );
  if (!rules.length) return (_edge: Edge) => [];
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const cache = new Map<string, Set<string>>();
  const ancestry = (id: string) => {
    const known = cache.get(id);
    if (known) return known;
    const seen = new Set<string>(),
      groups = new Set<string>();
    let node = byId.get(id);
    while (node && !seen.has(node.id)) {
      seen.add(node.id);
      if (node.boundary) groups.add(node.id);
      node =
        node.parent === undefined
          ? undefined
          : byId.get(node.parent);
    }
    cache.set(id, groups);
    return groups;
  };
  return (edge: Edge) => {
    if (
      !byId.has(edge.source) ||
      !byId.has(edge.target)
    )
      return [];
    const from = ancestry(edge.source),
      to = ancestry(edge.target);
    return rules.filter(
      (n) =>
        from.has(n.id) !== to.has(n.id) &&
        n.boundary !==
          (from.has(n.id)
            ? "outbound"
            : "inbound"),
    );
  };
};

export const auditBoundaries = (graph: Graph) => {
  const blocked = blockedBoundaries(graph);
  return graph.edges.flatMap((edge) =>
    blocked(edge).map((group) => ({
      edge,
      group,
    })),
  );
};

/** An empty result permits the candidate. Both initial wiring and endpoint
 * reconnection consult this check on the graph excluding the old edge. */
export const connectionIssue = (
  graph: Graph,
  e: Edge,
  allow?: (e: Edge, g: Graph) => boolean,
): string => {
  const source = graph.nodes.find(
      (n) => n.id === e.source,
    ),
    target = graph.nodes.find(
      (n) => n.id === e.target,
    );
  if (!source || !target)
    return "端点のノードが見つかりません";
  if (
    source.connectable === false ||
    target.connectable === false
  )
    return "このノードへの新規接続は禁止されています";
  if (source === target)
    return "同じノードには接続できません";
  const boundary = blockedBoundaries(graph)(e)[0];
  if (boundary)
    return (
      boundary.label +
      " のグループ境界ではこの向きの接続は禁止されています"
    );
  const output = source.ports?.find(
      (p) =>
        p.direction === "source" &&
        p.id === e.sourceHandle,
    ),
    input = target.ports?.find(
      (p) =>
        p.direction === "target" &&
        p.id === e.targetHandle,
    );
  if (
    input?.payload &&
    input.payload !== output?.payload
  )
    return (
      "入力には " +
      input.payload +
      " 型の出力が必要です"
    );
  if (
    graph.edges.some(
      (x) =>
        x.source === e.source &&
        x.target === e.target &&
        x.sourceHandle === e.sourceHandle &&
        x.targetHandle === e.targetHandle,
    )
  )
    return "この接続は既に存在します";
  for (const p of [output, input])
    if (p?.capacity !== undefined) {
      const end = p.direction,
        handle =
          end === "source"
            ? "sourceHandle"
            : "targetHandle";
      if (
        graph.edges.filter(
          (x) =>
            x[end] === e[end] &&
            x[handle] === p.id,
        ).length >= p.capacity
      )
        return (
          p.id + " の接続数が上限に達しています"
        );
    }
  return allow?.(e, graph) === false
    ? "図面の接続条件を満たしていません"
    : "";
};
export const configurePort = (
  graph: Graph,
  node: string,
  port: Port,
): Graph => {
  if (
    port.capacity !== undefined &&
    (!Number.isSafeInteger(port.capacity) ||
      port.capacity < 0)
  )
    return graph;
  const n = graph.nodes.find(
    (n) => n.id === node,
  );
  if (
    !n?.ports?.some(
      (p) =>
        p.id === port.id &&
        p.direction === port.direction,
    )
  )
    return graph;
  return {
    ...graph,
    nodes: graph.nodes.map((v) =>
      v === n
        ? {
            ...v,
            ports:
              v.ports?.map((p) =>
                p.id === port.id &&
                p.direction === port.direction
                  ? {
                      ...(p.description
                        ? {
                            description:
                              p.description,
                          }
                        : {}),
                      ...port,
                    }
                  : p,
              ) ?? [],
          }
        : v,
    ),
  };
};
export const reconnect = (
  graph: Graph,
  old: Edge,
  next: Edge,
  allow?: (edge: Edge, graph: Graph) => boolean,
): Graph => {
  const i = edgeIndex(graph.edges, old);
  if (
    i < 0 ||
    next.source === next.target ||
    !graph.nodes.some(
      (n) => n.id === next.source,
    ) ||
    !graph.nodes.some((n) => n.id === next.target)
  )
    return graph;
  const rest = {
    ...graph,
    edges: graph.edges.filter(
      (_, index) => index !== i,
    ),
  };
  if (connectionIssue(rest, next, allow))
    return graph;
  return {
    ...graph,
    edges: graph.edges.map((e, index) =>
      i === index
        ? {
            ...next,
            ...(old.id === undefined
              ? {}
              : { id: old.id }),
          }
        : e,
    ),
  };
};

/** Build a set of connections as one operation. Policies see the earlier
 * candidates in the set; a late rejection leaves the source graph untouched. */
export const connectBatch = (
  graph: Graph,
  candidates: readonly Edge[],
  allow?: (e: Edge, g: Graph) => boolean,
): import("plgg").Result<Graph, string> => {
  let next = graph;
  const ids = edgeIds(graph.edges);
  for (const edge of candidates) {
    if (edge.id !== undefined && ids.has(edge.id))
      return err("接続 ID が重複しています");
    const problem = connectionIssue(
      next,
      edge,
      allow,
    );
    if (problem) return err(problem);
    if (edge.id !== undefined) ids.add(edge.id);
    next = {
      ...next,
      edges: [...next.edges, edge],
    };
  }
  return ok(next);
};
export const eligibleTargets = (
  graph: Graph,
  source: string,
  handle?: string,
  allow?: (e: Edge, g: Graph) => boolean,
): readonly Edge[] => {
  const handles = portsFor(graph);
  return graph.nodes.flatMap((n) =>
    [
      undefined,
      ...(handles.get(n.id) ?? [])
        .filter((p) => p.direction === "target")
        .map((p) => p.id),
    ].flatMap((input) => {
      const edge = {
        source,
        target: n.id,
        ...(handle === undefined
          ? {}
          : { sourceHandle: handle }),
        ...(input === undefined
          ? {}
          : { targetHandle: input }),
      };
      return connectionIssue(graph, edge, allow)
        ? []
        : [edge];
    }),
  );
};

/** Transfer every wire on a socket as one edit, preserving edge order and IDs. */
export const transferWires = (
  graph: Graph,
  from: string,
  to: string,
  direction: Port["direction"],
  oldHandle: string | undefined,
  newHandle: string | undefined,
  allow?: (e: Edge, g: Graph) => boolean,
): import("plgg").Result<Graph, string> => {
  const field =
    direction === "source"
      ? "sourceHandle"
      : "targetHandle";
  const destination = graph.nodes.find(
    (n) => n.id === to,
  );
  if (
    !destination ||
    (newHandle !== undefined &&
      !portsFor(graph)
        .get(to)
        ?.some(
          (p) =>
            p.direction === direction &&
            p.id === newHandle,
        ))
  )
    return err("移動先のポートが見つかりません");
  const replacements = new Map<Edge, Edge>();
  for (const e of graph.edges) {
    if (
      e[direction] !== from ||
      e[field] !== oldHandle
    )
      continue;
    const { [field]: previous, ...rest } = e;
    replacements.set(e, {
      ...rest,
      [direction]: to,
      ...(newHandle === undefined
        ? {}
        : { [field]: newHandle }),
    });
  }
  if (!replacements.size)
    return err("移動する接続がありません");
  const result = connectBatch(
    {
      ...graph,
      edges: graph.edges.filter(
        (e) => !replacements.has(e),
      ),
    },
    [...replacements.values()],
    allow,
  );
  return isErr(result)
    ? result
    : ok({
        ...graph,
        edges: graph.edges.map(
          (e) => replacements.get(e) ?? e,
        ),
      });
};

/** Audit persisted contracts. Connection locks only govern new edits. */
export const auditPortContracts = (
  graph: Graph,
): readonly Readonly<{
  node: string;
  port: Port;
  edges: readonly Edge[];
  message: string;
}>[] => {
  const key = (
    node: string,
    direction: Port["direction"],
    id: string,
  ) => JSON.stringify([node, direction, id]);
  const ports = new Map(
    graph.nodes.flatMap((n) =>
      (n.ports ?? []).map(
        (port) =>
          [
            key(n.id, port.direction, port.id),
            {
              node: n.id,
              port,
              edges: Array<Edge>(),
            },
          ] as const,
      ),
    ),
  );
  const findings: {
    node: string;
    port: Port;
    edges: readonly Edge[];
    message: string;
  }[] = [];
  for (const edge of graph.edges) {
    const output =
      edge.sourceHandle === undefined
        ? undefined
        : ports.get(
            key(
              edge.source,
              "source",
              edge.sourceHandle,
            ),
          );
    const input =
      edge.targetHandle === undefined
        ? undefined
        : ports.get(
            key(
              edge.target,
              "target",
              edge.targetHandle,
            ),
          );
    output?.edges.push(edge);
    input?.edges.push(edge);
    if (
      input?.port.payload &&
      input.port.payload !== output?.port.payload
    )
      findings.push({
        node: input.node,
        port: input.port,
        edges: [edge],
        message:
          "型の不一致（入力 " +
          input.port.payload +
          "、出力 " +
          (output?.port.payload ?? "未指定") +
          "）",
      });
  }
  for (const {
    node,
    port,
    edges,
  } of ports.values()) {
    if (
      port.capacity !== undefined &&
      edges.length > port.capacity
    )
      findings.push({
        node,
        port,
        edges,
        message:
          "接続数 " +
          edges.length +
          " 件（上限 " +
          port.capacity +
          " 件）",
      });
  }
  return findings;
};

/** Match unused typed inputs to a unique compatible output on the chosen source. */
export const matchTypedPorts = (
  graph: Graph,
  source: string,
  targets: readonly string[],
  allow?: (edge: Edge, g: Graph) => boolean,
) => {
  const outputs =
    graph.nodes
      .find((n) => n.id === source)
      ?.ports?.filter(
        (p) =>
          p.direction === "source" && p.payload,
      ) ?? [];
  const selected = new Set(targets),
    occupied = new Set(
      graph.edges.map((e) =>
        JSON.stringify([
          e.target,
          e.targetHandle,
        ]),
      ),
    );
  let next = graph,
    ambiguous = 0;
  for (const node of graph.nodes) {
    if (
      node.id === source ||
      !selected.has(node.id)
    )
      continue;
    for (const input of node.ports ?? []) {
      if (
        input.direction !== "target" ||
        !input.payload ||
        occupied.has(
          JSON.stringify([node.id, input.id]),
        )
      )
        continue;
      const matches: Edge[] = [];
      for (const output of outputs) {
        if (input.payload !== output.payload)
          continue;
        const edge = {
          source,
          target: node.id,
          sourceHandle: output.id,
          targetHandle: input.id,
        };
        if (!connectionIssue(next, edge, allow))
          matches.push(edge);
        if (matches.length > 1) break;
      }
      if (matches.length > 1) {
        ambiguous++;
        continue;
      }
      const edge = matches[0];
      if (edge)
        next = {
          ...next,
          edges: [...next.edges, edge],
        };
    }
  }
  return { graph: next, ambiguous };
};

/** Inventory declared sockets by node type, independent of declaration order. */
export const inventoryTypes = (graph: Graph) => {
  const groups = new Map<
    string,
    Map<string, string[]>
  >();
  for (const node of graph.nodes) {
    const type =
      node.type ??
      (node.group ? "group" : "default");
    const ports = (node.ports ?? [])
      .map((p) =>
        JSON.stringify([
          p.direction,
          p.id,
          p.payload ?? null,
          p.capacity ?? null,
        ]),
      )
      .sort();
    const signature = JSON.stringify(ports);
    const variants =
      groups.get(type) ??
      new Map<string, string[]>();
    const members = variants.get(signature);
    if (members) members.push(node.id);
    else variants.set(signature, [node.id]);
    groups.set(type, variants);
  }
  return [...groups].map(([type, variants]) => {
    const definitions = [
      ...variants.values(),
    ].map((members) => ({ members }));
    return {
      type,
      count: definitions.reduce(
        (sum, v) => sum + v.members.length,
        0,
      ),
      definitions,
    };
  });
};

/** Consolidate one declared handle into another, validating rewired edges
 * as one transaction and retaining the original drawing order. */
export const mergePorts = (
  graph: Graph,
  node: string,
  from: Port,
  into: string,
  allow?: (edge: Edge, graph: Graph) => boolean,
): import("plgg").Result<Graph, string> => {
  const owner = graph.nodes.find(
    (n) => n.id === node,
  );
  const ports = owner?.ports?.filter(
    (p) => p.direction === from.direction,
  );
  if (
    !owner ||
    from.id === into ||
    !ports?.some((p) => p.id === from.id) ||
    !ports.some((p) => p.id === into)
  )
    return err(
      "同じ向きの異なる既存ポートを指定してください",
    );
  const nodes = graph.nodes.map((n) =>
    n === owner
      ? {
          ...n,
          ports: n.ports!.filter(
            (p) =>
              p.direction !== from.direction ||
              p.id !== from.id,
          ),
        }
      : n,
  );
  const field =
    from.direction === "source"
      ? "sourceHandle"
      : "targetHandle";
  const unchanged: Edge[] = [],
    changed: Edge[] = [];
  const edges = graph.edges.map((edge) => {
    if (
      edge[from.direction] !== node ||
      edge[field] !== from.id
    ) {
      unchanged.push(edge);
      return edge;
    }
    const next = { ...edge, [field]: into };
    changed.push(next);
    return next;
  });
  const checked = connectBatch(
    { nodes, edges: unchanged },
    changed,
    allow,
  );
  return isErr(checked)
    ? checked
    : ok({ ...graph, nodes, edges });
};

/** Sparse cross-tabulation: memory scales with occupied pairs, including the
 * implicit default handles and older wires without identities. */
export const portPairCounts = (
  graph: Graph,
  source: string,
  target: string,
) => {
  const rows = new Map<
    string,
    {
      output: string | undefined;
      input: string | undefined;
      count: number;
    }
  >();
  for (const edge of graph.edges) {
    if (
      edge.source !== source ||
      edge.target !== target
    )
      continue;
    const output = edge.sourceHandle,
      input = edge.targetHandle,
      key = JSON.stringify([output, input]);
    const row = rows.get(key);
    if (row) row.count++;
    else
      rows.set(key, { output, input, count: 1 });
  }
  return [...rows.values()];
};

/** Materialize wired handles and infer a payload only when every opposite
 * endpoint explicitly declares the same type. Never propagate guesses. */
export const inferPortContracts = (
  graph: Graph,
  selection: readonly string[],
): Graph => {
  const selected = new Set(selection);
  const key = (
    node: string,
    direction: Port["direction"],
    id: string | undefined,
  ) => JSON.stringify([node, direction, id]);
  const declared = new Map<string, Port>();
  for (const n of graph.nodes)
    for (const p of n.ports ?? [])
      declared.set(
        key(n.id, p.direction, p.id),
        p,
      );
  const observed = new Map<
    string,
    Set<string | undefined>
  >();
  const observe = (
    node: string,
    direction: Port["direction"],
    id: string | undefined,
    peer: string,
  ) => {
    if (id === undefined || !selected.has(node))
      return;
    const handle = key(node, direction, id),
      values = observed.get(handle) ?? new Set();
    values.add(declared.get(peer)?.payload);
    observed.set(handle, values);
  };
  for (const e of graph.edges) {
    observe(
      e.source,
      "source",
      e.sourceHandle,
      key(e.target, "target", e.targetHandle),
    );
    observe(
      e.target,
      "target",
      e.targetHandle,
      key(e.source, "source", e.sourceHandle),
    );
  }
  const handles = portsFor(graph);
  return {
    ...graph,
    nodes: graph.nodes.map((n) => {
      if (!selected.has(n.id)) return n;
      let changed = false;
      const ports = (handles.get(n.id) ?? []).map(
        (p) => {
          const handle = key(
              n.id,
              p.direction,
              p.id,
            ),
            existing = declared.get(handle),
            values = observed.get(handle);
          const type =
            values?.size === 1
              ? values.values().next().value
              : undefined;
          if (
            existing &&
            (existing.payload || !type)
          )
            return existing;
          changed = true;
          return type
            ? {
                ...(existing ?? p),
                payload: type,
              }
            : p;
        },
      );
      return changed ? { ...n, ports } : n;
    }),
  };
};

/** Compile application-level dependency rules for both interactive connection
 * checks and audits. Types omitted from the rule table remain unrestricted. */
export const typeDependencyPolicy = (
  rules: unknown,
): import("plgg").Result<
  (edge: Edge, graph: Graph) => boolean,
  string
> => {
  if (
    rules === null ||
    typeof rules !== "object" ||
    Array.isArray(rules)
  )
    return err(
      "出力側の型をキーとする JSON オブジェクトを指定してください",
    );
  const allowed = new Map<string, Set<string>>();
  for (const [source, targets] of Object.entries(
    rules,
  )) {
    if (
      !Array.isArray(targets) ||
      !targets.every((t) => typeof t === "string")
    )
      return err(
        source +
          " の許可先を型名の配列で指定してください",
      );
    allowed.set(source, new Set(targets));
  }
  let cached: Graph["nodes"] | undefined;
  let types = new Map<string, string>();
  return ok((edge, graph) => {
    if (cached !== graph.nodes) {
      types = new Map(
        graph.nodes.map((n) => [
          n.id,
          n.type ??
            (n.group ? "group" : "default"),
        ]),
      );
      cached = graph.nodes;
    }
    const source = types.get(edge.source),
      target = types.get(edge.target);
    return (
      source !== undefined &&
      target !== undefined &&
      (allowed.get(source)?.has(target) ?? true)
    );
  });
};

/** Reorder one side of a card; inferred legacy handles become explicit so
 * the chosen order survives a save or deletion of their last wire. */
export const orderPorts = (
  graph: Graph,
  node: string,
  direction: Port["direction"],
  order: readonly string[],
): import("plgg").Result<Graph, string> => {
  const card = graph.nodes.find(
    (n) => n.id === node,
  );
  if (!card) return err("カードがありません");
  const visible = portsFor(graph).get(node) ?? [];
  const declared = new Map(
    card.ports
      ?.filter((p) => p.direction === direction)
      .map((p) => [p.id, p]),
  );
  const side = new Map(
    visible
      .filter((p) => p.direction === direction)
      .map((p) => [
        p.id,
        declared.get(p.id) ?? p,
      ]),
  );
  if (
    order.length !== side.size ||
    new Set(order).size !== side.size ||
    order.some((id) => !side.has(id))
  )
    return err(
      "同じ向きの全ポート名を重複なく指定してください",
    );
  const ports = [
    ...(card.ports ?? []).filter(
      (p) => p.direction !== direction,
    ),
    ...order.map((id) => side.get(id)!),
  ];
  return ok({
    ...graph,
    nodes: graph.nodes.map((n) =>
      n === card ? { ...card, ports } : n,
    ),
  });
};

/** Exchange two processors' wiring roles, retaining their positions and
 * identities. Validate the complete replacement, including direct A-B links. */
export const swapWiringRoles = (
  graph: Graph,
  a: string,
  b: string,
  allow?: (e: Edge, g: Graph) => boolean,
): import("plgg").Result<Graph, string> => {
  if (
    a === b ||
    ![a, b].every((id) =>
      graph.nodes.some((n) => n.id === id),
    )
  )
    return err(
      "異なるカードを二つ選択してください",
    );
  const ports = portsFor(graph);
  const swap = (id: string) =>
    id === a ? b : id === b ? a : id;
  const unchanged: Edge[] = [],
    changed: Edge[] = [],
    edges: Edge[] = [];
  for (const edge of graph.edges) {
    const source = swap(edge.source),
      target = swap(edge.target);
    if (
      source === edge.source &&
      target === edge.target
    ) {
      unchanged.push(edge);
      edges.push(edge);
      continue;
    }
    for (const [node, old, direction, handle] of [
      [
        source,
        edge.source,
        "source",
        edge.sourceHandle,
      ],
      [
        target,
        edge.target,
        "target",
        edge.targetHandle,
      ],
    ] as const)
      if (
        node !== old &&
        handle !== undefined &&
        !ports
          .get(node)
          ?.some(
            (p) =>
              p.direction === direction &&
              p.id === handle,
          )
      )
        return err(
          node +
            " に対応するポートがありません：" +
            handle,
        );
    const next = { ...edge, source, target };
    changed.push(next);
    edges.push(next);
  }
  const checked = connectBatch(
    { ...graph, edges: unchanged },
    changed,
    allow,
  );
  return isErr(checked)
    ? checked
    : ok({ ...graph, edges });
};

export const describePort = (
  graph: Graph,
  node: string,
  direction: Port["direction"],
  id: string,
  description: string,
): Graph => {
  const card = graph.nodes.find(
    (n) => n.id === node,
  );
  const port = card?.ports?.find(
    (p) =>
      p.direction === direction && p.id === id,
  );
  if (!card || !port) return graph;
  const { description: old, ...rest } = port;
  const next = description.trim()
    ? { ...rest, description: description.trim() }
    : rest;
  return {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n === card
        ? {
            ...n,
            ports: n.ports!.map((p) =>
              p === port ? next : p,
            ),
          }
        : n,
    ),
  };
};

/** Keep the earliest inputs on each port. Move overflow to declared inputs
 * of the same payload in declaration order, committing only a complete repair. */
export const relieveInputCapacity = (
  graph: Graph,
  node: string,
  allow?: (edge: Edge, graph: Graph) => boolean,
) => {
  const inputs =
    graph.nodes
      .find((n) => n.id === node)
      ?.ports?.filter(
        (p) => p.direction === "target",
      ) ?? [];
  const counts = new Map<string, number>();
  const byId = new Map(
    inputs.map((p) => [p.id, p]),
  );
  let next = graph;
  for (const [i, edge] of graph.edges.entries()) {
    if (
      edge.target !== node ||
      edge.targetHandle === undefined
    )
      continue;
    const port = byId.get(edge.targetHandle);
    if (!port || port.capacity === undefined)
      continue;
    const used = counts.get(port.id) ?? 0;
    counts.set(port.id, used + 1);
    if (used < port.capacity) continue;
    let moved = false;
    for (const other of inputs) {
      if (
        other.id === port.id ||
        other.payload !== port.payload
      )
        continue;
      const candidate = {
        ...edge,
        targetHandle: other.id,
      };
      const repaired = reconnect(
        next,
        next.edges[i]!,
        candidate,
        allow,
      );
      if (repaired === next) continue;
      next = repaired;
      moved = true;
      break;
    }
    if (!moved)
      return err(
        "配線 " +
          (edge.id ?? edge.source) +
          " の移管先が見つかりません。入力の型と空き容量を確認してください",
      );
  }
  return ok(next);
};
