import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  asU32,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asU32 basic validation", () =>
  all([
    check(
      isOk(asU32(box("U32")(100000))),
      toBe(true),
    ),
    check(
      isErr(asU32(5000000000)),
      toBe(true),
    ),
  ]));
