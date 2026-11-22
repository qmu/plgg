// In-house bundler config for plgg-flow-example. Single `index`
// entry, ESM + CJS, per-file `.d.ts` tree. Externals
// are derived from package.json (deps + node:*).
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    { name: "diagram", input: "diagram.ts" },
  ],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-flow-example",
    srcRoot: "src",
  },
};
