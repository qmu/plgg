import {
  projectNodeBody,
  projectSocket,
  portPosition,
} from "plgg-flow/nodeBody";
import { test, check, toBe } from "plgg-test";
import { isOk, isSome, isErr } from "plgg";
import {
  project,
  pickPlane,
  unproject,
  orbitAround,
} from "plgg-board";
import {
  angle3,
  nodesInRadius,
  proximityTree,
  routeDetours,
  foregroundOverlaps,
  sectionGraph,
} from "plgg-flow/spatial";
import {
  pruneEmptyGroups,
  fitWire,
  setBranchDistance,
  createFlow,
  viewAt,
  type Graph,
} from "plgg-flow/model";
import {
  compareReachability,
  layoutDisplacements,
  restoreCardFields,
  revisionDrawing,
  diffGraph,
  applyPatch,
  invertPatch,
  mergeRevision,
} from "plgg-flow/revisions";
import {
  exportReactFlow,
  importReactFlow,
} from "plgg-flow/interchange";
import {
  routeOnPlane,
  simplifyWiring,
  bundleFanout,
  routeAroundNodes,
} from "plgg-flow/routing";
const n = (
  id: string,
  x: number,
  y: number,
  z = 0,
) => ({ id, label: id, position: { x, y, z } });
const scene: Graph = {
  nodes: [
    n("a", -200, 0),
    n("b", 200, 0),
    n("obstacle", 0, 0, 20),
  ],
  edges: [{ source: "a", target: "b" }],
};
test("selected pivot and plane intersections agree with the camera projection", () => {
  const model = createFlow(scene),
    next = viewAt(0.7, 0.5)(model).camera;
  const p = { x: 120, y: -50, z: 42 },
    c = orbitAround(p, model.camera, next);
  const front = project(model.camera)(p),
    oblique = project(c)(p),
    pick = pickPlane(c, oblique, "z", p.z),
    world = unproject(c, oblique, oblique.z);
  return check(
    Math.abs(front.x - oblique.x) +
      Math.abs(front.y - oblique.y) <
      1e-8 &&
      isSome(pick) &&
      Math.abs(pick.content.x - p.x) < 1e-7 &&
      Math.abs(world.z - p.z) < 1e-8,
    toBe(true),
  );
});
test("section cuts use physical node coordinates and angular measurements use three axes", () => {
  const clip = sectionGraph(scene, {
      axis: "z",
      min: 5,
      max: 40,
    }),
    a = angle3(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
    );
  return check(
    clip.nodes.length === 1 &&
      !clip.edges.length &&
      isSome(a) &&
      a.content === 90,
    toBe(true),
  );
});
test("obstacle router clears a central node and returns exact bends", () => {
  const e = scene.edges[0];
  if (!e) return check(false, toBe(true));
  const r = routeAroundNodes(scene, e);
  if (!isOk(r)) return check(false, toBe(true));
  return check(
    r.content.length >= 4 &&
      r.content.every((p, i) => {
        const prev = r.content[i - 1];
        if (!prev) return true;
        return !(
          Math.max(prev.x, p.x) >= -52 &&
          Math.min(prev.x, p.x) <= 52 &&
          Math.max(prev.y, p.y) >= -18 &&
          Math.min(prev.y, p.y) <= 18
        );
      }),
    toBe(true),
  );
});
test("three-way revision merge accepts independent edits and never partially applies a conflict", () => {
  const local = {
      ...scene,
      nodes: scene.nodes.map((n) =>
        n.id === "a"
          ? { ...n, label: "local" }
          : n,
      ),
    },
    remote = {
      ...scene,
      nodes: scene.nodes.map((n) =>
        n.id === "b"
          ? { ...n, label: "remote" }
          : n,
      ),
    };
  const result = mergeRevision(
      scene,
      local,
      remote,
    ),
    p = diffGraph(scene, remote);
  if (!isOk(result) || !isOk(p))
    return check(false, toBe(true));
  const undone = applyPatch(
      result.content,
      invertPatch(p.content),
    ),
    repeat = applyPatch(
      result.content,
      p.content,
    );
  const conflict = mergeRevision(scene, local, {
    ...remote,
    nodes: remote.nodes.map((n) => ({
      ...n,
      label: "different",
    })),
  });
  return check(
    isOk(undone) &&
      undone.content.nodes[1]?.label === "b" &&
      undone.content.nodes[0]?.label ===
        "local" &&
      isOk(repeat) &&
      isErr(conflict) &&
      local.nodes[1]?.label === "b",
    toBe(true),
  );
});
test("React Flow roundtrip preserves anchored nested positions, custom data and handle IDs", () => {
  const input = {
    nodes: [
      {
        id: "child",
        type: "processor",
        parentId: "g",
        origin: [0.5, 1],
        position: { x: 8, y: 22 },
        width: 100,
        height: 75,
        data: {
          label: "compute",
          params: { weights: [1, 2] },
        },
      },
      {
        id: "g",
        type: "group",
        position: { x: 200, y: 15 },
        width: 250,
        height: 180,
        data: { label: "Group" },
      },
    ],
    edges: [
      {
        id: "link",
        source: "g",
        target: "child",
        targetHandle: "signal",
        type: "custom",
        data: { coefficient: 5 },
      },
    ],
    viewport: { x: 90, y: 40, zoom: 1.5 },
  };
  const read = importReactFlow(
    JSON.stringify(input),
  );
  if (!isOk(read))
    return check(false, toBe(true));
  const serialized = exportReactFlow(
    read.content.drawing,
  );
  if (!isOk(serialized))
    return check(false, toBe(true));
  const parsed = importReactFlow(
    serialized.content,
  );
  if (!isOk(parsed))
    return check(false, toBe(true));
  const child = parsed.content.drawing.nodes.find(
      (n) => n.id === "child",
    ),
    edge = parsed.content.drawing.edges[0];
  return check(
    child?.position.x === 208 &&
      child.position.y === -0.5 &&
      child.type === "processor" &&
      JSON.stringify(child.data?.params) ===
        '{"weights":[1,2]}' &&
      edge?.targetHandle === "signal" &&
      edge.type === "custom" &&
      edge.data?.coefficient === 5,
    toBe(true),
  );
});

