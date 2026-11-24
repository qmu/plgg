import { test, check, toBe } from "plgg-test";
import {
  parseSpec,
  printSpec,
} from "plgg-flow/dsl";
import {
  examples,
  fitDemo,
} from "plgg-flow-example/examples";
test("all twenty-five diagrams have unique identities and valid directed edges", () =>
  check(
    new Set(examples.map((e) => e.name)).size ===
      25 &&
      examples.every(({ initial }) => {
        const graph = initial();
        const ids = new Set(
          graph.nodes.map((n) => n.id),
        );
        return (
          ids.size === graph.nodes.length &&
          graph.edges.length > 0 &&
          graph.edges.every(
            (e) =>
              ids.has(e.source) &&
              ids.has(e.target),
          ) &&
          new Set(
            graph.edges.map((edge) =>
              JSON.stringify(edge),
            ),
          ).size === graph.edges.length
        );
      }),
    toBe(true),
  ));
test("every diagram is written in the DSL and prints back to the same graph", () =>
  check(
    examples.every((e) => {
      const first = parseSpec(e.source);
      if (first.__tag === "Err") return false;
      const printed = printSpec(
        e.initial(),
        first.content.rules,
      );
      const again = parseSpec(printed);
      return (
        again.__tag === "Ok" &&
        JSON.stringify(again.content) ===
          JSON.stringify(first.content)
      );
    }),
    toBe(true),
  ));

test("the layered demo prints edges only after its directive", () => {
  const demo = examples.find(
    (e) => e.id === "layered",
  )!;
  return check(
    printSpec(demo.initial(), demo.spec().rules),
    toBe(demo.source.trim()),
  );
});

test("opening and resetting fit a wide diagram with a 48 pixel margin and cap small diagrams at unit scale", () => {
  const flow = examples[0]!.initial();
  const node = flow.nodes[0]!;
  const fit = (width: number) =>
    fitDemo({
      ...flow,
      nodes: [
        {
          ...node,
          width,
          height: 20,
          position: { x: 300, y: 100, z: 0 },
        },
      ],
      edges: [],
    }).camera;
  const wide = fit(1608);
  return check(
    wide.scale === 0.5 &&
      wide.origin.x + (300 - 804) * wide.scale ===
        48 &&
      fit(20).scale === 1,
    toBe(true),
  );
});
