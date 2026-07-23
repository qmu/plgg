// In-house bundler config for plgg-highlight. A single
// entry: the highlighter core (index). Externals (plgg +
// plgg-view + plgg-md + plgg-parser + node:*) are derived
// from package.json — the tokenizer is an in-house
// plgg-parser grammar now, so there is no `typescript`
// dependency to externalize or inline.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-highlight",
    srcRoot: "src",
  },
};
