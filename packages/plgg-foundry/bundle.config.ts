// In-house bundler config for plgg-foundry. Single `index`
// entry, ESM + CJS, per-file `.d.ts` tree. Externals
// are derived from package.json (deps + node:*).
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-foundry",
    srcRoot: "src",
  },
};
