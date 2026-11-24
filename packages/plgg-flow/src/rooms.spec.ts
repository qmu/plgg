import { flowView } from "plgg-flow/index";
import { wireDepthRuns } from "plgg-flow/wireDepth";
import { wireGraph } from "plgg-flow/wiring";
import { portPosition } from "plgg-flow/nodeBody";
import { project } from "plgg-board";
import { viewAt } from "plgg-flow/model";
import {
  faceTable,
  inSlab,
} from "plgg-flow/roomCamera";
import {
  roomView,
  roomLabels,
} from "plgg-flow/roomView";
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

test("turning reveals one plate, ruling path and value per floor", () => {
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
  const floors = new Set(
    flow.rooms!.rooms.map((r) => r.min.z),
  ).size;
  return check(
    turned.match(/class="room-plate"/g)
      ?.length === floors &&
      turned.match(/class="room-ruling"/g)
        ?.length === floors &&
      front.includes(">app<") &&
      front.includes(">dev<") &&
      !front.includes(">live<") &&
      turned.includes(">live<") &&
      turned.includes(">env<"),
    toBe(true),
  );
});

test("the rooms lattice paints every stroke in at most eight paths", () => {
  const flow = read(sheet);
  const html = renderToString(
    roomView(flow.rooms!, flow.camera, flow),
  );
  const lattice = html.match(
    /<g class="room-lattice">([\s\S]*?)<\/g>/,
  )?.[1];
  const paths =
    lattice?.match(/<path\b/g)?.length ?? 0;
  return check(
    paths > 0 && paths <= 8,
    toBe(true),
  );
});
test("the axes share the ground origin, extend forty units and tick every slab boundary", () => {
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
        )(flow).camera,
        at = project(camera),
        origin = { x: 0, y: 0, z: 0 };
      const html = renderToString(
        roomView(layout, camera, flow),
      );
      return (
        (
          ["x", "y", "z"] satisfies (
            | "x"
            | "y"
            | "z"
          )[]
        ).every((axis) => {
          const limit = Math.max(
            ...layout.rooms.map(
              (r) => r.max[axis],
            ),
          );
          const end = at({
              ...origin,
              [axis]: limit + 40,
            }),
            start = at(origin);
          const path = html.match(
            new RegExp(
              'data-room-axis="' +
                axis +
                '" d="([^"]+)"',
            ),
          )?.[1];
          if (!yaw && axis === "z")
            return (
              path === `M${start.x} ${start.y}h0`
            );
          return (
            path?.startsWith(
              `M${start.x} ${start.y}L${end.x} ${end.y}M`,
            ) &&
            path.split("M").length - 4 ===
              new Set(
                layout.rooms.map(
                  (r) => r.min[axis],
                ),
              ).size +
                1
          );
        }) &&
        (yaw
          ? html.includes('class="room-plate"')
          : html.includes('class="room-floor"'))
      );
    }),
    toBe(true),
  );
});

test("slab selections intersect across attributes", () =>
  check(
    [
      { layer: "app" },
      { layer: "app", env: "live" },
    ].every(
      (selection, i) =>
        read(sheet).rooms!.rooms.filter((r) =>
          inSlab(
            {
              layer: r.values[0],
              env: r.values[2],
            },
            selection,
          ),
        ).length === (i ? 2 : 6),
    ),
    toBe(true),
  ));

test("each face fits its nodes into separate table cells or slots", () => {
  const flow = read(sheet);
  return check(
    (
      [
        [0, 0],
        [0, Math.PI / 2],
        [Math.PI / 2, 0],
      ] satisfies [number, number][]
    ).every(([yaw, pitch]) => {
      const table = faceTable(
        viewAt(yaw, pitch)(flow),
      );
      return (
        table.camera.yaw === 0 &&
        table.camera.pitch === 0 &&
        table.nodes.every((a, i) =>
          table.nodes
            .slice(i + 1)
            .every(
              (b) =>
                Math.abs(
                  a.position.x - b.position.x,
                ) *
                  2 >=
                  nodeSize(a).width +
                    nodeSize(b).width ||
                Math.abs(
                  a.position.y - b.position.y,
                ) *
                  2 >=
                  nodeSize(a).height +
                    nodeSize(b).height,
            ),
        )
      );
    }),
    toBe(true),
  );
});

test("room labels clear one another and perspective stays bounded through a turn", () => {
  const flow = read(sheet),
    layout = flow.rooms!;
  for (let y = -180; y < 180; y += 15)
    for (let p = -90; p <= 90; p += 15) {
      const camera = viewAt(
        (y * Math.PI) / 180,
        (p * Math.PI) / 180,
      )(flow).camera;
      const labels = roomLabels(
        layout,
        camera,
      ).map((l) => {
        const width = 13 * l.value.length;
        return {
          x:
            l.x +
            l.dx -
            (l.anchor === "end"
              ? width
              : l.anchor === "middle"
                ? width / 2
                : 0),
          y: l.y + l.dy,
          width,
        };
      });
      if (
        camera.perspective !== 0 ||
        labels.some((a, i) =>
          labels
            .slice(i + 1)
            .some(
              (b) =>
                a.x < b.x + b.width &&
                b.x < a.x + a.width &&
                Math.abs(a.y - b.y) < 14,
            ),
        )
      )
        return check(false, toBe(true));
    }
  return check(true, toBe(true));
});

