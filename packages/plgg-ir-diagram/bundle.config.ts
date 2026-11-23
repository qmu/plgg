export default {
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "index", input: "index.ts" },
    { name: "widget", input: "widget.ts" },
    { name: "editor", input: "editor.ts" },
    { name: "flow", input: "flow.ts" },
    { name: "flowEditor", input: "flowEditor.ts" },
  ],
  formats: ["es", "cjs"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "plgg-ir-diagram",
    srcRoot: "src",
  },
};
