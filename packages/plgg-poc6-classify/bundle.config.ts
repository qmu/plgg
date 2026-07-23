// In-house bundler config for the PoC 6 shell client
// (target:"app" → one self-contained ESM bundle,
// dist/main.js, with plgg + plgg-view inlined from
// source).
//
// Like PoC 4b/5 there is NO `dev` section: the three
// navigation variants render and re-render IN PLACE from
// the client-held page index and the current per-variant
// queries — there is no internal dev server to proxy.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc6-classify",
    srcRoot: "src",
  },
};
