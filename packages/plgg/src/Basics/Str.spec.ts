import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import {
  isStr,
  asStr,
  isErr,
  box,
} from "plgg/index";

test("isStr and asStr basic validation", () =>
  all([
    check(
      isStr(box("Str")("hello")),
      toBe(true),
    ),
    check(
      asStr("test"),
      okThen((v) => toBe("test")(v.content)),
    ),
    check(isErr(asStr("")), toBe(true)),
    check(isErr(asStr(123)), toBe(true)),
  ]));
