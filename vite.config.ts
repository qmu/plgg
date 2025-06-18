/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      plgg: path.resolve(__dirname, "./src"),
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
      name: "plgg",
      fileName: "plgg",
    },
  },
});
