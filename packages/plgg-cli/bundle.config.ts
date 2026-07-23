// In-house bundler config for plgg-cli. Single `index`
// entry, ESM + CJS, per-file `.d.ts` tree. Externals
// are derived from package.json (deps + node:*).
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-cli", srcRoot: "src" },
};
