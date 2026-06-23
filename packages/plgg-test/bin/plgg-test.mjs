#!/usr/bin/env node
// plgg-test launcher.
//
// Responsibilities (kept in plain `.mjs` because it runs at the very
// process entry, before any type-stripping is configured):
//   1. Derive the self-package alias→srcRoot map from the TARGET
//      package's tsconfig (cwd) plus plgg-test's own src, and export
//      it as PLGG_TEST_ALIASES so the resolver hook can rewrite
//      `<pkg>/index` specifiers (the hook reads the env at init).
//   2. Spawn the in-process CLI under
//      `--experimental-strip-types --import <register.mjs>`.
//   3. For `--coverage`: re-exec the child with NODE_V8_COVERAGE set
//      to a temp dir (Plan Amendment 1 — named collection process),
//      then run the parent post-pass that folds the dumped V8 JSON and
//      applies the >90% gate. `node:inspector` Session is the
//      documented fallback only; not used here.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import {
  fileURLToPath,
  pathToFileURL,
} from "node:url";
import {
  deriveAliases,
  selfSrcRoot,
} from "../src/Resolve/aliases.mjs";

const here = dirname(
  fileURLToPath(import.meta.url),
);
const srcRoot = selfSrcRoot(here);
const registerPath = join(
  srcRoot,
  "Resolve",
  "register.mjs",
);
const cliPath = join(srcRoot, "Cli", "cli.ts");

const argv = process.argv.slice(2);
const wantsCoverage = argv.includes("--coverage");
const childArgv = argv.filter(
  (a) => a !== "--coverage",
);

// Build the alias env: the target package's own paths + always
// plgg-test -> its own src (so foreign specs/CLI can resolve
// plgg-test internals and the public façade).
const targetTsconfig = resolve(
  process.cwd(),
  "tsconfig.json",
);
const aliases = [
  safeDerive(targetTsconfig),
  `plgg-test=${srcRoot}`,
]
  .filter(Boolean)
  .join("\n");

function safeDerive(tsconfigPath) {
  try {
    return deriveAliases(tsconfigPath);
  } catch {
    return "";
  }
}

const baseEnv = {
  ...process.env,
  PLGG_TEST_ALIASES: aliases,
};

const nodeFlags = [
  "--experimental-strip-types",
  "--no-warnings",
  "--import",
  pathToFileURL(registerPath).href,
];

if (!wantsCoverage) {
  const r = spawnSync(
    process.execPath,
    [...nodeFlags, cliPath, ...childArgv],
    { stdio: "inherit", env: baseEnv },
  );
  process.exit(r.status ?? 1);
}

// Coverage path: re-exec with NODE_V8_COVERAGE, then post-pass.
const covDir = mkdtempSync(
  join(tmpdir(), "plgg-test-cov-"),
);
const r = spawnSync(
  process.execPath,
  [...nodeFlags, cliPath, ...childArgv],
  {
    stdio: "inherit",
    env: {
      ...baseEnv,
      NODE_V8_COVERAGE: covDir,
    },
  },
);

// Parent post-pass: load the coverage folder via the TS module under
// strip-types (a tiny inline runner) so we reuse Coverage/v8.ts.
const gatePath = join(
  srcRoot,
  "Coverage",
  "gate.ts",
);
const gate = spawnSync(
  process.execPath,
  [
    ...nodeFlags,
    gatePath,
    covDir,
    resolve(process.cwd(), "src"),
  ],
  { stdio: "inherit", env: baseEnv },
);

rmSync(covDir, {
  recursive: true,
  force: true,
});

// Fail if either the tests failed or the coverage gate failed.
process.exit(
  (r.status ?? 1) || (gate.status ?? 1),
);
