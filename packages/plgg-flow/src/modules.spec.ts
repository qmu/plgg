import { test, check, toBe } from "plgg-test";
import { isErr, isOk } from "plgg";
import {
  createFlow,
  groundSide,
  viewAt,
  type FlowNode,
} from "plgg-flow/index";
import {
  subtree,
  reparent,
  moveBranch,
  dissolve,
  visibleScene,
  foldGroup,
  rerootGroup,
  interfaceCover,
  groupTotals,
  groupLoads,
  commonContainer,
  ownershipPath,
  settingImpact,
  inheritedData,
  boundaryConnections,
  detachBoundary,
  summarizeBranches,
  fitContainer,
  swapBranches,
  adoptByBounds,
  hoistSetting,
  reparentWithSettings,
  groupSerialRuns,
  partitionCards,
  groupByAttribute,
  moveExpandingParents,
  revealNode,
} from "plgg-flow/hierarchy";
import {
  arrangeHierarchy,
  swimlaneLayout,
  packComponents,
  orderByNeighbors,
  relaxWiring,
  removeOverlaps,
  transferLayout,
  depthLayers,
} from "plgg-flow/layout";
import {
  components,
  shortestPath,
  minimumWireCut,
  feedbackEdges,
  mandatoryRoute,
  routeCorridor,
  alternativeWiring,
  commonOrigins,
} from "plgg-flow/topology";
import {
  dependenciesFromField,
  hierarchyFromField,
  nodeInventoryCsv,
  saveStructuralCopy,
  saveDrawing,
  loadDrawing,
  importReactFlow,
} from "plgg-flow/interchange";
import {
  paste,
  extractModule,
  extract,
  replaceNodeType,
  distribute,
  patchNodeData,
  formatNodeLabels,
  joinNodeData,
  migrateDataKeys,
  reduceTransitive,
} from "plgg-flow/edits";
const node = (
  id: string,
  parent?: string,
): FlowNode => ({
  id,
  label: id,
  position: { x: 0, y: 0, z: 7 },
  ...(parent ? { parent } : {}),
});
const graph = {
  nodes: [
    node("child", "mid"),
    node("other"),
    node("root"),
    node("mid", "root"),
  ],
  edges: [{ source: "child", target: "other" }],
};
test("nesting preserves descendants through movement, fold and dissolution", () => {
  const members = subtree(graph.nodes, ["root"]),
    moved = moveBranch(
      graph.nodes,
      ["mid", "root"],
      { x: 9, y: 2, z: 1 },
    );
  const folded = visibleScene(
    foldGroup(foldGroup(graph, "mid"), "root"),
  );
  return check(
    members.size === 3 &&
      moved.find((n) => n.id === "child")
        ?.position.x === 9 &&
      folded.nodes.length === 2 &&
      folded.edges[0]?.edge.source === "root" &&
      folded.edges[0]?.original ===
        graph.edges[0] &&
      reparent(graph, "root", "child") ===
        graph &&
      dissolve(graph, "mid").nodes.find(
        (n) => n.id === "child",
      )?.parent === "root",
    toBe(true),
  );
});
test("layout preserves branch offsets and works across a feedback component", () => {
  const arranged = arrangeHierarchy(graph);
  const a = arranged.nodes.find(
      (n) => n.id === "root",
    ),
    b = arranged.nodes.find(
      (n) => n.id === "child",
    );
  const loop = {
    nodes: ["A", "B", "C"].map((id) => node(id)),
    edges: [
      { source: "A", target: "B" },
      { source: "B", target: "A" },
      { source: "B", target: "C" },
    ],
  };
  const tiers = depthLayers(loop);
  return check(
    a?.position.x === b?.position.x &&
      components(loop).length === 2 &&
      tiers.nodes[2]?.position.z === 110 &&
      shortestPath(loop, "A", "C").join("") ===
        "ABC",
    toBe(true),
  );
});
test("partial clipboard remaps nested ids and drops external links", () => {
  const fragment = extract(graph, ["mid"]),
    pasted = paste(graph, fragment, {
      x: 20,
      y: 0,
      z: 0,
    });
  return check(
    fragment.nodes.length === 2 &&
      fragment.edges.length === 0 &&
      pasted.nodes.find(
        (n) => n.id === "child (2)",
      )?.parent === "mid (2)" &&
      pasted.nodes.find((n) => n.id === "mid (2)")
        ?.parent === undefined,
    toBe(true),
  );
});
test("reduce redundant edges without destroying reachability", () => {
  const g = {
    nodes: ["a", "b", "c"].map((id) => node(id)),
    edges: [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "a", target: "c" },
    ],
  };
  const reduced = reduceTransitive(g);
  return check(
    reduced.edges.length === 2 &&
      shortestPath(reduced, "a", "c").length ===
        3,
    toBe(true),
  );
});
test("drawing exchange rejects invalid references and camera values", () => {
  const f = createFlow(graph),
    saved = saveDrawing(f),
    r = loadDrawing(saved);
  return check(
    isOk(r) &&
      r.content.nodes.length === 4 &&
      isErr(
        loadDrawing(
          saved.replace(
            '"parent":"mid"',
            '"parent":"child"',
          ),
        ),
      ) &&
      isErr(
        loadDrawing(
          saved.replace(
            '"scale":1',
            '"scale":-1',
          ),
        ),
      ) &&
      isErr(loadDrawing('{"nodes":[]}')),
    toBe(true),
  );
});
test("React Flow import resolves unordered relative coordinates and reports custom fields", () => {
  const r = importReactFlow(
    JSON.stringify({
      nodes: [
        {
          id: "c",
          parentId: "p",
          position: { x: 4, y: 6 },
          data: { label: "<script>", foo: 1 },
        },
        {
          id: "p",
          type: "group",
          position: { x: 100, y: 200 },
          data: { label: "group" },
        },
      ],
      edges: [
        { id: "e", source: "c", target: "p" },
      ],
      viewport: { x: 0, y: 0, zoom: 2 },
    }),
  );
  return check(
    isOk(r) &&
      r.content.drawing.nodes[0]?.position.x ===
        156 &&
      r.content.drawing.nodes[0]?.position.y ===
        224 &&
      r.content.drawing.nodes[0]?.label ===
        "<script>" &&
      r.content.drawing.nodes[0]?.data?.foo === 1,
    toBe(true),
  );
});
test("ground indicator follows the eye crossing the actual plane", () => {
  const f = createFlow(graph);
  return check(
    groundSide(f.camera) === "above" &&
      groundSide(
        viewAt(0, (101 * Math.PI) / 180)(f)
          .camera,
      ) === "level" &&
      groundSide(viewAt(0, Math.PI)(f).camera) ===
        "below",
    toBe(true),
  );
});

