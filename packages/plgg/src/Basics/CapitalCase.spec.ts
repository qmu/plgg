import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  isCapitalCase,
  asCapitalCase,
  box,
} from "plgg/index";

test("isCapitalCase and asCapitalCase basic validation", () =>
  all([
    check(
      isCapitalCase(
        box("CapitalCase")("Capital Case"),
      ),
      toBe(true),
    ),
    check(
      asCapitalCase("Test Value"),
      okThen((b) => toBe("Test Value")(b.content)),
    ),
    check(
      asCapitalCase("lowercase"),
      shouldBeErr(),
    ),
  ]));
