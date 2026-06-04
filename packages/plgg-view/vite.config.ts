/// <reference types="vitest" />

import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      "plgg-view": path.resolve(
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
        "src/client.ts",
        "src/style.ts",
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
      // Entries: the runtime-neutral core (`plgg-view` — the Html<Msg> model,
      // folds, mapHtml, and the pure SSR renderToString); the browser-only
      // Elm-Architecture runtime (`plgg-view/client` — sandbox + application +
      // DOM render); and the pure inline-style utilities (`plgg-view/style` —
      // `style_` + the Tailwind-style vocabulary, kept on its own specifier so
      // its names don't collide with the Html builders). Window/DOM code lives
      // only behind `./client`, so the core and `./style` entries stay SSR-safe.
      entry: {
        index: "src/index.ts",
        client: "src/client.ts",
        style: "src/style.ts",
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
