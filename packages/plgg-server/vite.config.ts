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
        "**/*.test.ts",
        "**/index.ts",
        "src/node.ts",
        "src/bun.ts",
        "src/deno.ts",
        "src/ssg.ts",
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
      // Four entries: the runtime-neutral core (`index` — Http + Routing +
      // View, with the `Fetch` type and `toFetch` as the portable seam) and one
      // entry per host runtime (`node`, `bun`, `deno`). Runtime-coupled code
      // (`node:http`, `Bun.serve`, `Deno.serve`) never leaks into the core or
      // sibling runtime entries. Workers/Deno-Deploy/browser-fetch consume
      // `toFetch(app)` directly from the core — they need no adapter file.
      // (Client-side DOM rendering now lives in plgg-view's `./client` runtime.)
      entry: {
        index: "src/index.ts",
        node: "src/node.ts",
        bun: "src/bun.ts",
        deno: "src/deno.ts",
        ssg: "src/ssg.ts",
      },
      fileName: (format, entryName) =>
        `${entryName}.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: [
        "node:http",
        "node:stream",
        "node:fs/promises",
        "node:path",
      ],
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
