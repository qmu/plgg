import { wireGraph } from "plgg-flow/wiring";
import { sheetTools } from "plgg-ir-diagram/flowSheet";
import { project } from "plgg-board";
import {
  frameOf,
  placedLabels,
  roomFaceView,
  roomLabels,
  spaceScenery,
  nodeSize,
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
  fitDemo,
  resizeDemo,
  applyDemoSpec,
  roomsOpening,
  resetSheet,
  sheetToolNames,
} from "plgg-ir-diagram/flowSheet";
import { specFlow } from "plgg-flow/dsl";
import {
  readdirSync,
  readFileSync,
} from "node:fs";
import config from "../site.config.ts";
const examples = config.sidebar[0]!.items.map(
  ({ text: name, link }) => {
    const page = readFileSync(
      "markdown" + link + ".md",
      "utf8",
    );
    const fence =
      /```(plgg-flow[^\n]*)\n([\s\S]*?)\n```/.exec(
        page,
      );
    if (!fence) throw Error(link);
    const source = fence[2]!;
    const parsed = parseSpec(source);
    if (parsed.__tag === "Err")
      throw Error(parsed.content);
    const spec = () => parsed.content;
    const initial = () => {
      const flow = specFlow(spec());
      return fitDemo(
        flow.rooms ? roomsOpening(flow) : flow,
      );
    };
    return {
      name,
      id: link.split("/").pop(),
      source,
      spec,
      initial,
      tools: sheetToolNames(fence[1]!),
    };
  },
);
test("all twenty-eight diagrams have unique identities and valid directed edges", () =>
  check(
    new Set(examples.map((e) => e.name)).size ===
      28 &&
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

test("every gallery box sits on grid lines and Rooms opens on its three storeys", () => {
  const index = examples.findIndex(
      (d) => d.id === "rooms",
    ),
    flow = examples[index]!.initial();
  return check(
    examples[index - 2]?.id === "layered" &&
      examples[index - 1]?.id === "layers" &&
      examples[index + 1]?.id === "dimensions" &&
      flow.rooms?.rooms.length === 18 &&
      flow.nodes.length === 14 &&
      flow.camera.yaw ===
        flow.suggestions?.[0]?.camera.yaw &&
      flow.camera.pitch ===
        flow.suggestions?.[0]?.camera.pitch &&
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

test("the gallery building has three horizontal floors and upright cards", () => {
  const flow = examples
    .find((e) => e.id === "rooms")!
    .initial();
  const rooms = flow.rooms!.rooms;
  return check(
    new Set(rooms.map((c) => c.max.y)).size ===
      3 &&
      new Set(rooms.map((c) => c.caption))
        .size === 1 &&
      flow.nodes.every((n) =>
        rooms.some(
          (c) =>
            c.members.includes(n.id) &&
            n.position.y +
              nodeSize(n).height / 2 ===
              c.max.y - 16,
        ),
      ),
    toBe(true),
  );
});
test("room labels fit with a 40 pixel margin beside the DSL overlay", () => {
  const flow = examples
    .find((d) => d.id === "dimensions")!
    .initial();
  const focused = resizeDemo(
    flow,
    580,
    true,
    320,
  );
  const f = fitDemo({
      ...focused,
      focus: undefined,
    }),
    open = frameOf(f).x - 320;
  const other = spaceScenery(
    focused.rooms!,
    focused,
  ).find(
    (s) =>
      s.kind === "label" && s.text === "大阪",
  );
  const switched =
    other?.kind === "label" &&
    other.press?.(focused);
  const labels = roomLabels(
    f.rooms!,
    f.camera,
    f.nodes,
  );
  return check(
    !!focused.focus?.has("会員画面") &&
      focused.camera.scale > f.camera.scale &&
      !!switched &&
      !!switched.focus?.has("会員画面(大阪)") &&
      !resetSheet(switched).focus &&
      labels.length === 17 &&
      labels.some(
        (l) => "outer" in l && l.outer,
      ) &&
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
          left >= 39.99 &&
          left + width <= open - 39.99 &&
          l.y + l.dy - 7 >= 39.99 &&
          l.y + l.dy + 7 <= 580 - 39.99
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

test("each room face fills the open frame up to its 40 pixel margin", () => {
  const original = examples
    .find((d) => d.id === "rooms")!
    .initial();
  const f = resizeDemo(original, 580, true, 320);
  return check(
    (
      [
        [0.22, -0.2],
        [0.22, -1.05],
        [1.3, -0.2],
        [0.6, -0.5],
      ] satisfies [number, number][]
    ).every(([yaw, pitch]) => {
      const table = roomFaceView(
        fitDemo(viewAt(yaw, pitch)(f)),
      );
      const at = project(table.camera);
      const corners = table.rooms!.rooms.flatMap(
        (r) =>
          [r.min.x, r.max.x].flatMap((x) =>
            [r.min.y, r.max.y].flatMap((y) =>
              [r.min.z, r.max.z].map((z) =>
                at({ x, y, z }),
              ),
            ),
          ),
      );
      const boxes = roomLabels(
        table.rooms!,
        table.camera,
        table.nodes,
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
        table.camera.scale <= 1.6 &&
        Math.min(...margins) >= 39.99 &&
        (table.camera.scale === 1.6 ||
          Math.min(...margins) <= 60)
      );
    }),
    toBe(true),
  );
});

for (const id of ["rooms", "layers"]) {
  const yaw =
    id === "rooms" ? 0.22 : -Math.PI / 4;
  for (const pitch of [
    id === "rooms" ? -1.05 : -1.2,
    -1.3,
  ]) {
    test(
      id +
        " keeps drawn labels inside the open frame at pitch " +
        pitch,
      () => {
        const initial = examples
          .find((e) => e.id === id)!
          .initial();
        const flow = roomFaceView(
          fitDemo(
            viewAt(
              yaw,
              pitch,
            )({
              ...initial,
              cover: 320,
              sheetInsets: {
                left: 8,
                top: 36,
                bottom: 12,
              },
            }),
          ),
        );
        const labels = placedLabels({
          ...flow,
          scenery: [
            ...spaceScenery(flow.rooms!, flow),
            ...(flow.scenery ?? []),
          ],
        });
        return check(
          labels.some(
            (l) => l.covered && l.style === "tag",
          ) &&
            labels.every(
              ({ box }) =>
                box.left >= 8 &&
                box.right <= 580 &&
                box.top >= 36 &&
                box.bottom <= 568,
            ),
          toBe(true),
        );
      },
    );
  }
}

test("the demo uses the shared sheet tool registry", () =>
  check(
    examples.every((e) =>
      e.tools.every((name) =>
        sheetTools.has(name),
      ),
    ),
    toBe(true),
  ));

test("Team sends to Design and Build inside its tray without looping", () => {
  const flow = examples
    .find((e) => e.id === "group")!
    .initial();
  const team = flow.nodes.find(
    (n) => n.id === "Team",
  )!;
  const { width, height } = nodeSize(team);
  const routes = wireGraph(flow).filter(
    (w) =>
      w.edge.source === "Team" &&
      ["Design", "Build"].includes(w.edge.target),
  );
  return check(
    routes.length === 2 &&
      routes.every((w) => {
        const turns: number[] = [];
        for (
          let i = 2;
          i < w.points.length;
          i++
        ) {
          const a = w.points[i - 2]!,
            b = w.points[i - 1]!,
            c = w.points[i]!;
          const cross =
            (b.x - a.x) * (c.y - b.y) -
            (b.y - a.y) * (c.x - b.x);
          if (
            Math.abs(cross) > 1e-7 &&
            turns[turns.length - 1] !==
              Math.sign(cross)
          )
            turns.push(Math.sign(cross));
        }
        return (
          (w.sourceSide === "right" ||
            w.sourceSide === "bottom") &&
          w.source.x <
            team.position.x - width / 2 + 48 &&
          w.source.y <
            team.position.y - height / 2 + 24 &&
          turns.length <= 2 &&
          w.points.every(
            (p) =>
              Math.abs(p.x - team.position.x) <=
                width / 2 &&
              Math.abs(p.y - team.position.y) <=
                height / 2,
          )
        );
      }),
    toBe(true),
  );
});

test("each subject file has its own sheet and sidebar entry", () => {
  const subjects = "../plgg-flow/subjects";
  return check(
    ["architectures", "subjects"].every(
      (group, index) => {
        const folder =
          group === "subjects"
            ? subjects
            : subjects + "/architectures";
        const files = readdirSync(folder).filter(
          (name) => name.endsWith(".txt"),
        );
        const links = config.sidebar[
          index + 1
        ]!.items.map((item) => item.link);
        return (
          files.length === links.length &&
          files.every((file) => {
            const link =
              "/" +
              group +
              "/" +
              file.slice(0, -4);
            const [title, description, ...dsl] =
              readFileSync(
                folder + "/" + file,
                "utf8",
              ).split("\n");
            const page = readFileSync(
              "markdown" + link + ".md",
              "utf8",
            );
            const fence =
              /^```plgg-flow[^\n]*\n([\s\S]*?)\n```/m.exec(
                page,
              );
            return (
              links.includes(link) &&
              page.includes(
                "\n" + title + "\n",
              ) &&
              page.includes(
                "description: " +
                  description?.replace(
                    /^# 見えるはずのこと: /,
                    "",
                  ),
              ) &&
              fence?.[1] ===
                dsl.join("\n").trim() &&
              parseSpec(fence[1]).__tag === "Ok"
            );
          })
        );
      },
    ),
    toBe(true),
  );
});
