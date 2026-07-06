// In-house bundler config for plgg-mcp. A single entry: the
// protocol core (index). Externals are `plgg` + `plgg-content`
// (plus node:*), derived from package.json — plgg-mcp carries no
// typescript dep, so nothing else is externalized.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-mcp",
    srcRoot: "src",
  },
};
