// In-house bundler config for plgg-ir-thesis-proof. Two
// entries: the public barrel (`index`) and the runnable
// proof command (`prove`, from src/entrypoints/prove.ts)
// that bin/prove.mjs launches. Externals — `plgg`,
// `plgg-ir-syntax`, `plgg-ir-language`, `plgg-ir-thesis`
// (plus node:*) — are derived from package.json, never
// listed here.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    {
      name: "prove",
      input: "entrypoints/prove.ts",
    },
  ],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-ir-thesis-proof",
    srcRoot: "src",
  },
};
