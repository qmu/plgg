import type { Port } from "plgg-flow/connections";
import { test, check, toBe } from "plgg-test";
import { isOk } from "plgg";
import {
  createFlow,
  disconnect,
  connect,
  splitEdge,
  type Graph,
} from "plgg-flow/index";
import {
  typeDependencyPolicy,
  inferPortContracts,
  portPairCounts,
  auditBoundaries,
  mergePorts,
  swapWiringRoles,
  orderPorts,
  renamePort,
  transferWires,
  removePort,
} from "plgg-flow/connections";
import { paste } from "plgg-flow/edits";
import {
  importReactFlow,
  saveDrawing,
  loadDrawing,
} from "plgg-flow/interchange";
const n = (id: string) => ({
  id,
  label: id,
  position: { x: 0, y: 0, z: 0 },
});
const first = {
    id: "out1",
    source: "a",
    target: "b",
    sourceHandle: "yes",
    targetHandle: "in",
  },
  second = {
    ...first,
    id: "out2",
    sourceHandle: "no",
  };
const graph: Graph = {
  nodes: [
    {
      ...n("a"),
      ports: [
        { direction: "source", id: "yes" },
        { direction: "source", id: "no" },
      ],
    },
    n("b"),
  ],
  edges: [first, second],
};
test("import and native roundtrip retain ports and independent parallel edges", () => {
  const r = importReactFlow(
    JSON.stringify({
      nodes: graph.nodes.map((n) => ({
        ...n,
        data: { label: n.id },
      })),
      edges: graph.edges,
      viewport: { x: 0, y: 0, zoom: 1 },
    }),
  );
  if (!isOk(r)) return check(false, toBe(true));
  const f = createFlow(r.content.drawing),
    loaded = loadDrawing(saveDrawing(f)),
    one = disconnect({ ...first })(f);
  return check(
    isOk(loaded) &&
      loaded.content.edges[0]?.sourceHandle ===
        "yes" &&
      r.content.drawing.nodes[0]?.ports
        ?.length === 2 &&
      one.edges.length === 1 &&
      one.edges[0]?.id === "out2",
    toBe(true),
  );
});
test("port edits preserve sibling connections; splitting and pasting issue unique edge ids", () => {
  const renamed = renamePort(
    graph,
    "a",
    { id: "yes", direction: "source" },
    "pass",
  );
  const removed = removePort(renamed, "a", {
    id: "pass",
    direction: "source",
  });
  const split = splitEdge(
      graph,
      first,
      n("step"),
    ),
    copy = paste(graph, graph, {
      x: 5,
      y: 3,
      z: 1,
    });
  return check(
    renamed.edges[0]?.sourceHandle === "pass" &&
      removed.edges.length === 1 &&
      removed.edges[0]?.id === "out2" &&
      new Set(split.edges.map((e) => e.id))
        .size === 3 &&
      split.edges[0]?.targetHandle ===
        undefined &&
      split.edges[1]?.sourceHandle ===
        undefined &&
      new Set(copy.edges.map((e) => e.id))
        .size === 4,
    toBe(true),
  );
});
test("named handles accept directionally valid connections with distinct identities", () => {
  const f = createFlow({ ...graph, edges: [] });
  const next = connect(
    "b",
    "in",
    "target",
  )(connect("a", "yes", "source")(f));
  const more = connect(
    "b",
    "in",
    "target",
  )(connect("a", "no", "source")(next));
  const rejected = connect(
    "b",
    "no",
    "source",
  )(connect("a", "yes", "source")(more));
  return check(
    next.edges[0]?.sourceHandle === "yes" &&
      more.edges.length === 2 &&
      rejected.edges === more.edges,
    toBe(true),
  );
});

import {
  pinchCamera,
  type Pinch,
} from "plgg-flow/gesture";
test("pinch zoom keeps the original midpoint anchored during a two-finger pan", () => {
  const previous: Pinch = [
    { id: 1, point: { x: 100, y: 200 } },
    { id: 2, point: { x: 200, y: 200 } },
  ];
  const next: Pinch = [
    { id: 1, point: { x: 80, y: 225 } },
    { id: 2, point: { x: 280, y: 225 } },
  ];
  const c = pinchCamera(
    {
      yaw: 0.7,
      pitch: 0.9,
      origin: { x: 150, y: 200 },
      scale: 1,
    },
    previous,
    next,
  );
  return check(
    c.scale === 2 &&
      c.origin.x === 180 &&
      c.origin.y === 225 &&
      c.yaw === 0.7 &&
      c.pitch === 0.9,
    toBe(true),
  );
});

