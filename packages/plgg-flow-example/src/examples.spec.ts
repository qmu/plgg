import { sheetTools } from "plgg-ir-diagram/flowSheet";
import { project } from "plgg-board";
import {
  frameOf,
  faceTable,
  roomLabels,
  nodeSize,
  bodyDepth,
  viewAt,
} from "plgg-flow";
import { test, check, toBe } from "plgg-test";
import {
  parseSpec,
  printSpec,
  printLines,
  joinLine,
} from "plgg-flow/dsl";
import {
  demoSheetTools,
  examples,
  resizeDemo,
  fitDemo,
  applyDemoSpec,
} from "plgg-flow-example/examples";
test("all twenty-six diagrams have unique identities and valid directed edges", () =>
  check(
    new Set(examples.map((e) => e.name)).size ===
      26 &&
      examples.every(({ initial }) => {
        const graph = initial();
        const ids = new Set(
          graph.nodes.map((n) => n.id),
        );
        return (
          ids.size === graph.nodes.length &&
          graph.edges.length > 0 &&
          graph.edges.every(
            (e) =>
              ids.has(e.source) &&
              ids.has(e.target),
          ) &&
          new Set(
            graph.edges.map((edge) =>
              JSON.stringify(edge),
            ),
          ).size === graph.edges.length
        );
      }),
    toBe(true),
  ));
test("every diagram is written in the DSL and prints back to the same graph", () =>
  check(
    examples.every((e) => {
      const first = parseSpec(e.source);
      if (first.__tag === "Err") return false;
      const printed = printSpec(
        e.initial(),
        first.content.rules,
      );
      const again = parseSpec(printed);
      return (
        again.__tag === "Ok" &&
        JSON.stringify(again.content) ===
          JSON.stringify(first.content)
      );
    }),
    toBe(true),
  ));

test("the layered demo prints edges only after its directive", () => {
  const demo = examples.find(
    (e) => e.id === "layered",
  )!;
  return check(
    printSpec(demo.initial(), demo.spec().rules),
    toBe(demo.source.trim()),
  );
});

test("opening and resetting fit a wide diagram with a 48 pixel margin and cap small diagrams at unit scale", () => {
  const flow = examples[0]!.initial();
  const node = flow.nodes[0]!;
  const fit = (width: number) =>
    fitDemo({
      ...flow,
      nodes: [
        {
          ...node,
          width,
          height: 20,
          position: { x: 300, y: 100, z: 0 },
        },
      ],
      edges: [],
    }).camera;
  const wide = fit(1608);
  return check(
    wide.scale === 0.5 &&
      wide.origin.x + (300 - 804) * wide.scale ===
        48 &&
      fit(20).scale === 1,
    toBe(true),
  );
});

test("resizing the layered board refits a fitted camera and preserves a manually framed view", () => {
  const flow = examples
    .find((e) => e.id === "layered")!
    .initial();
  const tall = resizeDemo(flow, 1400, true);
  const camera = {
    ...flow.camera,
    scale: 2,
    origin: { x: 410, y: 310 },
  };
  const panned = resizeDemo(
    { ...flow, camera },
    1400,
    false,
  );
  return check(
    frameOf(flow).x === 900 &&
      frameOf(flow).y === 580 &&
      frameOf(tall).y === 1400 &&
      tall.camera.scale > flow.camera.scale &&
      panned.camera.scale === camera.scale &&
      panned.camera.origin.x ===
        camera.origin.x &&
      panned.camera.origin.y - 700 ===
        camera.origin.y - 290,
    toBe(true),
  );
});
test("DSL geometry edits refit the board and text-only edits preserve the camera", () => {
  const demo = examples.find(
    (e) => e.id === "layered",
  )!;
  const flow = demo.initial();
  const panned = {
    ...flow,
    camera: {
      ...flow.camera,
      origin: { x: 40, y: 30 },
    },
  };
  const edited = parseSpec(
    demo.source + "\nnode Remote at 40000 200",
  );
  if (edited.__tag === "Err")
    return check(false, toBe(true));
  const changed = applyDemoSpec(edited.content)(
    panned,
  );
  return check(
    applyDemoSpec(demo.spec())(panned).camera ===
      panned.camera &&
      changed.camera.scale < flow.camera.scale &&
      JSON.stringify(changed.camera) ===
        JSON.stringify(fitDemo(changed).camera),
    toBe(true),
  );
});

test("every gallery box sits on grid lines and Rooms opens on its two floors", () => {
  const index = examples.findIndex(
      (d) => d.id === "rooms",
    ),
    flow = examples[index]!.initial();
  return check(
    examples[index - 1]?.id === "layered" &&
      flow.rooms?.rooms.length === 18 &&
      flow.nodes.length === 14 &&
      flow.camera.yaw === -0.32 &&
      flow.camera.pitch === 0.26 &&
      examples.every((d) =>
        d.initial().nodes.every((n) => {
          const size = nodeSize(n);
          return (
            (n.position.x - size.width / 2) %
              16 ===
              0 &&
            (n.position.y - size.height / 2) %
              16 ===
              0
          );
        }),
      ),
    toBe(true),
  );
});

