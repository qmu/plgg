// In-house bundler config for the PoC 4 shell client
// (target:"app" → one self-contained ESM bundle,
// dist/main.js, with plgg + siblings inlined from source,
// including PoC 1's FTS modules via the relative reuse
// seam src/poc1.ts) PLUS the `dev` section for the
// INTERNAL plggpress doc server (`npm run dev:docs`): the
// seeded content copy rendered by pressDevEntry on an
// internal port the shell server proxies under /docs/.
// The shell page itself is NEVER served by this dev
// server — plgg-bundle injects the location.reload() live
// -reload script into every dev HTML response, which
// would tear down the WebRTC session; only the iframe'd
// doc pages live there (the locked iframe-isolation
// decision).
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [{ name: "main", input: "main.ts" }],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc4-edit",
    srcRoot: "src",
  },
  dev: {
    entry: "devEntry.ts",
    // Internal doc port — NOT the public one. The shell
    // server (PORT 5173 in the container, host 5187 →
    // plgg-poc4.qmu.dev) proxies /docs/* and
    // /__plgg_reload here so the iframe stays
    // same-origin behind the single tunnel hostname.
    port: 5175,
    // Only the seeded corpus copy: a `.md` write by the
    // agent always reloads (content extension), and only
    // the iframe'd doc page refreshes.
    watch: ["content"],
    allowedHosts: [
      "localhost",
      "plgg-poc4.qmu.dev",
    ],
    sourceAliases: [
      {
        prefix: "plggpress",
        srcDir: "../plggpress/src",
      },
    ],
  },
};
