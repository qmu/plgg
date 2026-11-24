import { labelWidth } from "plgg-flow/nodeSize";
import { wireGraph } from "plgg-flow/wiring";
import { some } from "plgg";
import {
  movePointer,
  moveSelectionGeometry,
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
const flatNode = (id: string) => ({
  ...node(id),
  position: { x: 0, y: 0, z: 0 },
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
test("label width rounds padded text to the 16-unit grid", () =>
  check(
    labelWidth("商品DB") === 41 &&
      labelWidth("カ\u3099") === 13 &&
      labelWidth("ｶ") === 7.5 &&
      nodeSize({ label: "商品ページ", width: 32 })
        .width >= labelWidth("商品ページ") &&
      nodeSize({ label: "a" }).height === 32 &&
      nodeSize({ label: "a" }).width === 64 &&
      nodeSize({ label: "サービス" }).width ===
        80 &&
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
      flatNode("a"),
      {
        ...flatNode("b"),
        position: { x: 280, y: 50, z: 0 },
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
      flatNode("a"),
      {
        ...flatNode("b"),
        position: { x: 250, y: 0, z: 0 },
      },
      {
        ...flatNode("c"),
        position: { x: 0, y: 400, z: 0 },
      },
      {
        ...flatNode("d"),
        position: { x: 300, y: 400, z: 0 },
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
    (_, i) => flatNode(String(i)),
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

test("opposing arrows meet the three-unit rim before either socket dot paints", () => {
  const flow = createFlow({
    nodes: [
      flatNode("a"),
      {
        ...flatNode("b"),
        position: { x: 280, y: 20, z: 0 },
      },
    ],
    edges: [
      {
        source: "a",
        target: "b",
        route: "straight",
      },
      {
        source: "b",
        target: "a",
        route: "straight",
      },
    ],
  });
  const html = renderToString(flowView(flow));
  const tips = [
    ...html.matchAll(
      /data-arrow="end" transform="translate\(([^ ]+) ([^)]+)\) rotate\(([^)]+)\)/g,
    ),
  ];
  const sockets = wireGraph(flow).map((w) =>
    project(flow.camera)(w.target),
  );
  return check(
    tips.length === 2 &&
      html.indexOf("data-port=") >
        html.lastIndexOf("data-arrow=") &&
      sockets.every((p) =>
        tips.some((t) => {
          const angle =
            (Number(t[3]) * Math.PI) / 180;
          return (
            Math.hypot(
              Number(t[1]) +
                3 * Math.cos(angle) -
                p.x,
              Number(t[2]) +
                3 * Math.sin(angle) -
                p.y,
            ) < 1e-6
          );
        }),
      ),
    toBe(true),
  );
});

test("a turned tray projects its frame, corner control and member stem onto the group plane", () => {
  const group = {
    ...node("team"),
    group: true,
    width: 192,
    height: 128,
    position: { x: 0, y: 0, z: 32 },
  };
  const child = {
    ...node("member"),
    parent: "team",
    position: { x: 16, y: 16, z: 64 },
  };
  const flow = rotateView(
    createFlow({
      nodes: [group, child],
      edges: [],
    }),
  );
  const html = renderToString(flowView(flow));
  const at = project(flow.camera);
  const corners = [
    [-96, -64],
    [96, -64],
    [96, 64],
    [-96, 64],
  ]
    .map(([x, y]) => {
      const p = at({ x: x!, y: y!, z: 32 });
      return p.x + " " + p.y;
    })
    .join("L");
  const base = at({
    ...child.position,
    z: group.position.z,
  });
  const trayOnly = renderToString(
    flowView({ ...flow, nodes: [group] }),
  );
  return check(
    html.includes('data-id="node:team"') &&
      html.includes(
        'data-id="handle:node:team"',
      ) &&
      html.includes('d="M' + corners + 'Z"') &&
      html.includes('class="stem line"') &&
      html.includes(
        "M" + base.x + " " + base.y + "L",
      ) &&
      !trayOnly.includes('class="node up"') &&
      !trayOnly.includes('class="node shade"'),
    toBe(true),
  );
});

test("moving a member grows each stored tray by a grid square of clearance", () => {
  const flow = createFlow({
    nodes: [
      { ...node("outer"), group: true },
      {
        ...node("inner"),
        group: true,
        parent: "outer",
      },
      { ...node("leaf"), parent: "inner" },
    ],
    edges: [],
  });
  const { nodes } = moveSelectionGeometry(
    flow,
    ["leaf"],
    { x: 151, y: -77, z: 0 },
  );
  return check(
    nodes.every((child) => {
      const parent = nodes.find(
        (n) => n.id === child.parent,
      );
      if (!parent) return true;
      const c = nodeSize(child),
        p = nodeSize(parent);
      return (
        Math.abs(
          child.position.x - parent.position.x,
        ) +
          c.width / 2 +
          16 <=
          p.width / 2 &&
        Math.abs(
          child.position.y - parent.position.y,
        ) +
          c.height / 2 +
          16 <=
          p.height / 2 &&
        (parent.position.x - p.width / 2) % 16 ===
          0 &&
        (parent.position.y - p.height / 2) %
          16 ===
          0
      );
    }),
    toBe(true),
  );
});
