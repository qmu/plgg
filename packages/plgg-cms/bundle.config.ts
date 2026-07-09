// In-house bundler config for plgg-cms. A single `index`
// entry, ESM-only output: the package declares
// `"type": "module"` (it carries a `serve` bin like
// plggpress), so a `.cjs.js` sibling would be mis-read as
// ESM by Node. Externals (the plgg family, plggpress +
// node:*) are derived from package.json, never listed here;
// the former content and MCP source trees are now internal
// plgg-cms modules.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-cms",
    srcRoot: "src",
  },
};
