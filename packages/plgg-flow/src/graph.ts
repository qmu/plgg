import { freePosition } from "plgg-flow/nodeSize";
import { nodeSize } from "plgg-flow/nodeSize";
import { boundaryConnections } from "plgg-flow/hierarchy";
import type { Port } from "plgg-flow/connections";
import {
  isErr,
  ok,
  err,
  type Result,
} from "plgg";
import {
  connectBatch,
  reserveId,
  edgeIds,
} from "plgg-flow/connections";
import type {
  Edge,
  FlowNode,
  Graph,
} from "./model";

/** Breadth-first search also terminates on graphs with feedback edges. */
export const reachable = (
  graph: Graph,
  start: string,
): ReadonlySet<string> => {
  const seen = new Set([start]),
    queue = [start];
  for (const id of queue) {
    for (const edge of graph.edges) {
      if (
        edge.source === id &&
        !seen.has(edge.target)
      ) {
        seen.add(edge.target);
        queue.push(edge.target);
      }
    }
  }
  return seen;
};
export const acyclicConnection = (
  edge: Edge,
  graph: Graph,
) =>
  !reachable(graph, edge.target).has(edge.source);
export const limitOutputs =
  (maximum: number) =>
  (edge: Edge, graph: Graph) =>
    graph.edges.filter(
      (e) => e.source === edge.source,
    ).length < maximum;
export const splitEdge = (
  graph: Graph,
  edge: Edge,
  node: FlowNode,
  options: Readonly<{
    input?: string;
    output?: string;
    allow?: (edge: Edge, graph: Graph) => boolean;
  }> = {},
): Graph => {
  const index = graph.edges.indexOf(edge);
  if (
    index < 0 ||
    graph.nodes.some((n) => n.id === node.id)
  )
    return graph;
  node = {
    ...node,
    position: freePosition(node, graph.nodes),
  };
  const {
    sourceHandle,
    targetHandle,
    id,
    waypoints,
    path,
    ...rest
  } = edge;
  const incoming: Edge = {
    ...rest,
    target: node.id,
    ...(id === undefined ? {} : { id }),
    ...(sourceHandle === undefined
      ? {}
      : { sourceHandle }),
    ...(options.input === undefined
      ? {}
      : { targetHandle: options.input }),
  };
  const outgoing: Edge = {
    ...rest,
    source: node.id,
    ...(id === undefined
      ? {}
      : {
          id: reserveId(edgeIds(graph.edges), id),
        }),
    ...(targetHandle === undefined
      ? {}
      : { targetHandle }),
    ...(options.output === undefined
      ? {}
      : { sourceHandle: options.output }),
  };
  // Keep bends in route order, splitting the path at the closest segment.
  if (waypoints?.length) {
    const start = graph.nodes.find(
        (n) => n.id === edge.source,
      )?.position,
      end = graph.nodes.find(
        (n) => n.id === edge.target,
      )?.position;
    if (!start || !end) return graph;
    const points = [start, ...waypoints, end];
    let cut = 0,
      best = Infinity;
    for (let k = 1; k < points.length; k++) {
      const a = points[k - 1],
        b = points[k];
      if (!a || !b) continue;
      const dx = b.x - a.x,
        dy = b.y - a.y,
        dz = b.z - a.z;
      const x = node.position.x - a.x,
        y = node.position.y - a.y,
        z = node.position.z - a.z;
      const length = dx * dx + dy * dy + dz * dz;
      const t = length
        ? Math.min(
            1,
            Math.max(
              0,
              (x * dx + y * dy + z * dz) / length,
            ),
          )
        : 0;
      const distance =
        (x - dx * t) ** 2 +
        (y - dy * t) ** 2 +
        (z - dz * t) ** 2;
      if (distance < best) {
        best = distance;
        cut = k - 1;
      }
    }
    return replace([
      {
        ...incoming,
        waypoints: waypoints.slice(0, cut),
      },
      {
        ...outgoing,
        waypoints: waypoints.slice(cut),
      },
    ]);
  }
  return replace([incoming, outgoing]);
  function replace(
    parts: readonly Edge[],
  ): Graph {
    const nodes = [...graph.nodes, node];
    const result = connectBatch(
      {
        ...graph,
        nodes,
        edges: graph.edges.filter(
          (_, i) => i !== index,
        ),
      },
      parts,
      options.allow,
    );
    return isErr(result)
      ? graph
      : {
          ...graph,
          nodes,
          edges: [
            ...graph.edges.slice(0, index),
            ...parts,
            ...graph.edges.slice(index + 1),
          ],
        };
  }
};
export const bypassNode = (
  graph: Graph,
  id: string,
): Graph => {
  const incoming = graph.edges.filter(
      (e) => e.target === id,
    ),
    outgoing = graph.edges.filter(
      (e) => e.source === id,
    );
  const keep = graph.edges.filter(
    (e) => e.source !== id && e.target !== id,
  );
  for (const a of incoming)
    for (const b of outgoing) {
      if (
        a.source !== b.target &&
        !keep.some(
          (e) =>
            e.source === a.source &&
            e.target === b.target,
        )
      )
        keep.push({
          source: a.source,
          target: b.target,
        });
    }
  return {
    nodes: graph.nodes.filter((n) => n.id !== id),
    edges: keep,
  };
};

