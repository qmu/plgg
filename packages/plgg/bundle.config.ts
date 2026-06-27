// In-house bundler config for plgg core — the
// equivalent of the former vite.config.ts: single
// `index` entry, ESM + CJS, `index.${format}.js`
// naming, per-file `.d.ts` tree. Externals are derived
// from package.json (plgg core has no deps → only
// `node:*` would externalize, and it imports none).
// Plain data validated by `asBundleConfig` at load.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg", srcRoot: "src" },
};
