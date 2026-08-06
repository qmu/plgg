#!/usr/bin/env node
// plgg-cms launcher. Two on-disk shapes, chosen by where the package
// lives — the same rule plgg-bundle's and plggpress's bins follow:
//
//  - A REAL REGISTRY INSTALL (this package's realpath is under
//    node_modules): run the COMPILED CLI at `dist/cli.es.js`. It is
//    plain ESM with plgg-cms's own source inlined, so Node never has
//    to strip types from a `.ts` under node_modules
//    (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING) — which is why the
//    old bin/relocate.mjs copied the package to /tmp and re-exec'd
//    there. No relocate, no /tmp cache, and no self-alias hook: the
//    `plgg-cms/*` specifiers are inlined, and `plggpress` + its
//    `plggpress/framework` subpath resolve through plggpress's
//    published exports.
//
//  - A MONOREPO CHECKOUT (realpath OUTSIDE node_modules, e.g. a
//    `file:` link): install the self-alias resolver hook, then run the
//    TypeScript source directly. Node strips types here, and an edit
//    is reflected on the next run with no rebuild.
//
// Unlike plggpress's, this hook resolves ONLY the package's own
// `plgg-cms/*` self-alias, so under node_modules it would have nothing
// left to do — hence it is registered on the source path alone.
import { register } from "node:module";
import { realpathSync } from "node:fs";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import { dirname, join, sep } from "node:path";

const here = dirname(
  fileURLToPath(import.meta.url),
);
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
  register("./hook.mjs", import.meta.url);
  await import(
    pathToFileURL(join(pkgRoot, "src", "cli.ts"))
      .href
  );
}
