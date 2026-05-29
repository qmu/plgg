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
  // `.tsx` specs compile through the automatic JSX runtime: Vite reads `jsx`
  // and `jsxImportSource` from tsconfig.json (so transforms resolve this
  // package's own jsx-runtime), and the `resolve.alias` above maps it to ./src.
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
        "**/jsx-runtime.ts",
        "**/jsx-dev-runtime.ts",
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
      // Entry points: the runtime-neutral core (`plgg-view` — Html model, folds,
      // SSR renderToString), the browser-only Elm-Architecture runtime
      // (`plgg-view/client` — sandbox + DOM render), and the legacy automatic
      // JSX runtime subpaths (kept during the VNode→Html migration). Window/DOM
      // code lives only behind `./client`, so the core entry stays SSR-safe.
      entry: {
        index: "src/index.ts",
        client: "src/client.ts",
        "jsx-runtime": "src/jsx-runtime.ts",
        "jsx-dev-runtime": "src/jsx-dev-runtime.ts",
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
