// In-house bundler config for the PoC 2 client app.
// target:"app" → one self-contained ESM bundle
// (dist/main.js) with plgg + siblings INLINED from
// source — including PoC 1's proven FTS modules
// (plgg-poc1-search/search/*, resolved through the
// bundler's workspace self-alias to that package's
// src/). plgg-kit is NOT imported by any browser file:
// the model call lives behind the server session seam
// (src/entrypoints/serve.ts), so no provider code or
// key material can end up in this bundle.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc2-agent",
    srcRoot: "src",
  },
};