import {
  configurePort,
  matchTypedPorts,
  auditPortContracts,
  connectionIssue,
  connectBatch,
  eligibleTargets,
  reconnect,
} from "plgg-flow/connections";
test("typed inputs, per-port limits and reconnection share the same rules", () => {
  const g: Graph = {
    nodes: [
      {
        ...n("a"),
        ports: [
          {
            id: "img",
            direction: "source",
            payload: "image",
            capacity: 1,
          },
        ],
      },
      {
        ...n("b"),
        ports: [
          {
            id: "in",
            direction: "target",
            payload: "image",
          },
        ],
      },
      n("c"),
    ],
    edges: [],
  };
  const e = {
    source: "a",
    sourceHandle: "img",
    target: "b",
    targetHandle: "in",
  };
  const wired = connectBatch(g, [e]);
  if (!isOk(wired))
    return check(false, toBe(true));
  const invalid = configurePort(g, "b", {
    id: "in",
    direction: "target",
    payload: "number",
  });
  const batch = connectBatch(g, [
    e,
    {
      source: "a",
      sourceHandle: "img",
      target: "c",
    },
  ]);
  const retarget = reconnect(wired.content, e, {
    source: "a",
    sourceHandle: "img",
    target: "c",
  });
  return check(
    connectionIssue(invalid, e).includes(
      "number",
    ) &&
      eligibleTargets(invalid, "a", "img").every(
        (v) => v.targetHandle !== "in",
      ) &&
      retarget.edges[0]?.target === "c" &&
      !isOk(batch) &&
      g.edges.length === 0,
    toBe(true),
  );
});

test("socket transfer retains wire identity and rejects the entire edit on a conflict", () => {
  const edges = [
    { id: "one", source: "a", target: "x" },
    { id: "two", source: "a", target: "y" },
  ];
  const graph = {
    nodes: ["a", "b", "x", "y"].map(n),
    edges,
  };
  const moved = transferWires(
    graph,
    "a",
    "b",
    "source",
    undefined,
    undefined,
  );
  const rejected = transferWires(
    graph,
    "a",
    "b",
    "source",
    undefined,
    undefined,
    (e) => e.target !== "y",
  );
  const split = splitEdge(
    graph,
    edges[0]!,
    n("middle"),
    { allow: (e) => e.source !== "middle" },
  );
  return check(
    isOk(moved) &&
      moved.content.edges.every(
        (e, i) =>
          e.id === edges[i]?.id &&
          e.source === "b",
      ) &&
      !isOk(rejected) &&
      split === graph &&
      graph.edges === edges,
    toBe(true),
  );
});

test("audit reports one shared capacity failure and individual incompatible wires", () => {
  const graph: Graph = {
    nodes: [
      {
        ...n("a"),
        connectable: false,
        ports: [
          {
            direction: "source",
            id: "out",
            payload: "image",
            capacity: 1,
          },
        ],
      },
      {
        ...n("b"),
        ports: [
          {
            direction: "target",
            id: "in",
            payload: "text",
          },
        ],
      },
      n("c"),
    ],
    edges: [
      {
        source: "a",
        sourceHandle: "out",
        target: "b",
        targetHandle: "in",
      },
      {
        source: "a",
        sourceHandle: "out",
        target: "c",
      },
    ],
  };
  const issues = auditPortContracts(graph);
  return check(
    issues.length === 2 &&
      issues[0]?.edges[0] === graph.edges[0] &&
      issues[1]?.edges.length === 2 &&
      issues[1].port.id === "out",
    toBe(true),
  );
});

test("typed auto-wiring skips ambiguous and occupied inputs, observes output capacity", () => {
  const graph: Graph = {
    nodes: [
      {
        ...n("src"),
        ports: [
          {
            id: "image",
            direction: "source",
            payload: "image",
            capacity: 1,
          },
          {
            id: "txt",
            direction: "source",
            payload: "text",
          },
          {
            id: "alt",
            direction: "source",
            payload: "text",
          },
        ],
      },
      ...["a", "b"].map((id) => ({
        ...n(id),
        ports: [
          {
            id: "pic",
            direction: "target",
            payload: "image",
          },
          {
            id: "caption",
            direction: "target",
            payload: "text",
          },
        ] satisfies Port[],
      })),
    ],
    edges: [
      {
        source: "a",
        target: "b",
        targetHandle: "caption",
      },
    ],
  };
  const result = matchTypedPorts(graph, "src", [
    "a",
    "b",
  ]);
  return check(
    result.graph.edges.length === 2 &&
      result.ambiguous === 1 &&
      result.graph.edges[1]?.sourceHandle ===
        "image" &&
      result.graph.edges[1]?.target === "a" &&
      matchTypedPorts(result.graph, "src", [
        "a",
        "b",
      ]).graph === result.graph,
    toBe(true),
  );
});

