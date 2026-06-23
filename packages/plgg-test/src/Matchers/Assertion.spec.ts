import {
  test,
  check,
  all,
  toBe,
  pass,
  fail,
  isAssertion,
} from "plgg-test/index";
import { ok, err, some } from "plgg";

test("pass/fail build branded assertions", () =>
  all([
    check(isAssertion(pass(1)), toBe(true)),
    check(
      isAssertion(
        fail({
          matcher: "m",
          expected: "a",
          actual: "b",
          message: "x",
        }),
      ),
      toBe(true),
    ),
  ]));

test("a bare domain Result is NOT an assertion (the brand keystone)", () =>
  all([
    // domain Ok of raw data
    check(isAssertion(ok(1)), toBe(false)),
    // domain Err of a domain error
    check(isAssertion(err("boom")), toBe(false)),
    // a non-Result value
    check(isAssertion(42), toBe(false)),
    // an Option is not an assertion
    check(isAssertion(some(1)), toBe(false)),
  ]));
