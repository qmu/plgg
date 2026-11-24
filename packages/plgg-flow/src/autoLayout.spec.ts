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
