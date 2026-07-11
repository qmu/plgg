// In-house bundler config for the PoC 1 client app.
// target:"app" → one self-contained ESM bundle
// (dist/main.js) with plgg + siblings INLINED from
// source. The browser-side embedding model is NOT
// bundled: src/vendors/browserLocalEmbedder.ts loads
// @huggingface/transformers at runtime through a
// dynamic import(url) of the CDN build, which the
// bundler passes through to the native import — the
// measured download/init cost is the PoC's point, so
// hiding it inside the bundle would defeat the metric.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc1-search",
    srcRoot: "src",
  },
};
