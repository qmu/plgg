import {
  project,
  frontCamera,
  projectedScale,
} from "plgg-board";
import { projectNodeBody } from "plgg-flow/nodeBody";
import {
  parseSpec,
  specFlow,
} from "plgg-flow/dsl";
import { moveSelectionGeometry } from "plgg-flow/model";
import {
  wireGraph,
  type WireStyle,
} from "plgg-flow/wiring";
import { bridgePoints } from "plgg-flow/polyline";
import { test, check, toBe } from "plgg-test";
import {
  planLayers,
  layeredLayout,
} from "plgg-flow/autoLayout";
const graph = {
  nodes: ["z", "b", "a", "c", "d"].map((id) => ({
    id,
    label: id,
    position: { x: 9, y: 8, z: 7 },
  })),
  edges: [
    ["a", "b"],
    ["b", "c"],
    ["c", "d"],
    ["z", "d"],
  ].map(([source, target]) => ({
    source: source!,
    target: target!,
  })),
};
test("shortens late source spans and preserves node order and depth", () => {
  const plan = planLayers(graph, { depth: true });
  const flat = layeredLayout({
    ...graph,
    nodes: graph.nodes.slice().reverse(),
    edges: graph.edges.slice().reverse(),
  });
  return check(
    plan.layers.get("z") === 2 &&
      plan.graph.nodes.every((n, i) => {
        const p = flat.nodes.find(
          (v) => v.id === n.id,
        )?.position;
        return (
          n.id === graph.nodes[i]?.id &&
          p?.x === n.position.x &&
          p.y === n.position.y &&
          n.position.z ===
            48 * plan.layers.get(n.id)!
        );
      }),
    toBe(true),
  );
});

test("feedback indices refer to original edges, counting parallel arcs and ignoring loops", () => {
  const plan = planLayers({
    ...graph,
    edges: [
      { source: "a", target: "a" },
      { source: "b", target: "a" },
      { source: "a", target: "b" },
      { source: "a", target: "b" },
    ],
  });
  return check(
    plan.reversed.join(",") === "1" &&
      plan.layers.get("a") === 0 &&
      plan.layers.get("b") === 1,
    toBe(true),
  );
});

test("microservices layers start at the flow entry", () => {
  const pairs = [
    ["Web", "Gateway"],
    ["Mobile", "Gateway"],
    ["Gateway", "Auth"],
    ["Gateway", "Users"],
    ["Gateway", "Orders"],
    ["Gateway", "Catalog"],
    ["Gateway", "Search"],
    ["Orders", "Queue"],
    ["Orders", "Payments"],
    ["Queue", "Mailer"],
    ["Queue", "Ledger"],
    ["Payments", "Ledger"],
    ["Catalog", "Cache"],
    ["Search", "Cache"],
    ["Cache", "DB"],
    ["Users", "DB"],
    ["Orders", "DB"],
    ["Ledger", "Audit"],
    ["Mailer", "Audit"],
    ["Auth", "Users"],
    ["Payments", "Orders"],
    ["Audit", "Gateway"],
    ["DB", "Catalog"],
  ] satisfies [string, string][];
  const plan = planLayers({
    nodes: [...new Set(pairs.flat())].map(
      (id) => ({
        id,
        label: id,
        position: { x: 0, y: 0, z: 0 },
      }),
    ),
    edges: pairs.map(([source, target]) => ({
      source,
      target,
    })),
  });
  return check(
    plan.layers.get("Web") === 0 &&
      plan.layers.get("Mobile") === 0 &&
      plan.layers.get("Gateway") === 1,
    toBe(true),
  );
});

test("stateMachine layers start at the flow entry", () => {
  const pairs = [
    ["Idle", "Loading"],
    ["Loading", "Ready"],
    ["Loading", "Error"],
    ["Error", "Idle"],
    ["Ready", "Editing"],
    ["Editing", "Ready"],
    ["Editing", "Saving"],
    ["Saving", "Ready"],
    ["Saving", "Error"],
    ["Ready", "Closed"],
    ["Error", "Loading"],
    ["Ready", "Idle"],
  ] satisfies [string, string][];
  const plan = planLayers({
    nodes: [...new Set(pairs.flat())].map(
      (id) => ({
        id,
        label: id,
        position: { x: 0, y: 0, z: 0 },
      }),
    ),
    edges: pairs.map(([source, target]) => ({
      source,
      target,
    })),
  });
  return check(
    [
      ["Idle"],
      ["Loading"],
      ["Ready", "Error"],
      ["Editing", "Closed"],
      ["Saving"],
    ].every((ids, layer) =>
      ids.every(
        (id) => plan.layers.get(id) === layer,
      ),
    ),
    toBe(true),
  );
});