test("swimlanes reserve descendant bounds and preserve outside nodes and depth", () => {
  const parent = node("team"),
    a = {
      ...node("a", "team"),
      data: { role: "dev" },
    },
    child = {
      ...node("child", "a"),
      position: { x: 10, y: 90, z: 43 },
    },
    b = {
      ...node("b", "team"),
      data: { role: "dev" },
    },
    c = {
      ...node("c", "team"),
      data: { role: "review" },
    };
  const g = {
    nodes: [parent, a, child, b, c],
    edges: [{ source: "child", target: "b" }],
  };
  const result = swimlaneLayout(
    g,
    "role",
    "team",
  );
  const [outer, first, inner, next, review] =
    result.nodes;
  return check(
    outer === parent &&
      !!first &&
      !!inner &&
      !!next &&
      !!review &&
      next.position.x > first.position.x &&
      next.position.y === first.position.y &&
      review.position.y > inner.position.y + 36 &&
      inner.position.y - first.position.y ===
        90 &&
      inner.position.z === 43 &&
      result.edges === g.edges,
    toBe(true),
  );
});

test("revealing a deep selection opens only its ancestors", () => {
  const g = {
    ...graph,
    nodes: graph.nodes.map((n) => ({
      ...n,
      collapsed: true,
      hidden: true,
    })),
  };
  const open = revealNode(g, "child");
  return check(
    ownershipPath(open.nodes, "child")
      .map((n) => n.id)
      .join("/") === "root/mid/child" &&
      open.nodes.every((n) =>
        n.id === "other"
          ? n.hidden && n.collapsed
          : !n.hidden &&
            Boolean(n.collapsed) ===
              (n.id === "child"),
      ) &&
      revealNode(open, "child") === open &&
      ownershipPath(
        [node("a", "b"), node("b", "a")],
        "a",
      ).length === 2,
    toBe(true),
  );
});

test("fit container includes nested card extents and leaves child world coordinates intact", () => {
  const child = {
    ...node("child", "mid"),
    position: { x: 100, y: 80, z: 51 },
    width: 80,
    height: 40,
  };
  const g = {
    nodes: [
      node("root"),
      node("mid", "root"),
      child,
      node("outside"),
    ],
    edges: [],
  };
  const result = fitContainer(g, "root", 10),
    root = result.nodes[0];
  return check(
    root?.width === 212 &&
      root.height === 138 &&
      root.position.x === 44 &&
      root.position.y === 41 &&
      root.position.z === 7 &&
      result.nodes[2] === child &&
      result.nodes[3] === g.nodes[3] &&
      fitContainer(result, "root", 10) === result,
    toBe(true),
  );
});

test("parent expansion propagates through opted-in ancestors while siblings stay put", () => {
  const root = {
      ...node("outer"),
      width: 160,
      height: 120,
    },
    group = {
      ...node("inner", "outer"),
      width: 120,
      height: 80,
      expandParent: true,
    },
    child = {
      ...node("leaf", "inner"),
      width: 40,
      height: 20,
      expandParent: true,
    },
    sibling = node("peer", "inner");
  const moved = moveExpandingParents(
    [root, group, child, sibling],
    ["leaf"],
    { x: 150, y: 0, z: 20 },
  );
  return check(
    moved[0]?.width === 250 &&
      moved[1]?.width === 230 &&
      moved[2]?.position.z === 27 &&
      moved[3] === sibling,
    toBe(true),
  );
});

test("boundary inspection keeps parallel handles and ignores internal links after folding", () => {
  const edges = [
    {
      source: "other",
      sourceHandle: "out",
      target: "child",
      targetHandle: "in",
    },
    {
      source: "child",
      target: "other",
      sourceHandle: "yes",
    },
    {
      source: "child",
      target: "other",
      sourceHandle: "no",
    },
    { source: "mid", target: "child" },
  ];
  const g = { ...graph, edges },
    folded = {
      ...g,
      nodes: g.nodes.map((n) => ({
        ...n,
        collapsed: true,
      })),
    };
  const { inputs, outputs } = boundaryConnections(
    folded,
    ["root", "mid"],
  );
  return check(
    inputs.length === 1 &&
      inputs[0] === edges[0] &&
      outputs.length === 2 &&
      outputs[0] === edges[1] &&
      outputs[1] === edges[2] &&
      !boundaryConnections(g, ["root", "other"])
        .inputs.length,
    toBe(true),
  );
});

test("type replacement keeps the nested node identity, geometry, and port wiring", () => {
  const child = {
    ...node("child", "mid"),
    type: "old",
    data: { obsolete: true },
  };
  const g = {
    ...graph,
    nodes: [child, ...graph.nodes.slice(1)],
  };
  const result = replaceNodeType(
    g,
    ["child"],
    "processor",
    { gain: 3 },
  );
  const n = isOk(result)
    ? result.content.nodes[0]
    : undefined;
  return check(
    isOk(result) &&
      n?.type === "processor" &&
      n.data?.gain === 3 &&
      n.data?.obsolete === undefined &&
      n.position === child.position &&
      n.id === child.id &&
      n.parent === child.parent &&
      result.content.edges === g.edges &&
      isErr(
        replaceNodeType(
          g,
          ["child", "missing"],
          "processor",
          {},
        ),
      ),
    toBe(true),
  );
});

test("isolating a collapsed branch preserves original wires, node flags and edit identities", () => {
  const g = {
    nodes: graph.nodes.map((n) =>
      n.id === "root"
        ? { ...n, collapsed: true }
        : n,
    ),
    edges: [
      ...graph.edges,
      { source: "mid", target: "child" },
    ],
  };
  const scene = visibleScene(g, "root");
  return check(
    scene.nodes.length === 3 &&
      scene.nodes.some((n) => n.id === "child") &&
      scene.edges.length === 1 &&
      scene.edges[0]?.original === g.edges[1] &&
      visibleScene(g).nodes.length === 2,
    toBe(true),
  );
});

