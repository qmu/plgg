/// <reference types="vitest" />

import { defineConfig } from "vite";

// A plain client-side app build (index.html is the entry) — no SSR/lib mode.
// The To-Do app is a client-only Elm-Architecture program mounted from
// src/main.ts.
export default defineConfig({
  test: {
    coverage: {
      all: true,
      provider: "v8",
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "**/*.spec.ts",
        "src/main.ts",
        "vite.config.ts",
      ],
    },
  },
});
