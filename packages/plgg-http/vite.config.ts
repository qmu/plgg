/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "plgg-http": path.resolve(
        __dirname,
        "./src",
      ),
    },
  },
  test: {
    coverage: {
      all: true,
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "**/*.spec.ts",
        "**/*.test.ts",
        "**/index.ts",
        "vite.config.ts",
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
  build: {
    outDir: "dist",
    minify: true,
    lib: {
      // One entry: the runtime-neutral HTTP model (request/response/status/
      // method/error) — pure data + pure builders, no `node:*` or `fetch`. Both
      // plgg-server and plgg-fetch build on it.
      entry: {
        index: "src/index.ts",
      },
      fileName: (format, entryName) =>
        `${entryName}.${format}.js`,
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
      tsconfigPath: "tsconfig.build.json",
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
});
