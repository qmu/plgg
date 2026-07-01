import {
  test,
  check,
  all,
  toBe,
  okThen,
  shouldBeErr,
} from "plgg-test";
import {
  isCamelCase,
  asCamelCase,
  box,
} from "plgg/index";

test("isCamelCase and asCamelCase basic validation", () =>
  all([
    check(
      isCamelCase(box("CamelCase")("camelCase")),
      toBe(true),
    ),
    check(
      asCamelCase("testValue"),
      okThen((b) => toBe("testValue")(b.content)),
    ),
    check(
      asCamelCase("PascalCase"),
      shouldBeErr(),
    ),
  ]));
