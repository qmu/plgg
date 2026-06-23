import {
  Box,
  Result,
  box,
  isBoxWithTag,
  isResult,
  isOk,
  isErr,
  ok,
  err,
} from "plgg";

/**
 * The verdict of one assertion — a BRANDED plgg `Result`.
 *
 * Why branded (the keystone, guardrail 1): a test body RETURNS its
 * assertion and the runner reads that return value as the verdict. But
 * a body can legitimately return a plain DOMAIN `Result` (e.g.
 * `test("parse", () => asInt("x"))`). If `Assertion` were just
 * `Result<…>`, the runner could not tell a verdict from domain data —
 * a domain `Err` would read as a failed assertion, a domain `Ok` as a
 * pass: a false green produced by the type choice itself. So BOTH arms
 * carry a `Box` tag the runner checks via `isBoxWithTag` (no `as`):
 *   - success: `Ok<Pass<T>>`  where Pass = Box<"AssertionPass", T>
 *   - failure: `Err<Fail>`    where Fail = Box<"AssertionFail", {...}>
 * It is still a real plgg `Result` (composes in pipe/cast/proc), just
 * runtime-distinguishable from domain Results.
 */
export type Pass<T> = Box<"AssertionPass", T>;

/**
 * A failure record. ALL fields are pre-formatted strings (guardrail 4),
 * produced at the matcher boundary via `format.ts`, so `Assertion` is
 * non-generic in the actual's type at composition boundaries and
 * `all(ReadonlyArray<Assertion>)` type-checks without `as`/`any`.
 * `sibling` accumulates the failures `all` folds together (mirroring
 * plgg's `InvalidError` sibling list — guardrail 3).
 */
export type Fail = Box<
  "AssertionFail",
  Readonly<{
    matcher: string;
    expected: string;
    actual: string;
    message: string;
    sibling: ReadonlyArray<Fail>;
  }>
>;

/**
 * One assertion verdict. `T` is the value carried forward on success
 * (the single-matcher `pipe`/`cast` path keeps the precise type; `all`
 * erases it to `unknown`).
 */
export type Assertion<T = unknown> = Result<
  Pass<T>,
  Fail
>;

/**
 * Builds a passing verdict carrying `value` (flows to the next pipe
 * step).
 */
export const pass = <T>(value: T): Assertion<T> =>
  ok(box("AssertionPass")(value));

/**
 * Builds a failing verdict from already-formatted strings.
 */
export const fail = (args: {
  matcher: string;
  expected: string;
  actual: string;
  message: string;
  sibling?: ReadonlyArray<Fail>;
}): Assertion<never> =>
  err(
    box("AssertionFail")({
      matcher: args.matcher,
      expected: args.expected,
      actual: args.actual,
      message: args.message,
      sibling: args.sibling ?? [],
    }),
  );

const isPass = isBoxWithTag("AssertionPass");
const isFail = isBoxWithTag("AssertionFail");

/**
 * Runtime guard: is `value` a branded Assertion (NOT a bare domain
 * `Result`)? The runner uses this to FAIL any body that returns a
 * non-Assertion — the anti-false-green guard (guardrail 6). No cast:
 * we check the Result shape, then the Box brand on its content.
 */
export const isAssertion = (
  value: unknown,
): value is Assertion =>
  isResult(value) &&
  (isOk(value)
    ? isPass(value.content)
    : isErr(value)
      ? isFail(value.content)
      : false);

/**
 * Reads the failure box out of a failing Assertion's `Err`.
 */
export const failOf = (
  f: Fail,
): Readonly<{
  matcher: string;
  expected: string;
  actual: string;
  message: string;
  sibling: ReadonlyArray<Fail>;
}> => f.content;
