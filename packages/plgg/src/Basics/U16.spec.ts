import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  asU16,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asU16 basic validation", () =>
  all([
    check(
      isOk(asU16(box("U16")(1000))),
      toBe(true),
    ),
    check(isErr(asU16(70000)), toBe(true)),
  ]));
