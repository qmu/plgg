// Build plgg-view, plgg-flow and plgg-ir-diagram before measuring.
import { some } from "plgg";
import {
  movePointer,
  wheelZoom,
} from "plgg-flow";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import {
  sandbox,
  custom,
  cmdNone,
} from "plgg-view/client";

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
const demo = await build({
  entryPoints: [
    fileURLToPath(
      new URL(
        "../../plgg-flow-example/src/index.ts",
        import.meta.url,
      ),
    ),
  ],
  platform: "node",
  format: "esm",
  bundle: true,
  write: false,
});
const {
  init,
  update,
  view,
  examples,
  boardAction,
} = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      demo.outputFiles[0].contents,
    ).toString("base64")
);
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
  for (const id of [
    "space",
    "layered",
    "rooms",
  ]) {
    const index = examples.findIndex(
      (e) => e.id === id,
    );
    for (const mode of ["zoom", "drag"]) {
      const host = document.createElement("div");
      const model = {
        ...init(),
        index,
        boardHeight: 580,
        boardCover: 320,
      };
      let step;
      const dispose = sandbox({
        init: [model, cmdNone()],
        view,
        update,
        subscriptions: () =>
          custom("bench", (dispatch) => {
            step = dispatch;
            return () => {};
          }),
      })(host);
      step((m) => m);
      const point = { x: 200, y: 180 };
      if (mode === "drag")
        step(
          boardAction((f) => ({
            ...f,
            selected: some(f.nodes[0].id),
            drag: some({
              mode: "node",
              node: f.nodes[0].id,
              pointer: 1,
              last: point,
            }),
          })),
        );
      const times = [];
      for (let i = 0; i < 70; i++) {
        const delta = i % 2 ? 1 : -1;
        const action = boardAction(
          mode === "zoom"
            ? wheelZoom(point, -delta * 10)
            : movePointer(
                { ...point, x: point.x + delta },
                1,
              ),
        );
        const start = performance.now();
        step(action);
        if (i >= 10)
          times.push(performance.now() - start);
      }
      times.sort((a, b) => a - b);
      console.log(
        examples[index].name,
        mode,
        times[29].toFixed(2),
        times[53].toFixed(2),
        count(host.querySelector("svg")),
      );
      if (
        times[29] >
        { space: 1.5, layered: 5, rooms: 8 }[id]
      )
        process.exitCode = 1;
      dispose();
    }
  }
} finally {
  await restore();
}
