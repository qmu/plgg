#!/usr/bin/env node
// plgg-cms launcher. Mirrors plggpress's bin: install the
// self-alias resolver hook, then hand off to the TypeScript
// CLI (Node strips types on load). Kept as a plain `.mjs`
// because it runs at the very process entry, before the
// hook that resolves `plgg-cms/*` specifiers is registered.
// The same hook lets the CLI source resolve its own
// modules without a separate transpile step; `plggpress`
// and its `plggpress/framework` subpath resolve through
// Node's default resolution against plggpress's exports.
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

register("./hook.mjs", import.meta.url);

const here = dirname(
  fileURLToPath(import.meta.url),
);
const cli = join(here, "..", "src", "cli.ts");

await import(cli);
