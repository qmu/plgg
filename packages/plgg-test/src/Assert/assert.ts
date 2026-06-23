import {
  AssertionError,
} from "plgg-test/Core/AssertionError";

/**
 * `assert(cond)` — a TYPE-NARROWING assertion (used 448× across the
 * corpus as `assert(isOk(x)); x.content...`). Its signature MUST be
 * `asserts condition`: that is the entire reason it can replace an
 * `as` cast in a no-escape-hatch codebase. A `Result`-returning
 * variant could not narrow, so this is necessarily a THROW boundary
 * (Plan Amendment 5).
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

/**
 * `assert.fail(msg)` — unconditionally fails the current test. The
 * `asserts` signature lives on the callable; `fail` is a sibling
 * property carrying a `never` return so callers can use it in
 * exhaustive positions.
 */
const fail = (
  message?: string,
): never => {
  throw new AssertionError({
    message:
      message ?? "assert.fail()",
  });
};

// Attach `fail` to the assertion function. `assert` keeps its
// `asserts condition` call signature; `assert.fail` is the sibling.
export const assertWithFail: typeof assert & {
  fail: (message?: string) => never;
} = Object.assign(assert, { fail });
