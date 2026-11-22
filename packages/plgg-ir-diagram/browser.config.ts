export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist/browser",
  entries: [
    { name: "interactive", input: "browser.ts" },
  ],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-ir-diagram",
    srcRoot: "src",
  },
};