/** Factor selected outgoing wires from one socket through a shared processing node. */
export const factorFanout = (
  graph: Graph,
  source: string,
  targets: readonly string[],
  label: string,
  allow?: (e: Edge, g: Graph) => boolean,
): Result<Graph, string> => {
  const origin = graph.nodes.find(
      (n) => n.id === source,
    ),
    selected = new Set(targets);
  const wires = graph.edges.filter(
    (e) =>
      e.source === source &&
      selected.has(e.target),
  );
  if (
    !origin ||
    !label.trim() ||
    selected.size < 2 ||
    selected.has(source) ||
    new Set(wires.map((e) => e.target)).size !==
      selected.size
  )
    return err(
      "同じ出力に接続された宛先を二つ以上選択してください",
    );
  const handles = new Set(
    wires.map((e) => e.sourceHandle),
  );
  if (handles.size !== 1)
    return err(
      "異なる出力ポートの配線はまとめられません",
    );
  const handle = wires[0]?.sourceHandle,
    payload = origin.ports?.find(
      (p) =>
        p.direction === "source" &&
        p.id === handle,
    )?.payload;
  const id = reserveId(
    new Set(graph.nodes.map((n) => n.id)),
    "process",
  );
  const position = { ...origin.position };
  for (const node of graph.nodes)
    if (selected.has(node.id))
      for (const axis of [
        "x",
        "y",
        "z",
      ] satisfies (keyof typeof position)[])
        position[axis] +=
          (node.position[axis] -
            origin.position[axis]) /
          (2 * selected.size);
  const contract = payload ? { payload } : {};
  const processor: FlowNode = {
    id,
    label: label.trim(),
    position,
    ...(origin.parent === undefined
      ? {}
      : { parent: origin.parent }),
    ports: [
      {
        id: "in",
        direction: "target",
        ...contract,
      },
      {
        id: "out",
        direction: "source",
        ...contract,
      },
    ],
  };
  const rewritten = new Map(
    wires.map((e) => [
      e,
      { ...e, source: id, sourceHandle: "out" },
    ]),
  );
  const upstream: Edge = {
    source,
    target: id,
    targetHandle: "in",
    ...(handle === undefined
      ? {}
      : { sourceHandle: handle }),
  };
  const nodes = [...graph.nodes, processor];
  const checked = connectBatch(
    {
      ...graph,
      nodes,
      edges: graph.edges.filter(
        (e) => !rewritten.has(e),
      ),
    },
    [upstream, ...rewritten.values()],
    allow,
  );
  return isErr(checked)
    ? checked
    : ok({
        ...graph,
        nodes,
        edges: [
          ...graph.edges.map(
            (e) => rewritten.get(e) ?? e,
          ),
          upstream,
        ],
      });
};

/** Expose incoming subtree wiring on a single gateway. Each internal
 * destination handle gets an independent typed channel through the gateway. */
export const exposeGroupInputs = (
  graph: Graph,
  groupId: string,
  allow?: (edge: Edge, g: Graph) => boolean,
): Result<Graph, string> => {
  const group = graph.nodes.find(
    (n) => n.id === groupId,
  );
  if (!group)
    return err("グループを選択してください");
  const byId = new Map(
    graph.nodes.map((n) => [n.id, n]),
  );
  const wires = boundaryConnections(graph, [
    groupId,
  ]).inputs.filter(
    (e) =>
      e.target !== groupId &&
      byId.get(e.target)?.type !==
        "input-gateway",
  );
  if (!wires.length)
    return err("公開できる外部入力がありません");
  const id = reserveId(
    new Set(byId.keys()),
    "input-gateway",
  );
  const channels = new Map<string, string>(),
    ports: Port[] = [],
    internal: Edge[] = [],
    rewritten = new Map<Edge, Edge>();
  for (const edge of wires) {
    const key = JSON.stringify([
      edge.target,
      edge.targetHandle,
    ]);
    let handle = channels.get(key);
    if (handle === undefined) {
      handle = "channel-" + (channels.size + 1);
      channels.set(key, handle);
      const payload = byId
        .get(edge.target)
        ?.ports?.find(
          (p) =>
            p.direction === "target" &&
            p.id === edge.targetHandle,
        )?.payload;
      for (const direction of [
        "source",
        "target",
      ] satisfies ("source" | "target")[])
        ports.push({
          id: handle,
          direction,
          ...(payload ? { payload } : {}),
        });
      internal.push({
        source: id,
        sourceHandle: handle,
        target: edge.target,
        ...(edge.targetHandle === undefined
          ? {}
          : { targetHandle: edge.targetHandle }),
      });
    }
    rewritten.set(edge, {
      ...edge,
      target: id,
      targetHandle: handle,
    });
  }
  const nodes = [
    ...graph.nodes,
    {
      id,
      label: group.label + " 入力",
      type: "input-gateway",
      parent: groupId,
      ports,
      position: {
        ...group.position,
        x:
          group.position.x -
          nodeSize(group).width / 2,
      },
    },
  ];
  const checked = connectBatch(
    {
      nodes,
      edges: graph.edges.filter(
        (e) => !rewritten.has(e),
      ),
    },
    [...rewritten.values(), ...internal],
    allow,
  );
  return isErr(checked)
    ? checked
    : ok({
        ...graph,
        nodes,
        edges: [
          ...graph.edges.map(
            (e) => rewritten.get(e) ?? e,
          ),
          ...internal,
        ],
      });
};
