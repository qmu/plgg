/// <reference types="vitest" />

import { defineConfig } from "vite";

export default defineConfig({
  // Builds the client entry into a single self-contained browser bundle
  // (dist/client.js) that the server serves at /client.js. plgg-view and
  // plgg-web/client are bundled in (not externalized) so it runs in the browser
  // with no module resolution. JSX config is read from tsconfig.json.
  build: {
    outDir: "dist",
    emptyOutDir: true,
    lib: {
      entry: "src/client.tsx",
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
