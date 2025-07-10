/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "plgg/llm": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    coverage: {
      all: true,
    },
  },
  build: {
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      name: "plgg-llm",
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
