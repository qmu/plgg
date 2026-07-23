// In-house bundler config for plgg-view. Three entries:
// the SSR-safe core (index), the browser runtime
// (client), and the inline-style utilities. The style
// entry's OUTPUT KEY is `styleEntry` (not `style`) so
// `dist/styleEntry.*` does not case-collide with the
// `dist/Style/` declaration tree on a case-insensitive
// filesystem (the U0 fix); the published `./style`
// subpath points at it. Externals (plgg + node:*) are
// derived from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    { name: "client", input: "client.ts" },
    {
      name: "styleEntry",
      input: "styleEntry.ts",
    },
  ],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-view", srcRoot: "src" },
};
