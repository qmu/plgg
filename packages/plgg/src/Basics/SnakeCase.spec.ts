import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import {
  isSnakeCase,
  asSnakeCase,
  isErr,
  box,
} from "plgg/index";

test("isSnakeCase and asSnakeCase basic validation", () =>
  all([
    check(
      isSnakeCase(
        box("SnakeCase")("snake_case"),
      ),
      toBe(true),
    ),
    check(
      asSnakeCase("test_value"),
      okThen((v) =>
        toBe("test_value")(v.content),
      ),
    ),
    check(
      isErr(asSnakeCase("camelCase")),
      toBe(true),
    ),
  ]));
