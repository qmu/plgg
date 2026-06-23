// Fixture consumed by the meta-harness (src/Core/_meta.ts). Each test
// DELIBERATELY exercises one verdict/drop-shape; the harness asserts
// the runner's outcome for each. Lives under fixtures/ (outside src) so
// the normal self-test discovery never picks it up.
//
// The drop-shape bodies intentionally MISHANDLE their assertion to
// prove the anti-false-green guard fails them at RUNTIME. To produce a
// wrong runtime value WITHOUT an `as`/`any`/`ts-ignore` token, they
// route junk through `wrong()` — a helper whose declared return type is
// `Assertion` but whose body yields a non-assertion via `JSON.parse`'s
// (lib-typed) return. This mirrors the real contributor mistake: a body
// that hands the runner something that is not a branded assertion.
import {
  test,
  check,
  toBe,
  all,
} from "plgg-test/index";
import type { Assertion } from "plgg-test/index";
import { ok } from "plgg";

// Produces a value typed `Assertion` but actually `value` at runtime.
const wrong = (value: string): Assertion =>
  JSON.parse(value);

// Happy paths.
test("returns a passing assertion", () =>
  check(2 + 2, toBe(4)));

test("returns a failing assertion", () =>
  check(2 + 2, toBe(5)));

// (a) computes an assertion then drops it, returning undefined.
test("drops the assertion and returns void", () => {
  check(1, toBe(2)); // computed, ignored
  return wrong("null");
});

// (b) returns a BARE DOMAIN Result (`ok(1)`), not a branded assertion.
test("returns a bare domain Result not an assertion", () =>
  wrongResult());

const wrongResult = (): Assertion =>
  // `ok(1)` is a real plgg Result a body might return by mistake; route
  // it through a type the runner must reject (it is not branded).
  JSON.parse(JSON.stringify(ok(1)));

// (c) fires an async assertion without returning/awaiting it.
test("fires an async assertion without returning it", () => {
  void Promise.resolve(check(1, toBe(2)));
  return wrong("null");
});

// (e) returns a non-Result truthy value.
test("returns a non-Result truthy value", () =>
  wrong("42"));

// (d) `all` with one failure among several: the body DOES return the
// aggregate, so the failure is real — it must report failed and surface
// every failure.
test("all with one failure among several fails", () =>
  all([
    check(1, toBe(1)),
    check(2, toBe(99)),
    check(3, toBe(3)),
  ]));
