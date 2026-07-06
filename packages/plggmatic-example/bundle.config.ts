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
  entries: [
    // the reference app — now the DECLARATIVE demo itself
    // (ticket 13 retired the crude scheduler demo entry;
    // the real app IS the vocabulary's proof of value)
    { name: "main", input: "main.ts" },
    // the ticket-12 forms demo (form + dialog + toasts)
    { name: "forms", input: "forms-main.ts" },
    // demo 1 — pane alignment (raw row/column/pane combinators)
    { name: "demo1", input: "demo1-main.ts" },
    // demo 2 — color scheme (token-driven light/dark reschemer)
    { name: "demo2", input: "demo2-main.ts" },
  ],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "@plggmatic/example",
    srcRoot: "src",
  },
};
