// In-house bundler config for plgg-kit. Single `index`
// entry, ESM + CJS, per-file `.d.ts` tree. Externals
// (plgg + node:*) are derived from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-kit", srcRoot: "src" },
};