import {
  articulationNodes,
  criticalSchedule,
  islands,
  cycleWitness,
  colorClasses,
  neighborhood,
} from "plgg-flow/analysis";
import {
  constrainedDelta,
  insideLasso,
} from "plgg-flow/constraints";
import {
  decodeMarks,
  annotate,
  reply,
  resolve,
} from "plgg-flow/annotations";
test("dependency analysis distinguishes slack, cut vertices and cycle witnesses", () => {
  const nodes = [
      "a",
      "b",
      "c",
      "end",
      "orphan",
    ].map((id) => n(id, 0, 0)),
    graph = {
      nodes,
      edges: [
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "b", target: "end" },
        { source: "c", target: "end" },
      ],
    };
  const schedule = criticalSchedule(
      graph,
      (id) => (id === "b" ? 5 : 1),
    ),
    colors = colorClasses(graph),
    loop = {
      ...graph,
      edges: [
        ...graph.edges,
        { source: "end", target: "a" },
      ],
    };
  const cuts = articulationNodes({
    ...graph,
    edges: graph.edges.slice(0, 3),
  });
  return check(
    isOk(schedule) &&
      schedule.content.duration === 7 &&
      schedule.content.tasks.get("c")?.slack ===
        4 &&
      cuts.includes("a") &&
      cuts.includes("b") &&
      islands(graph).length === 2 &&
      cycleWitness(loop).length === 4 &&
      graph.edges.every(
        (e) =>
          colors.get(e.source) !==
          colors.get(e.target),
      ) &&
      neighborhood(graph, ["a"], 1).size === 3,
    toBe(true),
  );
});
test("lasso and spatial constraints use physical coordinates", () => {
  const polygon = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 30, y: 50 },
    ],
    g = {
      nodes: [n("a", 0, 0), n("b", 180, 0)],
      edges: [],
    },
    selection = new Set(["a"]);
  const block = constrainedDelta(
      g,
      selection,
      "a",
      { x: 120, y: 0, z: 0 },
      { avoidOverlap: true },
    ),
    axis = constrainedDelta(
      g,
      selection,
      "a",
      { x: 3, y: 4, z: 5 },
      { axis: "z" },
    );
  return check(
    insideLasso({ x: 22, y: 5 }, polygon) &&
      !insideLasso({ x: 90, y: 5 }, polygon) &&
      block.x === 0 &&
      axis.x === 0 &&
      axis.y === 0 &&
      axis.z === 5,
    toBe(true),
  );
});
test("thread identity, replies and resolution survive a serialized review", () => {
  const marks = annotate(
      [],
      { x: 1, y: 2, z: 3 },
      "one",
      "a",
    ),
    id = marks[0]?.id ?? "",
    updated = resolve(
      reply(marks, id, "two"),
      id,
    ),
    result = decodeMarks(
      JSON.parse(JSON.stringify(updated)),
    );
  return check(
    isOk(result) &&
      result.content[0]?.kind === "review" &&
      result.content[0].resolved &&
      result.content[0].messages.length === 2 &&
      isErr(
        decodeMarks([
          {
            kind: "stroke",
            id: "x",
            points: [{}],
          },
        ]),
      ),
    toBe(true),
  );
});

