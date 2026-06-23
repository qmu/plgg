import { test, assert } from "plgg-test";
import {
  asU64,
  isOk,
  isErr,
  box,
} from "plgg/index";

test("asU64 basic validation", () => {
  const result = asU64(box("U64")(100000000n));
  assert(isOk(result));
  assert(
    isErr(asU64(BigInt("20000000000000000000"))),
  );
});