test("room services cover at most a quarter of either projected box at front and opening angles", () => {
  const flow = examples
    .find((d) => d.id === "rooms")!
    .initial();
  return check(
    [flow, viewAt(0, 0)(flow)].every((f) => {
      const at = project(f.camera);
      const boxes = f.nodes.map((n) => {
        const { width, height } = nodeSize(n),
          depth = bodyDepth(n);
        const points = [-1, 1].flatMap((i) =>
          [-1, 1].flatMap((j) =>
            [-1, 1].map((k) =>
              at({
                x: n.position.x + (i * width) / 2,
                y:
                  n.position.y + (j * height) / 2,
                z: n.position.z + k * depth,
              }),
            ),
          ),
        );
        const left = Math.min(
            ...points.map((p) => p.x),
          ),
          right = Math.max(
            ...points.map((p) => p.x),
          ),
          top = Math.min(
            ...points.map((p) => p.y),
          ),
          bottom = Math.max(
            ...points.map((p) => p.y),
          );
        return {
          left,
          right,
          top,
          bottom,
          area: (right - left) * (bottom - top),
        };
      });
      return boxes.every((a, i) =>
        boxes
          .slice(i + 1)
          .every(
            (b) =>
              Math.max(
                0,
                Math.min(a.right, b.right) -
                  Math.max(a.left, b.left),
              ) *
                Math.max(
                  0,
                  Math.min(a.bottom, b.bottom) -
                    Math.max(a.top, b.top),
                ) <=
              Math.min(a.area, b.area) / 4,
          ),
      );
    }),
    toBe(true),
  );
});

test("room labels fit with a 48 pixel margin beside the DSL overlay", () => {
  const flow = examples
    .find((d) => d.id === "rooms")!
    .initial();
  const f = resizeDemo(flow, 580, true, 320),
    open = frameOf(f).x - 320;
  const labels = roomLabels(f.rooms!, f.camera);
  return check(
    labels.length === 11 &&
      labels.every((l) => {
        const width = l.value.length * 13;
        const left =
          l.x +
          l.dx -
          (l.anchor === "end"
            ? width
            : l.anchor === "middle"
              ? width / 2
              : 0);
        return (
          left >= 47.99 &&
          left + width <= open - 47.99 &&
          l.y + l.dy - 7 >= 47.99 &&
          l.y + l.dy + 7 <= 580 - 47.99
        );
      }),
    toBe(true),
  );
});

test("structured rows join to the canonical text for every gallery sheet", () =>
  check(
    examples.every((e) => {
      const f = e.initial(),
        rules = e.spec().rules;
      return (
        printLines(f, rules)
          .map(joinLine)
          .join("\n") === printSpec(f, rules)
      );
    }),
    toBe(true),
  ));

test("each room face fills the open frame up to its 48 pixel margin", () => {
  const original = examples
    .find((d) => d.id === "rooms")!
    .initial();
  const f = resizeDemo(original, 580, true, 320);
  return check(
    (
      [
        [0, 0],
        [0, -Math.PI / 2],
        [Math.PI / 2, 0],
      ] satisfies [number, number][]
    ).every(([yaw, pitch]) => {
      const table = faceTable(
        fitDemo(viewAt(yaw, pitch)(f)),
      );
      const at = project(table.camera);
      const corners = table.rooms!.rooms.flatMap(
        (r) => [at(r.min), at(r.max)],
      );
      const boxes = roomLabels(
        table.rooms!,
        table.camera,
      ).map((l) => {
        const width = l.value.length * 13;
        const left =
          l.x +
          l.dx -
          (l.anchor === "end"
            ? width
            : l.anchor === "middle"
              ? width / 2
              : 0);
        return {
          left,
          right: left + width,
          top: l.y + l.dy - 7,
          bottom: l.y + l.dy + 7,
        };
      });
      const margins = [
        Math.min(
          ...corners.map((p) => p.x),
          ...boxes.map((b) => b.left),
        ),
        frameOf(f).x -
          320 -
          Math.max(
            ...corners.map((p) => p.x),
            ...boxes.map((b) => b.right),
          ),
        Math.min(
          ...corners.map((p) => p.y),
          ...boxes.map((b) => b.top),
        ),
        frameOf(f).y -
          Math.max(
            ...corners.map((p) => p.y),
            ...boxes.map((b) => b.bottom),
          ),
      ];
      return (
        table.camera.scale <= 1.5 &&
        Math.min(...margins) >= 47.99 &&
        Math.min(...margins) <= 60
      );
    }),
    toBe(true),
  );
});

test("the demo uses the shared sheet tool registry", () =>
  check(
    demoSheetTools === sheetTools,
    toBe(true),
  ));
