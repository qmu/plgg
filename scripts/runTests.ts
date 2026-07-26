/**
 * The canonical test runner: every package's suite, fanned out across
 * processes, through ONE command.
 *
 * `check-all.sh` used to list 37 `./scripts/test-<pkg>.sh` lines and run
 * them strictly one after another. With the typecheck gate and coverage
 * lifted off the per-package hot loop, what remains is one lean process
 * per package — and running those in parallel is the lever that turns a
 * 82 s phase into a ~25 s one on a 4-core box.
 *
 * Three things it must not get wrong, in this order:
 *
 *  1. **A red package must still fail the run**, named, with its failing
 *     test readable. A fast gate that stops failing is worse than the
 *     slow loop it replaced.
 *  2. **Output must stay legible.** Each package's stdout/stderr is
 *     buffered and emitted as one attributed block, never interleaved.
 *  3. **The slowest packages must start first**, or one worker is left
 *     holding `plgg-bundle` while three sit idle. Cost is taken from the
 *     previous run's measured durations (a git-ignored cache at the repo
 *     root, same idiom as `.check-all-green.stamp`), falling back to
 *     spec-file bytes on the first run.
 *
 * Cross-runtime: `node:child_process` only — no `worker_threads`, no
 * `cluster`, no native addon. Zero new dependencies.
 *
 * Usage:
 *   node scripts/runTests.ts                 # every package, lean
 *   node scripts/runTests.ts --coverage      # + the four-metric gate
 *   node scripts/runTests.ts --jobs 2        # pin the concurrency
 *   node scripts/runTests.ts plgg plgg-view  # only these packages
 */
import { spawn } from "node:child_process";
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { availableParallelism } from "node:os";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";

/** One package's suite outcome. */
export type PackageResult = Readonly<{
  name: string;
  ok: boolean;
  seconds: number;
  output: string;
}>;

/** Parsed invocation. */
export type RunArgs = Readonly<{
  coverage: boolean;
  typecheck: boolean;
  jobs: number;
  only: ReadonlyArray<string>;
}>;

/**
 * Parses `[packages...] [--coverage] [--typecheck] [--jobs N]`. Pure.
 * `jobs` falls back to the caller's default when absent or not a
 * positive integer — a typo must not silently serialize the whole run.
 */
export const parseRunArgs = (
  argv: ReadonlyArray<string>,
  defaultJobs: number,
): RunArgs => {
  const at = argv.indexOf("--jobs");
  const raw = at === -1 ? "" : (argv[at + 1] ?? "");
  const parsed = Number.parseInt(raw, 10);
  return {
    coverage: argv.includes("--coverage"),
    typecheck: argv.includes("--typecheck"),
    jobs:
      Number.isInteger(parsed) && parsed > 0
        ? parsed
        : defaultJobs,
    only: argv.filter(
      (a, i) =>
        !a.startsWith("--") &&
        !(at !== -1 && i === at + 1),
    ),
  };
};

/**
 * The whole-repo typecheck gate, run as one more job in the same pool.
 *
 * It is a separate gate, but it competes for the same four cores, and
 * running it before the fan-out simply leaves three cores idle for 13 s.
 * As a pool job it overlaps the test suites, and the phase reports ONE
 * wall clock — which is the number the developer actually waits for.
 * Dispatched first (it is the longest single job) so it is never the
 * tail.
 */
export const TYPECHECK_JOB = "typecheck";

/**
 * Slightly MORE children than cores, on purpose. Each child spends a
 * real slice of its life starting node and loading its module graph —
 * blocked, not computing — so pinning the pool to the core count leaves
 * cores idle during those windows.
 *
 * Measured on this 4-core box, the whole phase with the typecheck gate
 * folded in: jobs=4 → 35.5s, jobs=5 → 33.9s, jobs=6 → 33.8s,
 * jobs=8 → 34.7s. Two above the core count is the flat part of that
 * curve; past it, contention starts costing more than the idle it fills.
 */
export const defaultJobs = (
  cores: number,
): number => cores + 2;

/**
 * A package's `test` script must be the standard plgg-test invocation.
 * The runner spawns the launcher directly (skipping npm's ~0.3 s), which
 * is only faithful while every package agrees on what `test` means — so
 * a package that has drifted is reported as an error rather than run
 * with the wrong command.
 */
export const isStandardTestScript = (
  script: string | undefined,
): boolean =>
  script !== undefined &&
  /^(plgg-test|node \.\/bin\/plgg-test\.mjs) src$/.test(
    script.trim(),
  );

/**
 * The packages the runner is responsible for: those with a `test`
 * script. Pure — the filesystem is injected — so the selection rule has
 * a spec of its own.
 */
