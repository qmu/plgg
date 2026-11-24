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
    plan.layers.get("Idle") === 0,
    toBe(true),
  );
});