test("swapping branches carries internal bends while boundary wires and unrelated nodes stay in place", () => {
  const b = {
      ...node("b"),
      position: { x: 115, y: -30, z: 60 },
    },
    a = node("a"),
    child = node("child", "a"),
    outside = node("outside");
  const bend = { x: 12, y: 22, z: 40 },
    inside = {
      source: "a",
      target: "child",
      waypoints: [bend],
    },
    boundary = {
      source: "child",
      target: "outside",
      waypoints: [bend],
    };
  const g = {
      nodes: [a, b, child, outside],
      edges: [inside, boundary],
    },
    next = swapBranches(g, "a", "b");
  return check(
    next.nodes[0]?.position.z === 60 &&
      next.nodes[1]?.position.z === 7 &&
      next.nodes[2]?.position.x === 115 &&
      next.nodes[3] === outside &&
      next.edges[0]?.waypoints?.[0]?.z === 93 &&
      next.edges[1] === boundary &&
      swapBranches(g, "a", "child") === g,
    toBe(true),
  );
});

test("route corridor includes unequal detours and feedback but excludes dead ends", () => {
  const g = {
    nodes: [
      "s",
      "a",
      "b",
      "c",
      "t",
      "dead",
      "prior",
    ].map((id) => node(id)),
    edges: [
      ["s", "t"],
      ["s", "a"],
      ["a", "b"],
      ["b", "c"],
      ["c", "b"],
      ["b", "t"],
      ["a", "dead"],
      ["prior", "t"],
    ].map(([source = "", target = ""]) => ({
      source,
      target,
    })),
  };
  return check(
    routeCorridor(g, "s", "t").join(",") ===
      "s,a,b,c,t" &&
      !routeCorridor(g, "t", "s").length,
    toBe(true),
  );
});

test("common upstream frontier retains independent origins and entire feedback groups", () => {
  const g = {
    nodes: [
      "old",
      "p",
      "q",
      "r",
      "a",
      "b",
      "other",
    ].map((id) => node(id)),
    edges: [
      ["old", "p"],
      ["p", "q"],
      ["q", "p"],
      ["q", "a"],
      ["p", "b"],
      ["r", "a"],
      ["r", "b"],
    ].map(([source = "", target = ""]) => ({
      source,
      target,
    })),
  };
  return check(
    commonOrigins(g, "a", "b").join(",") ===
      "p,q,r" &&
      !commonOrigins(g, "a", "other").length,
    toBe(true),
  );
});

test("component packing respects pinned islands, ownership, bend bounds and depth", () => {
  const locked = { ...node("pin"), locked: true },
    edge = {
      source: "a",
      target: "b",
      waypoints: [{ x: 280, y: -10, z: 13 }],
    };
  const g = {
      nodes: [
        locked,
        node("a"),
        node("b"),
        node("child", "a"),
        node("q"),
      ],
      edges: [edge],
    },
    p = packComponents(g, 180, 10);
  const [pin, a, b, child, q] = p.nodes;
  return check(
    pin === locked &&
      !!a &&
      !!b &&
      !!child &&
      !!q &&
      b.position.x === a.position.x &&
      child.position.y === a.position.y &&
      q.position.y > a.position.y + 36 &&
      p.edges[0]?.waypoints?.[0]?.x ===
        a.position.x + 280 &&
      p.edges[0]?.waypoints?.[0]?.z === 13,
    toBe(true),
  );
});

test("data patches preserve individual settings, replace arrays and handle literal property names", () => {
  const g = {
    nodes: [
      {
        ...node("a"),
        data: {
          options: { left: 1, old: true },
          items: [9],
        },
      },
      {
        ...node("b"),
        data: { options: { right: 2 } },
      },
      node("other"),
    ],
    edges: [],
  };
  const result = patchNodeData(
    g,
    ["a", "b"],
    JSON.parse(
      '{"options":{"old":null,"gain":3},"items":[1,2],"__proto__":{"tag":1}}',
    ),
  );
  if (isErr(result))
    return check(false, toBe(true));
  const first = result.content.nodes[0]?.data,
    second = result.content.nodes[1]?.data;
  return check(
    JSON.stringify(first?.options) ===
      '{"left":1,"gain":3}' &&
      JSON.stringify(second?.options) ===
        '{"right":2,"gain":3}' &&
      JSON.stringify(first?.items) === "[1,2]" &&
      !!first &&
      Object.prototype.hasOwnProperty.call(
        first,
        "__proto__",
      ) &&
      Object.getPrototypeOf(first) ===
        Object.prototype &&
      result.content.nodes[2] === g.nodes[2],
    toBe(true),
  );
});

test("layout transfer matches IDs across revisions without replacing graph content", () => {
  const a = { ...node("a"), label: "updated" },
    b = { ...node("b"), locked: true };
  const graph = {
    nodes: [a, b, node("new")],
    edges: [{ source: "a", target: "new" }],
  };
  const reference = {
    nodes: [
      node("deleted"),
      {
        ...b,
        position: { x: 500, y: 10, z: 50 },
      },
      {
        ...a,
        label: "old",
        position: { x: 20, y: -40, z: 100 },
      },
    ],
    edges: [],
  };
  const updated = transferLayout(
    graph,
    reference,
  );
  return check(
    updated.nodes[0]?.position.z === 100 &&
      updated.nodes[0]?.label === "updated" &&
      updated.nodes[1] === b &&
      updated.nodes[2] === graph.nodes[2] &&
      updated.edges === graph.edges &&
      transferLayout(updated, reference) ===
        updated,
    toBe(true),
  );
});

import { matchesData } from "plgg-flow/metadata";
test("data matching combines nested predicates without coercion or inherited keys", () => {
  const data = {
    owner: "a",
    nested: { count: 3, other: true },
    rows: [1, 2],
    optional: null,
  };
  return check(
    matchesData(data, {
      nested: { count: 3 },
      rows: [1, 2],
    }) &&
      !matchesData(data, {
        nested: { count: "3" },
      }) &&
      !matchesData(data, { rows: [2, 1] }) &&
      !matchesData(data, { missing: null }) &&
      matchesData(data, { optional: null }) &&
      !matchesData(
        {},
        JSON.parse('{"__proto__":{}}'),
      ),
    toBe(true),
  );
});

