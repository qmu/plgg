import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { isBool, asBool } from "plgg/index";

test("Bool.is type guard", () =>
  all([
    check(isBool(true), toBe(true)),
    check(isBool(false), toBe(true)),
    check(isBool("true"), toBe(false)),
    check(isBool(1), toBe(false)),
    check(isBool(0), toBe(false)),
    check(isBool(null), toBe(false)),
    check(isBool(undefined), toBe(false)),
    check(isBool({}), toBe(false)),
    check(isBool([]), toBe(false)),
  ]));

test("Bool.cast validation", () =>
  all([
    // Ok: assert Ok AND check the unwrapped value in one matcher.
    check(asBool(true), okThen(toBe(true))),
    check(asBool(false), okThen(toBe(false))),
    // Err: assert Err AND check the error message.
    check(
      asBool("true"),
      errThen((e) =>
        toBe("Value is not a boolean")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBool(1),
      errThen((e) =>
        toBe("Value is not a boolean")(
          e.content.message,
        ),
      ),
    ),
    check(
      asBool(null),
      errThen((e) =>
        toBe("Value is not a boolean")(
          e.content.message,
        ),
      ),
    ),
  ]));
