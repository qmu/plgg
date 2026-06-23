import type {
  TestResult,
  Verdict,
} from "plgg-test/Core/types";

/**
 * Folds results into the aggregate verdict.
 */
export const tally = (
  results: ReadonlyArray<TestResult>,
): Verdict =>
  results.reduce<Verdict>(
    (v, r) => ({
      passed:
        v.passed +
        (r.outcome === "passed"
          ? 1
          : 0),
      failed:
        v.failed +
        (r.outcome === "failed"
          ? 1
          : 0),
      skipped:
        v.skipped +
        (r.outcome === "skipped"
          ? 1
          : 0),
    }),
    { passed: 0, failed: 0, skipped: 0 },
  );

/**
 * The exit-code contract (Plan / design, adopted as-is): exit 0 ONLY
 * when there are zero failures AND at least one test actually ran
 * (passed + failed > 0). A run that discovered nothing to execute is
 * a non-zero result — silence must never read as success for the
 * agent/CI consumers that gate on this code.
 */
export const exitCodeFor = (
  v: Verdict,
): number =>
  v.failed > 0
    ? 1
    : v.passed + v.failed === 0
      ? 1
      : 0;

/**
 * Renders the human report: a line per failure with its message, then
 * a one-line summary. Returns the text so the CLI owns the actual
 * write (keeps this pure for its own spec).
 */
export const report = (
  results: ReadonlyArray<TestResult>,
): string => {
  const failures = results.filter(
    (r) => r.outcome === "failed",
  );
  const v = tally(results);
  const failBlock =
    failures.length === 0
      ? ""
      : failures
          .map(formatFailure)
          .join("\n") + "\n\n";
  return (
    failBlock +
    summaryLine(v) +
    emptyNote(v)
  );
};

const formatFailure = (
  r: TestResult,
): string =>
  `✗ ${r.names.join(" › ")}\n    ${r.message}`;

const summaryLine = (
  v: Verdict,
): string =>
  `${v.passed} passed, ${v.failed} failed, ${v.skipped} skipped`;

const emptyNote = (
  v: Verdict,
): string =>
  v.passed + v.failed === 0
    ? "\nno tests were executed (treated as failure)"
    : "";