test("quotient drawing rolls up nested endpoints and keeps opposite directions separate", () => {
  const graph = {
    nodes: [
      node("g"),
      node("a", "g"),
      node("b", "a"),
      node("h"),
      node("c", "h"),
    ],
    edges: [
      { source: "a", target: "b" },
      { source: "a", target: "c" },
      { source: "b", target: "h" },
      { source: "c", target: "b" },
    ],
  };
  const summary = summarizeBranches(graph);
  return check(
    summary.nodes.map((n) => n.id).join(",") ===
      "g,h" &&
      summary.edges.length === 2 &&
      summary.edges[0]?.data?.count === 2 &&
      summary.edges[1]?.source === "h" &&
      summary.edges[1].data?.count === 1 &&
      summarizeBranches(graph, "g").edges
        .length === 0,
    toBe(true),
  );
});

test("geometric adoption checks the whole branch and rejects its own containers", () => {
  const outer = {
      ...node("outer"),
      group: true,
      width: 600,
      height: 400,
    },
    inner = {
      ...node("inner", "outer"),
      group: true,
      width: 180,
      height: 100,
    },
    root = node("branch"),
    child = {
      ...node("child", "branch"),
      group: true,
      width: 110,
      height: 40,
    };
  const g = {
      nodes: [outer, inner, root, child],
      edges: [],
    },
    chosen = adoptByBounds(g, "branch");
  const shifted = {
    ...child,
    position: { x: 140, y: 0, z: 7 },
  };
  const larger = adoptByBounds(
    {
      ...g,
      nodes: [outer, inner, root, shifted],
    },
    "branch",
  );
  return check(
    chosen.nodes[2]?.parent === "inner" &&
      chosen.nodes[2]?.position ===
        root.position &&
      chosen.nodes[3] === child &&
      larger.nodes[2]?.parent === "outer" &&
      adoptByBounds(chosen, "branch") === chosen,
    toBe(true),
  );
});

test("detaching multiple branches keeps connections between them and elsewhere", () => {
  const nodes = [
    node("g"),
    node("a", "g"),
    node("h"),
    node("b", "h"),
    node("x"),
    node("y"),
  ];
  const internal = { source: "a", target: "b" },
    outside = { source: "x", target: "y" };
  const g = {
    nodes,
    edges: [
      internal,
      { source: "a", target: "x" },
      { source: "y", target: "b" },
      outside,
    ],
  };
  const detached = detachBoundary(g, ["g", "h"]);
  return check(
    detached.nodes === nodes &&
      detached.edges.length === 2 &&
      detached.edges[0] === internal &&
      detached.edges[1] === outside &&
      detachBoundary(detached, ["g", "h"]) ===
        detached,
    toBe(true),
  );
});

import { bridgeEdges } from "plgg-flow/analysis";
test("bridge detection retains a sole inter-region wire, excluding cycles, loops and parallel wires", () => {
  const g = {
    nodes: ["a", "b", "c", "d", "e"].map((id) =>
      node(id),
    ),
    edges: [
      ["a", "b"],
      ["b", "c"],
      ["c", "a"],
      ["c", "d"],
      ["e", "d"],
      ["d", "e"],
      ["e", "e"],
    ].map(([source = "", target = ""]) => ({
      source,
      target,
    })),
  };
  const bridges = bridgeEdges(g);
  return check(
    bridges.length === 1 &&
      bridges[0] === g.edges[3],
    toBe(true),
  );
});

test("alternative wiring excludes only the inspected wire and preserves direction and handles", () => {
  const edge = {
      id: "direct",
      source: "a",
      target: "b",
    },
    parallel = {
      ...edge,
      id: "parallel",
      targetHandle: "backup",
    };
  const path = [
      { source: "a", target: "c" },
      { source: "c", target: "b" },
    ],
    g = {
      nodes: ["a", "b", "c"].map((id) =>
        node(id),
      ),
      edges: [edge, ...path, parallel],
    };
  return check(
    alternativeWiring(g, edge)[0] === parallel &&
      alternativeWiring(
        { ...g, edges: [edge, ...path] },
        edge,
      )[1] === path[1] &&
      !alternativeWiring(
        {
          ...g,
          edges: [
            edge,
            { source: "b", target: "a" },
          ],
        },
        edge,
      ).length,
    toBe(true),
  );
});

test("attribute grouping preserves sibling scope, typed keys, nested coordinates and wiring", () => {
  const g = {
    nodes: [
      node("parent"),
      {
        ...node("a", "parent"),
        data: { owner: 1 },
      },
      {
        ...node("b", "parent"),
        data: { owner: 1 },
      },
      {
        ...node("c", "parent"),
        data: { owner: "1" },
      },
      node("sub", "a"),
      { ...node("outside"), data: { owner: 1 } },
    ],
    edges: [{ source: "sub", target: "outside" }],
  };
  const result = groupByAttribute(
      g,
      "owner",
      "parent",
    ),
    frame = result.nodes[6];
  return check(
    result.nodes.length === 7 &&
      !!frame &&
      frame.parent === "parent" &&
      result.nodes[1]?.parent === frame.id &&
      result.nodes[2]?.parent === frame.id &&
      result.nodes[1]?.position ===
        g.nodes[1]?.position &&
      result.nodes[3] === g.nodes[3] &&
      result.nodes[4] === g.nodes[4] &&
      result.edges === g.edges &&
      groupByAttribute(
        result,
        "owner",
        "parent",
      ) === result,
    toBe(true),
  );
});

test("equal clearance uses card extents and leaves locked interior anchors fixed", () => {
  const g = {
    nodes: [0, 15, 100, 130, 300].map((x, i) => ({
      ...node(String(i)),
      width: [20, 40, 20, 60, 20][i] ?? 20,
      position: { x, y: 2, z: 7 },
      locked: i === 2,
    })),
    edges: [],
  };
  const result = distribute(
    g,
    g.nodes.map((n) => n.id),
    "x",
    "gaps",
  );
  const [a, b, c, d, e] = result.nodes;
  return check(
    !!a &&
      !!b &&
      !!c &&
      !!d &&
      !!e &&
      b.position.x === 50 &&
      d.position.x === 200 &&
      a === g.nodes[0] &&
      c === g.nodes[2] &&
      e === g.nodes[4],
    toBe(true),
  );
});