export const testablePackages = (
  entries: ReadonlyArray<string>,
  testScriptOf: (
    name: string,
  ) => string | undefined,
  only: ReadonlyArray<string>,
): ReadonlyArray<string> =>
  [...entries]
    .sort()
    .filter(
      (n) => testScriptOf(n) !== undefined,
    )
    .filter(
      (n) => only.length === 0 || only.includes(n),
    );

/**
 * Slowest first. A dynamic pool only has a tail problem, and the tail is
 * decided entirely by whether the expensive packages were dispatched
 * early — `plgg-bundle` alone is 10 s of an 82 s phase.
 */
export const orderByCost = (
  names: ReadonlyArray<string>,
  cost: (name: string) => number,
): ReadonlyArray<string> =>
  [...names].sort(
    (a, b) =>
      cost(b) - cost(a) || a.localeCompare(b),
  );

/** The attributed block printed for a failing package. */
export const failureBlock = (
  result: PackageResult,
): string =>
  `\n=== FAILED packages/${result.name} (${result.seconds.toFixed(1)}s) ===\n` +
  result.output.trimEnd() +
  `\n=== end packages/${result.name} ===\n`;

/** The packages that went red, in completion order. */
export const failedPackages = (
  results: ReadonlyArray<PackageResult>,
): ReadonlyArray<string> =>
  results.filter((r) => !r.ok).map((r) => r.name);

/** Non-zero iff any package went red. */
export const exitCodeFor = (
  results: ReadonlyArray<PackageResult>,
): number =>
  failedPackages(results).length > 0 ? 1 : 0;

/**
 * The closing line. The wall clock is printed on EVERY run, so the
 * mission's number can never go stale or be quoted from memory.
 */
export const summaryOf = (
  results: ReadonlyArray<PackageResult>,
  seconds: number,
  jobs: number,
): string => {
  const failed = failedPackages(results);
  const head = `test phase: ${results.length} checks in ${seconds.toFixed(1)}s (jobs=${jobs})`;
  return failed.length === 0
    ? `${head} — all green\n`
    : `${head} — FAILED in ${failed.length}: ${failed.join(", ")}\n`;
};

/** Total bytes of `*.spec.ts*` under a directory, recursively. */
const specBytes = (dir: string): number =>
  !existsSync(dir)
    ? 0
    : readdirSync(dir, {
        withFileTypes: true,
      }).reduce((sum, e) => {
        const p = join(dir, e.name);
        return e.isDirectory()
          ? sum + specBytes(p)
          : /\.spec\.tsx?$/.test(e.name)
            ? sum + statSync(p).size
            : sum;
      }, 0);

const DURATIONS_FILE = ".test-durations.json";

const readDurations = (
  repoRoot: string,
): ReadonlyMap<string, number> => {
  // Cache seam: an absent or malformed cache simply means "no history".
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(
        join(repoRoot, DURATIONS_FILE),
        "utf8",
      ),
    );
    return typeof parsed === "object" &&
      parsed !== null
      ? new Map(
          Object.entries(parsed).filter(
            (e): e is [string, number] =>
              typeof e[1] === "number",
          ),
        )
      : new Map();
  } catch {
    return new Map();
  }
};

const writeDurations = (
  repoRoot: string,
  results: ReadonlyArray<PackageResult>,
  prior: ReadonlyMap<string, number>,
): void => {
  // Cache seam: failing to persist timing must never fail the run.
  try {
    writeFileSync(
      join(repoRoot, DURATIONS_FILE),
      JSON.stringify(
        Object.fromEntries([
          ...prior,
          ...results.map(
            (r): [string, number] => [
              r.name,
              r.seconds,
            ],
          ),
        ]),
        null,
        2,
      ),
    );
  } catch {
    return;
  }
};

const testScriptOf = (
  packagesDir: string,
  name: string,
): string | undefined => {
  // Filesystem seam: a package without a readable package.json has no
  // test script as far as the runner is concerned.
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(
        join(packagesDir, name, "package.json"),
        "utf8",
      ),
    );
    const scripts =
      typeof parsed === "object" &&
      parsed !== null &&
      "scripts" in parsed
        ? parsed.scripts
        : undefined;
    const test =
      typeof scripts === "object" &&
      scripts !== null &&
      "test" in scripts
        ? scripts.test
        : undefined;
    return typeof test === "string"
      ? test
      : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Run one job as a child process, buffering its output. For a package
 * that is the plgg-test launcher with the package as cwd — exactly what
 * its `test` script does, minus npm's own startup.
 */