import { factorFanout } from "plgg-flow/index";
test("factoring a fanout retains branch identities and rejects an invalid shared input atomically", () => {
  const g: Graph = {
    nodes: ["a", "b", "c", "other"].map(n),
    edges: ["b", "c", "other"].map((target) => ({
      source: "a",
      target,
      id: target,
    })),
  };
  const result = factorFanout(
    g,
    "a",
    ["b", "c"],
    "processor",
  );
  return check(
    isOk(result) &&
      result.content.nodes.length === 5 &&
      result.content.edges[0]?.id === "b" &&
      result.content.edges[0]?.source ===
        "process" &&
      result.content.edges[2] === g.edges[2] &&
      result.content.edges[3]?.target ===
        "process" &&
      !isOk(
        factorFanout(
          g,
          "a",
          ["b", "c"],
          "processor",
          () => false,
        ),
      ),
    toBe(true),
  );
});

import { inventoryTypes } from "plgg-flow/connections";
test("type inventory groups reordered sockets together and distinguishes changed limits", () => {
  const ports: Port[] = [
    { id: "a", direction: "source", capacity: 0 },
    {
      id: "b",
      direction: "target",
      payload: "text",
    },
  ];
  const graph: Graph = {
    nodes: [
      { ...n("one"), type: "worker", ports },
      {
        ...n("two"),
        type: "worker",
        ports: [...ports].reverse(),
      },
      {
        ...n("three"),
        type: "worker",
        ports: [
          {
            id: "a",
            direction: "source",
            capacity: 1,
          },
          ports[1]!,
        ],
      },
      { ...n("g"), group: true },
    ],
    edges: [],
  };
  const [worker, group] = inventoryTypes(graph);
  return check(
    worker?.count === 3 &&
      worker.definitions.length === 2 &&
      worker.definitions[0]?.members.join(",") ===
        "one,two" &&
      group?.type === "group",
    toBe(true),
  );
});

test("port consolidation preserves wire identity and rejects duplicate connections atomically", () => {
  const from: Port = {
    id: "no",
    direction: "source",
  };
  const rejected = mergePorts(
    graph,
    "a",
    from,
    "yes",
  );
  const single = { ...graph, edges: [second] };
  const merged = mergePorts(
    single,
    "a",
    from,
    "yes",
  );
  return check(
    !isOk(rejected) &&
      graph.edges[1] === second &&
      isOk(merged) &&
      merged.content.edges[0]?.id === "out2" &&
      merged.content.edges[0]?.sourceHandle ===
        "yes" &&
      !merged.content.nodes[0]?.ports?.some(
        (p) => p.id === "no",
      ),
    toBe(true),
  );
});

test("nested one-way boundaries check all crossed groups, preserve internal connections and roundtrip", () => {
  const g = {
    nodes: [
      {
        ...n("group"),
        boundary: "inbound" as const,
      },
      {
        ...n("inner"),
        parent: "group",
        boundary: "outbound" as const,
      },
      { ...n("a"), parent: "inner" },
      { ...n("b"), parent: "inner" },
      { ...n("c"), parent: "group" },
      n("outside"),
    ],
    edges: [],
  };
  const loaded = loadDrawing(
    saveDrawing(createFlow(g)),
  );
  if (!isOk(loaded))
    return check(false, toBe(true));
  const allowed = (
    source: string,
    target: string,
  ) =>
    isOk(
      connectBatch(loaded.content, [
        { source, target },
      ]),
    );
  return check(
    allowed("a", "b") &&
      allowed("a", "c") &&
      allowed("outside", "c") &&
      !allowed("a", "outside") &&
      !allowed("outside", "a"),
    toBe(true),
  );
});

test("boundary audit lists every violated nested group on preexisting edges", () => {
  const edge = {
    source: "outside",
    target: "inner",
  };
  const g = {
    nodes: [
      n("outside"),
      {
        ...n("root"),
        boundary: "closed" as const,
      },
      {
        ...n("inner"),
        parent: "root",
        boundary: "outbound" as const,
      },
    ],
    edges: [
      edge,
      { source: "root", target: "outside" },
    ],
  };
  const hits = auditBoundaries(g);
  return check(
    hits.length === 3 &&
      hits[0]?.edge === edge &&
      hits[1]?.group.id === "inner" &&
      hits[2]?.group.id === "root",
    toBe(true),
  );
});

