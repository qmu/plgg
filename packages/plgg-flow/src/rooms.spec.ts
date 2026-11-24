import { project } from "plgg-board";
import { wireGraph } from "plgg-flow/wiring";
import { viewAt } from "plgg-flow/model";
import { roomView } from "plgg-flow/roomView";
import { renderToString } from "plgg-view";
import { test, check, toBe } from "plgg-test";
import { some } from "plgg";
import {
  planRooms,
  planLayers,
  roomFor,
} from "plgg-flow/autoLayout";
import { nodeSize } from "plgg-flow/nodeSize";
import {
  movePointer,
  resizeNode,
  selectNodes,
  settleRooms,
  type Drag,
  type FlowNode,
} from "plgg-flow/model";
import {
  parseSpec,
  specFlow,
  printSpec,
} from "plgg-flow/dsl";
const read = (source: string) => {
  const r = parseSpec(source);
  if (r.__tag === "Err") throw Error(r.content);
  return specFlow(r.content);
};
const aligned = (n: FlowNode, step = 16) => {
  const s = nodeSize(n);
  return (
    (n.position.x - s.width / 2) % step === 0 &&
    (n.position.y - s.height / 2) % step === 0
  );
};
const sheet = `layout rooms
axis x layer app db
axis y owner ops dev
axis z env live test
node A layer=app owner=dev env=live
node B layer=app owner=dev env=live
node C layer=app owner=dev env=test width 105 height 39
node D layer=db owner=ops env=test
node E layer=db owner=ops
A -> B
C -> D`;
test("rooms contain every box and floors occupy disjoint bands in the front view", () => {
  const flow = read(sheet),
    layout = flow.rooms!;
  return check(
    flow.nodes.every((n, i) => {
      const r = roomFor(layout, n)!,
        s = nodeSize(n),
        p = n.position;
      return (
        aligned(n) &&
        p.x - s.width / 2 >= r.min.x &&
        p.y - s.height / 2 >= r.min.y &&
        p.x + s.width / 2 <= r.max.x &&
        p.y + s.height / 2 <= r.max.y &&
        p.z === r.min.z &&
        p.z < r.max.z &&
        flow.nodes
          .slice(i + 1)
          .every(
            (m) =>
              Math.abs(m.position.x - p.x) * 2 >=
                s.width + nodeSize(m).width ||
              Math.abs(m.position.y - p.y) * 2 >=
                s.height + nodeSize(m).height,
          )
      );
    }),
    toBe(true),
  );
});
test("slabs meet at common boundaries and the complete lattice includes empty rooms", () => {
  const layout = read(sheet).rooms!,
    corners = new Set<string>();
  for (const r of layout.rooms)
    for (const x of [r.min.x, r.max.x])
      for (const y of [r.min.y, r.max.y])
        for (const z of [r.min.z, r.max.z])
          corners.add([x, y, z].join(","));
  return check(
    layout.rooms.length === 12 &&
      corners.size === 3 * 3 * 4 &&
      layout.rooms.every((r) =>
        layout.rooms.every((s) =>
          (
            ["x", "y", "z"] satisfies (
              | "x"
              | "y"
              | "z"
            )[]
          ).every((axis, i) =>
            r.index[i] === s.index[i]
              ? r.min[axis] === s.min[axis] &&
                r.max[axis] === s.max[axis]
              : r.index[i]! < s.index[i]!
                ? r.max[axis] <= s.min[axis]
                : true,
          ),
        ),
      ),
    toBe(true),
  );
});
test("axis permutations, missing values, input ordering and additions preserve room assignments", () => {
  const flow = read(sheet),
    layout = flow.rooms!,
    axes = layout.axes;
  const swapped = planRooms(flow, {
    x: axes.z!,
    y: axes.y!,
    z: axes.x!,
  });
  const reversed = planRooms(
    {
      nodes: [...flow.nodes].reverse(),
      edges: [...flow.edges].reverse(),
    },
    axes,
  );
  const grown = read(
    sheet +
      "\nnode F layer=app owner=dev env=test",
  ).rooms!;
  return check(
    roomFor(layout, flow.nodes[4]!)?.values[2] ===
      "—" &&
      flow.nodes.every((n) => {
        const r = roomFor(layout, n)!,
          s = roomFor(swapped, n)!,
          p = reversed.graph.nodes.find(
            (m) => m.id === n.id,
          )!.position;
        return (
          r.index.join() ===
            roomFor(grown, n)?.index.join() &&
          r.index.join() ===
            [
              s.index[2],
              s.index[1],
              s.index[0],
            ].join() &&
          p.x === n.position.x &&
          p.y === n.position.y &&
          p.z === n.position.z
        );
      }),
    toBe(true),
  );
});
test("room DSL infers value order, ignores at, prints attributes and settles a dragged box", () => {
  const flow = read(
      "layout rooms\naxis x kind\nnode C kind=z at 999 999\nnode B kind=a",
    ),
    n = flow.nodes[0]!,
    p = settleRooms({
      ...flow,
      nodes: [
        {
          ...n,
          position: { x: 5000, y: -500, z: 400 },
        },
      ],
    }).nodes[0]!,
    r = roomFor(flow.rooms!, n)!;
  const printed = printSpec(flow, []);
  return check(
    !printed.includes(" at ") &&
      printSpec(read(printed), []) === printed &&
      r.index[0] === 0 &&
      r.values[0] === "z" &&
      aligned(p) &&
      p.position.x + nodeSize(p).width / 2 <=
        r.max.x &&
      p.position.y - nodeSize(p).height / 2 >=
        r.min.y &&
      p.position.z === r.min.z,
    toBe(true),
  );
});
test("drag aligns box corners, snap off moves freely, and resizing and layered placement use whole squares", () => {
  const dragged = (directive: string) => {
    const flow = selectNodes(["A"])(
      read(
        directive +
          "\nnode A at 7 9 width 105 height 39",
      ),
    );
    return movePointer(
      { x: 43, y: 19 },
      1,
    )({
      ...flow,
      drag: some<Drag>({
        mode: "node",
        node: "A",
        pointer: 1,
        last: { x: 0, y: 0 },
      }),
    }).nodes[0]!;
  };
  const free = dragged("snap off"),
    sized = resizeNode(free, 101, 59);
  return check(
    read("").snap === 16 &&
      aligned(dragged("")) &&
      aligned(dragged("snap 8"), 8) &&
      aligned(dragged("snap 32"), 32) &&
      free.position.x === 50 &&
      free.position.y === 28 &&
      aligned(sized) &&
      sized.width === 96 &&
      sized.height === 64 &&
      planLayers(read(sheet)).graph.nodes.every(
        (n) => aligned(n),
      ) &&
      ["snap off", "snap 16", "snap 32"].every(
        (d) =>
          printSpec(read(d), []) ===
          (d === "snap 16" ? "" : d),
      ),
    toBe(true),
  );
});

