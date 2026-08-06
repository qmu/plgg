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
//   3. For `--coverage` ONLY: set NODE_V8_COVERAGE to a temp dir so the
//      child collects, and let the CHILD fold and gate it in-process.
//      `node:inspector` Session is the documented fallback only.
//
// COVERAGE IS OPT-IN. It used to be unconditional (D14): every run —
// including the one a developer types fifty times a day — re-exec'd
// under NODE_V8_COVERAGE and then spawned a THIRD process to fold the
// dump. Measured, that more than doubled each package's run (plgg
// 4.9 s → 11–12.5 s) and accounted for 57% of the whole repo's test
// phase. So the default run collects nothing and spawns nothing extra,
// and coverage moved to `--coverage`, where the fold happens inside the
// run's own process. The >90% four-metric gate is unchanged — it is
// relocated to the coverage mode, not retired.
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

// Node refuses to strip types from a `.ts` under `node_modules`, which is why
// this launcher used to copy the whole package to /tmp and re-exec there
// (bin/relocate.mjs, now retired). It no longer has to: the ONE file that must
// load without the hook — the hook itself — ships compiled as
// `dist/hook.es.js`, and `src/Resolve/register.mjs` registers that copy in a
// registry install. Everything else `.ts` (this src tree, the CLI entry below,
// and the target's specs at cwd) then loads through the hook's own
// transpiling `load`, which short-circuits Node's default loader and so is
// never subject to the node_modules restriction. No relocate, no /tmp cache.

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
const wantsCoverage = argv.includes("--coverage");
// The child CLI does a single run; --watch is orchestrated here, so it
// is stripped. --coverage is NOT stripped: the child is what folds and
// gates the coverage now, so it needs to see the flag.
const childArgv = argv.filter(
  (a) => a !== "--watch",
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

// One full run as a FRESH child process. Returns the exit status. A
// fresh process per run guarantees a clean ESM module graph, so under
// --watch a SOURCE edit is reflected (an in-process re-run would reuse
// Node's module cache and report stale results).
//
// The default path is ONE spawn and nothing else. Under --coverage a
// temp dir is handed to the child through NODE_V8_COVERAGE; the child
// flushes the dump with v8.takeCoverage() when its specs are done and
// folds the gate itself, so there is still only one spawn.
function runChild() {
  if (!wantsCoverage) {
    const lean = spawnSync(
      process.execPath,
      [...nodeFlags, cliPath, ...childArgv],
      { stdio: "inherit", env: baseEnv },
    );
    return lean.status ?? 1;
  }
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
  rmSync(covDir, {
    recursive: true,
    force: true,
  });
  return r.status ?? 1;
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
