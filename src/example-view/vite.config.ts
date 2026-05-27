/// <reference types="vitest" />

import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  // No `resolve.alias`: `plgg-view` is resolved from node_modules like any real
  // dependency, and JSX config (`jsx`/`jsxImportSource`) is read from
  // tsconfig.json — so the specs exercise the published package surface.
  test: {
    coverage: {
      all: true,
    },
  },
  build: {
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      name: "plgg-example-view",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        exports: "named",
      },
    },
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
});
