// Dev-server config for `plgg-bundle dev` (the toolchain
// serves the site in development; the static build still
// runs through `plggpress build`). The `dev` section wires
// the site's Fetch entry, the watched roots (site content
// + plggpress theme SOURCE in the sibling plgg checkout),
// the tunnel host allowlist, and the cross-package
// `sourceAliases` that make `plggpress/*` resolve to
// source so theme edits hot-reload. The non-`dev` fields
// are the bundler's required shape; dev never builds, so
// `entries` is empty.
export default {
  root: import.meta.dirname,
  rootDir: ".",
  outDir: "dist",
  fileNamePattern: "[name].[format].js",
  entries: [],
  formats: ["es"],
  alias: { prefix: "site", srcRoot: "." },
  dev: {
    entry: "devEntry.ts",
    port: 5182,
    watch: [
      ".",
      "../../../plgg/packages/plggpress/src",
    ],
    allowedHosts: [
      "localhost",
      "plggmatic-guide.qmu.dev",
    ],
    sourceAliases: [
      {
        prefix: "plggpress",
        srcDir:
          "../../../plgg/packages/plggpress/src",
      },
    ],
  },
};
