// In-house bundler config for the PoC 3 client app.
// target:"app" → one self-contained ESM bundle
// (dist/main.js) with plgg + siblings INLINED from
// source — including PoC 1's proven FTS modules via
// the relative reuse seam (src/poc1.ts). plgg-kit is
// NOT imported by any browser file: the standing key
// and the ephemeral-key mint live behind the server
// session seam (src/entrypoints/serve.ts); the
// browser only ever holds the short-lived key.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc3-voice",
    srcRoot: "src",
  },
};
