import { parseArgs } from "plgg-test/Cli/args";
import { discover } from "plgg-test/Discovery/find";
import { runFile } from "plgg-test/Core/Runner";
import {
  report,
  tally,
  exitCodeFor,
} from "plgg-test/Core/Reporter";
import { watch } from "plgg-test/Watch/watch";
import type { TestResult } from "plgg-test/Core/types";

/**
 * In-process CLI: discovers specs, runs them, prints the report, and
 * sets the exit code. Coverage re-exec is handled OUTSIDE this file by
 * the bin launcher (Plan Amendment 1); when running under coverage the
 * launcher passes the same args minus `--coverage`, so this file only
 * ever does discovery+run+report+watch.
 */
const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));

  const runOnce = async (): Promise<
    ReadonlyArray<TestResult>
  > => {
    const files = discover(args.roots);
    // The discovered SET is part of the parity contract; print it so
    // the launcher / parity harness can compare against vitest.
    if (
      process.env.PLGG_TEST_PRINT_FILES === "1"
    ) {
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
    return results;
  };

  if (args.watch) {
    process.stdout.write(
      "plgg-test: watch mode — editing a file re-runs the suite\n",
    );
    await runOnce();
    watch(
      args.roots,
      async () => {
        process.stdout.write(
          "\nplgg-test: change detected, re-running…\n",
        );
        await runOnce();
      },
      100,
    );
    // Keep the process alive for the watcher.
    return new Promise(() => undefined);
  }

  const results = await runOnce();
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
