import { SoftStr } from "plgg";

/**
 * The process-side effects a CLI performs, as an
 * injectable record. Passing a fake in tests exercises
 * the whole run fold with no global mutation; the default
 * {@link nodeConsole} is the one place `process` is
 * touched. Named `CliConsole` so it does not shadow the
 * DOM `Console`.
 */
export type CliConsole = Readonly<{
  out: (message: SoftStr) => void;
  err: (message: SoftStr) => void;
  fail: () => void;
}>;

/**
 * The production {@link CliConsole}: writes lines to the
 * real stdout/stderr and marks a non-zero process exit.
 * The single seam where `process` output is touched.
 */
export const nodeConsole: CliConsole = {
  out: (message: SoftStr): void => {
    process.stdout.write(`${message}\n`);
  },
  err: (message: SoftStr): void => {
    process.stderr.write(`${message}\n`);
  },
  fail: (): void => {
    process.exitCode = 1;
  },
};

/**
 * Reads the CLI arguments — everything after
 * `node <script>`. The one place `process.argv` is read.
 */
export const readArgv =
  (): ReadonlyArray<SoftStr> =>
    process.argv.slice(2);
