// In-house bundler config for plgg-db-migration. Two
// entries: the published library API (`index`) and the
// `cli` the `bin/` launcher loads. The CLI is bundled (not
// run as raw `.ts`) so the tsc-based bundler elides
// type-only imports — e.g. `Bool` from plgg — which Node's
// native type-stripping cannot do. ESM + CJS, per-file
// `.d.ts` tree; externals (plgg, plgg-sql + node:*) are
// derived from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    {
      name: "cli",
      input: "entrypoints/cli.ts",
    },
  ],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-db-migration",
    srcRoot: "src",
  },
};
