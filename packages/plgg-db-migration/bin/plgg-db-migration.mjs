#!/usr/bin/env node
// plgg-db-migration launcher. Installs the self-alias
// resolver hook, then hands off to the TypeScript CLI
// (Node strips types on load). Kept as plain `.mjs`
// because it runs at the very process entry, before the
// hook that resolves `plgg-db-migration/*` specifiers is
// registered.
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

register("./hook.mjs", import.meta.url);

const here = dirname(fileURLToPath(import.meta.url));
const cli = join(
  here,
  "..",
  "src",
  "entrypoints",
  "cli.ts",
);

await import(cli);