test("twelve input leaves wrap into two centred rows of six", () => {
  const leaves = Array.from(
    { length: 12 },
    (_, i) => String(i),
  );
  const plan = planLayers({
    nodes: [...leaves, "Hub"].map((id) => ({
      id,
      label: id,
      position: { x: 0, y: 0, z: 0 },
    })),
    edges: leaves.map((source) => ({
      source,
      target: "Hub",
    })),
  });
  const rows = [0, 1].map((layer) =>
    plan.graph.nodes
      .filter(
        (n) => plan.layers.get(n.id) === layer,
      )
      .map((n) => n.position.y),
  );
  return check(
    rows.every(
      (row) =>
        row.length === 6 &&
        Math.min(...row) + Math.max(...row) === 0,
    ),
    toBe(true),
  );
});

test("long-edge guides survive pinned-edge filtering and clear on endpoint movement", () => {
  const parsed = parseSpec(
    "layout layered right\nnode P at 0 0\nP -> A\nA -> B\nB -> C\nC -> D\nA -> D",
  );
  if (parsed.__tag === "Err")
    return check(false, toBe(true));
  const flow = specFlow(parsed.content);
  const edge = flow.edges[4]!;
  const moved = (id: string) =>
    moveSelectionGeometry(flow, [id], {
      x: 1,
      y: 0,
      z: 0,
    }).edges[4];
  return check(
    edge.via?.length === 2 &&
      edge.via[0]!.x < edge.via[1]!.x &&
      moved("B") === edge &&
      !moved("A")?.via &&
      !moved("D")?.via,
    toBe(true),
  );
});
test("both wire styles follow a free layout guide", () => {
  const nodes = graph.nodes
    .slice(0, 2)
    .map((n, i) => ({
      ...n,
      position: { x: i * 400, y: 0, z: 0 },
    }));
  return check(
    (
      ["curve", "step"] satisfies WireStyle[]
    ).every((route) => {
      const [wire] = wireGraph({
        nodes,
        edges: [
          {
            source: nodes[0]!.id,
            target: nodes[1]!.id,
            route,
            via: [{ x: 200, y: 100 }],
          },
        ],
      });
      return wire?.points.some((p) => p.y >= 85);
    }),
    toBe(true),
  );
});
test("only a depth-layout feedback wire rises above both ends when turned", () => {
  const g = {
    ...graph,
    edges: [
      { source: "a", target: "b" },
      { source: "b", target: "c" },
      { source: "c", target: "a" },
    ],
  };
  const plan = planLayers(g, { depth: true });
  const wires = wireGraph(plan.graph),
    i = plan.reversed[0]!;
  const w = wires[i]!,
    p = bridgePoints(w.points, w.lift, false);
  return check(
    w.lift === 24 &&
      wires.every(
        (v, j) => j === i || v.lift === undefined,
      ) &&
      bridgePoints(w.points, w.lift, true) ===
        w.points &&
      p[0] === w.points[0] &&
      p
        .slice(1, -1)
        .every(
          (v) =>
            v.z ===
            Math.max(w.source.z, w.target.z) + 24,
        ) &&
      !planLayers(g).graph.edges[i]?.lift,
    toBe(true),
  );
});

test("a turned bridge rises vertically past the projected top of its higher node", () => {
  const node = {
    id: "high",
    label: "High",
    position: { x: 0, y: 0, z: 72 },
  };
  const other = {
    id: "low",
    label: "Low",
    position: { x: 240, y: 0, z: 0 },
  };
  const [wire] = wireGraph({
    nodes: [node, other],
    edges: [
      { source: "high", target: "low", lift: 24 },
    ],
  });
  if (!wire) return check(false, toBe(true));
  const camera = {
    ...frontCamera({ x: 320, y: 240 }),
    pitch: 1.25,
    perspective: true,
  };
  const at = project(camera);
  const center = at(node.position);
  const scale = projectedScale(camera, center.z);
  const top = Math.min(
    ...projectNodeBody(
      node,
      camera,
    ).visible.flatMap((face) =>
      face.points.map(
        (p) => center.y + p.y * scale,
      ),
    ),
  );
  const knots = bridgePoints(
    wire.points,
    wire.lift,
    false,
  );
  const deck = knots[1]!,
    far = knots[knots.length - 2]!;
  return check(
    center.y < at({ ...node.position, z: 0 }).y &&
      at(deck).y < top &&
      deck.x === wire.source.x &&
      deck.y === wire.source.y &&
      far.x === wire.target.x &&
      far.y === wire.target.y &&
      deck.z === 96 &&
      far.z === deck.z,
    toBe(true),
  );
});
