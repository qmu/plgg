// Dev-server config for `plgg-bundle dev` (the toolchain
// serves the guide in development; the static build still
// runs through `plgg-press build`). The `dev` section wires
// the guide's Fetch entry, the watched roots (guide content
// + plgg-press theme SOURCE), the tunnel host allowlist,
// and the cross-package `sourceAliases` that make
// `plgg-press/*` resolve to source so theme edits
// hot-reload. The non-`dev` fields are the bundler's
// required shape; dev never builds, so `entries` is empty.
export default {
  root: import.meta.dirname,
  rootDir: ".",
  outDir: "dist",
  fileNamePattern: "[name].[format].js",
  entries: [],
  formats: ["es"],
  alias: { prefix: "guide", srcRoot: "." },
  dev: {
    entry: "devEntry.ts",
    // Container maps this internal port to host :5181
    // (the plgg-guide.qmu.dev tunnel target).
    port: 5173,
    watch: [".", "../plgg-press/src"],
    // Mirrors site.config.ts's dev.allowedHosts so the
    // Cloudflare tunnel host is accepted.
    allowedHosts: [
      "localhost",
      "plgg-guide.qmu.dev",
    ],
    sourceAliases: [
      {
        prefix: "plgg-press",
        srcDir: "../plgg-press/src",
      },
    ],
  },
};
