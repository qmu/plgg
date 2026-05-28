/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "plgg-server": path.resolve(
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
        "**/*.spec.tsx",
        "**/*.test.ts",
        "**/index.ts",
        "client.ts",
        "src/client.ts",
        "vite.config.ts",
      ],
      thresholds: {
        statements: 91,
        branches: 91,
        functions: 91,
        lines: 91,
      },
    },
  },
  build: {
    outDir: "dist",
    minify: true,
    lib: {
      // Two entries: the server library (`index`) and the client-only DOM
      // renderer (`client`, the `plgg-server/client` subpath) — so server
      // code never bundles the DOM renderer. Shared code is code-split.
      entry: {
        index: "src/index.ts",
        client: "src/client.ts",
      },
      fileName: (format, entryName) =>
        `${entryName}.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: ["node:http", "node:stream"],
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