import { cheapestRoute } from "plgg-flow/analysis";
test("weighted route chooses inexpensive parallel edges and handles zero-cost cycles", () => {
  const g = {
    nodes: ["a", "b", "c"].map((id) => node(id)),
    edges: [
      {
        source: "a",
        target: "c",
        data: { cost: 10 },
      },
      {
        source: "a",
        target: "b",
        data: { cost: 3 },
      },
      {
        source: "a",
        target: "b",
        data: { cost: 0 },
      },
      {
        source: "b",
        target: "a",
        data: { cost: 0 },
      },
      { source: "b", target: "c" },
    ],
  };
  const path = cheapestRoute(g, "a", "c");
  return check(
    isOk(path) &&
      path.content.cost === 1 &&
      path.content.edges[0] === g.edges[2] &&
      path.content.edges[1] === g.edges[4] &&
      isErr(cheapestRoute(g, "c", "a")),
    toBe(true),
  );
});

test("schema migration supports simultaneous swaps and rejects late collisions", () => {
  const nested = { gain: 2 },
    g = {
      nodes: [
        { ...node("a"), data: { old: nested } },
        {
          ...node("b"),
          data: { old: null, new: false },
        },
      ],
      edges: [],
    };
  const rejected = migrateDataKeys(
    g,
    ["a", "b"],
    { old: "new" },
  );
  const result = migrateDataKeys(g, ["a", "b"], {
    old: "new",
    new: "old",
  });
  return check(
    isErr(rejected) &&
      g.nodes[0]?.data.old === nested &&
      isOk(result) &&
      result.content.nodes[0]?.data?.new ===
        nested &&
      result.content.nodes[1]?.data?.old ===
        false &&
      result.content.nodes[1]?.data?.new === null,
    toBe(true),
  );
});

import {
  compareCardData,
  auditNodeData,
} from "plgg-flow/metadata";
test("per-type requirements distinguish null, arrays, wrong scalars and missing own properties", () => {
  const g = {
    nodes: [
      {
        ...node("w"),
        type: "worker",
        data: {
          tags: [],
          setting: null,
          count: "2",
        },
      },
      node("other"),
    ],
    edges: [],
  };
  const audit = auditNodeData(g, {
    worker: {
      tags: "array",
      setting: "null",
      count: "number",
      constructor: "string",
    },
  });
  return check(
    isOk(audit) &&
      audit.content.length === 2 &&
      audit.content.every((x) =>
        x.startsWith("w ·"),
      ) &&
      isErr(
        auditNodeData(g, {
          worker: { count: "unknown" },
        }),
      ),
    toBe(true),
  );
});

test("spring layout moves selected leaves toward world-space edge length with fixed endpoints", () => {
  const anchor = { ...node("a"), locked: true },
    leaf = {
      ...node("b"),
      position: { x: 0, y: 0, z: 507 },
    };
  const drawing = {
    nodes: [anchor, leaf],
    edges: [{ source: "a", target: "b" }],
  };
  const result = relaxWiring(
    drawing,
    ["a", "b"],
    100,
  );
  return check(
    result.nodes[0] === anchor &&
      result.nodes[1]!.position.x === 0 &&
      Math.abs(
        result.nodes[1]!.position.z - 107,
      ) < 0.01,
    toBe(true),
  );
});

test("inherited application fields resolve overrides including null and follow reparenting", () => {
  const drawing = {
    nodes: [
      {
        ...node("root"),
        data: { region: "east", mode: "shared" },
      },
      {
        ...node("mid", "root"),
        data: { mode: false },
      },
      {
        ...node("child", "mid"),
        data: { label: null },
      },
      {
        ...node("west"),
        data: { region: "west" },
      },
    ],
    edges: [],
  };
  const fields = inheritedData(drawing, "child");
  const moved = inheritedData(
    {
      ...drawing,
      nodes: drawing.nodes.map((n) =>
        n.id === "mid"
          ? { ...n, parent: "west" }
          : n,
      ),
    },
    "child",
  );
  return check(
    fields.get("region")?.owner === "root" &&
      fields.get("mode")?.value === false &&
      fields.get("label")?.value === null &&
      moved.get("region")?.value === "west",
    toBe(true),
  );
});

test("branch export shares boundary terminals while retaining nested endpoints and named wires", () => {
  const g = {
    ...graph,
    edges: [
      ...graph.edges,
      {
        source: "other",
        target: "mid",
        sourceHandle: "out",
      },
    ],
  };
  const branch = extractModule(g, ["mid"]);
  const terminal = branch.nodes.find(
    (n) => n.type === "terminal",
  );
  return check(
    !!terminal &&
      branch.nodes.length === 3 &&
      branch.nodes.find((n) => n.id === "mid")
        ?.parent === undefined &&
      branch.nodes.find((n) => n.id === "child")
        ?.parent === "mid" &&
      branch.edges[0]?.target === terminal.id &&
      branch.edges[1]?.source === terminal.id &&
      branch.edges[1]?.sourceHandle === "out",
    toBe(true),
  );
});

test("neighbor ordering removes an inverted pair without moving unrelated cards or depth", () => {
  const card = (
    id: string,
    x: number,
    y: number,
  ) => ({
    ...node(id),
    position: { x, y, z: 9 },
  });
  const g = {
    nodes: [
      card("a", 0, 100),
      card("b", 0, 0),
      card("first", 300, 0),
      card("second", 300, 100),
      card("isolated", 300, 50),
    ],
    edges: [
      { source: "a", target: "first" },
      { source: "b", target: "second" },
    ],
  };
  const result = orderByNeighbors(g, [
    "first",
    "second",
    "isolated",
  ]);
  return check(
    result.nodes[2]?.position.y === 100 &&
      result.nodes[3]?.position.y === 0 &&
      result.nodes[2]?.position.z === 9 &&
      result.nodes[4] === g.nodes[4] &&
      result.edges === g.edges,
    toBe(true),
  );
});

test("common container locates the deepest shared branch and handles disjoint selections", () => {
  const nodes = [
    ...graph.nodes,
    node("sibling", "mid"),
    node("cousin", "root"),
  ];
  return check(
    commonContainer(nodes, ["child", "sibling"])
      ?.id === "mid" &&
      commonContainer(nodes, ["child", "mid"])
        ?.id === "mid" &&
      commonContainer(nodes, [
        "child",
        "cousin",
        "sibling",
      ])?.id === "root" &&
      commonContainer(nodes, [
        "child",
        "other",
      ]) === undefined,
    toBe(true),
  );
});

