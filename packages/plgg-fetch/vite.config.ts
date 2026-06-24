import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

/**
 * The framework dependencies are kept external so the client bundle does not
 * inline `plgg` / `plgg-server`; consumers dedupe them. There are no Web
 * platform modules to externalize — `fetch`/`Request`/`Response` are globals
 * touched only at the seam, never imported.
 */
const isFrameworkDep = (id: string): boolean =>
  id === "plgg" ||
  id.startsWith("plgg/") ||
  id === "plgg-server" ||
  id.startsWith("plgg-server/");

export default defineConfig({
  resolve: {
    alias: {
      "plgg-fetch": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    minify: true,
    lib: {
      entry: "src/index.ts",
      name: "plgg-fetch",
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
