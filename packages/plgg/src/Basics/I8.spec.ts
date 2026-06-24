import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import {
  isI8,
  asI8,
  isErr,
  box,
} from "plgg/index";

test("isI8 and asI8 basic validation", () =>
  all([
    check(isI8(box("I8")(42)), toBe(true)),
    check(
      asI8(box("I8")(100)),
      okThen((v) => toBe(100)(v.content)),
    ),
    check(isErr(asI8(200)), toBe(true)),
  ]));