test("directed dominators exclude optional branches and handle feedback and unreachable predecessors", () => {
  const links = [
    ["s", "a"],
    ["s", "b"],
    ["a", "gate"],
    ["b", "gate"],
    ["gate", "a"],
    ["gate", "end"],
    ["other", "end"],
    ["end", "s"],
  ];
  const g = {
    nodes: [
      "s",
      "a",
      "b",
      "gate",
      "end",
      "other",
    ].map((id) => node(id)),
    edges: links.map(([source, target]) => ({
      source: source!,
      target: target!,
    })),
  };
  return check(
    mandatoryRoute(g, "s", "end").join(",") ===
      "s,gate,end" &&
      mandatoryRoute(g, "s", "other").length ===
        0,
    toBe(true),
  );
});

test("rerooting reverses only the selected group's ancestry in one edit", () => {
  const g = {
    ...graph,
    nodes: [
      ...graph.nodes,
      {
        ...node("inner", "mid"),
        group: true,
        extent: "parent" as const,
      },
      node("branch", "root"),
    ],
  };
  const changed = rerootGroup(g, "inner");
  const path = ownershipPath(
    changed.nodes,
    "branch",
  ).map((n) => n.id);
  return check(
    path.join(",") === "inner,mid,root,branch" &&
      changed.nodes.find((n) => n.id === "inner")
        ?.extent === undefined &&
      changed.nodes[0] === g.nodes[0] &&
      changed.edges === g.edges &&
      changed.nodes.every(
        (n, i) =>
          n.position === g.nodes[i]?.position,
      ),
    toBe(true),
  );
});

test("structural copy includes only allowed scalar data while preserving nesting and wires", () => {
  const drawing = createFlow({
    nodes: graph.nodes.map((n) => ({
      ...n,
      data: {
        category: "public",
        token: "secret",
        nested: { token: "secret" },
      },
    })),
    edges: graph.edges.map((e) => ({
      ...e,
      data: { category: false, token: "secret" },
    })),
  });
  const doc = saveStructuralCopy(drawing, [
    "category",
    "nested",
  ]);
  const restored = loadDrawing(doc);
  return check(
    isOk(restored) &&
      !doc.includes("secret") &&
      !doc.includes("nested") &&
      restored.content.edges[0]?.data
        ?.category === false &&
      restored.content.nodes[0]?.parent ===
        "mid" &&
      drawing.nodes[0]?.data?.token === "secret",
    toBe(true),
  );
});

test("business key join ignores drawing IDs, distinguishes key types and rejects ambiguous matches", () => {
  const g = {
    nodes: [
      {
        ...node("a"),
        data: { sku: 1, local: true },
      },
      { ...node("b"), data: { sku: "1" } },
    ],
    edges: [],
  };
  const donor = {
    nodes: [
      {
        ...node("b"),
        data: { sku: 1, color: "blue" },
      },
    ],
    edges: [],
  };
  const result = joinNodeData(g, donor, "sku"),
    duplicate = joinNodeData(
      g,
      {
        ...donor,
        nodes: [...donor.nodes, ...donor.nodes],
      },
      "sku",
    );
  return check(
    isOk(result) &&
      result.content.nodes[0]?.data?.color ===
        "blue" &&
      result.content.nodes[0]?.data?.local ===
        true &&
      result.content.nodes[1] === g.nodes[1] &&
      isErr(duplicate),
    toBe(true),
  );
});

test("declarative labels preserve scalar types, identities and all-or-nothing behavior", () => {
  const g = {
    nodes: [
      {
        ...node("a"),
        data: { sku: 0, enabled: false },
      },
      { ...node("b"), data: { sku: 2 } },
    ],
    edges: [],
  };
  const result = formatNodeLabels(
    g,
    ["a"],
    "{sku} / {enabled}",
  );
  return check(
    isOk(result) &&
      result.content.nodes[0]?.label ===
        "0 / false" &&
      result.content.nodes[1] === g.nodes[1] &&
      isErr(
        formatNodeLabels(
          g,
          ["a", "b"],
          "{enabled}",
        ),
      ) &&
      g.nodes[0]?.label === "a",
    toBe(true),
  );
});

test("group loads count hidden leaf cards through nested containers and ignore empty groups", () => {
  const nodes = [
    ...graph.nodes,
    { ...node("hidden", "root"), hidden: true },
    { ...node("empty", "mid"), group: true },
  ];
  const loads = new Map(
    groupLoads({ nodes, edges: [] }).map((g) => [
      g.id,
      g.cards,
    ]),
  );
  return check(
    loads.size === 3 &&
      loads.get("root") === 2 &&
      loads.get("mid") === 1 &&
      loads.get("empty") === 0,
    toBe(true),
  );
});

test("capacity partition splits along depth without disturbing preexisting branches or edges", () => {
  const cards = [90, 0, 91, 1, 92].map((z) => ({
    ...node("z" + z, "root"),
    position: { x: 0, y: 0, z },
  }));
  const g = {
    ...graph,
    nodes: [...graph.nodes, ...cards],
  };
  const result = partitionCards(g, "root", 2);
  const parent = (id: string) =>
    result.nodes.find((n) => n.id === id)?.parent;
  return check(
    result.nodes.length === g.nodes.length + 3 &&
      parent("z0") === parent("z1") &&
      parent("z0") !== parent("z90") &&
      parent("mid") === "root" &&
      result.edges === g.edges &&
      partitionCards(result, "root", 2) ===
        result,
    toBe(true),
  );
});

test("CSV inventory quotes multiline fields, guards formula text and keeps signed coordinates numeric", () => {
  const csv = nodeInventoryCsv({
    nodes: [
      {
        ...node("id", "group"),
        label: ' =A1,"quoted"\nline',
        position: { x: -2, y: 3, z: 4 },
      },
    ],
    edges: [],
  });
  return check(
    csv.includes('"\' =A1,""quoted""\nline"') &&
      csv.endsWith('"group",-2,3,4\r\n'),
    toBe(true),
  );
});

test("group totals roll up only finite numeric leaf values once per ancestor", () => {
  const g = {
    ...graph,
    nodes: [
      ...graph.nodes.map((n) => ({
        ...n,
        data: {
          hours: n.id === "child" ? 4 : 100,
        },
      })),
      {
        ...node("zero", "mid"),
        data: { hours: 0 },
      },
      {
        ...node("missing", "mid"),
        data: { hours: "3" },
      },
      {
        ...node("credit", "root"),
        data: { hours: -1 },
      },
    ],
  };
  const rows = groupTotals(g, "hours"),
    root = rows.find((r) => r.id === "root"),
    mid = rows.find((r) => r.id === "mid");
  return check(
    root?.total === 3 &&
      root.samples === 3 &&
      root.cards === 4 &&
      mid?.total === 4 &&
      mid.samples === 2,
    toBe(true),
  );
});

