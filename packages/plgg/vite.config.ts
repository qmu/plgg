import path from "path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  resolve: {
    alias: {
      plgg: path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",
    minify: true,
    lib: {
      entry: "src/index.ts",
      name: "plgg",
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
      insertTypesEntry: true,
      rollupTypes: false,
    }),
  ],
});
