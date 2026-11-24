import { quietMarked } from "plgg-flow/model";
import { writeCurrentView } from "plgg-flow/dsl";
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

test("marked nodes and wires keep their ink and survive printing", () => {
  const parsed = parseSpec(
    'mark A B "A -> B"\nA -> B\nB -> C',
  );
  if (parsed.__tag === "Err")
    throw Error(parsed.content);
  const f = specFlow(parsed.content);
  const printed = printSpec(f, []);
  const again = parseSpec(printed);
  return check(
    !quietMarked(f, "A") &&
      quietMarked(f, "C") &&
      !quietMarked(f, f.edges[0]!) &&
      quietMarked(f, f.edges[1]!) &&
      !quietMarked(
        { ...f, markCleared: true },
        "C",
      ) &&
      again.__tag === "Ok" &&
      JSON.stringify(again.content.mark) ===
        JSON.stringify(f.mark),
    toBe(true),
  );
});

test("writing a suggested view preserves comments and restores its camera", () => {
  const source =
    "layout rooms\naxis 層 A B\nnode a 層=A\nnode b 層=B\na -> b\n# keep\n";
  const parsed = parseSpec(source);
  if (parsed.__tag === "Err")
    throw Error(parsed.content);
  const f = specFlow(parsed.content);
  const written = writeCurrentView(source, f);
  const again = parseSpec(written);
  if (again.__tag === "Err")
    throw Error(again.content);
  const restored = specFlow(again.content);
  return check(
    !printSpec(f, []).includes("view ") &&
      written.startsWith(source) &&
      writeCurrentView(written, f) === written &&
      restored.camera.yaw === f.camera.yaw &&
      restored.camera.pitch === f.camera.pitch,
    toBe(true),
  );
});
