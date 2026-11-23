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

test("an edge to an undefined node names it", () => {
  const r = parseSpec("node A at 0 0\nA -> B");
  return check(
    r.__tag === "Err" ? r.content : "",
    toBe("未定義のノード「B」"),
  );
});
