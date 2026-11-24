import { test, check, toBe } from "plgg-test";
import { project } from "plgg-board";
import { planLayers } from "plgg-flow/autoLayout";
import { layerView } from "plgg-flow/layerView";
import {
  parseSpec,
  specFlow,
  printSpec,
} from "plgg-flow/dsl";
import { nodeSize } from "plgg-flow/nodeSize";
const source = `layout layered down
axis 層 A B C
view layer=層
node one 層=A
node two 層=B
node three 層=C
one -> two
two -> three`;
const read = (s: string) => {
  const result = parseSpec(s);
  if (result.__tag === "Err")
    throw Error(result.content);
  return result.content;
};
test("layer classification lifts the flat layout onto equally bounded planes", () => {
  const spec = read(source),
    plan = planLayers(spec.graph, spec.layout),
    plain = planLayers(spec.graph, {
      direction: "down",
    });
  const flow = specFlow(spec),
    at = project({
      ...flow.camera,
      yaw: 0,
      pitch: 0,
    });
  return check(
    plan.graph.nodes.every((n, i) => {
      const p = at(n.position),
        q = at(plain.graph.nodes[i]!.position);
      return (
        p.x === q.x &&
        p.y === q.y &&
        n.position.z === -112 * i &&
        n.within?.min.z === n.within?.max.z
      );
    }) &&
      plan.planes?.length === 3 &&
      plan.planes.every(
        ({ min, max }) =>
          plan.graph.nodes.every((n) => {
            const { width, height } = nodeSize(n);
            return (
              min.x <=
                n.position.x - width / 2 - 32 &&
              max.x >=
                n.position.x + width / 2 + 32 &&
              min.y <=
                n.position.y - height / 2 - 32 &&
              max.y >=
                n.position.y + height / 2 + 32
            );
          }) &&
          min.x === plan.planes?.[0]?.min.x &&
          max.y === plan.planes?.[0]?.max.y,
      ),
    toBe(true),
  );
});
test("layer declarations validate their lines and survive printing", () => {
  const second = parseSpec(
      source + "\naxis other",
    ),
    depth = parseSpec(
      source.replace("down", "down depth"),
    );
  const flow = specFlow(read(source)),
    printed = printSpec(flow, []);
  return check(
    printed.includes("axis 層 A B C") &&
      second.__tag === "Err" &&
      second.content.includes("9") &&
      depth.__tag === "Err" &&
      printSpec(specFlow(read(printed)), []) ===
        printed,
    toBe(true),
  );
});
test("plate labels pin and release nodes and incident wires", () => {
  const flow = specFlow(read(source)),
    layer = layerView(flow),
    label = layer.scenery?.find(
      (s) => s.kind === "label" && s.text === "A",
    );
  if (label?.kind !== "label" || !label.press)
    return check(false, toBe(true));
  const clicked = label.press(flow),
    pinned = layerView(clicked);
  return check(
    !pinned.nodes[0]?.quiet &&
      pinned.nodes[1]?.quiet &&
      pinned.edges.every((e) => e.quiet) &&
      !layerView(label.press(clicked)).nodes.some(
        (n) => n.quiet,
      ),
    toBe(true),
  );
});
