// In-house bundler config for the `example` client app.
// target:"app" → a single self-contained ESM bundle
// (dist/main.js, what index.html / the SSR page load),
// with plgg + siblings INLINED from source — a browser
// cannot resolve a bare `import "plgg"`, so the leaf app
// is where bundling deps is correct (the mirror of the
// libraries' externalize decision). Only node:* would
// stay external; the CSR graph has none. No .d.ts:
// nothing consumes the app.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "@plgg/example",
    srcRoot: "src",
  },
};
