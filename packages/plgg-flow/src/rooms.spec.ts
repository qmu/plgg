import { drawFlow } from "plgg-flow/viewport";
import { flowView } from "plgg-flow/index";
import { wireDepthRuns } from "plgg-flow/wireDepth";
import { wireGraph } from "plgg-flow/wiring";
import {
  bodyDepth,
  portPosition,
} from "plgg-flow/nodeBody";
import { project } from "plgg-board";
import { viewAt } from "plgg-flow/model";
import {
  roomFaceView,
  roomViews,
  inSlab,
} from "plgg-flow/roomCamera";
import {
  spaceScenery,
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
  moveConstrainedSelection,
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
test("rooms contain every box and cards stand on their storey and occupy disjoint volumes", () => {
  const flow = read(sheet),
    layout = flow.rooms!;
  return check(
    flow.nodes.every((n, i) => {
      const r = roomFor(layout, n)!,
        s = nodeSize(n),
        p = n.position;
      return (
        p.x - s.width / 2 >= r.min.x &&
        p.y - s.height / 2 >= r.min.y &&
        p.x + s.width / 2 <= r.max.x &&
        p.y + s.height / 2 <= r.max.y &&
        p.y + s.height / 2 === r.max.y - 16 &&
        p.z > r.min.z &&
        p.z < r.max.z &&
        flow.nodes
          .slice(i + 1)
          .every(
            (m) =>
              Math.abs(m.position.z - p.z) >=
                32 ||
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
                ? axis === "y"
                  ? s.max.y <= r.min.y
                  : r.max[axis] <= s.min[axis]
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
    p = moveConstrainedSelection(flow, [n.id], {
      x: 5000,
      y: -500,
      z: 400,
    }).nodes[0]!,
    r = roomFor(flow.rooms!, n)!;
  const printed = printSpec(flow, []);
  return check(
    !printed.includes(" at ") &&
      printSpec(read(printed), []) === printed &&
      r.index[0] === 1 &&
      r.values[0] === "z" &&
      aligned(p) &&
      p.position.x + nodeSize(p).width / 2 <=
        r.max.x &&
      p.position.y - nodeSize(p).height / 2 >=
        r.min.y &&
      p.position.z < r.max.z &&
      p.position.z > r.min.z,
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

test("named views draw the standard solid and dimension labels", () => {
  const flow = read(sheet);
  return check(
    roomViews.every(([, yaw, pitch]) => {
      const state = viewAt(yaw, pitch)(flow),
        html = renderToString(flowView(state));
      const { rooms, ...ordinaryState } = state;
      const ordinary = renderToString(
        flowView(ordinaryState),
      );
      const faces = (markup: string) =>
        markup
          .match(
            /<polygon[^>]*data-node-face[^>]*>/g,
          )
          ?.join("");
      return (
        spaceScenery(flow.rooms!, state).every(
          (item) =>
            item.layer === "front" ||
            item.layer === "behind",
        ) &&
        html.indexOf('fill-opacity="0.92"') >=
          0 &&
        !!faces(html) &&
        faces(html) === faces(ordinary) &&
        JSON.stringify(
          html.match(
            /<g data-node-caption[\s\S]*?<\/svg><\/g>/g,
          ),
        ) ===
          JSON.stringify(
            ordinary.match(
              /<g data-node-caption[\s\S]*?<\/svg><\/g>/g,
            ),
          ) &&
        spaceScenery(flow.rooms!, state).some(
          (item) =>
            item.kind === "label" &&
            item.size === 10,
        )
      );
    }),
    toBe(true),
  );
});
test("two-block outline edges support their cuboids and axis labels clear cards through a turn", () => {
  const original = read(
    sheet
      .replace(
        "node A ",
        "axis region Tokyo Osaka\nview x=layer y=owner z=env column=region\nnode A region=Tokyo ",
      )
      .replace("node B ", "node B region=Osaka ")
      .replace(
        /node ([CDE]) /g,
        "node $1 region=Tokyo ",
      ),
  );
  const layout = original.rooms!;
  const poses = [
    ...[10, 30, 55].flatMap((elevation) =>
      Array.from({ length: 11 }, (_, i) => [
        ((i * 30 - 150) * Math.PI) / 180,
        (-elevation * Math.PI) / 180,
      ]),
    ),
    [-0.6, 0.5],
    ...Array.from({ length: 8 }, (_, i) =>
      [0.22, 0.91].map((p) => [
        (i * Math.PI) / 4,
        p,
      ]),
    ).flat(),
  ];
  for (const [yaw, pitch] of poses) {
    const f = roomFaceView(
      viewAt(yaw!, pitch!)(original),
    );
    const at = project(f.camera);
    const blocks = [
      ...new Set(
        layout.rooms.map((r) => r.block),
      ),
    ].map((block) => {
      const rooms = layout.rooms.filter(
        (r) => r.block === block,
      );
      return rooms.flatMap((r) =>
        [r.min.x, r.max.x].flatMap((x) =>
          [r.min.y, r.max.y].flatMap((y) =>
            [r.min.z, r.max.z].map((z) =>
              at({ x, y, z }),
            ),
          ),
        ),
      );
    });
    const occupied = f.nodes
      .filter((n) => !n.hidden)
      .map((n) => {
        const { width, height } = nodeSize(n),
          p = n.position,
          d = bodyDepth(n);
        const corners = [-1, 1].flatMap((i) =>
          [-1, 1].flatMap((j) =>
            [-1, 1].map((k) =>
              at({
                x: p.x + (i * width) / 2,
                y: p.y + (j * height) / 2,
                z: p.z + k * d,
              }),
            ),
          ),
        );
        return {
          left: Math.min(
            ...corners.map((q) => q.x),
          ),
          right: Math.max(
            ...corners.map((q) => q.x),
          ),
          top: Math.min(
            ...corners.map((q) => q.y),
          ),
          bottom: Math.max(
            ...corners.map((q) => q.y),
          ),
        };
      });
    const labels = roomLabels(
      layout,
      f.camera,
      f.nodes,
    );
    for (const l of [
      ...labels.filter((l) => !("axis" in l)),
      ...labels.filter((l) => "axis" in l),
    ]) {
      const x = l.x + l.dx,
        y = l.y + l.dy,
        w = (l.value.length * 13) / 2;
      if (
        "axis" in l &&
        typeof l.axis === "string"
      ) {
        if (
          occupied.some(
            (b) =>
              x - w < b.right &&
              x + w > b.left &&
              y - 7 < b.bottom &&
              y + 7 > b.top,
          )
        )
          return check(false, toBe(true));
        const zero = at({ x: 0, y: 0, z: 0 }),
          unit = at({
            x: 0,
            y: 0,
            z: 0,
            [l.axis]: 1,
          });
        const nx = zero.y - unit.y,
          ny = unit.x - zero.x;
        if (
          !blocks.some((points) => {
            const dots = points.map(
              (p) =>
                (p.x - l.x) * nx +
                (p.y - l.y) * ny,
            );
            return (
              Math.abs(Math.min(...dots)) <
                1e-6 ||
              Math.abs(Math.max(...dots)) < 1e-6
            );
          })
        )
          return check(false, toBe(true));
      }
      occupied.push({
        left: x - w,
        right: x + w,
        top: y - 7,
        bottom: y + 7,
      });
    }
  }
  return check(true, toBe(true));
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

test("camera changes preserve world positions and pins isolate a slab", () => {
  const f = viewAt(0, 0)(read(sheet));
  const face = roomFaceView(f);
  const at = project(face.camera);
  const n = f.nodes[0]!,
    p = at(n.position),
    q = at(face.nodes[0]!.position);
  const pinned = roomFaceView({
    ...f,
    roomPins: { env: "live" },
  });
  return check(
    face.rooms === f.rooms &&
      q.x === p.x &&
      q.y === p.y &&
      pinned.nodes.every(
        (n) =>
          !!n.quiet === (n.data?.env !== "live"),
      ),
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
        Number(camera.perspective) !== 0 ||
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

test("space routes use standard flank sockets", () => {
  const f = read(sheet);
  return check(
    wireGraph(f).every((w) => {
      const node = f.nodes.find(
        (n) => n.id === w.edge.target,
      )!;
      const p = portPosition(
        node,
        w.targetSide,
        0,
      );
      return (
        w.target.z === p.z &&
        (w.target.x === p.x || w.target.y === p.y)
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

test("quiet space wires gain ink on incident hover and selection", () => {
  const f = read(sheet);
  const quiet = (state: typeof f) =>
    /class="edge quiet-wire"[^>]*data-edge-index="0"/.test(
      renderToString(flowView(state)),
    );
  const pinned = {
    ...f,
    roomPins: { env: "test" },
  };
  return check(
    !quiet(f) &&
      quiet(pinned) &&
      !quiet({ ...pinned, hoveredNode: "B" }) &&
      !quiet(selectNodes(["A"])(pinned)),
    toBe(true),
  );
});
test("roles and pinned slices round-trip independently of declaration order", () => {
  const source =
    'layout rooms\naxis owner one two\naxis env a b\naxis "x" left right\naxis region east west\naxis team red blue\nview row=owner pin=env=b y=x column=region x=team\nnode A env=a\nnode B env=b';
  const flow = read(source);
  const printed = printSpec(flow, []);
  const view = roomFaceView(
    viewAt(-0.6, 0.5)(flow),
  );
  const declaration = read(
    "layout rooms\naxis z env prod test\nnode A env=prod",
  );
  const legacy = printSpec(declaration, []);
  return check(
    printed === printSpec(read(printed), []) &&
      printed.includes("pin=env=b") &&
      view.nodes.find((n) => n.id === "A")
        ?.hidden === true &&
      !view.nodes.find((n) => n.id === "B")
        ?.hidden &&
      legacy.includes(
        "axis env prod test\nview z=env",
      ) &&
      !printSpec(read(sheet), []).includes(
        "view ",
      ),
    toBe(true),
  );
});

test("an unpinned space paints every background item before its first node", () => {
  const flow = read(sheet);
  const state = roomFaceView({
    ...flow,
    roomHover: ["owner", "unknown"],
    nodes: flow.nodes.map((n) => ({
      ...n,
      quiet: true,
    })),
  });
  const scenery = spaceScenery(
    state.rooms!,
    state,
  ).map((item, i) => ({
    ...item,
    tone: "paint-marker-" + i + "-end",
  }));
  const html = renderToString(
    drawFlow({ ...state, scenery }),
  );
  const first = html.indexOf("data-node-face");
  return check(
    first >= 0 &&
      state.nodes.every((n) => !n.quiet) &&
      scenery.every((item, i) => {
        const mark = html.indexOf(
          "paint-marker-" + i + "-end",
        );
        return (
          mark >= 0 &&
          (item.layer === "front" || mark < first)
        );
      }),
    toBe(true),
  );
});
