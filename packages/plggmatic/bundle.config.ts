// In-house bundler config for plggmatic. ESM-only output:
// the package declares `"type": "module"`, so a `.cjs.js`
// sibling would be mis-read as ESM by Node. Emitting `es`
// alone keeps the published surface coherent — its consumer
// app imports it as ESM. The `ssg` and `style` entries
// mirror the wrapped packages' subpaths (`plgg-server/ssg`,
// `plgg-view/style`). Externals (the plgg family + node:*)
// are derived from package.json, never listed here.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    { name: "ssg", input: "ssg.ts" },
    { name: "style", input: "style.ts" },
  ],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plggmatic",
    srcRoot: "src",
  },
};
