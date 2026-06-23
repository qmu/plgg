import {
  test,
  check,
  all,
  andThen,
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
} from "plgg";

test("shouldBeOk asserts Ok AND carries the inner value forward", () =>
  // Data-flow narrowing: `andThen` threads the unwrapped inner value
  // (42) from the value-carrying matcher into the next check.
  andThen(shouldBeOk()(ok(42)), (n) =>
    toBe(42)(n),
  ));

test("shouldBeOk fails on Err", () =>
  check(
    isErr(shouldBeOk()(err("boom"))),
    toBe(true),
  ));

test("shouldBeErr asserts Err and carries the error forward", () =>
  andThen(shouldBeErr()(err("boom")), (e) =>
    toBe("boom")(e),
  ));

test("shouldBeSome carries the inner value; shouldBeNone matches None", () =>
  all([
    andThen(shouldBeSome()(some(7)), (n) =>
      toBe(7)(n),
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
