// In-house bundler config for plgg-ir-thesis. A
// single entry: the Thesis dialect (index). The
// externals are `plgg`, `plgg-ir-syntax`, and
// `plgg-ir-language` (plus node:*), derived from
// package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-ir-thesis",
    srcRoot: "src",
  },
};
