import {
  Result,
  Option,
  isOk,
  isErr,
  isSome,
  isNone,
} from "plgg";
import type { None } from "plgg";
import {
  Assertion,
  pass,
  fail,
} from "plgg-test/Matchers/Assertion";
import { formatValue } from "plgg-test/Expect/format";

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
