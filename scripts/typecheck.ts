/**
 * Whole-repo typecheck gate.
 *
 * Every package's `npm run test` used to be `tsc --noEmit && plgg-test
 * src`, so the test phase paid **one cold `tsc` program per package**.
 * Typecheck moved off the per-package hot loop and became this single
 * gate. Tests do not need `tsc` to RUN: they execute through the
 * runtime's native type-stripping.
 *
 * Since the TypeScript 7 migration (split-version, 2026-08-13) the gate
 * drives the compiler as a PROCESS instead of through the compiler API:
 * TS7 is a Go binary whose npm package exports only `version` — the old
 * `createIncrementalProgram` / shared-`CompilerHost` surface does not
 * exist, and no incremental API replaces it (docs/typescript-7-api-gap.md).
 * What survives the redesign, deliberately:
 *
 *  - **Each package is checked by the compiler it declares.** The `tsc`
 *    launcher is resolved from the package's own `typescript` dependency
 *    (same seam as plgg-bundle's emitDts): the 27 TS7 packages get the
 *    native binary, while `plgg-bundle` and `plgg-test` — whose runtime
 *    dependency stays pinned to TS6 because `transpileModule` has no TS7
 *    counterpart — are checked by the exact TS6 that ships with them. A
 *    hoist-order change can never silently swap the compiler under a
 *    package again.
 *  - **Each package keeps its own options.** The 29 tsconfigs carry 12
 *    distinct shapes — DOM vs node-only `lib`, `NodeNext` vs `ESNext`
 *    module — so there is still one `tsc -p` per package, never a merged
 *    program that would let a node-only package see `DOM`.
 *  - **A red package still fails the run, named,** with its diagnostics
 *    shown in color (`--pretty` is forced; tsc would drop color on a
 *    piped stdout otherwise).
 *
 * What changed: the win no longer comes from a shared parsed-`.d.ts`
 * cache or `.tsbuildinfo` increments but from the native compiler's raw
 * speed plus a bounded process pool (measured: the TS7 native full check
 * of 27 packages beats the old warm incremental API path). Every run is
 * a full check — there is no stale-cache state to invalidate.
 *
 * Usage:
 *   node scripts/typecheck.ts            # every packages/<p>/tsconfig.json
 *   node scripts/typecheck.ts plgg plgg-view   # only the named packages
 *   node scripts/typecheck.ts --jobs 2   # pin the compiler concurrency
 *
 * Exit code 0 iff every package is clean. Zero new dependencies: Node
 * plus the TypeScript each package already installs.
 */
import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { availableParallelism } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

/** One package's typecheck outcome. */
export type ProjectResult = Readonly<{
  name: string;
  errorCount: number;
  seconds: number;
}>;

/**
 * The packages to check: every entry that actually carries a
 * `tsconfig.json`, in stable alphabetical order. Kept pure (the
 * directory listing and the existence probe are injected) so the
 * selection rule is unit-testable without a filesystem.
 */
