// In-house bundler config for plgg-highlight. A single
// entry: the highlighter core (index). Externals (plgg +
// plgg-view + plgg-md + typescript + node:*) are derived
// from package.json — `typescript` is a peerDependency so
// the graph walk externalizes the `import * as ts` rather
// than inlining the whole compiler.
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
