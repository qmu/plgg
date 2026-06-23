import {
  test,
  check,
  all,
  allAsync,
  not,
  toBe,
  fail,
  pass,
  isAssertion,
} from "plgg-test/index";
import { isOk, isErr } from "plgg";
import { failOf } from "plgg-test/Matchers/Assertion";

test("not inverts a matcher", () =>
  all([
    check(isOk(not(toBe(2))(1)), toBe(true)),
    check(isErr(not(toBe(1))(1)), toBe(true)),
  ]));

test("check is one call for the common case and aggregates many", () =>
  all([
    check(isOk(check(1, toBe(1))), toBe(true)),
    check(
      isErr(check(1, toBe(1), toBe(2))),
      toBe(true),
    ),
  ]));

test("all surfaces EVERY failure as siblings (no short-circuit)", () => {
  const verdict = all([
    fail({
      matcher: "m1",
      expected: "a",
      actual: "b",
      message: "first failed",
    }),
    pass(1),
    fail({
      matcher: "m2",
      expected: "c",
      actual: "d",
      message: "second failed",
    }),
  ]);
  // The aggregate is a branded Assertion that is an Err carrying both
  // failures as siblings. `isErr` narrows to Err<Fail>, so we read
  // `.content` (a Fail) without any cast.
  return all([
    check(isAssertion(verdict), toBe(true)),
    isErr(verdict)
      ? check(
          failOf(verdict.content).sibling.length,
          toBe(2),
        )
      : fail({
          matcher: "all",
          expected: "Err with 2 siblings",
          actual: "Ok",
          message:
            "expected the aggregate to fail",
        }),
  ]);
});

test("allAsync awaits every assertion then aggregates", () =>
  allAsync([
    Promise.resolve(check(1, toBe(1))),
    Promise.resolve(check(2, toBe(2))),
  ]));

test("allAsync fails if any awaited assertion failed", async () => {
  const v = await allAsync([
    Promise.resolve(check(1, toBe(1))),
    Promise.resolve(check(2, toBe(9))),
  ]);
  return check(isErr(v), toBe(true));
});