export const projectNames = (
  entries: ReadonlyArray<string>,
  hasConfig: (name: string) => boolean,
  requested: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  [...entries]
    .sort()
    .filter(hasConfig)
    .filter(
      (n) =>
        requested.length === 0 ||
        requested.includes(n),
    );

/** Parsed invocation. */
export type CheckArgs = Readonly<{
  jobs: number;
  only: ReadonlyArray<string>;
}>;

/**
 * Parses `[packages...] [--jobs N]`. Pure. `jobs` falls back to the
 * caller's default when absent or not a positive integer — a typo must
 * not silently serialize (or explode) the compiler pool. Same contract
 * as runTests.ts, which caps this gate at `--jobs 2` when it runs it as
 * one job in its own pool.
 */
export const parseCheckArgs = (
  argv: ReadonlyArray<string>,
  defaultJobs: number,
): CheckArgs => {
  const at = argv.indexOf("--jobs");
  const raw = at === -1 ? "" : (argv[at + 1] ?? "");
  const parsed = Number.parseInt(raw, 10);
  return {
    jobs:
      Number.isInteger(parsed) && parsed > 0
        ? parsed
        : defaultJobs,
    only: argv.filter(
      (a, i) =>
        a !== "--jobs" &&
        !(i === at + 1 && at !== -1),
    ),
  };
};

/**
 * The `tsc` launcher next to a resolved `typescript` main. TS6 resolves
 * to `lib/typescript.js`, TS7 to `lib/version.cjs`; both keep the
 * launcher at `../bin/tsc`, the same path arithmetic plgg-bundle's
 * emitDts relies on. Pure so the derivation is unit-testable.
 */
export const tscBinFromMain = (
  resolvedMain: string,
): string =>
  join(
    dirname(resolvedMain),
    "..",
    "bin",
    "tsc",
  );

/**
 * How many diagnostics a `tsc` run reported. Counted from the output
 * (ANSI color stripped — `--pretty` is forced) rather than trusted from
 * the exit code alone, so the summary can say how MANY; but a nonzero
 * exit with unparseable output still counts as one error, never as
 * green — a crash of the compiler itself must fail the gate.
 */
export const errorCountOf = (
  output: string,
  exitCode: number,
): number => {
  const stripped = output.replace(
    /\u001b\[[0-9;]*m/g,
    "",
  );
  const matches = stripped.match(/error TS\d+/g);
  return matches !== null
    ? matches.length
    : exitCode === 0
      ? 0
      : 1;
};

/** The packages that reported at least one error. */
export const failedProjects = (
  results: ReadonlyArray<ProjectResult>,
): ReadonlyArray<string> =>
  results
    .filter((r) => r.errorCount > 0)
    .map((r) => r.name);

/** Non-zero iff any package reported an error. */
export const exitCodeFor = (
  results: ReadonlyArray<ProjectResult>,
): number =>
  failedProjects(results).length > 0 ? 1 : 0;

/**
 * The closing summary. A red run names every failing package on one
 * line, so the gate's output is actionable without scrolling back
 * through 29 packages of diagnostics.
 */
export const summaryOf = (
  results: ReadonlyArray<ProjectResult>,
  seconds: number,
): string => {
  const failed = failedProjects(results);
  const head = `typecheck: ${results.length} packages in ${seconds.toFixed(1)}s`;
  return failed.length === 0
    ? `${head} — all clean\n`
    : `${head} — FAILED in ${failed.length}: ${failed.join(", ")}\n`;
};

/**
 * Typecheck one package by spawning its own `tsc`. `--noEmit` is forced
 * so a package whose tsconfig emits declarations (plgg, plggmatic, …)
 * is checked exactly as its retired `tsc --noEmit` script checked it,
 * and nothing is written. Output is buffered and printed as one
 * attributed block on failure, never interleaved.
 */
const checkProject = (
  packagesDir: string,
  name: string,
): Promise<ProjectResult> =>
  new Promise((done) => {
    const started = Date.now();
    const root = join(packagesDir, name);
    const tscBin = tscBinFromMain(
      createRequire(
        join(root, "package.json"),
      ).resolve("typescript"),
    );
    const child = spawn(
      process.execPath,
      [
        tscBin,
        "-p",
        join(root, "tsconfig.json"),
        "--noEmit",
        "--pretty",
      ],
      { cwd: root },
    );
    const chunks: Array<Buffer> = [];
    child.stdout.on("data", (c: Buffer) =>
      chunks.push(c),
    );
    child.stderr.on("data", (c: Buffer) =>
      chunks.push(c),
    );
    child.on("close", (code) => {
      const output =
        Buffer.concat(chunks).toString("utf8");
      const errorCount = errorCountOf(
        output,
        code ?? 1,
      );
      if (errorCount > 0) {
        process.stdout.write(
          `\n=== packages/${name} — ${errorCount} error(s) ===\n${output}\n`,
        );
      }
      done({
        name,
        errorCount,
        seconds: (Date.now() - started) / 1000,
      });
    });
    child.on("error", (e) => {
      process.stderr.write(
        `${name}: could not run ${tscBin}: ${e.message}\n`,
      );
      done({
        name,
        errorCount: 1,
        seconds: (Date.now() - started) / 1000,
      });
    });
  });

/**
 * A bounded process pool: at most `jobs` compilers at once, results in
 * input order. Same cross-runtime constraint as runTests.ts — child
 * processes only, no `worker_threads`.
 */
const runPool = async (
  packagesDir: string,
  names: ReadonlyArray<string>,
  jobs: number,
): Promise<ReadonlyArray<ProjectResult>> => {
  const results: Array<ProjectResult> =
    new Array(names.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const at = next;
      next += 1;
      const name = names[at];
      if (name === undefined) {
        return;
      }
      results[at] = await checkProject(
        packagesDir,
        name,
      );
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.max(
          1,
          Math.min(jobs, names.length),
        ),
      },
      worker,
    ),
  );
  return results;
};

const main = async (): Promise<void> => {
  const repoRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const packagesDir = join(repoRoot, "packages");
  const args = parseCheckArgs(
    process.argv.slice(2),
    availableParallelism(),
  );
  const names = projectNames(
    readdirSync(packagesDir),
    (n) =>
      existsSync(
        join(packagesDir, n, "tsconfig.json"),
      ),
    args.only,
  );
  const started = Date.now();
  const results = await runPool(
    packagesDir,
    names,
    args.jobs,
  );
  process.stdout.write(
    summaryOf(
      results,
      (Date.now() - started) / 1000,
    ),
  );
  process.exitCode = exitCodeFor(results);
};

// Run the CLI only when invoked directly, never when a spec imports the
// helpers above (node --test loads this module and would otherwise run
// the whole repo's typecheck).
const invoked = process.argv[1];
if (
  invoked !== undefined &&
  fileURLToPath(import.meta.url) === resolve(invoked)
) {
  void main();
}
