import { test, check, toBe } from "plgg-test";
import {
  parseSpec,
  printSpec,
  specFlow,
} from "plgg-flow/dsl";

test("a written diagram prints back to the same spec", () => {
  const source = `rule acyclic
snap 32
node Team at -250 -100 group
node "Build step" at 40 40 -40 in Team label "ビルド"
node A at 0 0 value 3 width 160
Team -> "Build step" "依頼" curve animated
"Build step" -> A`;
  const first = parseSpec(source);
  if (first.__tag === "Err")
    return check(first.content, toBe(""));
  const again = parseSpec(
    printSpec(
      specFlow(first.content),
      first.content.rules,
    ),
  );
  return check(
    again.__tag === "Ok" &&
      JSON.stringify(again.content) ===
        JSON.stringify(first.content),
    toBe(true),
  );
});

test("edge endpoints are implicit nodes and declarations take precedence", () => {
  const r = parseSpec(
    'A -> B\nnode B label "Bee"',
  );
  return check(
    r.__tag === "Ok" &&
      r.content.graph.nodes
        .map((n) => n.label)
        .join(",") === "Bee,A",
    toBe(true),
  );
});
test("layered pins stay out of placement and only dragged nodes gain coordinates", () => {
  const r = parseSpec(
    "layout layered down depth\nA -> B\nnode Pin at 17 19\nPin -> A",
  );
  if (r.__tag === "Err")
    return check(r.content, toBe(""));
  const f = specFlow(r.content);
  const text = printSpec(
    {
      ...f,
      nodes: f.nodes.map((n) =>
        n.id === "B"
          ? {
              ...n,
              position: { x: 3, y: 7, z: 2 },
            }
          : n,
      ),
    },
    [],
  );
  return check(
    text.includes("layout layered down depth") &&
      text.includes("node Pin at 17 19") &&
      text.includes("node A\n") &&
      text.includes("node B at 3 7 2") &&
      f.nodes.find((n) => n.id === "B")?.position
        .z === 48,
    toBe(true),
  );
});
