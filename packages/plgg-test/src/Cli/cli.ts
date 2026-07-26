import { takeCoverage } from "node:v8";
import { resolve } from "node:path";
import { parseArgs } from "./args.js";
import { discover } from "../Discovery/find.js";
import { runFile } from "../Core/Runner.js";
import {
  report,
  tally,
  exitCodeFor,
} from "../Core/Reporter.js";
import { foldAndGate } from "../Coverage/report.js";

/**
 * In-process CLI: a SINGLE run — discover specs, run them, print the
 * report, set the exit code. It does NOT handle `--watch`: that is
 * orchestrated by the bin launcher as fresh CHILD processes, so every
 * run gets a clean ESM module graph (an in-process re-run would reuse
 * Node's module cache and report stale results).
 *
 * COVERAGE is opt-in and folded HERE. The default run — the developer's
 * inner loop — pays nothing for it: no instrumentation, no extra
 * process. Under `--coverage` the launcher re-execs this CLI with
 * `NODE_V8_COVERAGE` set, and once the specs are done we flush the dump
 * ourselves and fold it in this same process. That is what removed the
 * third spawned process per package; measured, coverage collection plus
 * that spawned fold was 57% of the whole test phase.
 */
const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const files = discover(args.roots);
  // The discovered SET is part of the parity contract; print it so the
  // launcher / parity harness can compare against vitest.
  if (process.env.PLGG_TEST_PRINT_FILES === "1") {
    files.forEach((f) =>
      process.stdout.write(`FILE ${f}\n`),
    );
  }
  const results = (
    await sequence(
      files.map((f) => () => runFile(f)),
    )
  ).flat();
  process.stdout.write(report(results) + "\n");
  process.exitCode =
    exitCodeFor(tally(results)) ||
    coverageExitCode(args.coverage);
};

/**
 * Flush the V8 coverage this process collected and apply the package's
 * gate, in-process. Returns 0 when coverage is off, so the caller folds
 * it into the run's exit code with a plain `||`.
 *
 * `takeCoverage()` writes the dump for the CURRENT process on demand —
 * without it the dump only lands at exit, which is precisely why the
 * fold used to need a second process to read it.
 */
const coverageExitCode = (
  wanted: boolean,
): number => {
  const covDir = process.env.NODE_V8_COVERAGE;
  if (!wanted || covDir === undefined) {
    return 0;
  }
  takeCoverage();
  return foldAndGate(
    covDir,
    resolve(process.cwd(), "src"),
    process.cwd(),
    (s) => process.stdout.write(s),
  );
};

const sequence = <T>(
  thunks: ReadonlyArray<() => Promise<T>>,
): Promise<ReadonlyArray<T>> =>
  thunks.reduce<Promise<Array<T>>>(
    async (accP, thunk) => {
      const acc = await accP;
      acc.push(await thunk());
      return acc;
    },
    Promise.resolve([]),
  );

void main();
