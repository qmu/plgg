import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  asI64,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asI64 basic validation", () =>
  all([
    check(
      isOk(asI64(box("I64")(100000000n))),
      toBe(true),
    ),
    check(
      isErr(
        asI64(BigInt("10000000000000000000")),
      ),
      toBe(true),
    ),
  ]));
