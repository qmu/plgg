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
  build: {
    outDir: "dist",
    minify: true,
    lib: {
      // One entry: the runtime-neutral core (`index` — the `Segment`/`Location`
      // model and the pure path usecases: `compilePattern`/`matchSegments`/
      // `parseQuery`/`param`/`query`). No DOM/History code, no view dependency —
      // the package is pure data, consumed by plgg-view's `application` runtime.
      entry: {
        index: "src/index.ts",
      },
      fileName: (format, entryName) =>
        `${entryName}.${format}.js`,
      formats: ["es", "cjs"],
    },
    rollupOptions: {
      // Nothing platform-specific to externalize — pure data, no `node:*`/DOM.
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
