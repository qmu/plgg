import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import {
  isKebabCase,
  asKebabCase,
  isErr,
  box,
} from "plgg/index";

test("isKebabCase and asKebabCase basic validation", () =>
  all([
    check(
      isKebabCase(
        box("KebabCase")("kebab-case"),
      ),
      toBe(true),
    ),
    check(
      asKebabCase("test-value"),
      okThen((v) =>
        toBe("test-value")(v.content),
      ),
    ),
    check(
      isErr(asKebabCase("camelCase")),
      toBe(true),
    ),
  ]));
