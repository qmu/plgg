import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  isAlphanumeric,
  asAlphanumeric,
  box,
} from "plgg/index";

test("isAlphanumeric and asAlphanumeric basic validation", () =>
  all([
    check(
      isAlphanumeric(
        box("Alphanumeric")("test123"),
      ),
      toBe(true),
    ),
    check(
      asAlphanumeric("abc123"),
      okThen((b) => toBe("abc123")(b.content)),
    ),
    check(
      asAlphanumeric("test-123"),
      shouldBeErr(),
    ),
  ]));
