// In-house bundler config for the PoC 5 shell client
// (target:"app" → one self-contained ESM bundle,
// dist/main.js, with plgg + plgg-view inlined from
// source).
//
// Like PoC 4b there is NO `dev` section: the sample site
// is rendered and re-rendered IN PLACE by the shell client
// itself from the current config — there is no internal
// plggpress dev server to proxy. The whole PoC is one
// shell server; the config change happens ON the preview.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc5-config",
    srcRoot: "src",
  },
};
