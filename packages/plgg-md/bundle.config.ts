// In-house bundler config for plgg-md. A single entry:
// the parse-to-data core (index) — the frontmatter
// splitter + block tokenizer that emit the Box-union
// AST. Externals (plgg + plgg-view + node:*) are derived
// from package.json.
export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "index", input: "index.ts" }],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: { prefix: "plgg-md", srcRoot: "src" },
};
