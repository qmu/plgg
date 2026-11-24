import { renderToString } from "plgg-view";
import { flowView } from "plgg-flow/sheetView";
import { test, check, toBe } from "plgg-test";
import { roomFaceView } from "plgg-flow/roomCamera";
import { spaceScenery } from "plgg-flow/roomView";
import { planLayers } from "plgg-flow/autoLayout";

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
test("boards share a footprint and support their nodes at successive levels", () => {
  const spec = read(source);
  const plan = planLayers(
      spec.graph,
      spec.layout,
    ),
    rooms = specFlow(spec).rooms!.rooms;
  return check(
    plan.graph.nodes.every((n, i) => {
      const board = rooms[i]!,
        first = rooms[0]!,
        size = nodeSize(n);
      return (
        board.max.y === first.max.y + 144 * i &&
        board.min.x === first.min.x &&
        board.max.z === first.max.z &&
        n.position.y + size.height / 2 ===
          board.max.y &&
        n.within?.min.y === n.within?.max.y
      );
    }),
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
    layer = spaceScenery(flow.rooms!, flow),
    label = layer.find(
      (s) => s.kind === "label" && s.text === "A",
    );
  if (label?.kind !== "label" || !label.press)
    return check(false, toBe(true));
  const clicked = label.press(flow),
    pinned = roomFaceView(clicked);
  return check(
    !pinned.nodes[0]?.quiet &&
      pinned.nodes[1]?.quiet &&
      pinned.edges.every((e) => e.quiet) &&
      !roomFaceView(
        label.press(clicked),
      ).nodes.some((n) => n.quiet),
    toBe(true),
  );
});

test("in-board edges advance along x and drops pierce boards at marked holes", () => {
  const flow = specFlow(
    read(
      source + "\nnode four 層=A\none -> four",
    ),
  );
  const [first, second] = ["one", "four"].map(
    (id) => flow.nodes.find((n) => n.id === id)!,
  );
  const board = flow.rooms!.rooms[1]!;
  const point = {
    x: board.min.x + 8,
    z: board.min.z + 8,
    y: board.max.y,
  };
  const path = [
    { ...point, y: point.y - 32 },
    { ...point, y: point.y + 32 },
  ];
  const drawing = {
    ...flow,
    edges: [{ ...flow.edges[0]!, path }],
  };
  return check(
    first!.position.x < second!.position.x &&
      renderToString(flowView(drawing)).includes(
        'class="hole"',
      ),
    toBe(true),
  );
});

test("moving a node on its board survives printing and parsing", () => {
  const flow = specFlow(read(source));
  const edited = {
    ...flow,
    nodes: flow.nodes.map((n, i) =>
      i
        ? n
        : {
            ...n,
            position: {
              ...n.position,
              z: n.position.z + 8,
            },
          },
    ),
  };
  const printed = printSpec(edited, []);
  const restored = specFlow(read(printed));
  return check(
    restored.nodes[0]!.position.z ===
      edited.nodes[0]!.position.z &&
      printed === printSpec(restored, []),
    toBe(true),
  );
});
