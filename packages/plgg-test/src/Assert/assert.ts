import { AssertionError } from "plgg-test/Core/AssertionError";

/**
 * `assert(cond)` — a TYPE-NARROWING assertion (used 448× across the
 * corpus as `assert(isOk(x)); x.content...`). Its signature MUST be
 * `asserts condition`: that is the entire reason it can replace an
 * `as` cast in a no-escape-hatch codebase. A `Result`-returning
 * variant could not narrow, so this is necessarily a THROW boundary
 * (Plan Amendment 5).
 *
 * It is exported as a plain `function` declaration (NOT a `const` of an
 * intersection type): TypeScript only honors an `asserts` call
 * signature on a function declaration / function+namespace merge — a
 * `const assert: typeof fn & {…}` silently loses the assertion and
 * narrowing breaks (TS2775). `assert.fail` is attached via a
 * declaration-merged namespace, keeping the call signature a real
 * assertion. (plgg-test runs `.ts` through `ts.transpileModule`, which
 * compiles the namespace, so `erasableSyntaxOnly` is intentionally NOT
 * set for this package.)
 */
export function assert(
  condition: unknown,
  message?: string,
): asserts condition {
  if (!condition) {
    throw new AssertionError({
      message:
        message ??
        "assertion failed: value is falsy",
    });
  }
}

export namespace assert {
  /**
   * `assert.fail(msg)` — unconditionally fails the current test.
   */
  export function fail(message?: string): never {
    throw new AssertionError({
      message: message ?? "assert.fail()",
    });
  }
}
