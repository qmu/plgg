// In-house bundler config for plgg-db-migration's
// published library API. Single `index` entry, ESM +
// CJS, per-file `.d.ts` tree. Externals (plgg, plgg-sql
// + node:*) are derived from package.json. The CLI
// entrypoint and the `bin/` launchers are run via Node
// type-stripping, not bundled.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-db-migration",
    srcRoot: "src",
  },
};
