import { parseArgs } from "./args.js";
import { discover } from "../Discovery/find.js";
import { runFile } from "../Core/Runner.js";
import {
  report,
  tally,
  exitCodeFor,
} from "../Core/Reporter.js";

/**
 * In-process CLI: a SINGLE run — discover specs, run them, print the
 * report, set the exit code. It does NOT handle `--watch` or
 * `--coverage`: both are orchestrated by the bin launcher as fresh
 * CHILD processes (Iteration-1 + Amendment 1). Watch re-execs this CLI
 * per change so every run gets a clean ESM module graph — that is what
 * makes SOURCE-file edits reflect (an in-process re-run would reuse
 * Node's module cache and report stale results).
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
  process.exitCode = exitCodeFor(tally(results));
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
