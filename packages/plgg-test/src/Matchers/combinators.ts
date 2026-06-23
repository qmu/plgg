import {
  isOk,
  isErr,
  matchResult,
} from "plgg";
import {
  Assertion,
  Fail,
  pass,
  fail,
  failOf,
} from "plgg-test/Matchers/Assertion";
import { Matcher } from "plgg-test/Matchers/matchers";

/**
 * `not(matcher)` — inverts a matcher: the inner failing becomes a pass
 * (carrying the actual value), the inner passing becomes a failure. The
 * pipe-native analogue of the old `.not`.
 */
export const not =
  <A>(m: Matcher<A>): Matcher<A> =>
  (actual) =>
    matchResult<unknown, Fail, Assertion<A>>(
      () => pass(actual),
      () =>
        fail({
          matcher: "not",
          expected: "(inverted matcher to fail)",
          actual: "(it passed)",
          message: `expected the matcher NOT to pass for ${describeActual(actual)}`,
        }),
    )(m(actual));

const describeActual = (
  actual: unknown,
): string =>
  typeof actual === "string"
    ? JSON.stringify(actual)
    : String(actual);

/**
 * `all(assertions)` — AGGREGATES (never short-circuits, the inverse of
 * `cast`): runs every assertion and, if ANY failed, folds EVERY failure
 * into one verdict whose `sibling` list carries them all (mirroring
 * plgg's `InvalidError` sibling accumulation — guardrail 3). So a test
 * reports all failed checks at once, not just the first.
 */
export const all = (
  assertions: ReadonlyArray<
    Assertion
  >,
): Assertion => {
  // Collect every Err's `Fail` content. `flatMap` + the `isErr` guard
  // narrows each element to `Err<Fail>`, so `.content` is `Fail` with no
  // cast (a plain `.filter(isErr)` would leave the content widened).
  const failures: ReadonlyArray<Fail> =
    assertions.flatMap((a) =>
      isErr(a) ? [a.content] : [],
    );
  return failures.length === 0
    ? pass(undefined)
    : fail({
        matcher: "all",
        expected: `${assertions.length} assertions to pass`,
        actual: `${failures.length} failed`,
        message: combinedMessage(
          failures,
        ),
        sibling: failures,
      });
};

const combinedMessage = (
  failures: ReadonlyArray<Fail>,
): string =>
  failures
    .map(
      (f) =>
        `• ${failOf(f).message}`,
    )
    .join("\n");

/**
 * Async `all`: awaits every `Promise<Assertion>` (does NOT short-
 * circuit), then folds with the sync {@link all}.
 */
export const allAsync = async (
  assertions: ReadonlyArray<
    Promise<Assertion>
  >,
): Promise<Assertion> =>
  all(await Promise.all(assertions));

/**
 * `check(actual, ...matchers)` — the documented terse default entry
 * (guardrail 7). Runs every matcher against one actual and aggregates
 * via {@link all}, so the common single check is one call
 * (`check(x, toBe(y))`) and multiple checks report every failure. Use
 * bare `pipe(actual, matcher)` instead only when a matcher's carried
 * value must feed a further step.
 */
export const check = <A>(
  actual: A,
  ...matchers: ReadonlyArray<
    Matcher<A>
  >
): Assertion =>
  all(
    matchers.map((m) => m(actual)),
  );

// Re-export the brand guards used by callers building custom verdicts.
export { isOk, isErr };
