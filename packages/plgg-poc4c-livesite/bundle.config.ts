// In-house bundler config for PoC 4c. TWO app entries —
// this is the shape the PoC's whole question forced:
//
//   * `main`  → dist/main.js, the SHELL client (the
//     session page, the transcript, the iframe of the
//     real rendered site). Same as PoC 4/4b's client.
//   * `patch` → dist/patch.js, the INJECTED client. It
//     does NOT run on the shell page: the proxy splices it
//     into the REAL plggpress-rendered HTML, so it runs
//     inside the proxied document where the span to
//     animate actually lives. PoC 4b could patch its own
//     plgg-view tree; here the page belongs to the dev
//     server, so the only way in is a script that ships
//     WITH the page.
//
// Plus the `dev` section for the INTERNAL plggpress doc
// server (`npm run dev:docs`), carried over from PoC 4:
// the seeded content copy rendered by pressDevEntry on an
// internal port the shell proxies under /docs/. The shell
// page itself is NEVER served by this dev server — its
// injected location.reload() would tear down the WebRTC
// session.
export default {
  target: "app",
  root: import.meta.dirname,
  rootDir: "src",
  outDir: "dist",
  entries: [
    { name: "main", input: "main.ts" },
    {
      name: "patch",
      input: "entrypoints/patchMain.ts",
    },
  ],
  formats: ["es"],
  fileNamePattern: "[name].js",
  alias: {
    prefix: "plgg-poc4c-livesite",
    srcRoot: "src",
  },
  dev: {
    entry: "devEntry.ts",
    // Internal doc port — NOT the public one. The shell
    // server (PORT 5173 in the container, host 5198 →
    // plgg-poc4c.qmu.dev) proxies /docs/* and
    // /__plgg_reload here so the iframe stays same-origin
    // behind the single tunnel hostname.
    port: 5175,
    watch: ["content"],
    allowedHosts: [
      "localhost",
      "plgg-poc4c.qmu.dev",
    ],
    sourceAliases: [
      {
        prefix: "plggpress",
        srcDir: "../plggpress/src",
      },
    ],
  },
};
