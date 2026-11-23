import { renderToString } from "plgg-view";
import { test, check, toBe } from "plgg-test";
import {
  createFlow,
  flowView,
  connect,
  addNode,
  deleteSelected,
  selectArea,
  selectNodes,
  chooseEdges,
  selectedEdges,
  nodeSize,
  rotateView,
  viewAt,
  front,
} from "plgg-flow/index";
import { project, pan, zoomAt } from "plgg-board";
const node = (id: string) => ({
  id,
  label: id,
  position: { x: 0, y: 0, z: 10 },
});
test("deleting a selected node cleans up incident connections", () => {
  const initial = createFlow({
    nodes: [node("a")],
    edges: [],
  });
  const linked = connect("b")(
    connect("a")(addNode(node("b"))(initial)),
  );
  const duplicate = connect("b")(
    connect("a")(linked),
  );
  return check(
    linked.edges.length === 1 &&
      duplicate.edges.length === 1 &&
      deleteSelected(linked).edges.length === 0,
    toBe(true),
  );
});
test("returning to plan preserves spatial graph data", () => {
  const state = createFlow({
    nodes: [node("a")],
    edges: [],
  });
  const result = front(rotateView(state));
  return check(
    result.nodes === state.nodes &&
      result.camera.yaw === 0 &&
      result.camera.pitch === 0,
    toBe(true),
  );
});

test("inclining a panned, zoomed plan preserves edits and approaches the plan continuously", () => {
  const n = node("a");
  const edited = addNode({
    ...n,
    position: { x: 130, y: -40, z: 180 },
  })(createFlow({ nodes: [], edges: [] }));
  const state = {
    ...edited,
    camera: pan(
      30,
      -50,
    )(
      zoomAt(
        { x: 100, y: 90 },
        1.5,
      )(edited.camera),
    ),
  };
  const point = { x: 130, y: -40, z: 180 };
  const original = project(state.camera)(point);
  const almost = viewAt(
    0.000001,
    -0.000001,
  )(state);
  const near = project(almost.camera)(point);
  const tilted = viewAt(0.5, -0.5)(state);
  const oblique = project(tilted.camera)(point);
  const restored = front(tilted);
  const end = project(restored.camera)(point);
  return check(
    Math.hypot(
      near.x - original.x,
      near.y - original.y,
    ) < 0.001 &&
      Math.abs(oblique.x - original.x) > 5 &&
      end.x === original.x &&
      end.y === original.y &&
      restored.selected === state.selected &&
      restored.nodes === state.nodes &&
      restored.edges === state.edges,
    toBe(true),
  );
});

test("mixed selections delete parallel wires and cards together", () => {
  const a = { source: "a", target: "b" },
    b = { ...a },
    c = { source: "c", target: "d" };
  const graph = createFlow({
    nodes: ["a", "b", "c", "d"].map(node),
    edges: [a, b, c],
  });
  const area = selectArea(["a", "b"])(graph);
  const mixed = selectNodes(
    ["d"],
    true,
  )(chooseEdges([b])(graph));
  const removed = deleteSelected(mixed);
  return check(
    selectedEdges(area).length === 2 &&
      area.activeEdge === b &&
      removed.edges.length === 1 &&
      removed.edges[0] === a &&
      removed.nodes.length === 3 &&
      !removed.activeEdge,
    toBe(true),
  );
});
test("label width rounds padded text to an eight-unit grid", () =>
  check(
    nodeSize({ label: "a" }).width === 64 &&
      nodeSize({ label: "サービス" }).width ===
        88 &&
      nodeSize({ label: "Long label" }).width ===
        112 &&
      nodeSize({
        label: "Long label",
        width: 53,
        height: 27,
      }).height === 27 &&
      nodeSize({ label: "Long label", width: 53 })
        .width === 53,
    toBe(true),
  ));

test("shared sockets render once and the chosen stroke paints last", () => {
  const a = {
      id: "one",
      source: "a",
      target: "b",
      animated: true,
    },
    b = { ...a, id: "two" };
  const view = createFlow({
    nodes: [
      node("a"),
      {
        ...node("b"),
        position: { x: 280, y: 50, z: 10 },
      },
    ],
    edges: [a, b],
  });
  const html = renderToString(
    flowView(
      chooseEdges([a])(selectNodes(["a"])(view)),
    ),
  );
  const paths = [
    ...html.matchAll(
      /<path\b[^>]*data-edge-id="([^"]+)"[^>]*>/g,
    ),
  ];
  const chosen =
      paths.find((m) => m[1] === "one")?.[0] ??
      "",
    other =
      paths.find((m) => m[1] === "two")?.[0] ??
      "";
  const width = (path: string) =>
    Number(
      /stroke-width="([^"]+)"/.exec(path)?.[1],
    );
  return check(
    paths.length === 2 &&
      paths[paths.length - 1]?.[1] === "one" &&
      chosen.includes('data-chosen="true"') &&
      Math.abs(
        width(chosen) - 2.4 * width(other),
      ) < 1e-6 &&
      [...html.matchAll(/data-port="a"/g)]
        .length === 4 &&
      [...html.matchAll(/data-port="b"/g)]
        .length === 1,
    toBe(true),
  );
});