test("port pair inventory counts parallel default and named wires separately in one direction", () => {
  const edges = [
    first,
    { ...first, id: "duplicate" },
    second,
    { source: "a", target: "b" },
    { source: "b", target: "a" },
  ];
  const rows = portPairCounts(
    { ...graph, edges },
    "a",
    "b",
  );
  return check(
    rows.length === 3 &&
      rows[0]?.count === 2 &&
      rows[2]?.output === undefined &&
      rows[2]?.count === 1,
    toBe(true),
  );
});

test("materialized ports infer only unanimous explicit payloads and preserve declared capacity", () => {
  const g: Graph = {
    nodes: [
      {
        ...n("a"),
        ports: [
          {
            direction: "source",
            id: "out",
            capacity: 4,
          },
        ],
      },
      {
        ...n("b"),
        ports: [
          {
            direction: "target",
            id: "in",
            payload: "text",
          },
        ],
      },
      n("c"),
    ],
    edges: [
      {
        source: "a",
        sourceHandle: "out",
        target: "b",
        targetHandle: "in",
      },
      {
        source: "a",
        sourceHandle: "mixed",
        target: "b",
        targetHandle: "in",
      },
      {
        source: "a",
        sourceHandle: "mixed",
        target: "c",
      },
    ],
  };
  const p = inferPortContracts(g, ["a"]).nodes[0]
    ?.ports;
  return check(
    p?.length === 2 &&
      p[0]?.capacity === 4 &&
      p[0]?.payload === "text" &&
      p[1]?.id === "mixed" &&
      p[1]?.payload === undefined,
    toBe(true),
  );
});

test("type dependency policy can gate new connections, audit existing ones and refresh after retyping", () => {
  const g = {
    nodes: [
      { ...n("a"), type: "ui" },
      { ...n("b"), type: "storage" },
    ],
    edges: [],
  };
  const p = typeDependencyPolicy({
      ui: ["service"],
      storage: [],
    }),
    edge = { source: "a", target: "b" };
  if (!isOk(p)) return check(false, toBe(true));
  const fixed = {
    ...g,
    nodes: [
      g.nodes[0]!,
      { ...n("b"), type: "service" },
    ],
  };
  return check(
    !isOk(connectBatch(g, [edge], p.content)) &&
      isOk(
        connectBatch(fixed, [edge], p.content),
      ) &&
      !isOk(typeDependencyPolicy({ ui: "any" })),
    toBe(true),
  );
});

test("reordering handles retains contracts, inferred endpoints and parallel edge identity", () => {
  const g: Graph = {
    ...graph,
    nodes: graph.nodes.map((n) =>
      n.id === "a"
        ? {
            ...n,
            ports: [
              {
                id: "yes",
                direction: "source",
                payload: "text",
                capacity: 5,
              },
            ],
          }
        : n,
    ),
  };
  const result = orderPorts(g, "a", "source", [
    "no",
    "yes",
  ]);
  return check(
    isOk(result) &&
      result.content.edges === g.edges &&
      result.content.nodes[0]?.ports?.[0]?.id ===
        "no" &&
      result.content.nodes[0]?.ports?.[1]
        ?.capacity === 5 &&
      !isOk(
        orderPorts(g, "a", "source", [
          "yes",
          "yes",
        ]),
      ),
    toBe(true),
  );
});

test("role exchange rewrites both ends of a direct wire and rejects missing matching ports", () => {
  const nodes = ["x", "a", "b", "y"].map(n),
    edges = [
      { id: "one", source: "x", target: "a" },
      { id: "two", source: "a", target: "b" },
      { id: "three", source: "b", target: "y" },
    ];
  const changed = swapWiringRoles(
    { nodes, edges },
    "a",
    "b",
  );
  return check(
    isOk(changed) &&
      changed.content.nodes === nodes &&
      changed.content.edges
        .map((e) => e.source + e.target)
        .join(",") === "xb,ba,ay" &&
      !isOk(
        swapWiringRoles(
          {
            nodes,
            edges: [
              {
                ...edges[0]!,
                targetHandle: "in",
              },
            ],
          },
          "a",
          "b",
        ),
      ),
    toBe(true),
  );
});