import { simplifyTrace } from "plgg-flow/polyline";
test("trace simplification preserves endpoints and depth-only bends", () => {
  const p = [0, 1, 2, 3, 4].map((x) => ({
    x,
    y: 0,
    z: x <= 2 ? x : 4 - x,
  }));
  const result = simplifyTrace(p, 0.01);
  return check(
    result.length === 3 &&
      result[0] === p[0] &&
      result[1] === p[2] &&
      result[2] === p[4] &&
      simplifyTrace(p, 3).length === 2,
    toBe(true),
  );
});

test("sphere selection includes the exact boundary and distinguishes coincident projections", () => {
  const g = {
      nodes: [
        n("anchor", 0, 0),
        n("rim", 0, 3, 4),
        n("behind", 0, 0, 6),
      ],
      edges: [],
    },
    center = { x: 0, y: 0, z: 0 };
  return check(
    nodesInRadius(g, center, 5).join(",") ===
      "anchor,rim" &&
      nodesInRadius(g, center, 0).join(",") ===
        "anchor" &&
      !nodesInRadius(g, center, NaN).length,
    toBe(true),
  );
});

test("spatial wiring connects existing components at their nearest selected terminals", () => {
  const graph = {
    nodes: [
      n("a", 0, 0),
      n("b", 0, 0, 100),
      n("c", 2, 0, 100),
      n("d", 8, 0, 100),
      n("bridge", 0, 0),
    ],
    edges: [
      { source: "a", target: "bridge" },
      { source: "b", target: "bridge" },
    ],
  };
  const plan = proximityTree(graph, [
    "a",
    "b",
    "d",
    "c",
  ]);
  return check(
    plan.length === 2 &&
      plan[0]?.source === "b" &&
      plan[0]?.target === "c" &&
      plan[1]?.source === "c" &&
      plan[1]?.target === "d",
    toBe(true),
  );
});

test("detour audit measures the third dimension and ranks same-endpoint returns", () => {
  const graph = {
    nodes: [n("a", 0, 0), n("b", 6, 0)],
    edges: [
      { source: "a", target: "b" },
      {
        source: "a",
        target: "b",
        waypoints: [{ x: 3, y: 0, z: 4 }],
      },
      {
        source: "a",
        target: "a",
        waypoints: [{ x: 0, y: 0, z: 4 }],
      },
    ],
  };
  const distances = routeDetours(graph);
  return check(
    distances.map((d) => d.extra).join(",") ===
      "8,4,0" &&
      distances[1]?.length === 10 &&
      distances[1]?.direct === 6,
    toBe(true),
  );
});

test("bundling creates a shared 3D trunk only on the matching output and retains manual bends", () => {
  const bend = { x: 3, y: 8, z: 40 },
    other = {
      source: "a",
      sourceHandle: "extra",
      target: "b",
    };
  const g = {
    nodes: [
      n("a", 0, 0),
      n("b", 100, -30, 40),
      n("c", 100, 30, 80),
    ],
    edges: [
      {
        source: "a",
        target: "b",
        waypoints: [bend],
      },
      { source: "a", target: "c" },
      other,
    ],
  };
  const result = bundleFanout(g, "a", ["b", "c"]),
    p = result.edges[0]?.waypoints?.[0];
  return check(
    p?.x === 50 &&
      p.y === 0 &&
      p.z === 30 &&
      result.edges[1]?.waypoints?.[0] === p &&
      result.edges[0]?.waypoints?.[1] === bend &&
      result.edges[2] === other &&
      bundleFanout(result, "a", ["b", "c"]) ===
        result,
    toBe(true),
  );
});

