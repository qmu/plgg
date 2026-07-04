// In-house bundler config for plgg-domain. Single `index`
// entry, ESM + CJS, per-file `.d.ts` tree. Externals
// (plgg, plgg-sql, plgg-db-migration + node:*) are derived
// from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-domain", srcRoot: "src" },
};
