// In-house bundler config for plgg-flow. Single `index`
// entry, ESM + CJS, per-file `.d.ts` tree. Externals
// are derived from package.json (deps + node:*).
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    "index",
    "model",
    "hierarchy",
    "layout",
    "autoLayout",
    "topology",
    "analysis",
    "interchange",
    "edits",
    "connections",
    "metadata",
    "spatial",
    "constraints",
    "storage",
    "imageExport",
    "annotations",
    "routing",
    "revisions",
    "plot",
    "dsl",
    "wiring",
  ].map((name) => ({
    name,
    input: name + ".ts",
  })),
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-flow",
    srcRoot: "src",
  },
};
