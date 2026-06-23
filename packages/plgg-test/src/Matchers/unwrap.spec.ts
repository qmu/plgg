import {
  test,
  check,
  all,
  toBe,
  shouldBeOk,
  shouldBeErr,
  shouldBeSome,
  shouldBeNone,
} from "plgg-test/index";
import {
  ok,
  err,
  some,
  none,
  isOk,
  isErr,
  cast,
} from "plgg";

test("shouldBeOk asserts Ok AND carries the inner value forward", () =>
  // Data-flow narrowing: the inner value flows to the next matcher.
  cast(ok(42), shouldBeOk(), toBe(42)));

test("shouldBeOk fails on Err", () =>
  check(
    isErr(shouldBeOk()(err("boom"))),
    toBe(true),
  ));

test("shouldBeErr asserts Err and carries the error forward", () =>
  cast(
    err("boom"),
    shouldBeErr(),
    toBe("boom"),
  ));

test("shouldBeSome carries the inner value; shouldBeNone matches None", () =>
  all([
    cast(
      some(7),
      shouldBeSome(),
      toBe(7),
    ),
    check(
      isOk(shouldBeNone()(none())),
      toBe(true),
    ),
    check(
      isErr(shouldBeSome()(none())),
      toBe(true),
    ),
  ]));
