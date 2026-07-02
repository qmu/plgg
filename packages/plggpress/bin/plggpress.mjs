#!/usr/bin/env node
// plggpress launcher. Mirrors plgg-bundle's bin: install
// the self-alias resolver hook, then hand off to the
// TypeScript CLI (Node strips types on load). Kept as a
// plain `.mjs` because it runs at the very process entry,
// before the hook that resolves `plggpress/*` specifiers
// is registered. The same hook lets a consumer's TS
// `site.config.ts` (and the CLI source it loads) resolve
// without a separate transpile step.
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

register("./hook.mjs", import.meta.url);

const here = dirname(
  fileURLToPath(import.meta.url),
);
const cli = join(here, "..", "src", "cli.ts");

await import(cli);
