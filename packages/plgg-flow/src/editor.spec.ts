import { some } from "plgg";
import {
  movePointer,
  type Drag,
} from "plgg-flow/model";
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

test("a sending side has one dot, a receiving side none, and the chosen stroke paints last", () => {
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
      // b only receives: arrowheads mark it, no dot
      [...html.matchAll(/data-port="b"/g)]
        .length === 0,
    toBe(true),
  );
});

test("a connection preview leaves rendered wire paths fixed", () => {
  const flow = selectNodes(["Order"])(
    createFlow({
      nodes: (
        [
          ["Order", -260, 0],
          ["Stock", -40, -90],
          ["Payment", -40, 90],
          ["Ship", 200, 0],
          ["Notify", 380, 0],
        ] satisfies [string, number, number][]
      ).map(([id, x, y]) => ({
        ...node(id),
        position: {
          x,
          y,
          z: 0,
        },
      })),
      edges: [
        { source: "Order", target: "Stock" },
        { source: "Order", target: "Payment" },
        { source: "Stock", target: "Ship" },
        { source: "Payment", target: "Ship" },
        { source: "Ship", target: "Notify" },
      ],
    }),
  );
  const pending = connect("Order")(flow);
  const dragging = {
    ...pending,
    drag: some<Drag>({
      mode: "connect",
      node: "Order",
      pointer: 1,
      last: { x: 0, y: 0 },
    }),
  };
  const paths = (state: typeof flow) =>
    Array.from(
      renderToString(flowView(state)).matchAll(
        /<path\b[^>]*data-edge="[^"]+"[^>]*>/g,
      ),
      (m) => m[0],
    );
  const before = paths(flow);
  return check(
    before.length === 5 &&
      [
        pending,
        dragging,
        movePointer(
          { x: 35, y: 64 },
          1,
        )(dragging),
      ].every(
        (state) =>
          JSON.stringify(paths(state)) ===
          JSON.stringify(before),
      ),
    toBe(true),
  );
});

test("an unrelated wire keeps its lazy argument when a card moves", () => {
  const state = createFlow({
    nodes: [
      node("a"),
      {
        ...node("b"),
        position: { x: 250, y: 0, z: 10 },
      },
      {
        ...node("c"),
        position: { x: 0, y: 400, z: 10 },
      },
      {
        ...node("d"),
        position: { x: 300, y: 400, z: 10 },
      },
    ],
    edges: [
      { id: "still", source: "a", target: "b" },
      { id: "moving", source: "c", target: "d" },
    ],
  });
  const wireArg = (
    view: ReturnType<typeof flowView>,
    id: string,
  ): unknown => {
    if (view.__tag === "Lazy")
      return renderToString(
        view.content.render(),
      ).includes('data-edge-id="' + id + '"')
        ? view.content.arg
        : undefined;
    if (view.__tag === "Element")
      for (const child of view.content.children) {
        const arg = wireArg(child, id);
        if (arg !== undefined) return arg;
      }
    return undefined;
  };
  const before = flowView(state);
  const after = flowView({
    ...state,
    nodes: state.nodes.map((n) =>
      n.id === "c"
        ? {
            ...n,
            position: { ...n.position, x: 20 },
          }
        : n,
    ),
  });
  const still = wireArg(before, "still"),
    moving = wireArg(before, "moving");
  return check(
    still !== undefined &&
      moving !== undefined &&
      still === wireArg(after, "still") &&
      moving !== wireArg(after, "moving"),
    toBe(true),
  );
});
test("twenty cards leave only a handful of eager SVG children", () => {
  const nodes = Array.from(
    { length: 20 },
    (_, i) => node(String(i)),
  );
  const flow = createFlow({ nodes, edges: [] });
  const before = flowView(flow);
  const after = flowView({
    ...flow,
    nodes: nodes.map((n, i) =>
      i === 0
        ? {
            ...n,
            position: { ...n.position, x: 16 },
          }
        : n,
    ),
  });
  if (
    before.__tag !== "Element" ||
    after.__tag !== "Element"
  )
    return check(false, toBe(true));
  const children = after.content.children;
  const reused = children.filter((child, i) => {
    const old = before.content.children[i];
    return (
      child.__tag === "Lazy" &&
      old?.__tag === "Lazy" &&
      child.content.fn === old.content.fn &&
      child.content.arg === old.content.arg
    );
  });
  return check(
    children.filter(
      (child) => child.__tag !== "Lazy",
    ).length <= 5 && reused.length >= 21,
    toBe(true),
  );
});
