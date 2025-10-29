/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import dotenv from "dotenv";

export default defineConfig({
  resolve: {
    alias: {
      autoplgg: path.resolve(__dirname, "./src"),
    },
  },
  test: {
    env: dotenv.config({ path: ".env" }).parsed,
    coverage: {
      all: true,
    },
  },
  build: {
    outDir: "dist",
    lib: {
      entry: "src/index.ts",
      name: "autoplgg",
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
