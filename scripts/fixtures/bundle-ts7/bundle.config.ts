export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].[format].js",
  alias: {
    prefix: "bundle-ts7-consumer",
    srcRoot: "src",
  },
};
