/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "plgg-router": path.resolve(
        __dirname,
        "./src",
      ),
    },
  },
  // `.tsx` specs/example compile through the automatic JSX runtime: Vite reads
  // `jsx` and `jsxImportSource` from tsconfig.json (so transforms resolve
  // plgg-view's jsx-runtime), and the `resolve.alias` above maps the package to
  // ./src.
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
      // Two entries: the runtime-neutral core (`index` — the Routing model and
      // the pure path/resolve usecases) and the browser-only DOM/History seam
      // (`client`). Window/History/Document code never leaks into the core
      // entry, so the package's root import is environment-agnostic.
      entry: {
        index: "src/index.ts",
        client: "src/client.ts",
      },
      fileName: (format, entryName) =>
        `${entryName}.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // No `node:*` to externalize — the package is browser-native end to end.
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
