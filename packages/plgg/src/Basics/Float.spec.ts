import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  isFloat,
  asFloat,
  box,
} from "plgg/index";

test("isFloat and asFloat basic validation", () =>
  all([
    check(
      isFloat(box("Float")(3.14)),
      toBe(true),
    ),
    check(
      asFloat(box("Float")(2.5)),
      okThen((b) => toBe(2.5)(b.content)),
    ),
    check(asFloat("test"), shouldBeErr()),
  ]));
