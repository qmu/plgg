import {
  test,
  check,
  all,
  toBe,
} from "plgg-test";
import {
  asU64,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asU64 basic validation", () =>
  all([
    check(
      isOk(asU64(box("U64")(100000000n))),
      toBe(true),
    ),
    check(
      isErr(
        asU64(BigInt("20000000000000000000")),
      ),
      toBe(true),
    ),
  ]));
