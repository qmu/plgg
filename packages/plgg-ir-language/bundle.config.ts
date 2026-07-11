// In-house bundler config for plgg-ir-language. A
// single entry: the language framework (index). The
// externals are `plgg` and `plgg-ir-syntax` (plus
// node:*), derived from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-ir-language",
    srcRoot: "src",
  },
};
