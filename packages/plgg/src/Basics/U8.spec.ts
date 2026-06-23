import {
  test,
  check,
  all,
  toBe,
  okThen,
} from "plgg-test";
import {
  isU8,
  asU8,
  isErr,
  box,
} from "plgg/index";

test("isU8 and asU8 basic validation", () =>
  all([
    check(isU8(box("U8")(42)), toBe(true)),
    check(
      asU8(box("U8")(200)),
      okThen((v) => toBe(200)(v.content)),
    ),
    check(isErr(asU8(300)), toBe(true)),
  ]));
