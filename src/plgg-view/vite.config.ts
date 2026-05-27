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
      entry: "src/index.ts",
      name: "plgg-view",
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
      tsconfigPath: "tsconfig.build.json",
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
});