test("foreground overlap uses drawing order and excludes hidden cards", () => {
  const graph = {
    nodes: [
      n("back", 0, 0, -10),
      n("target", 0, 0),
      n("half", 52, 0),
      n("front", 0, 0, 10),
      { ...n("hidden", 0, 0, 15), hidden: true },
    ],
    edges: [],
  };
  const result = foregroundOverlaps(
    createFlow(graph),
    "target",
  );
  return check(
    result.length === 2 &&
      result[0]?.id === "front" &&
      Math.abs(result[0].fraction - 1) < 1e-8 &&
      result[1]?.id === "half" &&
      Math.abs(result[1].fraction - 0.5) < 1e-8,
    toBe(true),
  );
});

test("routing cleanup preserves shared knots, approach segments and depth bends", () => {
  const p = (x: number, z = 0) => ({
    x,
    y: 0,
    z,
  });
  const graph = {
    nodes: [],
    edges: [
      {
        source: "a",
        target: "b",
        waypoints: [
          p(0),
          p(1),
          p(2),
          p(3),
          p(4, 4),
          p(5),
        ],
      },
      {
        source: "c",
        target: "d",
        waypoints: [p(2)],
      },
    ],
  };
  const clean = simplifyWiring(graph, ["a"], 0);
  return check(
    JSON.stringify(clean.edges[0]?.waypoints) ===
      JSON.stringify([
        p(0),
        p(2),
        p(3),
        p(4, 4),
        p(5),
      ]) && clean.edges[1] === graph.edges[1],
    toBe(true),
  );
});

test("distance placement carries a nested branch along its spatial ray and honors locks", () => {
  const flow = createFlow({
    nodes: [
      n("a", 0, 0),
      n("b", 3, 0, 4),
      { ...n("leaf", 8, 2, 9), parent: "b" },
    ],
    edges: [
      {
        source: "b",
        target: "leaf",
        waypoints: [{ x: 4, y: 1, z: 5 }],
      },
    ],
  });
  const moved = setBranchDistance(
    flow,
    "a",
    "b",
    10,
  );
  const locked = {
    ...flow,
    nodes: flow.nodes.map((v) =>
      v.id === "leaf"
        ? { ...v, locked: true }
        : v,
    ),
  };
  return check(
    moved.nodes[1]?.position.x === 6 &&
      moved.nodes[2]?.position.z === 13 &&
      moved.edges[0]?.waypoints?.[0]?.z === 9 &&
      setBranchDistance(locked, "a", "b", 10) ===
        locked,
    toBe(true),
  );
});

test("pruning cascades through empty ancestry while retaining review, dimension and wired groups", () => {
  const g = (id: string, parent?: string) => ({
    ...n(id, 0, 0),
    group: true,
    ...(parent ? { parent } : {}),
  });
  const flow = {
    ...createFlow({
      nodes: [
        g("outer"),
        g("empty", "outer"),
        g("keep"),
        g("note", "keep"),
        g("dim"),
        g("wired"),
      ],
      edges: [{ source: "wired", target: "dim" }],
    }),
    marks: [
      {
        kind: "review" as const,
        id: "r",
        node: "note",
        position: { x: 0, y: 0, z: 0 },
        messages: ["note"],
        resolved: false,
      },
    ],
  };
  const clean = pruneEmptyGroups(flow);
  return check(
    clean.nodes.map((n) => n.id).join(",") ===
      "keep,note,dim,wired" &&
      clean.edges === flow.edges &&
      pruneEmptyGroups(clean) === clean,
    toBe(true),
  );
});

