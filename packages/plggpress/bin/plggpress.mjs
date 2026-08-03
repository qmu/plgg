#!/usr/bin/env node
// plggpress launcher. Two on-disk shapes, chosen by where the package
// lives — the same rule plgg-bundle's bin follows:
//
//  - A REAL REGISTRY INSTALL (this package's realpath is under
//    node_modules): run the COMPILED CLI at `dist/cli.es.js`. It is
//    plain ESM with plggpress's own source inlined, so Node never has
//    to strip types from a `.ts` under node_modules
//    (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING) — which is why the
//    old bin/relocate.mjs copied the package to /tmp and re-exec'd
//    there. No relocate, no /tmp cache.
//
//  - A MONOREPO CHECKOUT (realpath OUTSIDE node_modules, e.g. a
//    `file:` link): run the TypeScript source directly. Node strips
//    types here, and an edit is reflected on the next run with no
//    rebuild.
//
// The resolver hook is registered in BOTH shapes, because it does two
// jobs and only one of them is monorepo-only: it rewrites plggpress's
// own `plggpress/*` self-alias (source-only — the hook disables that
// branch under node_modules, where those specifiers are already
// inlined and the published `exports` map is authoritative), and it
// resolves EXTENSIONLESS RELATIVE imports for the consumer's own
// TypeScript — a `site.config.ts` sourcing its IA from `../ia/nav`.
// That second job serves files at the consumer's cwd, outside
// node_modules in every shape, so it must survive the compiled path.
import { register } from "node:module";
import { realpathSync } from "node:fs";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import { dirname, join, sep } from "node:path";

register("./hook.mjs", import.meta.url);

const here = dirname(
  fileURLToPath(import.meta.url),
);
const pkgRoot = realpathSync(join(here, ".."));
const underNodeModules = pkgRoot
  .split(sep)
  .includes("node_modules");

await import(
  pathToFileURL(
    underNodeModules
      ? join(pkgRoot, "dist", "cli.es.js")
      : join(pkgRoot, "src", "cli.ts"),
  ).href
);
