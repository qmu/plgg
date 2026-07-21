// In-house bundler config for plgg-bundle's OWN CLI.
// target:"cli" → a single self-contained ESM bundle
// (dist/cli.es.js) with plgg-bundle's own source INLINED
// and its declared npm deps (typescript) + node:* left
// EXTERNAL — a Node process resolves those from
// node_modules at runtime. The bin runs THIS compiled
// bundle in a real registry install, so Node never has to
// strip types from a `.ts` under node_modules (the
// ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING that the old
// bin/relocate.mjs /tmp hack existed to dodge). No .d.ts,
// no CJS: nothing consumes the CLI as a library.
//
// Plain object literal (no imports), like every other
// bundle.config.ts, so it transpiles + imports standalone.
export default {
  target: "cli",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "cli", input: "entrypoints/cli.ts" },
  ],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-bundle",
    srcRoot: "src",
  },
};
