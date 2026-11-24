// Run after building plgg-flow and plgg-ir-diagram. Ten warm-up frames precede each 60-step sample.
import { readFileSync } from "node:fs";
import { some } from "plgg";
import { flowView } from "plgg-flow";
import {
  parseSpec,
  specFlow,
  printSpec,
} from "plgg-flow/dsl";
import {
  fitDemo,
  roomsOpening,
  createDslPanel,
  sheetStage,
} from "plgg-ir-diagram/flowSheet";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { el } from "plgg-view";
import { makeRenderer } from "plgg-view/client";

const dom = await build({
  entryPoints: [
    fileURLToPath(
      new URL(
        "../../plgg-test/src/Env/Dom/install.ts",
        import.meta.url,
      ),
    ),
  ],
  platform: "node",
  format: "esm",
  bundle: true,
  write: false,
});
const { installDom } = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      dom.outputFiles[0].contents,
    ).toString("base64")
);
const restore = await installDom();
if (!document.createElementNS)
  document.createElementNS = (
    namespaceURI,
    localName,
  ) =>
    Object.assign(
      document.createElement(localName),
      { namespaceURI, localName },
    );
const sample = (name) =>
  readFileSync(
    new URL(
      "../../plgg-flow-example/markdown/samples/" +
        name +
        ".md",
      import.meta.url,
    ),
    "utf8",
  )
    .split("```plgg-flow fill dsl\n")[1]
    .split("```")[0];
const identity = (v) => v;
const count = (node) =>
  1 +
  Array.from(node.children).reduce(
    (n, child) => n + count(child),
    0,
  );
console.log(
  "sample step median_ms p90_ms svg_elements",
);
try {
  for (const [name, code] of [
    ["自動配置", sample("layered")],
    ["部屋に分ける", sample("rooms")],
    [
      "3-node",
      "node Source at -200 -48\nnode Process at 24 16\nnode Result at 216 -48\nSource -> Process\nProcess -> Result",
    ],
  ]) {
    const parsed = parseSpec(code);
    if (parsed.__tag !== "Ok")
      throw Error(parsed.content);
    const rules = parsed.content.rules;
    const raw = specFlow(parsed.content);
    const initial = fitDemo(
      raw.rooms ? roomsOpening(raw) : raw,
    );
    for (const mode of ["zoom", "drag"]) {
      const host = document.createElement("div");
      const render = makeRenderer(host, () => {});
      const times = [];
      const panel = createDslPanel(
        identity,
        identity,
        identity,
      );
      let flow = initial;
      const first = initial.nodes[0];
      for (let i = 0; i < 70; i++) {
        flow =
          mode === "zoom"
            ? {
                ...flow,
                camera: {
                  ...flow.camera,
                  scale:
                    initial.camera.scale *
                    (1 + (i % 20) / 100),
                },
              }
            : {
                ...flow,
                selected: some(first.id),
                drag: some({
                  mode: "node",
                  node: first.id,
                  pointer: 1,
                  last: { x: i, y: 0 },
                }),
                nodes: flow.nodes.map((n) =>
                  n.id === first.id
                    ? {
                        ...n,
                        position: {
                          ...n.position,
                          x: first.position.x + i,
                        },
                      }
                    : n,
                ),
              };
        const start = performance.now();
        render(
          sheetStage(
            flowView(flow),
            el("div", [], []),
            [
              panel(
                flow,
                rules,
                printSpec(flow, rules),
              ),
            ],
          ),
        );
        if (i >= 10)
          times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      console.log(
        name,
        mode,
        times[29].toFixed(2),
        times[53].toFixed(2),
        count(host.querySelector("svg")),
      );
      if (times[29] > 8) process.exitCode = 1;
      render.dispose();
    }
  }
} finally {
  await restore();
}
