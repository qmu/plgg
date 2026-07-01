import {
  test,
  check,
  all,
  toBe,
  okThen,
  errThen,
} from "plgg-test";
import { defined } from "plgg/index";

test("defined checks for non-undefined values", () =>
  // Example: Handling optional values
  all([
    check(defined("hello"), okThen(toBe("hello"))),
    check(
      defined(undefined),
      errThen((e) =>
        toBe("Value is undefined")(e.message),
      ),
    ),
  ]));
