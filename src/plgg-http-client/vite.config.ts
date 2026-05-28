/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

/**
 * The framework dependencies are kept external so the client bundle does not
 * inline `plgg` / `plgg-http-router`; consumers dedupe them. There are no Web
 * platform modules to externalize — `fetch`/`Request`/`Response` are globals
 * touched only at the seam, never imported.
 */
const isFrameworkDep = (id: string): boolean =>
  id === "plgg" ||
  id.startsWith("plgg/") ||
  id === "plgg-http-router" ||
  id.startsWith("plgg-http-router/");

export default defineConfig({
  resolve: {
    alias: {
      "plgg-http-client": path.resolve(__dirname, "./src"),
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
      name: "plgg-http-client",
      fileName: (format) => `index.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      external: isFrameworkDep,
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
