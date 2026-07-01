// In-house bundler config for plgg-http — the
// equivalent of the former vite.config.ts: single
// `index` entry, ESM + CJS, `index.${format}.js`
// naming, per-file `.d.ts` tree. Externals (plgg +
// node:*) are derived from package.json, so plgg is
// imported at runtime, not inlined.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-http", srcRoot: "src" },
};
