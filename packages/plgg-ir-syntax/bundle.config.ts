// In-house bundler config for plgg-ir-syntax. A single
// entry: the S-expression syntax layer (index). The
// externals are `plgg` and `plgg-parser` (plus node:*),
// derived from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-ir-syntax",
    srcRoot: "src",
  },
};