test("routing planes retain horizontal bends and do not accumulate port risers when retuned", () => {
  const graph = {
    nodes: [
      n("a", 0, 0, 20),
      n("b", 300, 100, -10),
    ],
    edges: [],
  };
  const edge = {
    id: "ab",
    source: "a",
    target: "b",
    waypoints: [{ x: 150, y: 10, z: 9 }],
  };
  const route = routeOnPlane(graph, edge, 40);
  if (!isOk(route))
    return check(false, toBe(true));
  const next = routeOnPlane(
    graph,
    route.content,
    -60,
  );
  return check(
    isOk(next) &&
      next.content.waypoints?.length === 3 &&
      next.content.waypoints.every(
        (p) => p.z === -60,
      ) &&
      next.content.waypoints[1]?.x === 150 &&
      next.content.id === "ab",
    toBe(true),
  );
});

test("review drawing retains deleted endpoint and both revisions of a reconnected wire", () => {
  const base = {
    nodes: [
      n("a", 0, 0),
      { ...n("old", 5, 0), parent: "g" },
      n("g", 10, 0),
      n("skip", 20, 0),
    ],
    edges: [
      { id: "wire", source: "a", target: "old" },
    ],
  };
  const next = {
    nodes: [
      ...base.nodes.filter((x) => x.id !== "old"),
      n("new", 8, 0),
    ],
    edges: [
      { id: "wire", source: "a", target: "new" },
    ],
  };
  const result = revisionDrawing(base, next);
  return check(
    isOk(result) &&
      result.content.nodes.length === 4 &&
      result.content.nodes.some(
        (n) =>
          n.id === "old" &&
          n.label.startsWith("削除"),
      ) &&
      result.content.edges
        .map((e) => e.target)
        .join(",") === "old,new" &&
      result.content.edges[0]?.id !==
        result.content.edges[1]?.id,
    toBe(true),
  );
});

test("partial baseline restore removes optional fields while retaining later geometry and unrelated edits", () => {
  const base = {
      nodes: [n("a", 0, 0), n("b", 2, 2)],
      edges: [],
    },
    current = {
      nodes: [
        {
          ...n("a", 10, 20),
          label: "new",
          data: { added: true },
        },
        { ...n("b", 30, 40), label: "keep" },
      ],
      edges: [],
    };
  const result = restoreCardFields(
    base,
    current,
    ["a"],
    "settings",
  );
  return check(
    isOk(result) &&
      result.content.nodes[0]?.position.x ===
        10 &&
      result.content.nodes[0]?.label === "a" &&
      !Object.prototype.hasOwnProperty.call(
        result.content.nodes[0]!,
        "data",
      ) &&
      result.content.nodes[1] ===
        current.nodes[1],
    toBe(true),
  );
});

test("layout comparison separates carried children, world-fixed children and reparenting", () => {
  const base = {
    nodes: [
      n("g", 0, 0),
      { ...n("c", 1, 0), parent: "g" },
      { ...n("d", 0, 0), parent: "g" },
      n("e", 0, 0),
    ],
    edges: [],
  };
  const next = {
    ...base,
    nodes: [
      n("g", 3, 0, 4),
      { ...n("c", 4, 0, 4), parent: "g" },
      base.nodes[2]!,
      { ...n("e", 0, 0), parent: "g" },
    ],
  };
  const rows = layoutDisplacements(base, next);
  return check(
    rows.find((r) => r.id === "c")?.relative ===
      0 &&
      rows.find((r) => r.id === "d")?.relative ===
        5 &&
      rows[0]?.distance === 5 &&
      rows.some(
        (r) =>
          r.id === "e" &&
          r.relative === undefined,
      ),
    toBe(true),
  );
});

import {
  reanchorReview,
  type Review,
} from "plgg-flow/annotations";
test("reanchoring and releasing a review retains history and captures the live card position", () => {
  const graph = {
    nodes: [n("a", 0, 0), n("b", 5, 6, 7)],
    edges: [],
  };
  const note: Review = {
    kind: "review",
    id: "note",
    node: "a",
    position: { x: 0, y: 0, z: 0 },
    messages: ["first", "reply"],
    assignee: "owner",
    resolved: true,
  };
  const attached = reanchorReview(
    graph,
    [note],
    "note",
    "b",
  );
  if (!isOk(attached))
    return check(false, toBe(true));
  const detached = reanchorReview(
    { ...graph, nodes: [n("b", 10, 20, 30)] },
    attached.content,
    "note",
  );
  const mark = isOk(detached)
    ? detached.content[0]
    : undefined;
  return check(
    mark?.kind === "review" &&
      mark.node === undefined &&
      mark.position.z === 30 &&
      mark.messages === note.messages &&
      mark.assignee === "owner" &&
      mark.resolved,
    toBe(true),
  );
});

