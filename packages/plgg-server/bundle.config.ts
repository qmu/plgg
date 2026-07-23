// In-house bundler config for plgg-server. Five entries:
// the runtime-neutral core (index) + one per host
// runtime (node, bun, deno) + the SSG entry. The SSG
// entry's OUTPUT KEY is `ssgEntry` (not `ssg`) so
// `dist/ssgEntry.*` does not case-collide with the
// `dist/Ssg/` declaration tree (the U0 fix); the
// published `./ssg` subpath points at it. Externals
// (plgg, plgg-http, plgg-view + node:*) are derived from
// package.json — runtime-coupled `node:*` stays external.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    { name: "node", input: "node.ts" },
    { name: "bun", input: "bun.ts" },
    { name: "deno", input: "deno.ts" },
    { name: "ssgEntry", input: "ssgEntry.ts" },
  ],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-server",
    srcRoot: "src",
  },
};
