import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  isMethod,
  asMethod,
  METHODS,
} from "plgg-http/index";

test("isMethod accepts every recognized method and rejects others", () =>
  all([
    ...METHODS.map((m) =>
      check(isMethod(m), toBe(true)),
    ),
    check(isMethod("TRACE"), toBe(false)),
    check(isMethod("get"), toBe(false)),
    check(isMethod(123), toBe(false)),
  ]));

test("asMethod returns Ok for a known method", () =>
  check(
    asMethod("GET"),
    okThen((m) => toBe("GET")(m)),
  ));

test("asMethod returns Err for an unknown method", () =>
  all([
    check(asMethod("TRACE"), shouldBeErr()),
    check(asMethod(42), shouldBeErr()),
  ]));
