import { test, check, toBe } from "plgg-test";
import {
  parseSpec,
  printSpec,
} from "plgg-flow-example/flowDsl";
import { examples } from "plgg-flow-example/examples";
test("all twenty diagrams have unique identities and valid directed edges", () =>
  check(
    new Set(examples.map((e) => e.name)).size ===
      20 &&
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
