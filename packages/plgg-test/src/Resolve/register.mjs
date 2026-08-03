// Registers the plgg-test ESM resolver hook. Loaded via Node's
// `--import` so it is installed before any spec module is resolved.
// Kept as plain `.mjs` (no type-stripping needed) because it runs at
// the very process entry.
//
// WHICH hook file it registers depends on where this package lives —
// the same two-shape rule plgg-bundle's bin follows:
//
//  - A REAL REGISTRY INSTALL (realpath under node_modules): the
//    COMPILED `dist/hook.es.js`. Node refuses to strip types from a
//    `.ts` under node_modules, and the hook is the one file that
//    cannot rely on the hook — Node loads it with DEFAULT resolution,
//    on the loader thread, before any customization is in place — so
//    registering `./hook.ts` there dies with
//    ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING. That single
//    bootstrap file is the whole reason the old bin/relocate.mjs
//    copied the package to /tmp and re-exec'd there. Once the hook
//    itself is compiled, EVERYTHING ELSE `.ts` — this package's own
//    src, the CLI entry, the target package's specs — loads through
//    the hook's own `load`, which transpiles with the vendored
//    TypeScript and short-circuits, so Node's node_modules
//    restriction never applies to any of it.
//
//  - A MONOREPO CHECKOUT (realpath outside node_modules, e.g. a
//    `file:` link): the `./hook.ts` SOURCE, so an edit to the hook
//    takes effect on the next run with no rebuild.
import { register } from "node:module";
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, sep } from "node:path";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const underNodeModules = realpathSync(
  join(here, "..", ".."),
)
  .split(sep)
  .includes("node_modules");

register(
  underNodeModules
    ? "../../dist/hook.es.js"
    : "./hook.ts",
  import.meta.url,
);
