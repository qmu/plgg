// In-house bundler config for the PoC 4b shell client
// (target:"app" → one self-contained ESM bundle,
// dist/main.js, with plgg + siblings inlined from source,
// including PoC 1's FTS modules via the relative reuse
// seam src/poc1.ts).
//
// NO `dev` section (a deviation from PoC 4): 4b RETIRES
// the reloading plggpress iframe. The document preview is
// rendered and PATCHED in place by the shell client
// itself (from the raw bytes of GET /api/doc), so there
// is no internal plggpress dev server to proxy and no
// second process. The whole PoC is one shell server —
// the change now happens ON the preview, not by swapping
// an iframe.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc4b-coedit",
    srcRoot: "src",
  },
};