import {
  resourceSchedule,
  readyCards,
  repeatedProcessors,
} from "plgg-flow/analysis";
test("repeated processor candidates ignore geometry and field order but respect input handles and hierarchy", () => {
  const nodes = [
    node("src"),
    node("grp"),
    { ...node("a"), data: { x: 1, y: 2 } },
    { ...node("b"), data: { y: 2, x: 1 } },
    { ...node("c"), data: { x: 1, y: 2 } },
    { ...node("d", "grp"), data: { x: 1, y: 2 } },
  ];
  const edges = ["a", "b", "c", "d"].map(
    (target) => ({
      source: "src",
      target,
      targetHandle:
        target === "c" ? "other" : "in",
    }),
  );
  return check(
    JSON.stringify(
      repeatedProcessors({ nodes, edges }),
    ),
    toBe('[["a","b"]]'),
  );
});

test("feedback cut accounts for parallel arcs, disjoint cycles and self loops", () => {
  const g = {
    nodes: ["a", "b", "c", "d"].map((id) =>
      node(id),
    ),
    edges: [
      ["a", "b"],
      ["b", "a"],
      ["b", "a"],
      ["c", "d"],
      ["d", "c"],
      ["d", "d"],
    ].map(([source, target], i) => ({
      id: String(i),
      source: source!,
      target: target!,
    })),
  };
  const cut = new Set(feedbackEdges(g));
  return check(
    [...cut].map((e) => e.id).join(",") ===
      "1,2,4,5" &&
      feedbackEdges({
        ...g,
        edges: g.edges.filter((e) => !cut.has(e)),
      }).length === 0,
    toBe(true),
  );
});

test("minimum branch interface cover handles both directions and excludes unrelated wires", () => {
  const nodes = [
    node("left"),
    node("right"),
    ...["a", "b", "c"].map((id) =>
      node(id, "left"),
    ),
    ...["x", "y", "z"].map((id) =>
      node(id, "right"),
    ),
  ];
  const edges = [
    ["a", "x"],
    ["y", "a"],
    ["a", "z"],
    ["b", "x"],
    ["x", "c"],
    ["b", "a"],
  ].map(([source, target]) => ({
    source: source!,
    target: target!,
  }));
  const cover = interfaceCover(
    { nodes, edges },
    "left",
    "right",
  );
  return check(
    cover.length === 2 &&
      cover.includes("a") &&
      cover.includes("x"),
    toBe(true),
  );
});

test("hierarchy import resolves unordered parent keys and rejects a cyclic or missing owner atomically", () => {
  const leaf = {
      ...node("leaf"),
      data: { owner: "mid" },
    },
    mid = {
      ...node("mid"),
      data: { owner: "root" },
    },
    root = node("root");
  const flat = {
    nodes: [leaf, mid, root],
    edges: [{ source: "leaf", target: "root" }],
  };
  const result = hierarchyFromField(
    flat,
    "owner",
  );
  return check(
    isOk(result) &&
      result.content.nodes[0]?.parent === "mid" &&
      result.content.nodes[1]?.group &&
      result.content.nodes[2]?.group &&
      result.content.edges === flat.edges &&
      result.content.nodes[0]?.position ===
        leaf.position &&
      isErr(
        hierarchyFromField(
          { ...flat, nodes: [leaf, mid] },
          "owner",
        ),
      ) &&
      isErr(
        hierarchyFromField(
          {
            ...flat,
            nodes: [
              leaf,
              mid,
              {
                ...root,
                data: { owner: "leaf" },
              },
            ],
          },
          "owner",
        ),
      ),
    toBe(true),
  );
});

test("dependency import is additive and idempotent with existing named wires and rejects invalid batches", () => {
  const a = node("a"),
    b = node("b"),
    c = {
      ...node("c"),
      data: { deps: ["b", "a", "b"] },
    };
  const original = {
    source: "a",
    target: "c",
    sourceHandle: "existing",
  };
  const g = {
    nodes: [a, b, c],
    edges: [original],
  };
  const result = dependenciesFromField(g, "deps");
  if (isErr(result))
    return check(false, toBe(true));
  const retry = dependenciesFromField(
    result.content,
    "deps",
  );
  return check(
    result.content.edges.length === 2 &&
      result.content.edges[0] === original &&
      isOk(retry) &&
      retry.content === result.content &&
      isErr(
        dependenciesFromField(
          g,
          "deps",
          () => false,
        ),
      ) &&
      isErr(
        dependenciesFromField(
          {
            ...g,
            nodes: [
              a,
              b,
              {
                ...c,
                data: { deps: ["b", "missing"] },
              },
            ],
          },
          "deps",
        ),
      ),
    toBe(true),
  );
});

test("ready work requires every distinct predecessor, handles feedback and never trusts missing endpoints", () => {
  const g = {
    nodes: ["a", "b", "join", "loop", "new"].map(
      (id) => node(id),
    ),
    edges: [
      { source: "a", target: "join" },
      { source: "a", target: "join" },
      { source: "b", target: "join" },
      { source: "loop", target: "loop" },
      { source: "missing", target: "new" },
    ],
  };
  return check(
    readyCards(g, ["a", "missing"]).join(",") ===
      "b" &&
      readyCards(g, ["a", "b"]).join(",") ===
        "join",
    toBe(true),
  );
});

test("resource scheduling respects parallel slots, task duration and predecessor completion", () => {
  const g = {
    nodes: ["a", "b", "c", "d"].map((id, i) => ({
      ...node(id),
      data: {
        owner: i === 3 ? "other" : "team",
        duration: i === 0 ? 5 : 2,
      },
    })),
    edges: [{ source: "c", target: "d" }],
  };
  const r = resourceSchedule(g, 2);
  if (isErr(r)) return check(false, toBe(true));
  const times = new Map(
    r.content.map((t) => [t.id, t]),
  );
  return check(
    times.get("a")?.start === 0 &&
      times.get("b")?.start === 0 &&
      times.get("c")?.start === 2 &&
      times.get("d")?.start === 4 &&
      times.get("d")?.finish === 6,
    toBe(true),
  );
});

