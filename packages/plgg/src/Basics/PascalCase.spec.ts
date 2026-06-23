import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import {
  isPascalCase,
  asPascalCase,
  isErr,
  box,
} from "plgg/index";

test("isPascalCase and asPascalCase basic validation", () =>
  all([
    check(
      isPascalCase(
        box("PascalCase")("PascalCase"),
      ),
      toBe(true),
    ),
    check(
      asPascalCase("TestValue"),
      okThen((v) =>
        toBe("TestValue")(v.content),
      ),
    ),
    check(
      isErr(asPascalCase("camelCase")),
      toBe(true),
    ),
  ]));
