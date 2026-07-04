#!/usr/bin/env node
// plgg-db-migration launcher (plain `.mjs`, no type
// stripping). Two jobs the bundled CLI can't do itself:
//  1. Load the BUILT CLI (dist/cli.es.js) — plgg-bundle
//     compiles it with proper type elision, which Node's
//     native stripping of raw `.ts` cannot do.
//  2. Own the DYNAMIC import of the user's config (the
//     bundler rejects dynamic imports), passing it to the
//     CLI as `loadConfig`.
// Requires a prior `npm run build`.
import { resolve } from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import { dirname, join } from "node:path";
import { existsSync } from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));

const loadConfig = () => {
  const configPath = resolve(
    process.cwd(),
    process.env.PLGG_DB_MIGRATION_CONFIG ??
      "migrate.config.ts",
  );
  if (!existsSync(configPath)) {
    throw new Error(
      `config not found: ${configPath}`,
    );
  }
  return import(pathToFileURL(configPath).href);
};

const cliPath = join(
  here,
  "..",
  "dist",
  "cli.es.js",
);
if (!existsSync(cliPath)) {
  process.stderr.write(
    "plgg-db-migration: build required — run `npm run build` (dist/cli.es.js missing)\n",
  );
  process.exit(1);
}

const { run } = await import(cliPath);

await run(loadConfig, process.argv);