test("multi-selection drags align authored boxes and carry the whole selection through successive steps", () => {
  const flow = selectNodes(["A", "B"])(
      read(
        "node A at 31 17\nnode B at 142 68 width 105",
      ),
    ),
    drag = {
      mode: "node",
      node: "A",
      pointer: 7,
      last: { x: 0, y: 0 },
    } satisfies Drag;
  const first = movePointer(
      { x: 44, y: 43 },
      7,
    )({ ...flow, drag: some(drag) }),
    next = movePointer(
      { x: 76, y: 75 },
      7,
    )(first);
  return check(
    first.nodes.every((n) => aligned(n)) &&
      next.nodes.every(
        (n, i) =>
          aligned(n) &&
          n.position.x -
            first.nodes[i]!.position.x ===
            32 &&
          n.position.y -
            first.nodes[i]!.position.y ===
            32,
      ),
    toBe(true),
  );
});

test("successive layers leave six squares between default boxes", () => {
  const graph = read("A -> B");
  return check(
    (
      ["right", "down"] satisfies (
        | "right"
        | "down"
      )[]
    ).every((direction) => {
      const [a, b] = planLayers(graph, {
        direction,
      }).graph.nodes;
      if (!a || !b) return false;
      const axis =
          direction === "right" ? "x" : "y",
        dimension =
          direction === "right"
            ? "width"
            : "height";
      return (
        b.position[axis] -
          a.position[axis] -
          (nodeSize(a)[dimension] +
            nodeSize(b)[dimension]) /
            2 ===
        96
      );
    }),
    toBe(true),
  );
});

