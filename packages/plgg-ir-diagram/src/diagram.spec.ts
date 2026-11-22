import { test, check, toBe } from "plgg-test";
import { compileDiagram } from "plgg-ir-diagram/index";
import { diagramFlow } from "plgg-ir-diagram/widget";
const source =
  'diagram shop { a.send -> b.receive node a "送信" { out send: Order } group backend { node b { in receive: Order } } }';
test("forward references lower to the same graph through canonical IR", () => {
  const r = compileDiagram(source);
  const canonical =
    r.__tag === "Ok"
      ? compileDiagram(r.content.ir)
      : r;
  return check(
    r.__tag === "Ok" &&
      canonical.__tag === "Ok" &&
      JSON.stringify(r.content) ===
        JSON.stringify(canonical.content),
    toBe(true),
  );
});
test("a port diagnostic selects the reference and names the available port", () => {
  const bad = source.replace(
      "b.receive",
      "b.typo",
    ),
    r = compileDiagram(bad);
  return check(
    r.__tag === "Err" &&
      r.content.some(
        (d) =>
          bad.slice(
            d.range.start.offset,
            d.range.end.offset,
          ) === "typo" &&
          d.message.includes("receive"),
      ),
    toBe(true),
  );
});
test("reject malformed diagrams, type mismatches, duplicate IDs and ownership cycles", () =>
  check(
    [
      source.replace(
        "in receive: Order",
        "in receive: Receipt",
      ),
      "diagram s { node a node a }",
      "diagram s {",
      '(diagram s) (group a "A" b) (group b "B" a)',
    ].every(
      (s) => compileDiagram(s).__tag === "Err",
    ),
    toBe(true),
  ));
test("a label edit preserves a manually positioned node and the camera", () => {
  const before = compileDiagram(source),
    after = compileDiagram(
      source.replace("送信", "送信元"),
    );
  if (
    before.__tag === "Err" ||
    after.__tag === "Err"
  )
    return check(false, toBe(true));
  const f = diagramFlow(before.content),
    position = { x: 73, y: 91, z: 12 };
  const updated = diagramFlow(after.content, {
    ...f,
    nodes: f.nodes.map((n) =>
      n.id === "a" ? { ...n, position } : n,
    ),
  });
  return check(
    updated.nodes.find((n) => n.id === "a")
      ?.position === position &&
      updated.camera === f.camera,
    toBe(true),
  );
});
