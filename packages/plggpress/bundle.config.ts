// In-house bundler config for plggpress. A single
// `index` entry, ESM-only output: the package declares
// `"type": "module"` (mirroring plgg-bundle, the other
// bin-carrying package), so a `.cjs.js` sibling would be
// mis-read as ESM by Node. Emitting `es` alone keeps the
// published surface coherent — the guide and the CLI
// both consume it as ESM. Externals (the plgg family +
// node:*) are derived from package.json, never listed
// here.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plggpress",
    srcRoot: "src",
  },
};
