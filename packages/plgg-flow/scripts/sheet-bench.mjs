// Build plgg-view, plgg-flow and plgg-ir-diagram before measuring.
import { some } from "plgg";
import {
  movePointer,
  wheelZoom,
} from "plgg-flow";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";
import { el, attr, onClick } from "plgg-view";
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
// Layout and observation are supplied by browsers on the live sheet.
class Observer {
  observe() {}
  disconnect() {}
}
globalThis.ResizeObserver = Observer;
globalThis.MutationObserver = Observer;
const frames = new Map();
let frameId = 0;
globalThis.requestAnimationFrame = (fn) => {
  frames.set(++frameId, fn);
  return frameId;
};
globalThis.cancelAnimationFrame = (id) =>
  frames.delete(id);
window.matchMedia = (query) => ({
  matches: query.includes("reduced-motion"),
  addEventListener() {},
});
const source = fileURLToPath(
  new URL(
    "../../plgg-ir-diagram/src/",
    import.meta.url,
  ),
);
const bundle = await build({
  stdin: {
    contents: `
      export { mountSheet } from "./mountSheet.ts";
      export { sheetTools } from "./flowSheet.ts";
    `,
    resolveDir: source,
  },
  tsconfig: source + "../tsconfig.json",
  platform: "node",
  format: "esm",
  bundle: true,
  write: false,
});
const { mountSheet, sheetTools } = await import(
  "data:text/javascript;base64," +
    Buffer.from(
      bundle.outputFiles[0].contents,
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
  for (const id of ["layers", "rooms"]) {
    const page = await readFile(
      new URL(
        `../../plgg-flow-example/markdown/samples/${id}.md`,
        import.meta.url,
      ),
      "utf8",
    );
    const [, options, code] = page.match(
      /^```plgg-flow ([^\n]*)\n([\s\S]*?)^```/m,
    );
    const names =
      options
        .match(/tools=(\S+)/)?.[1]
        .split(",") ?? [];
    for (const mode of ["zoom", "drag"]) {
      const host = document.createElement("div");
      host.closest = () => null;
      const point = { x: 200, y: 180 };
      let action;
      let updates = 0;
      sheetTools.set("bench", {
        name: "bench",
        view: () =>
          el(
            "button",
            [
              attr("id", "bench"),
              onClick((flow) => {
                updates++;
                return action(flow);
              }),
            ],
            [],
          ),
      });
      const dispose = mountSheet(
        host,
        code,
        true,
        [...names, "bench"],
      );
      for (const [id, fn] of frames) {
        frames.delete(id);
        fn(performance.now());
      }
      const trigger = host.querySelector(
        '[id="bench"]',
      );
      const step = () =>
        trigger.dispatchEvent(
          new Event("click", { bubbles: true }),
        );
      if (mode === "drag") {
        action = (f) => ({
          ...f,
          selected: some(f.nodes[0].id),
          drag: some({
            mode: "node",
            node: f.nodes[0].id,
            pointer: 1,
            last: point,
          }),
        });
        step();
      }
      const times = [];
      for (let i = 0; i < 70; i++) {
        const delta = i % 2 ? 1 : -1;
        action =
          mode === "zoom"
            ? wheelZoom(point, -delta * 10)
            : movePointer(
                { ...point, x: point.x + delta },
                1,
              );
        const start = performance.now();
        step();
        if (i >= 10)
          times.push(performance.now() - start);
      }
      if (updates !== (mode === "drag" ? 71 : 70))
        throw Error(
          `Sheet processed ${updates} updates`,
        );
      times.sort((a, b) => a - b);
      console.log(
        id,
        mode,
        times[29].toFixed(2),
        times[53].toFixed(2),
        count(host.querySelector(".flow-board")),
      );
      if (times[29] > 8) process.exitCode = 1;
      dispose();
    }
  }
} finally {
  await restore();
}
