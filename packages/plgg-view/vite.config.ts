/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "plgg-view": path.resolve(__dirname, "./src"),
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
      // Two entries: the runtime-neutral core (`plgg-view` — the Html<Msg> model,
      // folds, mapHtml, and the pure SSR renderToString) and the browser-only
      // Elm-Architecture runtime (`plgg-view/client` — sandbox + application +
      // DOM render). Window/DOM code lives only behind `./client`, so the core
      // entry stays SSR-safe.
      entry: {
        index: "src/index.ts",
        client: "src/client.ts",
      },
      fileName: (format, entryName) => `${entryName}.${format}.js`,
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
