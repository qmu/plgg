import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { el, attr } from "plgg-view";
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
const tree = (x) =>
  el(
    "svg",
    [],
    Array.from({ length: 17 }, (_, i) =>
      el(
        "g",
        [
          attr(
            "transform",
            "translate(" +
              (i === 0 ? x : i) +
              " 0)",
          ),
        ],
        Array.from({ length: 16 }, (_, j) =>
          el(
            "rect",
            [
              attr("x", String(j)),
              attr("y", "2"),
              attr("width", "8"),
              attr("height", "6"),
            ],
            [],
          ),
        ),
      ),
    ),
  );
const frames = [tree(0), tree(1)];
const render = makeRenderer(
  document.createElement("div"),
  () => {},
);
try {
  for (let i = 0; i < 20; i++)
    render(frames[i % 2]);
  const samples = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    render(frames[i % 2]);
    samples.push(performance.now() - start);
  }
  samples.sort((a, b) => a - b);
  console.log(
    "290 SVG elements, 100 diffs: median",
    samples[49].toFixed(3),
    "ms, p90",
    samples[89].toFixed(3),
    "ms",
  );
} finally {
  render.dispose();
  await restore();
}
