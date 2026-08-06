// In-house bundler config for plgg-cms. Two entries — the
// public barrel (`index`) and the `cli` the bin runs in a
// REAL REGISTRY INSTALL — with ESM-only output: the package
// declares `"type": "module"` (it carries a `serve` bin like
// plggpress), so a `.cjs.js` sibling would be mis-read as
// ESM by Node. Externals (the plgg family, plggpress +
// node:*) are derived from package.json, never listed here;
// the former content source tree is an internal plgg-cms
// module, while the MCP protocol substrate is the external
// plgg-mcp package (only its content TOOLS stay internal).
//
// The `cli` entry is what retired bin/relocate.mjs: Node
// refuses to strip types from a `.ts` under node_modules, so
// a registry-installed bin could not run `src/cli.ts` in
// place and the launcher copied the whole package to /tmp to
// re-exec it there. It now runs this compiled
// `dist/cli.es.js` instead, exactly as plgg-bundle's bin
// runs its own. The LIBRARY target already emits precisely
// the shape a Node CLI wants — own source inlined, declared
// deps external — so no `target: "cli"` (which would drop
// the `.d.ts` tree the `index` entry needs) is involved;
// `src/cli.ts` is simply a second entry. It exports nothing
// and runs for its side effect, so its emitted export
// surface is empty.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    { name: "cli", input: "cli.ts" },
  ],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-cms",
    srcRoot: "src",
  },
};