test("revision reachability ignores redundant routes and reports downstream loss through feedback", () => {
  const nodes = ["a", "b", "c", "d", "e"].map(
    (id) => n(id, 0, 0),
  );
  const wires = (pairs: string[]) =>
    pairs.map((pair) => ({
      source: pair[0]!,
      target: pair[1]!,
    }));
  const before = {
      nodes,
      edges: wires([
        "ab",
        "bc",
        "ac",
        "cd",
        "dc",
      ]),
    },
    after = {
      nodes,
      edges: wires(["ab", "bc", "ce"]),
    };
  const r = compareReachability(
    before,
    after,
    "a",
  );
  return check(
    isOk(r) &&
      r.content.lost.join(",") === "d" &&
      r.content.gained.join(",") === "e",
    toBe(true),
  );
});

import {
  exportReviews,
  importReviews,
} from "plgg-flow/annotations";
test("portable review packets retain live position on missing anchors and skip existing threads", () => {
  const g = {
      nodes: [n("a", 4, 5, 6)],
      edges: [],
    },
    note: Review = {
      id: "r",
      kind: "review",
      node: "a",
      messages: ["first", "reply"],
      resolved: true,
      assignee: "owner",
      position: { x: 0, y: 0, z: 0 },
    };
  const packet = exportReviews(g, [note]),
    target = { nodes: [], edges: [] };
  const first = importReviews(target, [], packet);
  if (isErr(first))
    return check(false, toBe(true));
  const item = first.content.marks[0],
    again = importReviews(
      target,
      first.content.marks,
      packet,
    );
  return check(
    item?.kind === "review" &&
      item.node === undefined &&
      item.position.z === 6 &&
      item.messages.length === 2 &&
      item.resolved &&
      isOk(again) &&
      again.content.skipped === 1,
    toBe(true),
  );
});

test("wire framing fits a distant bend but ignores unrelated distant cards", () => {
  const bend = { x: 500, y: 900, z: 15 },
    edge = {
      source: "a",
      target: "b",
      waypoints: [bend],
    };
  const f = {
    ...createFlow({
      nodes: [
        n("a", 0, 0),
        n("b", 10, 5),
        n("other", 50000, 60000),
      ],
      edges: [edge],
    }),
    activeEdge: edge,
  };
  const next = fitWire(f),
    p = project(next.camera)(bend),
    q = project(next.camera)(
      f.nodes[0]!.position,
    ),
    outside = project(next.camera)(
      f.nodes[2]!.position,
    );
  return check(
    p.y <= 580 &&
      q.y >= 0 &&
      outside.y > 580 &&
      next.nodes === f.nodes &&
      next.edges === f.edges,
    toBe(true),
  );
});

test("solid cards expose their back and keep sockets on the physical side faces", () => {
  const card = n("card", 0, 0);
  const flow = createFlow({
    nodes: [card],
    edges: [],
  });
  const rear = viewAt(Math.PI, 0)(flow).camera,
    side = viewAt(Math.PI / 2, 0)(flow).camera;
  const body = projectNodeBody(card, rear),
    input = projectSocket(
      card,
      side,
      "target",
      0,
    ),
    output = projectSocket(
      card,
      side,
      "source",
      0,
    );
  const end = project(side)(
    portPosition(card, "target", 0),
  );
  return check(
    body.visible.some((f) => f.side === "back") &&
      !body.visible.some(
        (f) => f.side === "front",
      ) &&
      output.z !== input.z &&
      input.x === end.x &&
      input.y === end.y &&
      projectNodeBody(card, side).visible.filter(
        (f) =>
          f.side === "left" || f.side === "right",
      ).length === 1 &&
      body.caption?.every(Number.isFinite) ===
        true,
    toBe(true),
  );
});