test("serial grouping preserves junctions, cycles, geometry and wiring", () => {
  const g = {
    nodes: [
      "a",
      "b",
      "fork",
      "c",
      "d",
      "loop",
    ].map((id) => node(id)),
    edges: [
      ["a", "b"],
      ["b", "fork"],
      ["fork", "c"],
      ["fork", "d"],
      ["loop", "loop"],
    ].map(([source, target]) => ({
      source: source!,
      target: target!,
    })),
  };
  const grouped = groupSerialRuns(g);
  return check(
    grouped.nodes.length === 7 &&
      grouped.nodes[0]?.parent === "sequence-a" &&
      grouped.nodes[1]?.parent === "sequence-a" &&
      grouped.nodes[2]?.parent === undefined &&
      grouped.nodes[5] === g.nodes[5] &&
      grouped.edges === g.edges &&
      groupSerialRuns(grouped) === grouped,
    toBe(true),
  );
});

import { exposeGroupInputs } from "plgg-flow/graph";
test("group gateway exposes nested targets independently and preserves incoming wire identities", () => {
  const g = {
    nodes: [
      node("root"),
      node("mid", "root"),
      node("child", "mid"),
      node("other", "root"),
      node("outside"),
    ],
    edges: [
      {
        id: "a",
        source: "outside",
        target: "child",
      },
      {
        id: "b",
        source: "outside",
        target: "other",
      },
    ],
  };
  const r = exposeGroupInputs(g, "root");
  if (isErr(r)) return check(false, toBe(true));
  const gw = r.content.nodes.find(
    (n) => n.type === "input-gateway",
  );
  return check(
    !!gw &&
      gw.parent === "root" &&
      gw.ports?.length === 4 &&
      r.content.edges[0]?.id === "a" &&
      r.content.edges[0]?.target === gw.id &&
      r.content.edges[2]?.target === "child" &&
      isErr(exposeGroupInputs(r.content, "root")),
    toBe(true),
  );
});

test("setting impact stops at the first override even if its value equals the ancestor value", () => {
  const g = {
    nodes: [
      {
        ...node("root"),
        data: { setting: null },
      },
      node("pass", "root"),
      node("leaf", "pass"),
      {
        ...node("stop", "root"),
        data: { setting: null },
      },
      node("shielded", "stop"),
    ],
    edges: [],
  };
  const scope = settingImpact(
    g,
    "root",
    "setting",
  );
  return check(
    scope.declared &&
      scope.affected.join(",") === "pass,leaf" &&
      scope.overrides.join(",") === "stop" &&
      !settingImpact(g, "pass", "setting")
        .declared,
    toBe(true),
  );
});

test("moving a branch freezes only changed inherited fields and rejects unmaskable new keys", () => {
  const g = {
    nodes: [
      {
        ...node("old"),
        data: { region: "east", same: { x: 1 } },
      },
      {
        ...node("new"),
        data: { region: "west", same: { x: 1 } },
      },
      node("branch", "old"),
      node("child", "branch"),
      { ...node("bad"), data: { extra: true } },
    ],
    edges: [],
  };
  const moved = reparentWithSettings(
    g,
    "branch",
    "new",
  );
  return check(
    isOk(moved) &&
      moved.content.nodes[2]?.parent === "new" &&
      moved.content.nodes[2]?.data?.region ===
        "east" &&
      moved.content.nodes[2]?.data?.same ===
        undefined &&
      inheritedData(moved.content, "child").get(
        "region",
      )?.value === "east" &&
      isErr(
        reparentWithSettings(g, "branch", "bad"),
      ),
    toBe(true),
  );
});

test("hoisting compares nested values irrespective of field order and rejects conflicting parent settings", () => {
  const root = node("root"),
    a = {
      ...node("a", "root"),
      data: { mode: { x: 1, y: 2 }, keep: true },
    },
    b = {
      ...node("b", "root"),
      data: { mode: { y: 2, x: 1 } },
    };
  const graph = {
    nodes: [root, a, b, node("leaf", "a")],
    edges: [],
  };
  const r = hoistSetting(graph, "root", "mode");
  return check(
    isOk(r) &&
      inheritedData(r.content, "leaf").get("mode")
        ?.owner === "root" &&
      r.content.nodes[1]?.data?.keep === true &&
      r.content.nodes[2]?.data?.mode ===
        undefined &&
      isErr(
        hoistSetting(
          {
            ...graph,
            nodes: [
              { ...root, data: { mode: null } },
              a,
              b,
            ],
          },
          "root",
          "mode",
        ),
      ),
    toBe(true),
  );
});

test("settings comparison distinguishes missing values, respects selection order and compares nested objects structurally", () => {
  const g = {
    nodes: [
      {
        ...node("a"),
        data: {
          value: null,
          nested: { x: 1, y: 2 },
        },
      },
      {
        ...node("b"),
        data: { nested: { y: 2, x: 1 } },
      },
    ],
    edges: [],
  };
  const result = compareCardData(g, ["b", "a"]);
  return check(
    result.ids.join(",") === "b,a" &&
      result.rows[0]?.same === true &&
      result.rows[1]?.same === false &&
      result.rows[1].values[0] === undefined &&
      result.rows[1].values[1] === null,
    toBe(true),
  );
});

test("overlap removal reserves the measured height of neighboring cards", () => {
  const rows = removeOverlaps(
    {
      nodes: [
        { ...node("large"), height: 180 },
        { ...node("small"), height: 20 },
        { ...node("medium"), height: 60 },
      ],
      edges: [],
    },
    10,
  ).nodes;
  return check(
    rows.map((n) => n.position.y).join(","),
    toBe("0,110,160"),
  );
});

test("minimum wire cut can cancel an earlier path through a shared junction", () => {
  const pairs = [
    ["start", "A"],
    ["start", "B"],
    ["A", "C"],
    ["A", "D"],
    ["B", "C"],
    ["C", "end"],
    ["D", "end"],
  ] as const;
  const graph = {
    nodes: [
      "start",
      "A",
      "B",
      "C",
      "D",
      "end",
    ].map((id) => node(id)),
    edges: pairs.map(([source, target]) => ({
      source,
      target,
    })),
  };
  const cut = minimumWireCut(
    graph,
    "start",
    "end",
  );
  return check(
    cut.length === 2 &&
      cut.every((e) => e.source === "start"),
    toBe(true),
  );
});
