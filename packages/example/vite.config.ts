import { defineConfig } from "vite";

// SSR + CSR demo. `vite` (npm run serve) serves index.html for CSR-only dev.
// `vite build` bundles the client entry to a stable `dist/main.js`, which the
// SSR server (src/server.ts) serves to boot the client takeover. The shared
// `view` is rendered server-side via plgg-server's pageResponse.
export default defineConfig({
  build: {
    outDir: "dist",
    lib: {
      entry: "src/main.ts",
      formats: ["es"],
      fileName: () => "main.js",
    },
  },
});