test("the viewport draws each lattice edge once and reveals floor labels on rotation", () => {
  const flow = read(sheet),
    html = (angle: number) =>
      renderToString(
        roomView(
          flow.rooms!,
          viewAt(angle, 0)(flow).camera,
        ),
      ),
    front = html(0),
    turned = html(-0.5);
  const segments = [
    ...turned.matchAll(/ d="([^"]*)"/g),
  ].map((m) => m[1]!.split("M").length - 1);
  return check(
    segments.reduce((a, b) => a + b, 0) ===
      2 * 3 * 4 + 3 * 2 * 4 + 3 * 3 * 3 &&
      front.includes(">app<") &&
      front.includes(">dev<") &&
      !front.includes(">live<") &&
      turned.includes(">live<") &&
      turned.includes(">env<"),
    toBe(true),
  );
});

test("lattice partitions have three strengths and anchors clear the projected cuboid by twelve pixels", () => {
  const flow = read(sheet),
    layout = flow.rooms!;
  return check(
    [
      [0, 0],
      [-0.6, 0.5],
      [0.6, -0.5],
    ].every(([yaw, pitch]) => {
      const camera = viewAt(
        yaw!,
        pitch!,
      )(flow).camera;
      const html = renderToString(
        roomView(layout, camera),
      );
      const limits =
        layout.rooms[layout.rooms.length - 1]!
          .max;
      const corners = [0, limits.x].flatMap((x) =>
        [0, limits.y].flatMap((y) =>
          [0, limits.z].map((z) =>
            project(camera)({ x, y, z }),
          ),
        ),
      );
      const anchors = [
        ...html.matchAll(
          /<text x="([^"]+)" y="([^"]+)"/g,
        ),
      ];
      return (
        anchors.length === (yaw ? 10 : 6) &&
        anchors.every(([, x, y]) =>
          corners.some((p) =>
            corners.some((q) => {
              const dx = q.x - p.x,
                dy = q.y - p.y,
                length = Math.hypot(dx, dy);
              if (!length) return false;
              const side = (
                u: number,
                v: number,
              ) =>
                ((u - p.x) * dy -
                  (v - p.y) * dx) /
                length;
              return (
                corners.every(
                  (r) => side(r.x, r.y) <= 1e-6,
                ) &&
                side(Number(x), Number(y)) >=
                  11.99
              );
            }),
          ),
        ) &&
        ["outer", "inner", "empty"].every(
          (kind) =>
            html.includes(
              'class="room-' + kind + '" d="M',
            ),
        ) &&
        html.includes('class="room-floor"')
      );
    }),
    toBe(true),
  );
});

test("only room wires changing floor have vertical end segments", () => {
  const f = read(sheet + "\nA -> C\nC -> A");
  const regular = wireGraph({
    nodes: f.nodes,
    edges: f.edges,
  });
  return check(
    wireGraph(f).every((w, i) => {
      if (w.source.z === w.target.z)
        return (
          JSON.stringify(w.points) ===
          JSON.stringify(regular[i]!.points)
        );
      const start = w.points[1]!,
        end = w.points[w.points.length - 2]!;
      const rise =
        Math.sign(w.target.z - w.source.z) * 16;
      return (
        start.x === w.source.x &&
        start.y === w.source.y &&
        start.z === w.source.z + rise &&
        end.x === w.target.x &&
        end.y === w.target.y &&
        end.z === w.target.z - rise
      );
    }),
    toBe(true),
  );
});
