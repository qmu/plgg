// In-house bundler config for the example client app.
// target:"app" → a single self-contained ESM bundle
// (dist/main.js, what index.html loads), with plggmatic
// and the plgg family INLINED from their built dists — a
// browser cannot resolve a bare `import "plggmatic"`, so
// the leaf app is where bundling deps is correct (the
// mirror of the libraries' externalize decision). The
// build script copies index.html beside it, making
// `dist/` the self-contained deployable the docs site
// nests under `/example/`.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "@plggmatic/example",
    srcRoot: "src",
  },
};
