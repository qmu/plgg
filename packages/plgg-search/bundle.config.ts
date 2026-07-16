// In-house bundler config for plgg-search. A single
// entry: the browser-shippable search core (index).
// The only external is `plgg`, derived from
// package.json — no node:* anywhere; the same bundle
// serves the SSG build step and the reader's browser.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-search",
    srcRoot: "src",
  },
};
