// In-house bundler config for plgg-parser. A single entry:
// the combinator core (index). The only external is `plgg`
// (plus node:*), derived from package.json — plgg-parser
// carries no typescript dep, so nothing else is externalized.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-parser",
    srcRoot: "src",
  },
};