test("floor plates reverse paint order after half a turn", () => {
  const flow = read(sheet);
  const values = (yaw: number) =>
    [
      ...renderToString(
        roomView(
          flow.rooms!,
          viewAt(yaw, 0.48)(flow).camera,
        ),
      ).matchAll(
        /class="room-floor-value"[^>]*>([^<]+)</g,
      ),
    ].map((m) => m[1]);
  const front = values(-0.62),
    back = values(Math.PI - 0.62);
  return check(
    front.length === 3 &&
      front.join() === back.reverse().join(),
    toBe(true),
  );
});

test("inter-floor wires use one vertical riser at the upper socket in either direction", () => {
  const flow = read(sheet + "\nA -> C\nC -> A");
  const wires = wireGraph(flow).filter(
    (w) => w.source.z !== w.target.z,
  );
  return check(
    wires.length >= 2 &&
      wires.every((w) => {
        const rises = w.target.z > w.source.z;
        const upper = rises ? w.target : w.source;
        const run = rises
          ? w.points.slice(0, -1)
          : w.points.slice(1);
        const foot = rises
          ? run[run.length - 1]
          : run[0];
        const target = flow.nodes.find(
          (n) => n.id === w.edge.target,
        )!;
        const socket = portPosition(
          target,
          w.targetSide,
          0,
        );
        return (
          w.target.x === socket.x &&
          w.target.y === socket.y &&
          foot?.x === upper.x &&
          foot.y === upper.y &&
          run.every(
            (p) =>
              p.z ===
              Math.min(w.source.z, w.target.z),
          )
        );
      }),
    toBe(true),
  );
});

test("hover and selection guide a room node to its three segment midpoints in one path", () => {
  const flow = read(sheet);
  const layout = flow.rooms!,
    node = flow.nodes[0]!,
    room = roomFor(layout, node)!;
  const camera = viewAt(-0.32, 0.26)(flow).camera,
    at = project(camera),
    p = at(node.position);
  const axes: readonly ("x" | "y" | "z")[] = [
    "x",
    "y",
    "z",
  ];
  const path = axes
    .map((axis) => {
      const q = at({
        x: 0,
        y: 0,
        z: 0,
        [axis]:
          (room.min[axis] + room.max[axis]) / 2,
      });
      return `M${p.x} ${p.y}L${q.x} ${q.y}`;
    })
    .join("");
  return check(
    [
      { ...flow, roomNode: node.id },
      selectNodes([node.id])(flow),
    ].every((state) => {
      const html = renderToString(
        roomView(layout, camera, state),
      );
      return (
        html.includes(
          `class="room-guides" d="${path}"`,
        ) &&
        html.match(/data-room-axis=/g)?.length ===
          3 &&
        html.match(/class="room-guides"/g)
          ?.length === 1
      );
    }),
    toBe(true),
  );
});

test("a wire only splits where an overlapping node has ink on both sides of its depth", () => {
  const points = [
    { x: 0, y: 0, z: 0, scale: 1 },
    { x: 100, y: 0, z: 100, scale: 1 },
  ];
  const box = {
    left: 25,
    right: 75,
    top: -10,
    bottom: 10,
    depth: 50,
  };
  const split = wireDepthRuns(points, [box]);
  return check(
    split.length === 2 &&
      split[0]?.[1]?.z === 50 &&
      split[1]?.[0]?.z === 50 &&
      wireDepthRuns(points, [
        { ...box, left: 80 },
      ]).length === 1 &&
      wireDepthRuns(points, [
        { ...box, top: 20, bottom: 30 },
      ]).length === 1,
    toBe(true),
  );
});

test("only an incident node or two pinned endpoints ink a room wire", () => {
  const flow = viewAt(-0.62, 0.48)(read(sheet));
  const tones = (state: typeof flow) =>
    [
      ...renderToString(flowView(state)).matchAll(
        /class="edge room-wire-(ink|pencil)"[^>]*data-edge-index="0"/g,
      ),
    ].map((m) => m[1]);
  const cases: readonly [typeof flow, string][] =
    [
      [flow, "pencil"],
      [
        { ...flow, roomHover: ["env", "live"] },
        "pencil",
      ],
      [{ ...flow, roomNode: "B" }, "ink"],
      [selectNodes(["A"])(flow), "ink"],
      [
        { ...flow, roomPins: { env: "live" } },
        "ink",
      ],
      [
        { ...flow, roomPins: { env: "test" } },
        "pencil",
      ],
    ];
  return check(
    cases.every(([state, tone]) => {
      const runs = tones(state);
      return (
        runs.length > 0 &&
        runs.every((t) => t === tone)
      );
    }),
    toBe(true),
  );
});
