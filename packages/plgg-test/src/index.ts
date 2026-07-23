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
} from "./Core/Registry.js";

// The verdict type + builders + brand guard.
export {
  pass,
  fail,
  isAssertion,
} from "./Matchers/Assertion.js";
export type {
  Assertion,
  Pass,
  Fail,
} from "./Matchers/Assertion.js";

// Matchers (data-last; value flows through on success).
export {
  toBe,
  toEqual,
  toContain,
  toHaveLength,
  toBeGreaterThan,
  toBeGreaterThanOrEqual,
  toBeInstanceOf,
  toBeUndefined,
  toBeNull,
} from "./Matchers/matchers.js";
export type { Matcher } from "./Matchers/matchers.js";

// Value-carrying Option/Result assertions (the narrowing replacement).
export {
  shouldBeOk,
  shouldBeErr,
  shouldBeSome,
  shouldBeNone,
  okThen,
  errThen,
  someThen,
} from "./Matchers/unwrap.js";

// Combinators + the terse `check` entry.
export {
  not,
  all,
  allAsync,
  andThen,
  check,
} from "./Matchers/combinators.js";

// Structural equality predicate — the same one `toEqual` uses,
// exposed for specs that assert over collections (e.g. a spy's
// `mock.calls.some((c) => deepEqual(c, [...]))`).
export { deepEqual } from "./Expect/equals.js";

// Spies (style-agnostic test doubles).
export { vi } from "./Mock/vi.js";
