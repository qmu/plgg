// The public authoring façade — pipe-style. Assertions are data-last
// functions returning a branded plgg `Result`; a test body RETURNS its
// assertion and the runner collects it. No fluent `expect(x).toBe(y)`
// chain, no throw-on-mismatch.
//
//   import { test, check, toBe, toEqual, shouldBeOk } from "plgg-test";
//   import { pipe, cast } from "plgg";
//
//   test("adds", () => check(2 + 2, toBe(4)));
//   test("parses", () =>
//     cast(asInt("42"), shouldBeOk(), toBe(int(42))));

// Authoring (registration tree — reused plumbing).
export {
  suite,
  describe,
  test,
  it,
  beforeEach,
  afterEach,
} from "plgg-test/Core/Registry";

// The verdict type + builders + brand guard.
export {
  pass,
  fail,
  isAssertion,
} from "plgg-test/Matchers/Assertion";
export type {
  Assertion,
  Pass,
  Fail,
} from "plgg-test/Matchers/Assertion";

// Matchers (data-last; value flows through on success).
export {
  toBe,
  toEqual,
  toContain,
  toHaveLength,
  toBeGreaterThan,
  toBeInstanceOf,
  toBeUndefined,
  toBeNull,
} from "plgg-test/Matchers/matchers";
export type { Matcher } from "plgg-test/Matchers/matchers";

// Value-carrying Option/Result assertions (the narrowing replacement).
export {
  shouldBeOk,
  shouldBeErr,
  shouldBeSome,
  shouldBeNone,
  okThen,
  errThen,
  someThen,
} from "plgg-test/Matchers/unwrap";

// Combinators + the terse `check` entry.
export {
  not,
  all,
  allAsync,
  andThen,
  check,
} from "plgg-test/Matchers/combinators";

// Spies (style-agnostic test doubles).
export { vi } from "plgg-test/Mock/vi";
