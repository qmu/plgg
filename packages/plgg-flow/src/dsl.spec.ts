import { test, check, toBe } from "plgg-test";
import {
  parseSpec,
  printSpec,
  printLines,
  selectSubject,
  subjectSelected,
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
      !text.includes("node A\n") &&
      text.includes("node B at 3 7 2") &&
      f.nodes.find((n) => n.id === "B")?.position
        .z === 48,
    toBe(true),
  );
});

test("each token edit reprints its change and preserves the original", () => {
  const cases: readonly (readonly [
    string,
    string,
    string,
    string,
  ])[] = [
    [
      "node A at 1 2 3 width 90",
      "1",
      "17",
      "node A at 17 2 3 width 90",
    ],
    [
      "node A at 1 2 3",
      "2",
      "18",
      "node A at 1 18 3",
    ],
    [
      "node A at 1 2 3",
      "3",
      "19",
      "node A at 1 2 19",
    ],
    [
      "node A at 1 2 width 90",
      "90",
      "106",
      "node A at 1 2 width 106",
    ],
    [
      "node A at 1 2 height 90",
      "90",
      "106",
      "node A at 1 2 height 106",
    ],
    [
      "node A at 1 2 value 5",
      "5",
      "21",
      "node A at 1 2 value 21",
    ],
    [
      'node A at 1 2 label "One"',
      '"One"',
      "Two words",
      'node A at 1 2 label "Two words"',
    ],
    [
      "node A at 1 2 group",
      "group",
      "",
      "node A at 1 2",
    ],
    [
      "node A at 1 2 group",
      "collapsed",
      "",
      "node A at 1 2 group collapsed",
    ],
    [
      "node G at 0 0 group\nnode A at 1 2 in G",
      "G",
      "",
      "node G at 0 0 group\nnode A at 1 2",
    ],
    [
      "layout layered right",
      "right",
      "",
      "layout layered down",
    ],
    [
      "layout layered down",
      "depth",
      "",
      "layout layered down depth",
    ],
    [
      "layout layered down\nA -> B",
      "->",
      "",
      "layout layered down\nB -> A",
    ],
    [
      "layout layered down\nA -> B",
      "step",
      "curve",
      "layout layered down\nA -> B curve",
    ],
    [
      "layout layered down\nA -> B step",
      "step",
      "straight",
      "layout layered down\nA -> B straight",
    ],
    [
      "layout layered down\nA -> B",
      "animated",
      "",
      "layout layered down\nA -> B animated",
    ],
    [
      'layout layered down\nA -> B "old"',
      '"old"',
      "new",
      'layout layered down\nA -> B "new"',
    ],
    [
      "layout layered down\nA -> B",
      "A",
      "New name",
      'layout layered down\n"New name" -> B',
    ],
    ["snap 32", "32", "off", "snap off"],
    [
      "layout rooms\naxis x 層 一 二\nnode A 層=一",
      "層=一",
      "二",
      "layout rooms\naxis x 層 一 二\nnode A 層=二",
    ],
    [
      "layout rooms\naxis x 層 一\naxis y 担当 人",
      "x",
      "",
      "layout rooms\naxis y 層 一\naxis x 担当 人",
    ],
  ];
  return check(
    cases.every(
      ([source, token, value, expected]) => {
        const spec = parseSpec(source);
        if (spec.__tag === "Err") return false;
        const f = specFlow(spec.content),
          lines = printLines(f, []);
        const act = lines
          .flatMap((l) => [
            ...l.tokens,
            ...(l.ghosts ?? []),
          ])
          .filter((t) => t.text === token)
          .pop()?.act;
        return (
          !!act &&
          printSpec(act.change(value)(f), []) ===
            expected &&
          printSpec(f, []) === source
        );
      },
    ),
    toBe(true),
  );
});
test("row selection retains individual parallel wires, loops and additive node selection", () => {
  const spec = parseSpec(
    "node A at 0 0\nA -> B\nA -> B\nA -> A",
  );
  if (spec.__tag === "Err")
    return check(false, toBe(true));
  const f = specFlow(spec.content);
  const subjects = printLines(f, []).map(
    (l) => l.subject,
  );
  const selection = subjects.filter((s) =>
    s.kind === "node"
      ? s.id === "A"
      : s.kind === "edge" && s.index > 0,
  );
  const chosen = selection.reduce(
    (flow, s) => selectSubject(s, true)(flow),
    f,
  );
  return check(
    subjects.every(
      (s) =>
        subjectSelected(s, chosen) ===
        selection.includes(s),
    ) &&
      subjects.filter((s) =>
        subjectSelected(
          s,
          selectSubject(
            { kind: "edge", index: 0 },
            false,
          )(chosen),
        ),
      ).length === 1,
    toBe(true),
  );
});
