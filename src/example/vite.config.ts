/// <reference types="vitest" />

import { defineConfig } from "vite";

export default defineConfig({
  // `build` produces the CSR client bundle (dist/client.js) that the SSR server
  // serves at /client.js. plgg-view and plgg-http-router/client are bundled in (not
  // externalized) so it runs in the browser; JSX config is read from tsconfig.
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/csr/client.tsx",
      fileName: () => "client.js",
      formats: ["es"],
    },
    rollupOptions: {
      external: [],
      output: { exports: "named" },
    },
  },
  test: {
    coverage: {
      all: true,
    },
  },
});
