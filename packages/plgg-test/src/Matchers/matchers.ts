import {
  Assertion,
  pass,
  fail,
} from "./Assertion.js";
import { deepEqual } from "../Expect/equals.js";
import { formatValue } from "../Expect/format.js";

/**
 * A matcher: a data-last function from an actual value to an
 * {@link Assertion} (`refine`-shaped, the plgg idiom). On success the
 * actual value flows through (inside `Pass`). Compose them with:
 *   - `check(actual, m1, m2)` — fan several matchers over one actual;
 *   - `pipe(actual, toBe(4))` — a single matcher's verdict;
 *   - `andThen(m(x), next)` — thread a value-carrying matcher's result
 *     into the next check.
 */
export type Matcher<A> = (
  actual: A,
) => Assertion<A>;

// Helper: build a matcher from a predicate + message parts. The
// `expected`/`actual` are formatted to strings HERE (guardrail 4).
const matcher =
  <A>(
    name: string,
    predicate: (actual: A) => boolean,
    describe: (actual: A) => {
      expected: string;
      message: string;
    },
  ): Matcher<A> =>
  (actual) =>
    predicate(actual)
      ? pass(actual)
      : fail({
          matcher: name,
          expected: describe(actual).expected,
          actual: formatValue(actual),
          message: describe(actual).message,
        });

// `toBe`/`toEqual` are RUNTIME equality checks: the `expected` value
// fixes the comparand, but the `actual` is left generic on the inner
// (application) function so it can be wider than — or simply unrelated
// to — `expected`'s static type. A test legitimately asserts that a
// value statically typed `Datum` equals the literal `"hello"`; pinning
// `actual` to `typeof expected` would reject that even though it holds
// at runtime. The actual's type `X` still threads through `Assertion<X>`
// so value-carrying composition keeps its precise type.
export const toBe =
  <A>(expected: A) =>
  <X>(actual: X): Assertion<X> =>
    Object.is(actual, expected)
      ? pass(actual)
      : fail({
          matcher: "toBe",
          expected: formatValue(expected),
          actual: formatValue(actual),
          message: `expected ${formatValue(actual)} to be ${formatValue(expected)}`,
        });

export const toEqual =
  <A>(expected: A) =>
  <X>(actual: X): Assertion<X> =>
    deepEqual(actual, expected)
      ? pass(actual)
      : fail({
          matcher: "toEqual",
          expected: formatValue(expected),
          actual: formatValue(actual),
          message: `expected ${formatValue(actual)} to deeply equal ${formatValue(expected)}`,
        });

// `toContain`: substring for strings, membership (Object.is) for
// arrays. Typed over the two actual shapes the corpus uses.
export const toContain =
  <A extends string | ReadonlyArray<unknown>>(
    expected: A extends string ? string : unknown,
  ): Matcher<A> =>
  (actual) =>
    (
      typeof actual === "string"
        ? typeof expected === "string" &&
          actual.includes(expected)
        : actual.some((v) =>
            Object.is(v, expected),
          )
    )
      ? pass(actual)
      : fail({
          matcher: "toContain",
          expected: formatValue(expected),
          actual: formatValue(actual),
          message: `expected ${formatValue(actual)} to contain ${formatValue(expected)}`,
        });

export const toHaveLength = <
  A extends string | ReadonlyArray<unknown>,
>(
  expected: number,
): Matcher<A> =>
  matcher(
    "toHaveLength",
    (actual) => actual.length === expected,
    (actual) => ({
      expected: String(expected),
      message: `expected ${formatValue(actual)} to have length ${expected}`,
    }),
  );

export const toBeGreaterThan = <
  A extends number | bigint,
>(
  expected: number | bigint,
): Matcher<A> =>
  matcher(
    "toBeGreaterThan",
    (actual) => actual > expected,
    (actual) => ({
      expected: formatValue(expected),
      message: `expected ${formatValue(actual)} to be greater than ${formatValue(expected)}`,
    }),
  );

export const toBeInstanceOf = <A>(
  ctor: Function,
): Matcher<A> =>
  matcher(
    "toBeInstanceOf",
    (actual) => actual instanceof ctor,
    (actual) => ({
      expected: ctor.name,
      message: `expected ${formatValue(actual)} to be an instance of ${ctor.name}`,
    }),
  );

export const toBeUndefined = <A>(): Matcher<A> =>
  matcher(
    "toBeUndefined",
    (actual) => actual === undefined,
    (actual) => ({
      expected: "undefined",
      message: `expected ${formatValue(actual)} to be undefined`,
    }),
  );

export const toBeNull = <A>(): Matcher<A> =>
  matcher(
    "toBeNull",
    (actual) => actual === null,
    (actual) => ({
      expected: "null",
      message: `expected ${formatValue(actual)} to be null`,
    }),
  );
