// In-house bundler config for plgg-mcp. A single
// entry: the protocol substrate (index). The only
// external is `plgg` (plus node:*), derived from
// package.json — the whole point of this package is
// that nothing content-shaped is reachable from it.
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
