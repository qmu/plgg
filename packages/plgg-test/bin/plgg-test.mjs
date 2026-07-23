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
import {
  mkdtempSync,
  rmSync,
  watch as fsWatch,
} from "node:fs";
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
import { relocateOutOfNodeModules } from "./relocate.mjs";

// Node 24 refuses to strip types from `.ts` under `node_modules`. When this
// tool is installed from the registry, relocate a copy OUTSIDE `node_modules`
// and re-exec there (so the spawned `--experimental-strip-types` children load
// this tool's `.ts` from a strippable path); a no-op on a monorepo `file:`
// link. The TARGET package's specs stay at cwd (outside node_modules) either
// way.
relocateOutOfNodeModules(
  import.meta.url,
  "plgg-test.mjs",
);

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
const wantsWatch = argv.includes("--watch");
// The child CLI does a single run; --watch/--coverage are orchestrated
// here, so strip them from what the child sees.
const childArgv = argv.filter(
  (a) => a !== "--coverage" && a !== "--watch",
);
// Roots the watcher observes (positional args, default ["src"]).
const watchRoots = childArgv.filter(
  (a) => !a.startsWith("--"),
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

const gatePath = join(
  srcRoot,
  "Coverage",
  "gate.ts",
);

// One full run as a FRESH child process. Returns the exit status. A
// fresh process per run guarantees a clean ESM module graph, so under
// --watch a SOURCE edit is reflected (an in-process re-run would reuse
// Node's module cache and report stale results).
function runChild() {
  // Gating is unconditional (D14): every one-shot run re-execs with
  // NODE_V8_COVERAGE, then the parent post-pass folds the dumped V8 JSON
  // and applies the per-package gate. `--coverage` is accepted as a no-op
  // (stripped from childArgv above) so existing `coverage` npm scripts
  // keep working.
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
  const gate = spawnSync(
    process.execPath,
    [
      ...nodeFlags,
      gatePath,
      covDir,
      resolve(process.cwd(), "src"),
      process.cwd(),
    ],
    {
      stdio: "inherit",
      env: baseEnv,
    },
  );
  rmSync(covDir, {
    recursive: true,
    force: true,
  });
  return (r.status ?? 1) || (gate.status ?? 1);
}

if (!wantsWatch) {
  process.exit(runChild());
}

// Watch: run once, then re-run a fresh child on any change under the
// roots, debounced. Never exits on a red run — the loop survives.
process.stdout.write(
  "plgg-test: watch mode — editing a source or spec file re-runs the suite (fresh process)\n",
);
runChild();

let timer = null;
let running = false;
let pending = false;

function fire() {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  process.stdout.write(
    "\nplgg-test: change detected, re-running…\n",
  );
  runChild();
  running = false;
  if (pending) {
    pending = false;
    fire();
  }
}

function schedule() {
  if (timer !== null) {
    clearTimeout(timer);
  }
  timer = setTimeout(fire, 100);
}

const roots =
  watchRoots.length > 0 ? watchRoots : ["src"];
for (const root of roots) {
  fsWatch(
    resolve(process.cwd(), root),
    { recursive: true },
    () => schedule(),
  );
}
