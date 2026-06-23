import {
  Result,
  Option,
  isOk,
  isErr,
  isSome,
  isNone,
} from "plgg";
import type {
  None,
  InvalidError,
} from "plgg";
import {
  Assertion,
  pass,
  fail,
} from "./Assertion.js";
import { formatValue } from "../Expect/format.js";

/**
 * Value-carrying assertions — the narrowing replacement (guardrail 2).
 *
 * The old `assert(isOk(r)); r.content` narrowed via `asserts cond` (a
 * throw). Here narrowing is DATA-FLOW: `shouldBeOk` asserts the value
 * is `Ok` AND yields the inner `T` inside `Pass`, so the next pipe step
 * receives the unwrapped value. No `asserts cond`, no throw, no ambient
 * `.d.ts` shim:
 *
 *   cast(asInt("42"), shouldBeOk(), toBe(int(42)))
 *   cast(asInt("x"),  shouldBeErr(), (e) => toContain("…")(e.message))
 */

// The type params live on the INNER (returned) function so they infer
// from the value at application time — `shouldBeOk()(ok(42))` infers
// `T = number`, carrying `42` forward, with no explicit type args.
export const shouldBeOk =
  () =>
  <T, E>(r: Result<T, E>): Assertion<T> =>
    isOk(r)
      ? pass(r.content)
      : fail({
          matcher: "shouldBeOk",
          expected: "Ok(_)",
          actual: formatValue(r),
          message: `expected Ok, got ${formatValue(r)}`,
        });

export const shouldBeErr =
  () =>
  <T, E>(r: Result<T, E>): Assertion<E> =>
    isErr(r)
      ? pass(r.content)
      : fail({
          matcher: "shouldBeErr",
          expected: "Err(_)",
          actual: formatValue(r),
          message: `expected Err, got ${formatValue(r)}`,
        });

export const shouldBeSome =
  () =>
  <T>(o: Option<T>): Assertion<T> =>
    isSome(o)
      ? pass(o.content)
      : fail({
          matcher: "shouldBeSome",
          expected: "Some(_)",
          actual: formatValue(o),
          message: `expected Some, got ${formatValue(o)}`,
        });

export const shouldBeNone =
  () =>
  <T>(o: Option<T>): Assertion<None> =>
    isNone(o)
      ? pass(o)
      : fail({
          matcher: "shouldBeNone",
          expected: "None",
          actual: formatValue(o),
          message: `expected None, got ${formatValue(o)}`,
        });

/**
 * `okThen(matcher)` — the ergonomic narrowing form: asserts the value
 * is `Ok` AND applies `matcher` to the unwrapped inner value, in one
 * data-last matcher. Fully type-inferring (matcher-first), so it reads
 * cleanly and needs no annotation:
 *
 *   check(asInt("42"), okThen(toBe(int(42))))
 *   check(asBool("x"), errThen(toBe(invalidBoolMsg)))   // on the error
 *
 * This is the direct replacement for `assert(isOk(r)); <check r.content>`.
 */
export const okThen =
  <T>(
    inner: (value: T) => Assertion,
  ): (<E>(r: Result<T, E>) => Assertion) =>
  (r) =>
    isOk(r)
      ? inner(r.content)
      : fail({
          matcher: "okThen",
          expected: "Ok(_)",
          actual: formatValue(r),
          message: `expected Ok, got ${formatValue(r)}`,
        });

// `E` is generic but DEFAULTS to `InvalidError` — the dominant error
// channel in this corpus. A bare `errThen((e) => …)` lambda yields no
// inference candidate for `E`, so the default applies and `e` is typed
// `InvalidError` with no annotation. A matcher-first `errThen(toBe(s))`
// infers `E` from the matcher's parameter (`E = string` here), so the
// error channel need not be `InvalidError`. Both forms read clean.
export const errThen =
  <E = InvalidError>(
    inner: (error: E) => Assertion,
  ): (<T>(r: Result<T, E>) => Assertion) =>
  (r) =>
    isErr(r)
      ? inner(r.content)
      : fail({
          matcher: "errThen",
          expected: "Err(_)",
          actual: formatValue(r),
          message: `expected Err, got ${formatValue(r)}`,
        });

export const someThen =
  <T>(
    inner: (value: T) => Assertion,
  ): ((o: Option<T>) => Assertion) =>
  (o) =>
    isSome(o)
      ? inner(o.content)
      : fail({
          matcher: "someThen",
          expected: "Some(_)",
          actual: formatValue(o),
          message: `expected Some, got ${formatValue(o)}`,
        });
