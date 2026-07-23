// In-house bundler config for plggpress. Two entries: the
// public barrel (`index`) + the generic web-application
// framework seam (`frameworkEntry`) that a dynamic consumer
// such as plgg-cms composes its served app onto. ESM-only
// output: the package declares `"type": "module"` (mirroring
// plgg-bundle, the other bin-carrying package), so a
// `.cjs.js` sibling would be mis-read as ESM by Node.
// Emitting `es` alone keeps the published surface coherent —
// the guide and the CLI both consume it as ESM. The
// framework entry's OUTPUT KEY is `frameworkEntry` (not
// `framework`) so `dist/frameworkEntry.*` does not
// case-collide with the `dist/framework/` declaration tree;
// the published `./framework` subpath points at it.
// Externals (the plgg family + node:*) are derived from
// package.json, never listed here.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    {
      name: "frameworkEntry",
      input: "frameworkEntry.ts",
    },
  ],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plggpress",
    srcRoot: "src",
  },
};