const runJob = (
  name: string,
  argv: ReadonlyArray<string>,
  cwd: string,
): Promise<PackageResult> =>
  new Promise((settle) => {
    const started = Date.now();
    const child = spawn(
      process.execPath,
      [...argv],
      {
        cwd,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    const chunks: Array<string> = [];
    child.stdout.on("data", (d: Buffer) =>
      chunks.push(d.toString()),
    );
    child.stderr.on("data", (d: Buffer) =>
      chunks.push(d.toString()),
    );
    child.on("error", (e: Error) => {
      chunks.push(`spawn failed: ${e.message}\n`);
      settle({
        name,
        ok: false,
        seconds: (Date.now() - started) / 1000,
        output: chunks.join(""),
      });
    });
    child.on("close", (code) =>
      settle({
        name,
        ok: code === 0,
        seconds: (Date.now() - started) / 1000,
        output: chunks.join(""),
      }),
    );
  });

/**
 * A bounded pool: `jobs` children in flight, the next package dispatched
 * as soon as one finishes. Dynamic rather than statically partitioned,
 * so a mis-estimated cost costs at most one package's tail instead of a
 * whole worker's idle time.
 */
const runPool = async (
  ordered: ReadonlyArray<string>,
  jobs: number,
  run: (name: string) => Promise<PackageResult>,
  onDone: (r: PackageResult) => void,
): Promise<ReadonlyArray<PackageResult>> => {
  const queue = [...ordered];
  const results: Array<PackageResult> = [];
  const worker = async (): Promise<void> => {
    // Imperative seam: the pool's whole job is to pull from one shared
    // queue until it is empty, which is a loop by nature.
    for (
      let next = queue.shift();
      next !== undefined;
      next = queue.shift()
    ) {
      const result = await run(next);
      onDone(result);
      results.push(result);
    }
  };
  await Promise.all(
    Array.from({
      length: Math.min(jobs, ordered.length),
    }).map(worker),
  );
  return results;
};

const main = async (): Promise<void> => {
  const repoRoot = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const packagesDir = join(repoRoot, "packages");
  const launcher = join(
    packagesDir,
    "plgg-test",
    "bin",
    "plgg-test.mjs",
  );
  const args = parseRunArgs(
    process.argv.slice(2),
    defaultJobs(availableParallelism()),
  );
  const names = testablePackages(
    readdirSync(packagesDir),
    (n) => testScriptOf(packagesDir, n),
    args.only,
  );
  const drifted = names.filter(
    (n) =>
      !isStandardTestScript(
        testScriptOf(packagesDir, n),
      ),
  );
  if (drifted.length > 0) {
    process.stderr.write(
      `tests: unrecognised test script in: ${drifted.join(", ")}\n` +
        "The canonical runner invokes the plgg-test launcher directly; a package\n" +
        "with a bespoke test command would be run with the wrong one.\n",
    );
    process.exitCode = 1;
    return;
  }
  const prior = readDurations(repoRoot);
  const ordered = orderByCost(
    args.typecheck
      ? [TYPECHECK_JOB, ...names]
      : names,
    (n) =>
      n === TYPECHECK_JOB
        ? Number.MAX_SAFE_INTEGER
        : (prior.get(n) ??
          specBytes(join(packagesDir, n, "src")) /
            10000),
  );
  process.stdout.write(
    `=== Running ${names.length} package suites (jobs=${args.jobs}${args.coverage ? ", coverage" : ""}${args.typecheck ? ", + typecheck gate" : ""}) ===\n`,
  );
  const started = Date.now();
  const results = await runPool(
    ordered,
    args.jobs,
    (n) =>
      n === TYPECHECK_JOB
        ? runJob(
            n,
            [join(repoRoot, "scripts", "typecheck.ts")],
            repoRoot,
          )
        : runJob(
            n,
            [
              launcher,
              "src",
              ...(args.coverage
                ? ["--coverage"]
                : []),
            ],
            join(packagesDir, n),
          ),
    (r) =>
      process.stdout.write(
        `${r.ok ? "  ok  " : " FAIL "} ${r.name} (${r.seconds.toFixed(1)}s)\n`,
      ),
  );
  const seconds = (Date.now() - started) / 1000;
  // A green package's output is noise across 38 packages; a red one's is
  // the whole point, so it is replayed in full and attributed.
  results
    .filter((r) => !r.ok)
    .forEach((r) =>
      process.stdout.write(failureBlock(r)),
    );
  process.stdout.write(
    summaryOf(results, seconds, args.jobs),
  );
  writeDurations(repoRoot, results, prior);
  process.exitCode = exitCodeFor(results);
};

// Run the CLI only when invoked directly, never when a spec imports the
// helpers above (node --test loads this module and would otherwise run
// the whole repo's test phase).
const invoked = process.argv[1];
if (
  invoked !== undefined &&
  fileURLToPath(import.meta.url) === resolve(invoked)
) {
  void main();
}
