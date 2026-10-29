export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  alias: {
    prefix: "corpd-consumer",
    srcRoot: "src",
  },
  fileNamePattern: "[name].[format].js",
};
