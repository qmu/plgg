import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

// plgg-test builds a dist library so that consumer packages can
// import its public API (`import { test, expect } from "plgg-test"`)
// against built output, exactly like the other packages. The test
// RUNNER itself, however, executes `*.spec.ts` directly via Node's
// native type-stripping — it does not bundle. So there is no `test`
// block here: plgg-test runs its own tests through its own CLI.
export default defineConfig({
  resolve: {
    alias: {
      "plgg-test": path.resolve(
        __dirname,
        "./src",
      ),
    },
  },
  build: {
    outDir: "dist",
    minify: true,
    lib: {
      entry: "src/index.ts",
      name: "plgg-test",
      fileName: (format) =>
        `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["plgg", /^node:/],
      output: {
        globals: {},
        exports: "named",
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
});
