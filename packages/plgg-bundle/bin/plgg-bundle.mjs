#!/usr/bin/env node
// plgg-bundle launcher. Two on-disk shapes, chosen by where the package lives:
//
//  - A REAL REGISTRY INSTALL (this package's realpath is under node_modules):
//    run the COMPILED, self-bundled CLI at `dist/cli.es.js`. It is plain ESM,
//    so Node never has to strip types from a `.ts` under node_modules
//    (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING) — which is why the old
//    bin/relocate.mjs copied the package to /tmp and re-exec'd there. No
//    relocate, no /tmp cache, no self-alias hook (the source is inlined).
//
//  - A MONOREPO CHECKOUT (realpath OUTSIDE node_modules, e.g. a `file:` link):
//    run the TypeScript source directly via the self-alias resolver hook.
//    Node strips types here, `import.meta.url` stays anchored to the real
//    source tree (the dev server resolves its alias hook relative to it), and
//    an edit is reflected on the next run with no rebuild.
//
// The compiled dist is what ships; the monorepo keeps running from source so
// its dev-server + hot-reload behaviour is unchanged.
import { realpathSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, sep } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = realpathSync(join(here, ".."));
const underNodeModules = pkgRoot
  .split(sep)
  .includes("node_modules");

if (underNodeModules) {
  await import(
    pathToFileURL(
      join(pkgRoot, "dist", "cli.es.js"),
    ).href
  );
} else {
  const { register } = await import("node:module");
  register("./hook.mjs", import.meta.url);
  await import(
    pathToFileURL(
      join(pkgRoot, "src", "entrypoints", "cli.ts"),
    ).href
  );
}
