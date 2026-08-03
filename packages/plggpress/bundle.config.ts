// In-house bundler config for plggpress. Three entries: the
// public barrel (`index`), the generic web-application
// framework seam (`frameworkEntry`) that a dynamic consumer
// such as plgg-cms composes its served app onto, and the
// `cli` the bin runs in a REAL REGISTRY INSTALL. ESM-only
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
//
// The `cli` entry is what retired bin/relocate.mjs: Node
// refuses to strip types from a `.ts` under node_modules, so
// a registry-installed bin could not run `src/cli.ts` in
// place and the launcher copied the package to /tmp to
// re-exec it. It now runs this compiled `dist/cli.es.js`
// instead, exactly as plgg-bundle's bin runs its own. The
// LIBRARY target already emits precisely the shape a Node
// CLI wants — own source inlined, declared deps external —
// so no `target: "cli"` (which would drop the `.d.ts` tree
// the other two entries need) is involved; `src/cli.ts` is
// simply a third entry. It exports nothing and runs for its
// side effect, so its emitted export surface is empty.
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
    { name: "cli", input: "cli.ts" },
  ],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plggpress",
    srcRoot: "src",
  },
};
