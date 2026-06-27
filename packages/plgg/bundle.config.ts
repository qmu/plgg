// In-house bundler config for plgg core — the
// equivalent of the former vite.config.ts: single
// `index` entry, ESM + CJS, `index.${format}.js`
// naming, no externals, per-file `.d.ts` tree. Plain
// data validated by the bundler's `asBundleConfig` at
// load.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  external: [],
  alias: { prefix: "plgg", srcRoot: "src" },
};
