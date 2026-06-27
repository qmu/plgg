// In-house bundler config for plgg-test's published
// dist library API (`import { test, expect } from
// "plgg-test"`). The test RUNNER is separate (its own
// CLI, Node type-stripping) and is untouched. Single
// `index` entry, ESM + CJS, per-file `.d.ts` tree;
// externals (plgg, typescript, happy-dom + node:*) are
// derived from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-test", srcRoot: "src" },
};
